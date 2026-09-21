const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const firebase=require('firebase/compat/app');
require('firebase/compat/auth');require('firebase/compat/firestore');
const createClient=require('../account-client');
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Local emulators required');
const projectId='demo-doori-security';
let env,owner,peer,outsider,account;
const apps=[];
function client(name){
 const app=firebase.initializeApp({projectId,apiKey:'demo-key',authDomain:projectId+'.firebaseapp.com'},'spark-'+name);
 apps.push(app);
 const auth=app.auth(),db=app.firestore();
 auth.useEmulator('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});
 const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');db.useEmulator(host,Number(port));
 return {auth,db,api:createClient(auth,db,firebase.firestore.FieldValue,globalThis.crypto)};
}
async function register(c,name,email){await c.auth.createUserWithEmailAndPassword(email,'Password123!');return c.api.registerAccount({username:name});}
async function verify(c){
 const response=await fetch('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key',{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({localId:c.auth.currentUser.uid,emailVerified:true})});
 assert.equal(response.ok,true,await response.text());
 await c.auth.currentUser.reload();await c.auth.currentUser.getIdToken(true);
}
before(async()=>{
 env=await initializeTestEnvironment({projectId,firestore:{rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 await env.clearFirestore();
 await fetch('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/emulator/v1/projects/'+projectId+'/accounts',{method:'DELETE'});
 owner=client('owner');peer=client('peer');outsider=client('outsider');
});
after(async()=>{for(const app of apps)await app.delete();await env?.cleanup();});
test('real unverified Auth user atomically creates private identity and public profile',async()=>{
 account=await register(owner,'@AccountTest','account@example.test');
 assert.match(account.id,/^\d{6}$/);
 assert.equal((await owner.db.doc('accounts/'+owner.auth.currentUser.uid).get()).data().key,'@accounttest');
 await assertFails(owner.db.doc('profiles/@accounttest').get());
 await verify(owner);
 const profile=(await owner.db.doc('profiles/@accounttest').get()).data();
 assert.equal(profile.email,undefined);assert.equal(profile.verificationToken,undefined);
});
test('duplicate name, second identity and forged ownership are rejected by rules',async()=>{
 await peer.auth.createUserWithEmailAndPassword('peer@example.test','Password123!');
 await assertFails(peer.api.registerAccount({username:'@AccountTest'}));
 await peer.api.registerAccount({username:'@OtherAccount'});await verify(peer);
 await assertFails(owner.api.registerAccount({username:'@SecondAccount'}));
 await assertFails(peer.db.doc('accounts/'+peer.auth.currentUser.uid).update({key:'@accounttest',username:'@AccountTest'}));
 await assertFails(peer.db.doc('users/@accounttest').get());
 await register(outsider,'@OutsideUser','outsider@example.test');await verify(outsider);
});
test('username and ID use native password authentication and reject wrong identity',async()=>{
 const credentials={email:'account@example.test',username:'@ACCOUNTTEST',id:account.id,password:'Password123!'};
 await owner.auth.signOut();await owner.api.signIn(credentials);
 await assert.rejects(owner.api.signIn({...credentials,id:'000000'}));assert.equal(owner.auth.currentUser,null);
 await assert.rejects(owner.api.signIn({...credentials,username:'@OtherAccount'}));assert.equal(owner.auth.currentUser,null);
 await assert.rejects(owner.api.signIn({...credentials,password:'wrong'}));
 await owner.api.signIn(credentials);
});
test('legacy migration trusts UID, ignores old verification and copies no private fields',async()=>{
 const legacy=client('legacy');await legacy.auth.createUserWithEmailAndPassword('legacy@example.test','Password123!');
 const uid=legacy.auth.currentUser.uid;
 await env.withSecurityRulesDisabled(async context=>context.firestore().doc('users/@legacytest').set({uid,username:'@LegacyTest',email:'legacy@example.test',id_number:'123456',isVerified:true,verificationToken:'old-token'}));
 const result=await legacy.api.ensureAccount();assert.equal(result.key,'@legacytest');
 await assertFails(legacy.db.doc('profiles/@legacytest').get());
 await assertFails(legacy.db.collection('messages').add({sender_username:'@LegacyTest',isPublic:true,chat_id:'general',text:'blocked'}));
 await verify(legacy);
 assert.equal((await legacy.db.doc('profiles/@legacytest').get()).data().verificationToken,undefined);
});
test('private invitations require recipient, current admin and an atomic membership change',async()=>{
 const group={id:'spark-private',name:'Private',privacy:'private',creator:'@AccountTest',admins:['@AccountTest'],members:['@AccountTest']};
 await owner.db.doc('groups/'+group.id).set(group);
 await owner.db.doc('messages/invite').set({type:'group_invite',invite_status:'pending',invite_group_id:group.id,recipient_username:'@otheraccount',sender_username:'@AccountTest',participants:['@accounttest','@otheraccount'],isPublic:false,chat_id:'@otheraccount'});
 await assertFails(peer.db.doc('groups/'+group.id).get());
 await assertFails(outsider.api.acceptGroupInvitation({groupId:group.id,messageId:'invite'}));
 await assertFails(peer.db.doc('messages/invite').update({invite_status:'accepted'}));
 await peer.api.acceptGroupInvitation({groupId:group.id,messageId:'invite'});
 assert.deepEqual((await peer.db.doc('groups/'+group.id).get()).data().members,['@AccountTest','@OtherAccount']);
 await peer.api.acceptGroupInvitation({groupId:group.id,messageId:'invite'}); // Harmless retry is idempotent.
 await owner.db.doc('groups/'+group.id).update({members:['@AccountTest']});
 await assertFails(peer.api.acceptGroupInvitation({groupId:group.id,messageId:'invite'}));
});
test('unguessable link allows preview and self-join, but not enumeration or revoked tokens',async()=>{
 const group=(await owner.db.doc('groups/spark-private').get()).data();
 const token=await owner.api.publishGroupLink(group);
 const info=await outsider.api.groupInviteInfo({groupId:group.id,token});
 assert.equal(info.name,'Private');assert.equal(info.inviteToken,undefined);
 await assertFails(outsider.db.collection('groupLinks').get());
 await assertFails(outsider.api.publishGroupLink({...group,inviteToken:token}));
 await assertFails(outsider.api.acceptGroupInvitation({groupId:group.id,token:'0'.repeat(48)}));
 const fresh=await owner.api.publishGroupLink({...group,inviteToken:token},true);
 await assertFails(outsider.api.groupInviteInfo({groupId:group.id,token}));
 await assertFails(outsider.api.acceptGroupInvitation({groupId:group.id,token}));
 await outsider.api.acceptGroupInvitation({groupId:group.id,token:fresh});
 assert.ok((await outsider.db.doc('groups/'+group.id).get()).data().members.includes('@OutsideUser'));
});
test('missed calls are recovered by recipient without peer writes or resetting seen state',async()=>{
 const data={status:'ended',caller:'@OtherAccount',receiver:'@AccountTest',timestamp:firebase.firestore.Timestamp.now()};
 await owner.api.recordMissedCall('missed',data);
 const ref=owner.db.doc('users/@accounttest/callHistory/missed');assert.equal((await ref.get()).data().type,'missed');
 await ref.update({seen:true});await owner.api.recordMissedCall('missed',data);assert.equal((await ref.get()).data().seen,true);
 await assertFails(peer.db.doc(ref.path).set({type:'forged'}));
 await owner.api.recordMissedCall('answered',{...data,answer:{sdp:'answered'}});assert.equal((await owner.db.doc('users/@accounttest/callHistory/answered').get()).exists,false);
});
test('crafted registration cannot bypass identity binding, email matching or profile privacy',async()=>{
 const attacker=client('crafted');await attacker.auth.createUserWithEmailAndPassword('crafted@example.test','Password123!');
 const uid=attacker.auth.currentUser.uid;
 const normal={uid,email:'crafted@example.test',username:'@CraftedUser',id_number:'123456',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
 for(const change of [{uid:owner.auth.currentUser.uid},{email:'victim@example.test'},{username:'@x'},{isVerified:true}]){
  const data={...normal,...change},key=data.username.toLowerCase(),batch=attacker.db.batch();
  batch.set(attacker.db.doc('accounts/'+uid),{username:data.username,key});batch.set(attacker.db.doc('users/'+key),data);
  await assertFails(batch.commit());
 }
 assert.equal((await attacker.db.doc('accounts/'+uid).get()).exists,false);
 await attacker.api.registerAccount({username:'@کاربرآزمایشی'});
 await assertFails(attacker.db.doc('profiles/@کاربرآزمایشی').update({email:'leak@example.test'}));
});
test('an invitation from a removed admin no longer authorizes joining',async()=>{
 const group={id:'revoked-admin',name:'Private',privacy:'private',creator:'@AccountTest',admins:['@AccountTest'],members:['@AccountTest']};
 await owner.db.doc('groups/'+group.id).set(group);
 await owner.db.doc('groups/'+group.id).update({admins:['@AccountTest','@OtherAccount'],members:['@AccountTest','@OtherAccount']});
 await peer.db.doc('messages/revoked-invite').set({type:'group_invite',invite_status:'pending',invite_group_id:group.id,recipient_username:'@outsideuser',sender_username:'@OtherAccount',participants:['@otheraccount','@outsideuser'],isPublic:false,chat_id:'@outsideuser'});
 await owner.db.doc('groups/'+group.id).update({admins:['@AccountTest']});
 await assertFails(outsider.api.acceptGroupInvitation({groupId:group.id,messageId:'revoked-invite'}));
});
