const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path'),{createRequire}=require('node:module');
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Local emulators required');
process.env.GCLOUD_PROJECT='demo-doori-security';process.env.FUNCTIONS_EMULATOR='true';process.env.BREVO_API_KEY='test-secret';
const backend=createRequire(path.resolve(__dirname,'../functions/package.json'));
const functions=require('../functions');
const {getAuth}=backend('firebase-admin/auth');const {getFirestore}=backend('firebase-admin/firestore');const {getApps,deleteApp}=backend('firebase-admin/app');
const auth=getAuth(),db=getFirestore();let created;
const req=(uid,verified,data={},email)=>({auth:uid?{uid,token:{email_verified:verified,email}}:undefined,data,rawRequest:{ip:'127.0.0.1'}});
before(async()=>{await auth.createUser({uid:'function-user',email:'function@example.test',password:'Password123!',emailVerified:false});});
after(async()=>{for(const app of getApps())await deleteApp(app);});
test('server registration creates private account without exposing email in profile',async()=>{
 created=await functions.registerAccount.run(req('function-user',false,{username:'@FunctionUser'},'function@example.test'));
 assert.match(created.id,/^\d{6}$/);assert.equal((await db.doc('profiles/@functionuser').get()).data().email,undefined);
});
test('username login checks ID and Firebase password, then returns a custom token',async()=>{
 const result=await functions.loginWithUsername.run(req(null,false,{username:'@FunctionUser',id:created.id,password:'Password123!'}));
 assert.equal(typeof result.token,'string');
 const resultWithoutAt=await functions.loginWithUsername.run(req(null,false,{username:'FunctionUser',id:created.id,password:'Password123!'}));
 assert.equal(typeof resultWithoutAt.token,'string');
 await assert.rejects(functions.loginWithUsername.run(req(null,false,{username:'@FunctionUser',id:'000000',password:'Password123!'})),e=>e.code==='unauthenticated');
 await assert.rejects(functions.loginWithUsername.run(req(null,false,{username:'@FunctionUser',id:created.id,password:'wrong'})),e=>e.code==='unauthenticated');
});
test('recovery needs only an email and sends account details with a reset link',async()=>{
 let payload;const original=global.fetch;
 global.fetch=async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({messageId:'test'})};};
 try{const result=await functions.recoverAccountDetails.run(req(null,false,{email:'function@example.test',language:'de'}));assert.equal(result.sent,true);}
 finally{global.fetch=original;}
 assert.equal(payload.to[0].email,'function@example.test');assert.match(payload.textContent,new RegExp(created.id));assert.match(payload.textContent,/Neues Passwort festlegen/);assert.match(payload.textContent,/https:\/\/doori-messenger\.de\/account\/action\?/);assert.match(payload.textContent,/oobCode=/);assert.doesNotMatch(payload.textContent,/firebaseapp\.com/);assert.equal(JSON.stringify(payload).includes('Password123!'),false);
 assert.deepEqual(await functions.recoverAccountDetails.run(req(null,false,{email:'unknown@example.test',language:'en'})),{sent:true});
 global.fetch=async()=>({ok:false,status:401});
 try{await assert.rejects(functions.recoverAccountDetails.run(req(null,false,{email:'function@example.test',language:'tr'})),error=>error.code==='unavailable');}
 finally{global.fetch=original;}
});
test('verification email uses the branded handler and selected language',async()=>{
 let payload;const original=global.fetch;global.fetch=async(url,options)=>{payload=JSON.parse(options.body);return {ok:true};};
 try{assert.deepEqual(await functions.sendVerificationEmail.run(req('function-user',false,{language:'tr'},'function@example.test')),{sent:true});}
 finally{global.fetch=original;}
 assert.equal(payload.to[0].email,'function@example.test');assert.match(payload.subject,/E-posta/);assert.match(payload.textContent,/https:\/\/doori-messenger\.de\/account\/action\?/);assert.match(payload.textContent,/mode=verifyEmail/);assert.doesNotMatch(payload.textContent,/firebaseapp\.com/);
});
