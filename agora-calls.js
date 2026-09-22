// Agora-powered voice and video calls. Firestore is used only for invitations and call state.
(() => {
'use strict';

const $ = id => document.getElementById(id);
const ui = {
  audioButton:$('call-btn'), videoButton:$('video-call-btn'), audioModal:$('call-modal'), videoModal:$('video-call-modal'),
  audioStatus:$('call-status'), videoStatus:$('video-call-status'), audioName:$('call-name'), videoName:$('video-call-name'),
  audioAvatar:$('call-avatar'), videoAvatar:$('video-call-avatar'), ringingAvatar:$('video-ringing-avatar'),
  audioDuration:$('call-duration'), videoDuration:$('video-call-duration'), audioAccept:$('accept-call-btn'), videoAccept:$('video-accept-btn'),
  audioEnd:$('reject-call-btn'), videoEnd:$('video-reject-btn'), audioMute:$('mute-call-btn'), videoMute:$('video-toggle-mic-btn'),
  audioSound:$('speaker-toggle-btn'), videoSound:$('video-speaker-toggle-btn'), videoCamera:$('video-toggle-cam-btn'),
  switchCamera:$('video-switch-camera-btn'), shareScreen:$('video-share-screen-btn'), fullscreen:$('video-fullscreen-btn'),
  videoGrid:$('video-grid'), localVideo:$('video-local'), ringing:$('video-call-ringing-ui'),
  groupModal:$('group-call-modal'), groupName:$('group-call-name'), groupStatus:$('group-call-status'),
  groupRinging:$('group-call-ringing-container'), groupActive:$('group-call-active-container'), groupParticipants:$('group-call-participants'),
  groupAccept:$('group-accept-call-btn'), groupReject:$('group-reject-call-btn'), groupMute:$('group-mute-call-btn'),
  groupSound:$('group-speaker-toggle-btn'), groupLeave:$('group-leave-call-btn')
};

const TEXT = {
 de:{incomingAudio:'Eingehender Sprachanruf …',incomingVideo:'Eingehender Videoanruf …',groupVideo:'Gruppen-Videoanruf',groupAudio:'Gruppenanruf',calling:'Wird angerufen …',connecting:'Verbindung wird hergestellt …',connected:'Verbunden',reconnecting:'Verbindung wird wiederhergestellt …',failed:'Verbindung fehlgeschlagen',encrypted:'Über Agora verschlüsselt',accept:'Annehmen',end:'Auflegen',mute:'Stumm',unmute:'Mikrofon an',speaker:'Ton',soundOff:'Ton aus',camera:'Kamera',cameraOn:'Kamera an',switchCamera:'Wechseln',shareScreen:'Bildschirm',stopShare:'Freigabe stoppen',fullscreen:'Vollbild',voiceCall:'Sprachanruf',videoCall:'Videoanruf',participants:'Teilnehmer',permissionDenied:'Bitte erlaube den Zugriff auf Mikrofon und Kamera in den Browser-Einstellungen.',deviceMissing:'Kein passendes Mikrofon oder keine Kamera gefunden.',callFailed:'Der Anruf konnte nicht aufgebaut werden.',alreadyCalling:'Es läuft bereits ein Anruf.',sdkMissing:'Der Anrufdienst konnte nicht geladen werden.'},
 en:{incomingAudio:'Incoming voice call …',incomingVideo:'Incoming video call …',groupVideo:'Group video call',groupAudio:'Group call',calling:'Calling …',connecting:'Establishing connection …',connected:'Connected',reconnecting:'Restoring connection …',failed:'Connection failed',encrypted:'Encrypted through Agora',accept:'Accept',end:'End call',mute:'Mute',unmute:'Unmute',speaker:'Sound',soundOff:'Sound off',camera:'Camera',cameraOn:'Camera on',switchCamera:'Switch',shareScreen:'Screen',stopShare:'Stop sharing',fullscreen:'Full screen',voiceCall:'Voice call',videoCall:'Video call',participants:'Participants',permissionDenied:'Please allow microphone and camera access in your browser settings.',deviceMissing:'No suitable microphone or camera was found.',callFailed:'The call could not be established.',alreadyCalling:'A call is already in progress.',sdkMissing:'The calling service could not be loaded.'},
 ar:{incomingAudio:'مكالمة صوتية واردة …',incomingVideo:'مكالمة فيديو واردة …',groupVideo:'مكالمة فيديو جماعية',groupAudio:'مكالمة جماعية',calling:'جارٍ الاتصال …',connecting:'جارٍ إنشاء الاتصال …',connected:'متصل',reconnecting:'جارٍ استعادة الاتصال …',failed:'فشل الاتصال',encrypted:'مشفّر عبر Agora',accept:'قبول',end:'إنهاء',mute:'كتم',unmute:'تشغيل الميكروفون',speaker:'الصوت',soundOff:'إيقاف الصوت',camera:'الكاميرا',cameraOn:'تشغيل الكاميرا',switchCamera:'تبديل',shareScreen:'الشاشة',stopShare:'إيقاف المشاركة',fullscreen:'ملء الشاشة',voiceCall:'مكالمة صوتية',videoCall:'مكالمة فيديو',participants:'المشاركون',permissionDenied:'يرجى السماح بالوصول إلى الميكروفون والكاميرا من إعدادات المتصفح.',deviceMissing:'لم يتم العثور على ميكروفون أو كاميرا مناسبة.',callFailed:'تعذر إنشاء المكالمة.',alreadyCalling:'توجد مكالمة جارية بالفعل.',sdkMissing:'تعذر تحميل خدمة المكالمات.'},
 fa:{incomingAudio:'تماس صوتی ورودی …',incomingVideo:'تماس تصویری ورودی …',groupVideo:'تماس تصویری گروهی',groupAudio:'تماس گروهی',calling:'در حال تماس …',connecting:'در حال برقراری ارتباط …',connected:'متصل',reconnecting:'در حال بازیابی ارتباط …',failed:'ارتباط ناموفق بود',encrypted:'رمزگذاری‌شده با Agora',accept:'پذیرفتن',end:'پایان تماس',mute:'بی‌صدا',unmute:'روشن کردن میکروفون',speaker:'صدا',soundOff:'قطع صدا',camera:'دوربین',cameraOn:'روشن کردن دوربین',switchCamera:'تغییر',shareScreen:'صفحه‌نمایش',stopShare:'پایان اشتراک‌گذاری',fullscreen:'تمام‌صفحه',voiceCall:'تماس صوتی',videoCall:'تماس تصویری',participants:'شرکت‌کنندگان',permissionDenied:'لطفاً دسترسی به میکروفون و دوربین را در تنظیمات مرورگر مجاز کنید.',deviceMissing:'میکروفون یا دوربین مناسبی پیدا نشد.',callFailed:'برقراری تماس ممکن نشد.',alreadyCalling:'یک تماس هم‌اکنون در حال اجرا است.',sdkMissing:'سرویس تماس بارگیری نشد.'},
 tr:{incomingAudio:'Gelen sesli arama …',incomingVideo:'Gelen görüntülü arama …',groupVideo:'Grup görüntülü araması',groupAudio:'Grup araması',calling:'Aranıyor …',connecting:'Bağlantı kuruluyor …',connected:'Bağlandı',reconnecting:'Bağlantı yeniden kuruluyor …',failed:'Bağlantı başarısız',encrypted:'Agora ile şifreli',accept:'Kabul et',end:'Kapat',mute:'Sessize al',unmute:'Mikrofonu aç',speaker:'Ses',soundOff:'Sesi kapat',camera:'Kamera',cameraOn:'Kamerayı aç',switchCamera:'Değiştir',shareScreen:'Ekran',stopShare:'Paylaşımı durdur',fullscreen:'Tam ekran',voiceCall:'Sesli arama',videoCall:'Görüntülü arama',participants:'Katılımcı',permissionDenied:'Lütfen tarayıcı ayarlarından mikrofon ve kamera erişimine izin verin.',deviceMissing:'Uygun mikrofon veya kamera bulunamadı.',callFailed:'Arama kurulamadı.',alreadyCalling:'Zaten devam eden bir arama var.',sdkMissing:'Arama hizmeti yüklenemedi.'}
};
const lang=()=>['de','en','ar','fa','tr'].includes(window.currentLang)?window.currentLang:'de';
const text=key=>(TEXT[lang()]||TEXT.en)[key]||TEXT.en[key]||key;
let audioStatusKey='incomingAudio',videoStatusKey='incomingVideo';
function translateCalls(){
 document.querySelectorAll('[data-call-i18n]').forEach(el=>{el.textContent=text(el.dataset.callI18n);});
 document.querySelectorAll('[data-call-i18n-title]').forEach(el=>{const value=text(el.dataset.callI18nTitle);el.title=value;el.setAttribute('aria-label',value);});
 if(ui.audioStatus)ui.audioStatus.textContent=text(audioStatusKey);if(ui.videoStatus)ui.videoStatus.textContent=text(videoStatusKey);
 const count=$('group-call-participants-count');if(count)count.textContent=`${count.dataset.count||0} ${text('participants')}`;
}
function status(key,type=call.type){if(type==='video'){videoStatusKey=key;if(ui.videoStatus)ui.videoStatus.textContent=text(key);}else{audioStatusKey=key;if(ui.audioStatus)ui.audioStatus.textContent=text(key);}}
function show(button,visible){if(!button)return;button.classList.toggle('hidden-control',!visible);button.style.display=visible?'':'none';}
function label(button,key,stateClass){if(!button)return;button.classList.toggle('disabled',stateClass==='disabled');button.classList.toggle('active',stateClass==='active');button.setAttribute('aria-pressed',stateClass?'true':'false');const el=button.querySelector('[data-call-i18n]');if(el){el.dataset.callI18n=key;el.textContent=text(key);}button.dataset.callI18nTitle=key;button.title=text(key);}
function initials(name){return String(name||'#').replace(/^@/,'').charAt(0).toUpperCase()||'#';}
function mediaError(error){if(error?.code==='PERMISSION_DENIED'||error?.name==='NotAllowedError'||error?.name==='SecurityError')return text('permissionDenied');if(error?.code==='NOT_FOUND'||error?.name==='NotFoundError')return text('deviceMissing');return text('callFailed');}
window.addEventListener('doori-language-change',translateCalls);translateCalls();

let currentUser=null,incomingUnsubscribe=null,callDocUnsubscribe=null,client=null,localAudio=null,localVideo=null,screenVideo=null;
let timer=null,timeout=null,ending=false,soundMuted=false,cameraIndex=0,groupParticipantsUnsubscribe=null;
const remoteAudio=new Map(),remoteVideo=new Map();
const call={id:null,ref:null,type:'audio',peer:null,outgoing:false,scope:'direct',groupId:null,start:null,status:null};
const resetCall=()=>Object.assign(call,{id:null,ref:null,type:'audio',peer:null,outgoing:false,scope:'direct',groupId:null,start:null,status:null});

function formatDuration(seconds){const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
function updateTimer(){const value=formatDuration(call.start?Math.max(0,Math.floor((Date.now()-call.start)/1000)):0);if(ui.audioDuration)ui.audioDuration.textContent=value;if(ui.videoDuration)ui.videoDuration.textContent=value;}
function startTimer(){if(!call.start)call.start=Date.now();clearInterval(timer);clearTimeout(timeout);timer=setInterval(updateTimer,1000);updateTimer();}
function unansweredTimer(){clearTimeout(timeout);timeout=setTimeout(()=>finish(true),60000);}

function showIncoming(data,id){
 if(call.id&&call.id!==id){window.db.collection('calls').doc(id).update({status:'rejected',endedAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});return;}
 Object.assign(call,{id,ref:window.db.collection('calls').doc(id),type:data.callType||'audio',peer:data.caller,outgoing:false,scope:'direct',status:'calling'});
 bindCallDoc();
 if(call.type==='video'){prepareDirectGrid();setPeerUI(data.caller,'video');status('incomingVideo','video');incomingControls('video');ui.videoModal.classList.remove('hidden');}
 else{setPeerUI(data.caller,'audio');status('incomingAudio','audio');incomingControls('audio');ui.audioModal.classList.remove('hidden');}
}
function setPeerUI(peer,type){const initial=initials(peer);if(type==='video'){ui.videoName.textContent=peer;ui.videoAvatar.textContent=initial;if(ui.ringingAvatar)ui.ringingAvatar.textContent=initial;}else{ui.audioName.textContent=peer;ui.audioAvatar.textContent=initial;}}
function incomingControls(type){
 if(type==='video'){show(ui.videoAccept,true);show(ui.videoEnd,true);[ui.videoMute,ui.videoCamera,ui.switchCamera,ui.shareScreen,ui.videoSound].forEach(b=>show(b,false));if(ui.ringing)ui.ringing.style.display='flex';}
 else{show(ui.audioAccept,true);show(ui.audioEnd,true);show(ui.audioMute,false);show(ui.audioSound,false);}
}
function activeControls(type){
 if(type==='video'){show(ui.videoAccept,false);show(ui.videoEnd,true);[ui.videoMute,ui.videoCamera,ui.switchCamera,ui.videoSound].forEach(b=>show(b,true));show(ui.shareScreen,!!navigator.mediaDevices?.getDisplayMedia);if(ui.ringing)ui.ringing.style.display='none';}
 else{show(ui.audioAccept,false);show(ui.audioEnd,true);show(ui.audioMute,true);show(ui.audioSound,true);}
}
function prepareDirectGrid(){if(!ui.videoGrid)return;ui.videoGrid.innerHTML='';ui.videoGrid.style.gridTemplateColumns='1fr';const remote=document.createElement('div');remote.id='video-remote';ui.videoGrid.appendChild(remote);}

function tokenFunction(){if(!window.accountFunctions)throw new Error('Functions unavailable');return window.accountFunctions.httpsCallable('getAgoraToken');}
async function joinAgora(scope,id,type){
 if(!window.AgoraRTC)throw new Error('Agora SDK missing');
 const response=await tokenFunction()({scope,id}),access=response.data;
 client=window.AgoraRTC.createClient({mode:'rtc',codec:'vp8'});
 client.on('user-published',async(user,mediaType)=>{await client.subscribe(user,mediaType);if(mediaType==='audio'){remoteAudio.set(user.uid,user.audioTrack);user.audioTrack.setVolume(soundMuted?0:100);user.audioTrack.play();}else if(type==='video'){remoteVideo.set(user.uid,user.videoTrack);const target=scope==='group'?ensureGroupVideoTarget(user.uid):$('video-remote');user.videoTrack.play(target);}});
 client.on('user-unpublished',(user,mediaType)=>{if(mediaType==='audio')remoteAudio.delete(user.uid);else{remoteVideo.delete(user.uid);$(`agora-video-${cssId(user.uid)}`)?.remove();}});
 client.on('user-left',user=>{remoteAudio.delete(user.uid);remoteVideo.delete(user.uid);$(`agora-video-${cssId(user.uid)}`)?.remove();if(scope==='direct'&&!ending)finish(false);updateGroupCount();});
 client.on('connection-state-change',state=>{if(state==='CONNECTED'){status(scope==='group'?(type==='video'?'groupVideo':'groupAudio'):'connected',type);if(scope==='direct'&&call.status==='connected')startTimer();}else if(state==='RECONNECTING')status('reconnecting',type);else if(state==='DISCONNECTED'&&!ending)status('failed',type);});
 await client.join(access.appId,access.channel,access.token,access.uid);
 localAudio=await window.AgoraRTC.createMicrophoneAudioTrack({AEC:true,ANS:true,AGC:true});
 const tracks=[localAudio];
 if(type==='video'){localVideo=await window.AgoraRTC.createCameraVideoTrack({encoderConfig:'720p_2',facingMode:'user'});tracks.push(localVideo);localVideo.play(ui.localVideo);}
 await client.publish(tracks);
 return access;
}
function cssId(value){return String(value).replace(/[^A-Za-z0-9_-]/g,'_');}
function ensureGroupVideoTarget(uid){let target=$(`agora-video-${cssId(uid)}`);if(!target){target=document.createElement('div');target.id=`agora-video-${cssId(uid)}`;target.className='video-wrapper';ui.videoGrid.appendChild(target);}return target;}

async function checkCallPrivacy(receiver){const snap=await window.db.collection('profiles').doc(String(receiver).toLowerCase()).get();if(!snap.exists)return true;const setting=snap.data().callPrivacy||'all';const translations=window.TRANSLATIONS?.[lang()]||{};if(setting==='none'){alert(translations.err_calls_blocked||text('callFailed'));return false;}if(setting==='contacts'){const ok=window.chatData?.contacts?.some(item=>String(item.id).toLowerCase()===String(receiver).toLowerCase());if(!ok){alert(translations.err_calls_contacts||text('callFailed'));return false;}}return true;}
async function startDirect(type){
 if(call.id||!window.currentChat||!currentUser)return;if(window.currentChat.type==='room'){return window.startGroupCall(window.currentChat,type);}
 if(!window.AgoraRTC){alert(text('sdkMissing'));return;}
 const receiver=window.currentChat.id;if(!await checkCallPrivacy(receiver))return;
 try{
  const ref=window.db.collection('calls').doc();Object.assign(call,{id:ref.id,ref,type,peer:receiver,outgoing:true,scope:'direct',status:'calling'});ending=false;
  await ref.set({caller:currentUser,receiver,callType:type,provider:'agora',status:'calling',timestamp:firebase.firestore.FieldValue.serverTimestamp()});
  setPeerUI(receiver,type);if(type==='video'){prepareDirectGrid();ui.videoModal.classList.remove('hidden');}else ui.audioModal.classList.remove('hidden');activeControls(type);status('calling',type);bindCallDoc();
  await joinAgora('direct',ref.id,type);unansweredTimer();
 }catch(error){console.error('Agora call start failed',error);alert(mediaError(error));await finish(true);}
}
async function accept(){
 if(!call.ref||call.outgoing)return;
 try{activeControls(call.type);status('connecting',call.type);await joinAgora('direct',call.id,call.type);call.status='connected';await call.ref.update({answer:{provider:'agora'},status:'connected'});startTimer();}
 catch(error){console.error('Agora call accept failed',error);alert(mediaError(error));await call.ref.update({status:'rejected',endedAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});await finish(false);}
}
function bindCallDoc(){
 if(callDocUnsubscribe)callDocUnsubscribe();callDocUnsubscribe=call.ref.onSnapshot(snapshot=>{if(!snapshot.exists)return;const data=snapshot.data();call.status=data.status;if(data.status==='connected'){status('connected',call.type);startTimer();}if(['ended','rejected'].includes(data.status)&&!ending)finish(false);});
}

async function recordHistory(){if(!call.peer||!currentUser||!window.db)return;const duration=call.start?Math.floor((Date.now()-call.start)/1000):0;const type=call.start?(call.outgoing?'outgoing':'incoming'):(call.outgoing?'outgoing':'missed');const id=call.id||window.db.collection('users').doc(String(currentUser).toLowerCase()).collection('callHistory').doc().id;await window.db.collection('users').doc(String(currentUser).toLowerCase()).collection('callHistory').doc(id).set({peer:call.peer,type,timestamp:firebase.firestore.FieldValue.serverTimestamp(),duration,seen:false,provider:'agora'}).catch(()=>{});}
async function closeAgora(){
 clearTimeout(timeout);clearInterval(timer);timeout=timer=null;
 if(screenVideo){screenVideo.stop();screenVideo.close();screenVideo=null;}if(localVideo){localVideo.stop();localVideo.close();localVideo=null;}if(localAudio){localAudio.stop();localAudio.close();localAudio=null;}
 remoteAudio.forEach(track=>track.stop());remoteVideo.forEach(track=>track.stop());remoteAudio.clear();remoteVideo.clear();
 if(client){const old=client;client=null;await old.leave().catch(()=>{});}
 if(ui.localVideo)ui.localVideo.innerHTML='';soundMuted=false;updateTimer();
}
async function finish(update=true){
 if(ending)return;ending=true;const previous={...call};
 if(update&&previous.ref)await previous.ref.update({status:previous.outgoing||previous.start?'ended':'rejected',endedAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
 if(previous.scope==='direct')await recordHistory();if(callDocUnsubscribe){callDocUnsubscribe();callDocUnsubscribe=null;}
 await closeAgora();ui.audioModal?.classList.add('hidden');ui.videoModal?.classList.add('hidden');if(ui.ringing)ui.ringing.style.display='flex';resetCall();ending=false;
}

function getActiveAudio(){return localAudio;}
async function toggleMute(button){if(!getActiveAudio())return;const muted=!getActiveAudio().muted;await getActiveAudio().setMuted(muted);label(button,muted,muted?'disabled':'');}
function toggleSound(button){soundMuted=!soundMuted;remoteAudio.forEach(track=>track.setVolume(soundMuted?0:100));label(button,soundMuted,soundMuted?'disabled':'');}
async function toggleCamera(){if(!localVideo)return;const muted=!localVideo.muted;await localVideo.setMuted(muted);label(ui.videoCamera,muted,muted?'disabled':'');}
async function switchCamera(){if(!localVideo)return;try{const cameras=await window.AgoraRTC.getCameras();if(cameras.length<2)return;cameraIndex=(cameraIndex+1)%cameras.length;await localVideo.setDevice(cameras[cameraIndex].deviceId);}catch(error){console.warn('Camera switch failed',error);alert(text('deviceMissing'));}}
async function stopShare(){if(!screenVideo)return;const track=screenVideo;screenVideo=null;await client.unpublish(track).catch(()=>{});track.stop();track.close();if(localVideo){await client.publish(localVideo);localVideo.play(ui.localVideo);}label(ui.shareScreen,'shareScreen','');}
async function shareScreen(){
 if(screenVideo)return stopShare();
 try{const created=await window.AgoraRTC.createScreenVideoTrack({},'disable');screenVideo=Array.isArray(created)?created[0]:created;if(localVideo)await client.unpublish(localVideo);await client.publish(screenVideo);screenVideo.play(ui.localVideo);screenVideo.on('track-ended',stopShare);label(ui.shareScreen,'stopShare','active');}catch(error){if(error?.code!=='PERMISSION_DENIED')console.warn('Screen share failed',error);}
}

window.initWebRTC=username=>{
 if(currentUser===username)return;if(incomingUnsubscribe)incomingUnsubscribe();currentUser=username;
 incomingUnsubscribe=window.db.collection('calls').where('receiver','==',username).onSnapshot(snapshot=>snapshot.docChanges().forEach(change=>{
  if(change.type==='removed')return;const data=change.doc.data();
  if(['ended','rejected'].includes(data.status))window.accountClient?.recordMissedCall?.(change.doc.id,data).catch(()=>{});
  if(change.type!=='added'||data.status!=='calling')return;
  const time=data.timestamp?.toMillis?.()||(data.timestamp?.seconds?data.timestamp.seconds*1000:0);if(time&&Math.abs(Date.now()-time)<60000)showIncoming(data,change.doc.id);
 }));
};

let groupId=null,groupType='audio';
function updateGroupCount(){const count=(client?.remoteUsers?.length||0)+1;const el=$('group-call-participants-count');if(el){el.dataset.count=String(count);el.textContent=`${count} ${text('participants')}`;}if(ui.groupParticipants){ui.groupParticipants.innerHTML='';[currentUser,...((client?.remoteUsers||[]).map(user=>String(user.uid)))].forEach(name=>{const item=document.createElement('div');item.className='call-participant-chip';item.textContent=name;ui.groupParticipants.appendChild(item);});}}
async function leaveGroup(){
 if(!groupId)return;const old=groupId;groupId=null;if(groupParticipantsUnsubscribe){groupParticipantsUnsubscribe();groupParticipantsUnsubscribe=null;}
 await window.db.collection('groups').doc(old).collection('call_participants').doc(currentUser).delete().catch(()=>{});await closeAgora();
 const remaining=await window.db.collection('groups').doc(old).collection('call_participants').get().catch(()=>null);if(remaining?.empty)await window.db.collection('groups').doc(old).update({activeCall:firebase.firestore.FieldValue.delete()}).catch(()=>{});
 ui.groupModal?.classList.add('hidden');ui.videoModal?.classList.add('hidden');resetCall();ending=false;
}
window.startGroupCall=async(group,type='audio')=>{
 if(call.id||groupId)return;groupId=group.id;groupType=type;Object.assign(call,{scope:'group',groupId:group.id,type,status:'connected'});ending=false;
 try{
  if(!group.activeCall?.initiator)await window.db.collection('groups').doc(group.id).update({activeCall:{initiator:currentUser,startTime:Date.now(),type,provider:'agora'}});
  await window.db.collection('groups').doc(group.id).collection('call_participants').doc(currentUser).set({joinedAt:Date.now(),isMuted:false,provider:'agora'});
  if(type==='video'){ui.videoGrid.innerHTML='';setPeerUI(group.name||group.id,'video');ui.videoModal.classList.remove('hidden');activeControls('video');status('groupVideo','video');}
  else{ui.groupName.textContent=group.name||group.id;ui.groupRinging?.classList.add('hidden');ui.groupActive?.classList.remove('hidden');ui.groupAccept.style.display='none';ui.groupReject.style.display='none';ui.groupMute.classList.remove('hidden');ui.groupSound?.classList.remove('hidden');ui.groupLeave.classList.remove('hidden');ui.groupModal.classList.remove('hidden');}
  await joinAgora('group',group.id,type);call.start=Date.now();startTimer();updateGroupCount();
  groupParticipantsUnsubscribe=window.db.collection('groups').doc(group.id).collection('call_participants').onSnapshot(updateGroupCount);
 }catch(error){console.error('Agora group call failed',error);alert(mediaError(error));await leaveGroup();}
};
window.handleGroupCallEnded=id=>{if(groupId===id)leaveGroup();};

$('join-group-call-btn')?.addEventListener('click',()=>{
 const group=window.currentChat;if(group?.type==='room'&&group.activeCall)window.startGroupCall(group,group.activeCall.type||'audio');
});

ui.audioButton?.addEventListener('click',()=>startDirect('audio'));ui.videoButton?.addEventListener('click',()=>startDirect('video'));
ui.audioAccept?.addEventListener('click',accept);ui.videoAccept?.addEventListener('click',accept);ui.audioEnd?.addEventListener('click',()=>finish(true));ui.videoEnd?.addEventListener('click',()=>groupId?leaveGroup():finish(true));
ui.audioMute?.addEventListener('click',()=>toggleMute(ui.audioMute));ui.videoMute?.addEventListener('click',()=>toggleMute(ui.videoMute));ui.audioSound?.addEventListener('click',()=>toggleSound(ui.audioSound));ui.videoSound?.addEventListener('click',()=>toggleSound(ui.videoSound));
ui.videoCamera?.addEventListener('click',toggleCamera);ui.switchCamera?.addEventListener('click',switchCamera);ui.shareScreen?.addEventListener('click',shareScreen);
ui.fullscreen?.addEventListener('click',async()=>{const card=ui.videoModal?.querySelector('.video-call-card');try{if(document.fullscreenElement)await document.exitFullscreen();else await card?.requestFullscreen?.();}catch(error){console.warn('Fullscreen failed',error);}});
ui.groupMute?.addEventListener('click',()=>toggleMute(ui.groupMute));ui.groupSound?.addEventListener('click',()=>toggleSound(ui.groupSound));ui.groupLeave?.addEventListener('click',leaveGroup);
})();
