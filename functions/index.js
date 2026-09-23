'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,Timestamp}=require('firebase-admin/firestore');
const {createHash,randomInt,timingSafeEqual}=require('node:crypto');
const {RtcTokenBuilder,RtcRole}=require('agora-token');
const {createAssistantRouter,LocalFallbackError}=require('./assistant-router');
initializeApp();
const db=getFirestore(),auth=getAuth();
const BREVO_API_KEY=defineSecret('BREVO_API_KEY');
const AGORA_APP_CERTIFICATE=defineSecret('AGORA_APP_CERTIFICATE');
const GROQ_API_KEY=defineSecret('GROQ_API_KEY');
const CLOUDFLARE_API_TOKEN=defineSecret('CLOUDFLARE_API_TOKEN');
const options={region:'europe-west3',maxInstances:10,timeoutSeconds:30,memory:'256MiB'};
const AGORA_APP_ID='275401ea48a74f4b9f9cac0107362c6c'; // Public Agora project identifier.
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
const deletionRequestCopy={
 de:{subject:'Doori Messenger: Konto endgültig löschen',title:'Konto endgültig löschen',warning:'Achtung: Dies löscht dein Konto und alle persönlichen Daten unwiderruflich!',button:'Konto endgültig löschen',note:'Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Konto bleibt sicher.'},
 en:{subject:'Doori Messenger: Delete account permanently',title:'Delete account permanently',warning:'Warning: This will permanently and irreversibly delete your account and all data!',button:'Delete account permanently',note:'If you did not make this request, you can ignore this email. Your account remains safe.'},
 ar:{subject:'Doori Messenger: حذف الحساب نهائياً',title:'حذف الحساب نهائياً',warning:'تحذير: هذا الإجراء سيحذف حسابك وجميع بياناتك بشكل نهائي ولا يمكن التراجع عنه!',button:'حذف الحساب نهائياً',note:'إذا لم تطلب حذف حسابك، يمكنك تجاهل هذه الرسالة بأمان وسيظل حسابك محمياً.'},
 fa:{subject:'Doori Messenger: حذف دائمی حساب کاربری',title:'حذف دائمی حساب کاربری',warning:'هشدار: این اقدام حساب شما و تمام داده‌هایتان را به‌طور برگشت‌ناپذیر و برای همیشه حذف خواهد کرد!',button:'حذف دائمی حساب کاربری',note:'اگر شما این درخواست را نداده‌اید، می‌توانید این ایمیل را نادیده بگیرید. حساب شما امن باقی می‌ماند.'},
 tr:{subject:'Doori Messenger: Hesabı kalıcı olarak sil',title:'Hesabı kalıcı olarak sil',warning:'Uyarı: Bu işlem hesabınızı ve tüm verilerinizi geri alınamaz şekilde kalıcı olarak silecektir!',button:'Hesabı kalıcı olarak sil',note:'Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz. Hesabınız güvende kalacaktır.'}
};
const deletionCompletedCopy={
 de:{subject:'Doori Messenger: Dein Account wurde gelöscht',title:'Account gelöscht',message:'Dein Konto bei Doori Messenger wurde erfolgreich und endgültig gelöscht. Alle deine persönlichen Daten und Chats wurden entfernt. Wir danken dir für deine Zeit bei uns.'},
 en:{subject:'Doori Messenger: Your account has been deleted',title:'Account deleted',message:'Your Doori Messenger account has been successfully and permanently deleted. All your personal data and chats have been removed. Thank you for using Doori Messenger.'},
 ar:{subject:'Doori Messenger: تم حذف حسابك',title:'تم حذف الحساب',message:'تم حذف حسابك في Doori Messenger بنجاح وبشكل نهائي. تمت إزالة جميع بياناتك ومحادثاتك. شكراً لاستخدامك Doori Messenger.'},
 fa:{subject:'Doori Messenger: حساب کاربری شما حذف شد',title:'حساب کاربری حذف شد',message:'حساب کاربری Doori Messenger شما با موفقیت و برای همیشه حذف شد. تمامی اطلاعات شخصی و گفتگوهای شما پاک گردید. با سپاس از شما.'},
 tr:{subject:'Doori Messenger: Hesabınız silindi',title:'Hesap silindi',message:'Doori Messenger hesabınız başarıyla ve kalıcı olarak silindi. Tüm kişisel verileriniz ve sohbetleriniz kaldırıldı. Doori Messenger’ı kullandığınız için teşekkür ederiz.'}
};
function languageOf(value){return recoveryCopy[value]?value:'en';}
function customDeletionLink(token,language){
 const target=new URL('https://doori-messenger.de/account/action');
 target.searchParams.set('mode','deleteAccount');target.searchParams.set('token',token);target.searchParams.set('lang',language);
 return target.toString();
}
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
async function reserveDailyAssistantBudget(provider,max){
 const day=new Date().toISOString().slice(0,10),ref=db.collection('_assistantBudgets').doc(`${provider}-${day}`);
 return db.runTransaction(async tx=>{const snapshot=await tx.get(ref),count=Number(snapshot.data()?.count||0);if(count>=max)return false;tx.set(ref,{count:count+1,day,updatedAt:Timestamp.now()});return true;});
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
exports.getAgoraToken=onCall({...options,secrets:[AGORA_APP_CERTIFICATE]},async request=>{
 const uid=signedIn(request),scope=String(request.data?.scope||''),id=String(request.data?.id||'');
 if(!['direct','group'].includes(scope)||!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw new HttpsError('invalid-argument','Invalid call scope.');
 await limit(request,'agora-token:'+uid,30);
 const account=await ensureAccount(uid);
 if(scope==='direct'){
  const call=await db.collection('calls').doc(id).get();
  if(!call.exists)throw new HttpsError('not-found','Call not found.');
  const data=call.data();
  if(![data.caller,data.receiver].map(keyOf).includes(account.key)||!['calling','connected'].includes(data.status))throw new HttpsError('permission-denied','Not a call participant.');
 }else{
  const group=await db.collection('groups').doc(id).get();
  if(!group.exists)throw new HttpsError('not-found','Group not found.');
  const data=group.data(),members=data.members||{};
  const isMember=Array.isArray(members)?members.map(keyOf).includes(account.key):Object.prototype.hasOwnProperty.call(members,account.key);
  if(!isMember||!data.activeCall)throw new HttpsError('permission-denied','No active group call.');
 }
 const channel='doori_'+(scope==='direct'?'d':'g')+'_'+createHash('sha256').update(id).digest('hex').slice(0,32);
 const expiresIn=60*60;
 const token=RtcTokenBuilder.buildTokenWithUserAccount(AGORA_APP_ID,AGORA_APP_CERTIFICATE.value(),channel,account.key,RtcRole.PUBLISHER,expiresIn,expiresIn);
 return {appId:AGORA_APP_ID,token,channel,uid:account.key,expiresIn};
});
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
exports.requestAccountDeletion=onCall({...options,secrets:[BREVO_API_KEY]},async request=>{
 const uid=signedIn(request,false),language=languageOf(request.data?.language);await limit(request,'deletion:'+uid,3);
 const record=await auth.getUser(uid);if(!record.email)throw new HttpsError('failed-precondition','Email account required.');
 const token=createHash('sha256').update(uid+':'+Date.now()+':'+randomInt(100000,999999)).digest('hex');
 await db.collection('accountDeletionRequests').doc(token).set({uid,email:record.email,createdAt:Timestamp.now(),expiresAt:Timestamp.fromMillis(Date.now()+60*60*1000)});
 const copy=deletionRequestCopy[language],link=customDeletionLink(token,language),direction=language==='ar'||language==='fa'?'rtl':'ltr';
 const textContent=`${copy.title}\n\n${copy.warning}\n\n${copy.button}: ${link}\n\n${copy.note}`;
 const htmlContent=`<div dir="${direction}"><h2>${safe(copy.title)}</h2><p style="color:#d63031;font-weight:bold;font-size:15px;">${safe(copy.warning)}</p><p style="margin:24px 0;"><a href="${safe(link)}" style="display:inline-block;padding:14px 24px;background-color:#d63031;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:8px;font-size:16px;">${safe(copy.button)}</a></p><p style="color:#777;font-size:13px;">${safe(copy.note)}</p></div>`;
 await sendBrevo(record.email,copy,textContent,htmlContent);return {sent:true};
});
exports.confirmAccountDeletion=onCall({...options,secrets:[BREVO_API_KEY]},async request=>{
 const token=String(request.data?.token||'').trim(),language=languageOf(request.data?.language);
 if(!/^[a-f0-9]{64}$/.test(token))throw new HttpsError('invalid-argument','Invalid token.');
 await limit(request,'confirm-deletion',10);
 const tokenRef=db.collection('accountDeletionRequests').doc(token);
 const tokenDoc=await tokenRef.get();
 if(!tokenDoc.exists)throw new HttpsError('not-found','Invalid or expired deletion token.');
 const tokenData=tokenDoc.data();
 if(tokenData.expiresAt.toMillis()<Date.now()){await tokenRef.delete();throw new HttpsError('deadline-exceeded','Deletion token expired.');}
 const {uid,email}=tokenData;
 const accountSnap=await db.collection('accounts').doc(uid).get();
 const key=accountSnap.exists?accountSnap.data().key:null;
 const batch=db.batch();
 batch.delete(tokenRef);
 if(accountSnap.exists)batch.delete(accountSnap.ref);
 if(key){
  batch.delete(db.collection('users').doc(key));
  batch.delete(db.collection('profiles').doc(key));
  batch.delete(db.collection('presence').doc(key));
  batch.delete(db.collection('userData').doc(key));
 }
 await batch.commit();
 try{await auth.deleteUser(uid);}catch(err){if(err.code!=='auth/user-not-found')console.error('Delete user auth error',err);}
 const copy=deletionCompletedCopy[language],direction=language==='ar'||language==='fa'?'rtl':'ltr';
 const textContent=`${copy.title}\n\n${copy.message}`;
 const htmlContent=`<div dir="${direction}"><h2>${safe(copy.title)}</h2><p style="font-size:15px;line-height:1.6;">${safe(copy.message)}</p></div>`;
 try{await sendBrevo(email,copy,textContent,htmlContent);}catch(mailErr){console.error('Final deletion email error',mailErr);}
 return {success:true};
});

exports.askDooriAssistant=onCall({...options,secrets:[GROQ_API_KEY,CLOUDFLARE_API_TOKEN]},async request=>{
 const uid=signedIn(request);
 await limit(request,'assistant-user:'+uid,20);
 const rawMessages=Array.isArray(request.data?.messages)?request.data.messages:[];
 if(rawMessages.length<1||rawMessages.length>10)throw new HttpsError('invalid-argument','Invalid assistant context.');
 const messages=rawMessages.map(message=>({role:message?.role==='assistant'?'assistant':'user',content:String(message?.content||'')}));
 if(messages.some(message=>!message.content.trim()||message.content.length>2000))throw new HttpsError('invalid-argument','Invalid assistant message.');
 const language=['de','en','ar','fa','tr'].includes(request.data?.language)?request.data.language:'auto';
 const router=createAssistantRouter({
  groqKey:GROQ_API_KEY.value(),
  cloudflareToken:CLOUDFLARE_API_TOKEN.value(),
  allowGroq:true,
  allowCloudflare:true,
  beforeProvider:provider=>reserveDailyAssistantBudget(provider,provider==='groq'?100:3)
 });
 try{return await router({messages,language});}
 catch(error){
  if(error instanceof LocalFallbackError||error?.code==='LOCAL_FALLBACK_REQUIRED')return {localFallback:true};
  console.error('Assistant request failed without provider details');
  return {localFallback:true};
 }
});
