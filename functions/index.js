'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,Timestamp}=require('firebase-admin/firestore');
const {createHash,randomInt,timingSafeEqual}=require('node:crypto');
initializeApp();
const db=getFirestore(),auth=getAuth();
const BREVO_API_KEY=defineSecret('BREVO_API_KEY');
const options={region:'europe-west3',maxInstances:10,timeoutSeconds:30,memory:'256MiB'};
const WEB_API_KEY='AIzaSyAIV8HtZGe8RBzqcDLwc8RT2iY3TSWrnIk'; // Public Firebase Web identifier.
const keyOf=name=>'@'+String(name||'').replace(/^@/,'').toLowerCase();
const profileFields=['avatarUrl','profilePics','searchable','avatarVisibility','callPrivacy','lastSeenPrivacy','bio'];
function signedIn(request,verified=true){
 if(!request.auth)throw new HttpsError('unauthenticated','Sign in first.');
 if(verified&&request.auth.token.email_verified!==true)throw new HttpsError('permission-denied','Verify email first.');
 return request.auth.uid;
}
function publicProfile(data){const out={uid:data.uid,username:data.username,id_number:data.id_number||''};for(const field of profileFields)if(data[field]!==undefined)out[field]=data[field];return out;}
function safe(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
const recoveryCopy={
 de:{subject:'Doori Messenger: Zugang wiederherstellen',title:'Zugang wiederherstellen',username:'Benutzername',id:'Kontakt-ID',reset:'Neues Passwort festlegen',note:'Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.'},
 en:{subject:'Doori Messenger: Recover your account',title:'Recover your account',username:'Username',id:'Contact ID',reset:'Set a new password',note:'If you did not make this request, you can ignore this email.'},
 ar:{subject:'Doori Messenger: استعادة حسابك',title:'استعادة حسابك',username:'اسم المستخدم',id:'معرّف جهة الاتصال',reset:'تعيين كلمة مرور جديدة',note:'إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.'},
 fa:{subject:'Doori Messenger: بازیابی حساب',title:'بازیابی حساب',username:'نام کاربری',id:'شناسه مخاطب',reset:'تعیین گذرواژه جدید',note:'اگر این درخواست را نداده‌اید، می‌توانید این ایمیل را نادیده بگیرید.'},
 tr:{subject:'Doori Messenger: Hesabınızı kurtarın',title:'Hesabınızı kurtarın',username:'Kullanıcı adı',id:'Kişi kimliği',reset:'Yeni şifre belirle',note:'Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.'}
};
const verificationCopy={
 de:{subject:'Doori Messenger: E-Mail-Adresse bestätigen',title:'E-Mail-Adresse bestätigen',button:'E-Mail-Adresse bestätigen',note:'Falls du dieses Konto nicht erstellt hast, kannst du diese E-Mail ignorieren.'},
 en:{subject:'Doori Messenger: Verify your email address',title:'Verify your email address',button:'Verify email address',note:'If you did not create this account, you can ignore this email.'},
 ar:{subject:'Doori Messenger: تأكيد البريد الإلكتروني',title:'تأكيد البريد الإلكتروني',button:'تأكيد البريد الإلكتروني',note:'إذا لم تنشئ هذا الحساب، يمكنك تجاهل هذه الرسالة.'},
 fa:{subject:'Doori Messenger: تأیید ایمیل',title:'تأیید ایمیل',button:'تأیید ایمیل',note:'اگر این حساب را ایجاد نکرده‌اید، می‌توانید این ایمیل را نادیده بگیرید.'},
 tr:{subject:'Doori Messenger: E-posta adresinizi doğrulayın',title:'E-posta adresinizi doğrulayın',button:'E-posta adresini doğrula',note:'Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.'}
};
function languageOf(value){return recoveryCopy[value]?value:'en';}
function customActionLink(firebaseLink,language){
 const source=new URL(firebaseLink),target=new URL('https://doori-messenger.de/account/action');
 for(const name of ['mode','oobCode','continueUrl'])if(source.searchParams.has(name))target.searchParams.set(name,source.searchParams.get(name));
 target.searchParams.set('lang',language);return target.toString();
}
async function sendBrevo(email,copy,textContent,htmlContent){
 const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{Accept:'application/json','api-key':BREVO_API_KEY.value(),'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Doori Messenger',email:'noreply@doori-messenger.de'},to:[{email}],subject:copy.subject,textContent,htmlContent}),signal:AbortSignal.timeout(10000)});
 if(!response.ok){console.error('Brevo delivery failed',response.status);throw new HttpsError('unavailable','Email delivery failed.');}
}
async function limit(request,bucket,max=10){
 const now=Date.now(),ip=request.rawRequest?.ip||'unknown';
 const id=createHash('sha256').update(bucket+':'+ip).digest('hex'),ref=db.collection('_rateLimits').doc(id);
 await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data(),active=old&&old.until.toMillis()>now,count=active?old.count:0;if(count>=max)throw new HttpsError('resource-exhausted','Try later.');tx.set(ref,{count:count+1,until:active?old.until:Timestamp.fromMillis(now+15*60*1000)});});
}
async function ensureAccount(uid){
 const mapped=await db.collection('accounts').doc(uid).get();if(mapped.exists)return mapped.data();
 const users=await db.collection('users').where('uid','==',uid).limit(2).get();
 if(users.size!==1)throw new HttpsError('failed-precondition','Account requires review.');
 const user=users.docs[0],data=user.data(),key=keyOf(data.username);if(key!==user.id)throw new HttpsError('failed-precondition','Account requires review.');
 const account={username:data.username,key};
 await db.runTransaction(async tx=>{const ref=db.collection('accounts').doc(uid),profile=db.collection('profiles').doc(key);const [a,p]=await Promise.all([tx.get(ref),tx.get(profile)]);if(!a.exists)tx.create(ref,account);if(!p.exists)tx.create(profile,publicProfile(data));});
 return account;
}
exports.registerAccount=onCall(options,async request=>{
 const uid=signedIn(request,false),raw=request.data?.username;
 if(typeof raw!=='string'||!/^@?[\p{L}\p{N}_.-]{10,64}$/u.test(raw))throw new HttpsError('invalid-argument','Invalid username.');
 const username=raw.startsWith('@')?raw:'@'+raw,key=keyOf(username),record=await auth.getUser(uid);
 if(!record.email||!record.providerData.some(p=>p.providerId==='password'))throw new HttpsError('failed-precondition','Email/password required.');
 const data={username,uid,email:record.email,id_number:String(randomInt(100000,1000000)),createdAt:new Date().toISOString()};
 await db.runTransaction(async tx=>{const user=db.collection('users').doc(key),account=db.collection('accounts').doc(uid),profile=db.collection('profiles').doc(key);const [u,a,g]=await Promise.all([tx.get(user),tx.get(account),tx.get(db.collection('groups').doc(key))]);if(u.exists||a.exists||g.exists)throw new HttpsError('already-exists','Name unavailable.');tx.create(user,data);tx.create(account,{username,key});tx.create(profile,publicProfile(data));});
 return {username,id:data.id_number};
});
exports.ensureAccount=onCall(options,request=>ensureAccount(signedIn(request)));
exports.loginWithUsername=onCall(options,async request=>{
 const {username,id,password}=request.data||{},key=keyOf(username);
 if(typeof username!=='string'||username.length>128||username.includes('/')||typeof password!=='string'||password.length>4096||!/^\d{6}$/.test(String(id||'')))throw new HttpsError('unauthenticated','Invalid credentials.');
 await limit(request,'login:'+key,10);
 const data=(await db.collection('users').doc(key).get()).data(),wanted=Buffer.from(String(id)),stored=Buffer.from(String(data?.id_number||''));
 if(!data?.email||!data?.uid||wanted.length!==stored.length||!timingSafeEqual(wanted,stored))throw new HttpsError('unauthenticated','Invalid credentials.');
 const emulator=process.env.FUNCTIONS_EMULATOR==='true'&&process.env.FIREBASE_AUTH_EMULATOR_HOST;
 const origin=emulator?'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/identitytoolkit.googleapis.com':'https://identitytoolkit.googleapis.com';
 const response=await fetch(origin+'/v1/accounts:signInWithPassword?key='+WEB_API_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.email,password,returnSecureToken:true}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new HttpsError('unauthenticated','Invalid credentials.');
 const result=await response.json();if(result.localId!==data.uid||typeof result.idToken!=='string')throw new HttpsError('unauthenticated','Invalid credentials.');
 const verified=await auth.verifyIdToken(result.idToken);if(verified.uid!==data.uid)throw new HttpsError('unauthenticated','Invalid credentials.');
 return {token:await auth.createCustomToken(data.uid)};
});
exports.recoverAccountDetails=onCall({...options,secrets:[BREVO_API_KEY]},async request=>{
 const email=String(request.data?.email||'').trim().toLowerCase(),language=languageOf(request.data?.language);
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>254)throw new HttpsError('invalid-argument','Invalid email.');
 await limit(request,'recovery-email:'+email,3);await limit(request,'recovery-ip',10);
 let record;try{record=await auth.getUserByEmail(email);}catch(error){if(error.code==='auth/user-not-found')return {sent:true};throw error;}
 let account;try{account=await ensureAccount(record.uid);}catch{return {sent:true};}
 const privateData=(await db.collection('users').doc(account.key).get()).data();if(!privateData?.id_number)return {sent:true};
 const copy=recoveryCopy[language],resetLink=customActionLink(await auth.generatePasswordResetLink(email,{url:'https://doori-messenger.web.app/'}),language);
 const textContent=`${copy.title}\n\n${copy.username}: ${account.username}\n${copy.id}: ${privateData.id_number}\n\n${copy.reset}: ${resetLink}\n\n${copy.note}`;
 const direction=language==='ar'||language==='fa'?'rtl':'ltr';
 const htmlContent=`<div dir="${direction}"><h2>${safe(copy.title)}</h2><p><strong>${safe(copy.username)}:</strong> ${safe(account.username)}</p><p><strong>${safe(copy.id)}:</strong> ${safe(privateData.id_number)}</p><p><a href="${safe(resetLink)}">${safe(copy.reset)}</a></p><p>${safe(copy.note)}</p></div>`;
 await sendBrevo(email,copy,textContent,htmlContent);
 return {sent:true};
});
exports.sendVerificationEmail=onCall({...options,secrets:[BREVO_API_KEY]},async request=>{
 const uid=signedIn(request,false),language=languageOf(request.data?.language);await limit(request,'verification:'+uid,3);
 const record=await auth.getUser(uid);if(!record.email)throw new HttpsError('failed-precondition','Email account required.');
 if(record.emailVerified)return {sent:true,alreadyVerified:true};
 const copy=verificationCopy[language],link=customActionLink(await auth.generateEmailVerificationLink(record.email,{url:'https://doori-messenger.web.app/'}),language),direction=language==='ar'||language==='fa'?'rtl':'ltr';
 const textContent=`${copy.title}\n\n${copy.button}: ${link}\n\n${copy.note}`;
 const htmlContent=`<div dir="${direction}"><h2>${safe(copy.title)}</h2><p><a href="${safe(link)}">${safe(copy.button)}</a></p><p>${safe(copy.note)}</p></div>`;
 await sendBrevo(record.email,copy,textContent,htmlContent);return {sent:true};
});
