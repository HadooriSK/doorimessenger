// Default is read-only. --apply writes only validated mappings/profiles, never emailVerified.
const path=require('node:path');
const {createRequire}=require('node:module');
const backend=createRequire(path.resolve(__dirname,'../package.json')); // Local administration only; never deployed.
const {initializeApp}=backend('firebase-admin/app');
const {getAuth}=backend('firebase-admin/auth');
const {getFirestore,FieldPath}=backend('firebase-admin/firestore');
const cli=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
const cliAuth=require(path.join(cli,'auth'));
const {requireAuth}=require(path.join(cli,'requireAuth'));
const apply=process.argv.includes('--apply');
const fields=['avatarUrl','profilePics','searchable','avatarVisibility','callPrivacy','lastSeenPrivacy','bio'];
(async()=>{
 const session=cliAuth.getGlobalDefaultAccount();
 if (!session) throw Error('Run firebase login --reauth first.');
 await requireAuth({project:'doori-messenger',user:session.user,tokens:session.tokens,nonInteractive:true});
 initializeApp({projectId:'doori-messenger',credential:{getAccessToken:async()=>{
  const token=await cliAuth.getAccessToken(session.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
  return {access_token:token.access_token,expires_in:token.expires_in || 3600};
 }}});
 // Firestore's Admin wrapper does not accept a custom token credential. Use the
 // standard authorized-user OAuth credential with the underlying Google client.
 const api=require(path.join(cli,'api'));
 const {Firestore}=backend('@google-cloud/firestore');
 const db=new Firestore({projectId:'doori-messenger',preferRest:true,credentials:{
  type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:session.tokens.refresh_token
 }}),auth=getAuth();
 const planned=[],seen=new Set();
 let cursor=null,skipped=0,missingAuthUsers=0;
 while(true) {
  let query=db.collection('users').orderBy(FieldPath.documentId()).limit(200);
  if(cursor)query=query.startAfter(cursor);
  const page=await query.get();
  if(page.empty)break;
  for(const doc of page.docs) {
   const data=doc.data();
   if(!data.uid){skipped++;continue;}
   if(seen.has(data.uid))throw Error('Duplicate UID found. No migration written; review accounts.');
   seen.add(data.uid);
   if(typeof data.username!=='string' || data.username.toLowerCase()!==doc.id)throw Error('Username/key mismatch. No migration written.');
   let record;
   try { record=await auth.getUser(data.uid); }
   catch(error) {
    if(error.code==='auth/user-not-found'){missingAuthUsers++;continue;}
    throw error;
   }
   if(record.email?.toLowerCase()!==data.email?.toLowerCase())throw Error('Auth/email mismatch. No migration written.');
   const mappingRef=db.collection('accounts').doc(data.uid);
   const existing=await mappingRef.get();
   if(existing.exists && existing.data().key!==doc.id)throw Error('Conflicting account mapping. No migration written.');
   const profile={uid:data.uid,username:data.username,id_number:data.id_number || ''};
   for(const field of fields)if(data[field]!==undefined)profile[field]=data[field];
   planned.push({key:doc.id,mappingRef,profile,mapping:{username:data.username,key:doc.id}});
  }
  cursor=page.docs.at(-1);
 }
 console.log(JSON.stringify({mode:apply?'apply':'dry-run',validated:planned.length,legacyWithoutUid:skipped,missingAuthUsers}));
 if(apply) {
  for(const item of planned)await db.runTransaction(async tx=>{
   const profileRef=db.collection('profiles').doc(item.key);
   const [mapping,profile]=await Promise.all([tx.get(item.mappingRef),tx.get(profileRef)]);
   if(mapping.exists && mapping.data().key!==item.key)throw Error('Mapping changed during migration. Stopping.');
   if(!mapping.exists)tx.create(item.mappingRef,item.mapping);
   if(!profile.exists)tx.create(profileRef,item.profile);
  });
  console.log('Migration complete. Existing profiles were preserved; Firebase email verification was not changed.');
 }
})().catch(error=>{console.error('Migration stopped:',error.message);process.exitCode=1;});
