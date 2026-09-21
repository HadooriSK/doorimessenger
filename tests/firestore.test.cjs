const {test,before,after,beforeEach} = require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc,updateDoc,deleteDoc,collection,getDocs,query,where,orderBy,limit}=require('firebase/firestore');
let env;
const db=(id,verified=true)=>env.authenticatedContext(id,{email_verified:verified}).firestore();
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-doori-security',firestore:{rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async context=>{
  const store=context.firestore();
  for(const [uid,name] of [['alice','@Alice'],['bob','@Bob'],['eve','@Eve']]) {
   await setDoc(doc(store,'accounts',uid),{username:name,key:name.toLowerCase()});
   await setDoc(doc(store,'users',name.toLowerCase()),{uid,email:uid+'@example.test',verificationToken:'old-token',isVerified:false});
   await setDoc(doc(store,'profiles',name.toLowerCase()),{uid,username:name,lastSeenPrivacy:'all'});
   await setDoc(doc(store,'userData',name.toLowerCase()),{blockedContacts:[]});
  }
  await setDoc(doc(store,'groups','private'),{id:'private',privacy:'private',creator:'@Alice',admins:['@Alice'],members:['@Alice','@Bob']});
  await setDoc(doc(store,'groups','public'),{id:'public',privacy:'public',creator:'@Alice',admins:['@Alice'],members:['@Alice','@Bob']});
  await setDoc(doc(store,'messages','dm'),{sender_username:'@Alice',recipient_username:'@Bob',participants:['@alice','@bob'],isPublic:false,chat_id:'@Bob',text:'secret'});
  await setDoc(doc(store,'messages','private-room'),{sender_username:'@Alice',isPublic:true,chat_id:'private',text:'group secret'});
 });
});
test('anonymous cannot read accounts or forge legacy verification',async()=>{
 const store=env.unauthenticatedContext().firestore();
 await assertFails(getDoc(doc(store,'users','@alice')));
 await assertFails(updateDoc(doc(store,'users','@alice'),{isVerified:true,verifyAttempt:'old-token'}));
});
test('unverified Firebase accounts cannot access messages or profiles',async()=>{
 await assertFails(getDoc(doc(db('alice',false),'messages','dm')));
 await assertFails(getDoc(doc(db('alice',false),'profiles','@bob')));
});
test('private profile data and identity mapping cannot be read or changed by peers',async()=>{
 await assertSucceeds(getDoc(doc(db('alice'),'users','@alice')));
 await assertFails(getDoc(doc(db('bob'),'users','@alice')));
 await assertFails(getDoc(doc(db('bob'),'userData','@alice')));
 await assertFails(updateDoc(doc(db('bob'),'profiles','@alice'),{bio:'owned'}));
 await assertFails(setDoc(doc(db('bob'),'accounts','bob'),{username:'@Alice',key:'@alice'}));
 await assertFails(updateDoc(doc(db('alice'),'profiles','@alice'),{uid:'bob'}));
 await assertSucceeds(updateDoc(doc(db('alice'),'profiles','@alice'),{bio:'hello'}));
});
test('DMs visible only to sender and recipient; author cannot be forged',async()=>{
 await assertSucceeds(getDoc(doc(db('bob'),'messages','dm')));
 await assertFails(getDoc(doc(db('eve'),'messages','dm')));
 await assertFails(updateDoc(doc(db('bob'),'messages','dm'),{text:'forged'}));
 await assertFails(deleteDoc(doc(db('bob'),'messages','dm')));
 await assertSucceeds(updateDoc(doc(db('bob'),'messages','dm'),{read:true,readAt:Date.now()}));
 await assertFails(setDoc(doc(db('eve'),'messages','forged'),{sender_username:'@Alice',isPublic:true,chat_id:'general',text:'forged'}));
});
test('private group messages cannot be read by a non-member',async()=>{
 await assertSucceeds(getDoc(doc(db('bob'),'messages','private-room')));
 await assertFails(getDoc(doc(db('eve'),'messages','private-room')));
 await assertFails(updateDoc(doc(db('eve'),'groups','private'),{members:['@Alice','@Bob','@Eve']}));
 await assertFails(updateDoc(doc(db('bob'),'groups','private'),{admins:['@Alice','@Bob']}));
});
test('public group self-join cannot add another member or grant admin',async()=>{
 await assertSucceeds(updateDoc(doc(db('eve'),'groups','public'),{members:['@Alice','@Bob','@Eve']}));
 await assertFails(updateDoc(doc(db('eve'),'groups','public'),{admins:['@Alice','@Eve']}));
});
test('frontend DM, room and group subscriptions are compatible with rules',async()=>{
 const store=db('bob');
 await assertSucceeds(getDocs(query(collection(store,'messages'),where('participants','array-contains','@bob'),where('isPublic','==',false),orderBy('timestamp','desc'),limit(200))));
 await assertSucceeds(getDocs(query(collection(store,'messages'),where('chat_id','==','private'),where('isPublic','==',true),orderBy('timestamp','desc'),limit(50))));
 await assertSucceeds(getDocs(query(collection(store,'messages'),where('chat_id','==','general'),where('isPublic','==',true),orderBy('timestamp','desc'),limit(50))));
 await assertSucceeds(getDocs(query(collection(store,'groups'),where('members','array-contains','@Bob'))));
 await assertFails(getDocs(collection(store,'messages')));
});
test('legitimate DM, saved message and group send succeed',async()=>{
 const store=db('alice');
 await assertSucceeds(setDoc(doc(store,'messages','new-dm'),{sender_username:'@Alice',recipient_username:'@Bob',participants:['@alice','@bob'],isPublic:false,chat_id:'@Bob',text:'hello'}));
 await assertSucceeds(setDoc(doc(store,'messages','saved'),{sender_username:'@Alice',participants:['@alice'],isPublic:false,chat_id:'saved',text:'note'}));
 await assertSucceeds(setDoc(doc(store,'messages','room'),{sender_username:'@Alice',isPublic:true,chat_id:'private',text:'hello'}));
});
test('read-only and muted groups reject ordinary members but permit administrators',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  await updateDoc(doc(context.firestore(),'groups','private'),{isReadOnly:true});
 });
 await assertFails(setDoc(doc(db('bob'),'messages','readonly'),{sender_username:'@Bob',isPublic:true,chat_id:'private',text:'not allowed'}));
 await assertSucceeds(setDoc(doc(db('alice'),'messages','admin'),{sender_username:'@Alice',isPublic:true,chat_id:'private',text:'allowed'}));
});
test('call and doodle signaling stays between participants',async()=>{
 await assertSucceeds(setDoc(doc(db('alice'),'calls','call'),{caller:'@Alice',receiver:'@Bob',status:'calling'}));
 await assertSucceeds(getDoc(doc(db('bob'),'calls','call')));
 await assertFails(getDoc(doc(db('eve'),'calls','call')));
 await assertFails(updateDoc(doc(db('bob'),'calls','call'),{caller:'@Eve'}));
 await assertSucceeds(setDoc(doc(db('alice'),'calls','call','callerCandidates','ice'),{candidate:'test'}));
 await assertFails(setDoc(doc(db('bob'),'calls','call','callerCandidates','forged'),{candidate:'test'}));
 await assertSucceeds(setDoc(doc(db('alice'),'doodle_sessions','drawing'),{caller:'@alice',receiver:'@bob',type:'invite'}));
 await assertSucceeds(getDoc(doc(db('bob'),'doodle_sessions','drawing')));
 await assertFails(getDoc(doc(db('eve'),'doodle_sessions','drawing')));
});
