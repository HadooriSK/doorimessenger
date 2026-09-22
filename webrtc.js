// webrtc.js - WebRTC Voice Calling Logic
const rtcCallBtn = document.getElementById('call-btn');
const callModal = document.getElementById('call-modal');
const callStatus = document.getElementById('call-status');
const callAvatar = document.getElementById('call-avatar');
const callName = document.getElementById('call-name');
const acceptCallBtn = document.getElementById('accept-call-btn');
const rejectCallBtn = document.getElementById('reject-call-btn');
const muteCallBtn = document.getElementById('mute-call-btn');
const speakerToggleBtn = document.getElementById('speaker-toggle-btn');
const videoSpeakerToggleBtn = document.getElementById('video-speaker-toggle-btn');
let isSpeakerOn = false;
const speakerCallBtn = document.getElementById('speaker-call-btn');
const remoteAudio = document.getElementById('remote-audio');
const videoCallBtn = document.getElementById('video-call-btn');
const videoCallModal = document.getElementById('video-call-modal');
const videoCallStatus = document.getElementById('video-call-status');
const videoCallAvatar = document.getElementById('video-call-avatar');
const videoCallName = document.getElementById('video-call-name');
const videoAcceptBtn = document.getElementById('video-accept-btn');
const videoRejectBtn = document.getElementById('video-reject-btn');
const videoToggleCamBtn = document.getElementById('video-toggle-cam-btn');
const videoToggleMicBtn = document.getElementById('video-toggle-mic-btn');
const videoSwitchCameraBtn = document.getElementById('video-switch-camera-btn');
const videoShareScreenBtn = document.getElementById('video-share-screen-btn');
const videoFullscreenBtn = document.getElementById('video-fullscreen-btn');
const videoRemote = document.getElementById('video-remote');
const videoLocal = document.getElementById('video-local');
const videoCallRingingUi = document.getElementById('video-call-ringing-ui');
const videoRingingAvatar = document.getElementById('video-ringing-avatar');
const callDuration = document.getElementById('call-duration');
const videoCallDuration = document.getElementById('video-call-duration');
let currentCallType = 'audio';
let isCamMuted = false;

let peerConnection;
let localStream;
let activeCallId = null;
let isCaller = false;
let callUnsubscribe = null;
let currentCallDocRef = null;
let rtcCurrentUser = null;
let isMuted = false;
let isSpeaker = false;
let callStartTime = null;
let currentCallPeer = null; // The other person's username
let currentCallStatus = null; // 'missed', 'incoming', 'outgoing'
let incomingCallsUnsubscribe = null;
let callerCandidatesUnsubscribe = null;
let receiverCandidatesUnsubscribe = null;
let callDurationInterval = null;
let unansweredCallTimeout = null;
let cameraFacingMode = 'user';
let isScreenSharing = false;
let cameraTrackBeforeShare = null;
let audioStatusKey = 'incomingAudio';
let videoStatusKey = 'incomingVideo';

const CALL_TRANSLATIONS = {
    de: { incomingAudio:'Eingehender Sprachanruf …', incomingVideo:'Eingehender Videoanruf …', groupVideo:'Gruppen-Videoanruf', calling:'Wird angerufen …', connecting:'Verbindung wird hergestellt …', connected:'Verbunden', reconnecting:'Verbindung wird wiederhergestellt …', failed:'Verbindung fehlgeschlagen', encrypted:'WebRTC-verschlüsselt', accept:'Annehmen', end:'Auflegen', mute:'Stumm', unmute:'Mikrofon an', speaker:'Ton', soundOff:'Ton aus', camera:'Kamera', cameraOn:'Kamera an', switchCamera:'Wechseln', shareScreen:'Bildschirm', stopShare:'Freigabe stoppen', fullscreen:'Vollbild', voiceCall:'Sprachanruf', videoCall:'Videoanruf', participants:'Teilnehmer', permissionDenied:'Bitte erlaube den Zugriff auf Mikrofon und Kamera in den Browser-Einstellungen.', deviceMissing:'Kein passendes Mikrofon oder keine Kamera gefunden.', callFailed:'Der Anruf konnte nicht aufgebaut werden.', alreadyCalling:'Es läuft bereits ein Anruf.', turnFallback:'Relay-Server nicht erreichbar; direkter Verbindungsversuch läuft.' },
    en: { incomingAudio:'Incoming voice call …', incomingVideo:'Incoming video call …', groupVideo:'Group video call', calling:'Calling …', connecting:'Establishing connection …', connected:'Connected', reconnecting:'Restoring connection …', failed:'Connection failed', encrypted:'WebRTC encrypted', accept:'Accept', end:'End call', mute:'Mute', unmute:'Unmute', speaker:'Sound', soundOff:'Sound off', camera:'Camera', cameraOn:'Camera on', switchCamera:'Switch', shareScreen:'Screen', stopShare:'Stop sharing', fullscreen:'Full screen', voiceCall:'Voice call', videoCall:'Video call', participants:'Participants', permissionDenied:'Please allow microphone and camera access in your browser settings.', deviceMissing:'No suitable microphone or camera was found.', callFailed:'The call could not be established.', alreadyCalling:'A call is already in progress.', turnFallback:'Relay server unavailable; trying a direct connection.' },
    ar: { incomingAudio:'مكالمة صوتية واردة …', incomingVideo:'مكالمة فيديو واردة …', groupVideo:'مكالمة فيديو جماعية', calling:'جارٍ الاتصال …', connecting:'جارٍ إنشاء الاتصال …', connected:'متصل', reconnecting:'جارٍ استعادة الاتصال …', failed:'فشل الاتصال', encrypted:'مشفّر عبر WebRTC', accept:'قبول', end:'إنهاء', mute:'كتم', unmute:'تشغيل الميكروفون', speaker:'الصوت', soundOff:'إيقاف الصوت', camera:'الكاميرا', cameraOn:'تشغيل الكاميرا', switchCamera:'تبديل', shareScreen:'الشاشة', stopShare:'إيقاف المشاركة', fullscreen:'ملء الشاشة', voiceCall:'مكالمة صوتية', videoCall:'مكالمة فيديو', participants:'المشاركون', permissionDenied:'يرجى السماح بالوصول إلى الميكروفون والكاميرا من إعدادات المتصفح.', deviceMissing:'لم يتم العثور على ميكروفون أو كاميرا مناسبة.', callFailed:'تعذر إنشاء المكالمة.', alreadyCalling:'توجد مكالمة جارية بالفعل.', turnFallback:'خادم الترحيل غير متاح؛ تتم محاولة اتصال مباشر.' },
    fa: { incomingAudio:'تماس صوتی ورودی …', incomingVideo:'تماس تصویری ورودی …', groupVideo:'تماس تصویری گروهی', calling:'در حال تماس …', connecting:'در حال برقراری ارتباط …', connected:'متصل', reconnecting:'در حال بازیابی ارتباط …', failed:'ارتباط ناموفق بود', encrypted:'رمزگذاری‌شده با WebRTC', accept:'پذیرفتن', end:'پایان تماس', mute:'بی‌صدا', unmute:'روشن کردن میکروفون', speaker:'صدا', soundOff:'قطع صدا', camera:'دوربین', cameraOn:'روشن کردن دوربین', switchCamera:'تغییر', shareScreen:'صفحه‌نمایش', stopShare:'پایان اشتراک‌گذاری', fullscreen:'تمام‌صفحه', voiceCall:'تماس صوتی', videoCall:'تماس تصویری', participants:'شرکت‌کنندگان', permissionDenied:'لطفاً دسترسی به میکروفون و دوربین را در تنظیمات مرورگر مجاز کنید.', deviceMissing:'میکروفون یا دوربین مناسبی پیدا نشد.', callFailed:'برقراری تماس ممکن نشد.', alreadyCalling:'یک تماس هم‌اکنون در حال اجرا است.', turnFallback:'سرور واسط در دسترس نیست؛ اتصال مستقیم امتحان می‌شود.' },
    tr: { incomingAudio:'Gelen sesli arama …', incomingVideo:'Gelen görüntülü arama …', groupVideo:'Grup görüntülü araması', calling:'Aranıyor …', connecting:'Bağlantı kuruluyor …', connected:'Bağlandı', reconnecting:'Bağlantı yeniden kuruluyor …', failed:'Bağlantı başarısız', encrypted:'WebRTC ile şifreli', accept:'Kabul et', end:'Kapat', mute:'Sessize al', unmute:'Mikrofonu aç', speaker:'Ses', soundOff:'Sesi kapat', camera:'Kamera', cameraOn:'Kamerayı aç', switchCamera:'Değiştir', shareScreen:'Ekran', stopShare:'Paylaşımı durdur', fullscreen:'Tam ekran', voiceCall:'Sesli arama', videoCall:'Görüntülü arama', participants:'Katılımcı', permissionDenied:'Lütfen tarayıcı ayarlarından mikrofon ve kamera erişimine izin verin.', deviceMissing:'Uygun mikrofon veya kamera bulunamadı.', callFailed:'Arama kurulamadı.', alreadyCalling:'Zaten devam eden bir arama var.', turnFallback:'Aktarma sunucusuna ulaşılamıyor; doğrudan bağlantı deneniyor.' }
};

function callLanguage() { return ['de','en','ar','fa','tr'].includes(window.currentLang) ? window.currentLang : 'de'; }
function callText(key) { return (CALL_TRANSLATIONS[callLanguage()] || CALL_TRANSLATIONS.en)[key] || CALL_TRANSLATIONS.en[key] || key; }
function applyCallLanguage() {
    document.querySelectorAll('[data-call-i18n]').forEach(el => { el.textContent = callText(el.dataset.callI18n); });
    document.querySelectorAll('[data-call-i18n-title]').forEach(el => { const value = callText(el.dataset.callI18nTitle); el.title = value; el.setAttribute('aria-label', value); });
    if (callStatus) callStatus.textContent = callText(audioStatusKey);
    if (videoCallStatus) videoCallStatus.textContent = callText(videoStatusKey);
    const participantCount = document.getElementById('group-call-participants-count');
    if (participantCount) participantCount.textContent = `${participantCount.dataset.count || '0'} ${callText('participants')}`;
}
function setCallStatus(key, type = currentCallType) {
    if (type === 'video') { videoStatusKey = key; if (videoCallStatus) videoCallStatus.textContent = callText(key); }
    else { audioStatusKey = key; if (callStatus) callStatus.textContent = callText(key); }
}
function showCallControl(button, visible) {
    if (!button) return;
    button.classList.toggle('hidden-control', !visible);
    button.style.display = visible ? '' : 'none';
}
function ensureDirectVideoGrid() {
    const grid = document.getElementById('video-grid');
    if (!grid || !videoRemote) return;
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = '1fr';
    grid.appendChild(videoRemote);
}
function getActiveLocalStream() {
    return (typeof activeGroupCallId !== 'undefined' && activeGroupCallId && typeof groupLocalStream !== 'undefined') ? groupLocalStream : localStream;
}
function setControlState(button, disabled, activeKey, normalKey) {
    if (!button) return;
    button.classList.toggle('disabled', !!disabled);
    button.classList.toggle('active', !disabled && activeKey === 'speaker');
    button.setAttribute('aria-pressed', disabled ? 'true' : 'false');
    const label = button.querySelector('[data-call-i18n]');
    const key = disabled ? activeKey : normalKey;
    if (label) { label.dataset.callI18n = key; label.textContent = callText(key); }
    button.dataset.callI18nTitle = key;
    button.title = callText(key);
    button.setAttribute('aria-label', callText(key));
}
window.addEventListener('doori-language-change', applyCallLanguage);
applyCallLanguage();

// Ringback Tone Synthesis
let ringbackAudioContext = null;
let ringbackOscillator = null;
let ringbackGainNode = null;
let ringbackInterval = null;

function playRingPattern() {
    if (!ringbackAudioContext || !ringbackGainNode) return;
    const now = ringbackAudioContext.currentTime;
    ringbackGainNode.gain.setValueAtTime(0, now);
    ringbackGainNode.gain.linearRampToValueAtTime(0.1, now + 0.1);
    ringbackGainNode.gain.setValueAtTime(0.1, now + 1.0);
    ringbackGainNode.gain.linearRampToValueAtTime(0, now + 1.1);
}

function startRingbackTone() {
    stopRingbackTone();
    try {
        ringbackAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        ringbackGainNode = ringbackAudioContext.createGain();
        ringbackGainNode.connect(ringbackAudioContext.destination);
        ringbackGainNode.gain.value = 0;
        
        ringbackOscillator = ringbackAudioContext.createOscillator();
        ringbackOscillator.type = 'sine';
        ringbackOscillator.frequency.value = 425;
        ringbackOscillator.connect(ringbackGainNode);
        ringbackOscillator.start();
        
        playRingPattern();
        ringbackInterval = setInterval(playRingPattern, 5000);
    } catch(e) { console.error("Ringback tone failed", e); }
}

function stopRingbackTone() {
    if (ringbackInterval) { clearInterval(ringbackInterval); ringbackInterval = null; }
    if (ringbackOscillator) {
        try { ringbackOscillator.stop(); ringbackOscillator.disconnect(); } catch(e){}
        ringbackOscillator = null;
    }
    if (ringbackGainNode) {
        try { ringbackGainNode.disconnect(); } catch(e){}
        ringbackGainNode = null;
    }
    if (ringbackAudioContext) {
        try { ringbackAudioContext.close(); } catch(e){}
        ringbackAudioContext = null;
    }
}

// Receiver Ringtone Synthesis
let receiverAudioContext = null;
let receiverOscillator = null;
let receiverGainNode = null;
let receiverInterval = null;

function playReceiverRingPattern() {
    const soundSetting = document.getElementById('setting-sound');
    if (soundSetting && !soundSetting.checked) return;
    if (!receiverAudioContext) return;
    if (receiverAudioContext.state === 'suspended') return;
    
    let now = receiverAudioContext.currentTime;
    
    // Classic Musical Ringtone (Nokia-style)
    const melody = [
        {f: 1318.5, d: 0.15}, {f: 1174.7, d: 0.15}, {f: 740.0, d: 0.3}, {f: 830.6, d: 0.3},
        {f: 1108.7, d: 0.15}, {f: 987.8, d: 0.15}, {f: 587.3, d: 0.3}, {f: 659.3, d: 0.3},
        {f: 987.8, d: 0.15}, {f: 880.0, d: 0.15}, {f: 554.4, d: 0.3}, {f: 659.3, d: 0.3},
        {f: 880.0, d: 0.6}
    ];
    
    melody.forEach(note => {
        const osc = receiverAudioContext.createOscillator();
        const gain = receiverAudioContext.createGain();
        osc.type = 'triangle'; // Musical, music-box like sound
        osc.frequency.value = note.f;
        
        osc.connect(gain);
        gain.connect(receiverAudioContext.destination);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.d - 0.02);
        
        osc.start(now);
        osc.stop(now + note.d);
        
        now += note.d;
    });
}

function startReceiverRingtone() {
    stopReceiverRingtone();
    try {
        receiverAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        playReceiverRingPattern();
        receiverInterval = setInterval(playReceiverRingPattern, 4500);
    } catch(e) { console.error("Receiver ringtone failed", e); }
}

function stopReceiverRingtone() {
    if (receiverInterval) { clearInterval(receiverInterval); receiverInterval = null; }
    if (receiverAudioContext) {
        try { receiverAudioContext.close(); } catch(e){}
        receiverAudioContext = null;
    }
}

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

const iceServersReady = (async () => {
  try {
    // Ruft die TURN-Server-Anmeldedaten mit dem korrekten API-Key ab
    const response = await fetch("https://doorimessenger.metered.live/api/v1/turn/credentials?apiKey=5d690342ab7fc7900677335bddc370bf89ea");
    const iceServers = await response.json();
    
    // Prüfen, ob die API ein gültiges Array zurückgibt
    if (Array.isArray(iceServers)) {
        servers.iceServers = iceServers;
        console.info("TURN relay configuration loaded.");
    } else {
        console.error("TURN API returned an invalid configuration.");
    }
  } catch (error) {
    console.warn(callText('turnFallback'), error);
  }
})();

async function createCallPeerConnection() {
    await Promise.race([iceServersReady, new Promise(resolve => setTimeout(resolve, 5000))]);
    const connection = new RTCPeerConnection(servers);
    connection.addEventListener('connectionstatechange', () => {
        if (connection !== peerConnection) return;
        if (connection.connectionState === 'connected') {
            setCallStatus('connected');
            startCallDuration();
            stopRingbackTone();
        } else if (connection.connectionState === 'disconnected' || connection.connectionState === 'connecting') {
            setCallStatus('reconnecting');
        } else if (connection.connectionState === 'failed') {
            setCallStatus('failed');
        }
    });
    return connection;
}

function formatCallDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours ? `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}` : `${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}
function updateCallDuration() {
    const value = formatCallDuration(callStartTime ? Math.max(0, Math.floor((Date.now() - callStartTime) / 1000)) : 0);
    if (callDuration) callDuration.textContent = value;
    if (videoCallDuration) videoCallDuration.textContent = value;
}
function startCallDuration() {
    if (!callStartTime) callStartTime = Date.now();
    if (unansweredCallTimeout) { clearTimeout(unansweredCallTimeout); unansweredCallTimeout = null; }
    if (callDurationInterval) clearInterval(callDurationInterval);
    updateCallDuration();
    callDurationInterval = setInterval(updateCallDuration, 1000);
}
function startUnansweredTimeout() {
    if (unansweredCallTimeout) clearTimeout(unansweredCallTimeout);
    unansweredCallTimeout = setTimeout(() => {
        if (currentCallDocRef && isCaller && !callStartTime) currentCallDocRef.update({ status: 'ended', endedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
        endCall();
    }, 60000);
}

// Initialize WebRTC after login
window.initWebRTC = function(username) {
    if (rtcCurrentUser === username) return; // Already initialized
    if (incomingCallsUnsubscribe) incomingCallsUnsubscribe();
    rtcCurrentUser = username;
    
    // Listen for incoming calls
    incomingCallsUnsubscribe = window.db.collection('calls')
        .where('receiver', '==', rtcCurrentUser)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type !== 'removed') {
                    window.accountClient.recordMissedCall(change.doc.id, change.doc.data())
                        .catch(error => console.error('Missed call history failed', error));
                }
                if (change.type === 'added') {
                    const callData = change.doc.data();
                    if (callData.status === 'calling') {
                        let isOldCall = false;
                        if (!callData.timestamp) {
                            isOldCall = true;
                        } else {
                            const timeMs = callData.timestamp.toMillis ? callData.timestamp.toMillis() : (callData.timestamp.seconds ? callData.timestamp.seconds * 1000 : NaN);
                            if (isNaN(timeMs) || Math.abs(Date.now() - timeMs) > 60000) isOldCall = true;
                        }
                        if (!isOldCall) {
                            showIncomingCall(change.doc.id, callData);
                        }
                    }
                }
            });
        });
};

function showIncomingCall(callId, data) {
    if (activeCallId && activeCallId !== callId) {
        window.db.collection('calls').doc(callId).update({ status: 'rejected', endedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
        return;
    }
    activeCallId = callId;
    isCaller = false;
    currentCallDocRef = window.db.collection('calls').doc(callId);
    currentCallType = data.callType || 'audio';
    
    currentCallPeer = data.caller;
    startReceiverRingtone();
    
    if (currentCallType === 'video') {
        ensureDirectVideoGrid();
        videoCallName.textContent = data.caller;
        videoCallAvatar.textContent = data.caller.charAt(0).toUpperCase();
        if (videoRingingAvatar) videoRingingAvatar.textContent = data.caller.charAt(0).toUpperCase();
        setCallStatus('incomingVideo', 'video');
        
        showCallControl(videoAcceptBtn, true);
        showCallControl(videoRejectBtn, true);
        showCallControl(videoToggleMicBtn, false);
        showCallControl(videoToggleCamBtn, false);
        showCallControl(videoSwitchCameraBtn, false);
        showCallControl(videoShareScreenBtn, false);
        showCallControl(videoSpeakerToggleBtn, false);
        videoCallModal.classList.remove('hidden');
    } else {
        callName.textContent = data.caller;
        callAvatar.textContent = data.caller.charAt(0).toUpperCase();
        setCallStatus('incomingAudio', 'audio');
        
        showCallControl(acceptCallBtn, true);
        showCallControl(rejectCallBtn, true);
        showCallControl(muteCallBtn, false);
        if(speakerToggleBtn) { showCallControl(speakerToggleBtn, false); isSpeakerOn = false; }
        if(speakerCallBtn) speakerCallBtn.style.display = 'none';
        callModal.classList.remove('hidden');
    }
    
    // Listen for call cancellation by caller
    callUnsubscribe = currentCallDocRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const d = doc.data();
        if (d.status === 'ended' || d.status === 'rejected') {
            endCall();
        }
    });
}

async function initiateCall(type) {
    if (!window.currentChat || !rtcCurrentUser) return;
    if (activeCallId) { alert(callText('alreadyCalling')); return; }
    
    if (window.currentChat.type === 'room') {
        window.startGroupCall(window.currentChat, type);
        return;
    }

    const receiver = window.currentChat.id;
    const caller = rtcCurrentUser;
    currentCallType = type;
    
    try {
        const receiverProfileSnap = await window.db.collection('profiles').doc(receiver.toLowerCase()).get();
        if (receiverProfileSnap.exists) {
            const receiverProfile = receiverProfileSnap.data();
            const callPrivacy = receiverProfile.callPrivacy || 'all';
            if (callPrivacy === 'none') { alert((window.TRANSLATIONS?.[callLanguage()] || {}).err_calls_blocked || callText('callFailed')); return; }
            if (callPrivacy === 'contacts') {
                const isContact = window.chatData && window.chatData.contacts && window.chatData.contacts.some(c => c.id.toLowerCase() === receiver.toLowerCase());
                if (!isContact) { alert((window.TRANSLATIONS?.[callLanguage()] || {}).err_calls_contacts || callText('callFailed')); return; }
            }
        }

        const constraints = type === 'video' ? { video: { facingMode: { ideal: cameraFacingMode } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } } : { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        isCaller = true;
        currentCallPeer = receiver;
        startRingbackTone();
        isMuted = false;
        isCamMuted = false;
        
        if (type === 'video') {
            ensureDirectVideoGrid();
            if (videoCallRingingUi) videoCallRingingUi.style.display = 'flex';
            videoCallModal.classList.remove('hidden');
            videoCallName.textContent = receiver;
            videoCallAvatar.textContent = receiver.charAt(0).toUpperCase();
            if (videoRingingAvatar) videoRingingAvatar.textContent = receiver.charAt(0).toUpperCase();
            setCallStatus('calling', 'video');
            showCallControl(videoAcceptBtn, false);
            showCallControl(videoRejectBtn, true);
            showCallControl(videoToggleMicBtn, true);
            showCallControl(videoToggleCamBtn, true);
            showCallControl(videoSwitchCameraBtn, true);
            showCallControl(videoShareScreenBtn, !!navigator.mediaDevices.getDisplayMedia);
            showCallControl(videoSpeakerToggleBtn, true);
            setControlState(videoToggleMicBtn, false, 'unmute', 'mute');
            setControlState(videoToggleCamBtn, false, 'cameraOn', 'camera');
            videoLocal.srcObject = localStream;
        } else {
            callModal.classList.remove('hidden');
            callName.textContent = receiver;
            callAvatar.textContent = receiver.charAt(0).toUpperCase();
            setCallStatus('calling', 'audio');
            showCallControl(acceptCallBtn, false);
            showCallControl(rejectCallBtn, true);
            if(muteCallBtn) { showCallControl(muteCallBtn, true);
                if(speakerToggleBtn) showCallControl(speakerToggleBtn, true); setControlState(muteCallBtn, false, 'unmute', 'mute'); }
            if(speakerCallBtn) { speakerCallBtn.style.display = 'inline-block'; speakerCallBtn.style.background = 'rgba(255,255,255,0.15)'; }
            isSpeaker = false;
        }
        
        peerConnection = await createCallPeerConnection();
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        peerConnection.ontrack = (event) => {
            if (type === 'video') {
                videoRemote.srcObject = event.streams[0];
                videoRemote.play().catch(e => console.error("Play video failed", e));
            } else {
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.play().catch(e => console.error("Play audio failed", e));
            }
        };
        
        currentCallDocRef = window.db.collection('calls').doc();
        activeCallId = currentCallDocRef.id;
        
        let callCreated = false;
        const pendingCallerCandidates = [];
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                const candidate = event.candidate.toJSON();
                if (!callCreated) pendingCallerCandidates.push(candidate);
                else currentCallDocRef.collection('callerCandidates').add(candidate).catch(console.error);
            }
        };
        
        const offerDescription = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offerDescription);
        
        const callData = {
            caller: caller,
            receiver: receiver,
            callType: type,
            offer: { type: offerDescription.type, sdp: offerDescription.sdp },
            status: 'calling',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await currentCallDocRef.set(callData);
        startUnansweredTimeout();
        callCreated = true;
        await Promise.all(pendingCallerCandidates.map(candidate => currentCallDocRef.collection('callerCandidates').add(candidate)));
        
        let iceCandidateQueue = [];
        let isAnswerProcessed = false;
        
        callUnsubscribe = currentCallDocRef.onSnapshot(doc => {
            const data = doc.data();
            if (!isAnswerProcessed && data?.answer) {
                isAnswerProcessed = true;
                const answerDescription = new RTCSessionDescription(data.answer);
                peerConnection.setRemoteDescription(answerDescription).then(() => {
                    iceCandidateQueue.forEach(c => peerConnection.addIceCandidate(c).catch(console.error));
                    iceCandidateQueue = [];
                });
                if (type === 'video') {
                    setCallStatus('connected', 'video');
                    if (videoCallRingingUi) videoCallRingingUi.style.display = 'none';
                }
                else setCallStatus('connected', 'audio');
                startCallDuration();
                currentCallStatus = 'outgoing';
                stopRingbackTone();
            }
            if (data?.status === 'rejected' || data?.status === 'ended') {
                endCall();
            }
        });
        
        receiverCandidatesUnsubscribe = currentCallDocRef.collection('receiverCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    if (peerConnection.remoteDescription) {
                        peerConnection.addIceCandidate(candidate).catch(console.error);
                    } else {
                        iceCandidateQueue.push(candidate);
                    }
                }
            });
        });
        
    } catch (error) {
        console.error('Call failed', error);
        alert(error && (error.name === 'NotAllowedError' || error.name === 'SecurityError') ? callText('permissionDenied') : error && error.name === 'NotFoundError' ? callText('deviceMissing') : callText('callFailed'));
        if(callModal) callModal.classList.add('hidden');
        if(videoCallModal) videoCallModal.classList.add('hidden');
        endCall();
    }
}

if (rtcCallBtn) {
    rtcCallBtn.addEventListener('click', () => initiateCall('audio'));
}
if (videoCallBtn) {
    videoCallBtn.addEventListener('click', () => initiateCall('video'));
}

// Accept Call
async function acceptIncomingCall() {
    try {
        stopReceiverRingtone();
        const constraints = currentCallType === 'video' ? { video: { facingMode: { ideal: cameraFacingMode } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } } : { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        isMuted = false;
        isCamMuted = false;
        
        if (currentCallType === 'video') {
            showCallControl(videoAcceptBtn, false);
            showCallControl(videoRejectBtn, true);
            showCallControl(videoToggleMicBtn, true);
            showCallControl(videoToggleCamBtn, true);
            showCallControl(videoSwitchCameraBtn, true);
            showCallControl(videoShareScreenBtn, !!navigator.mediaDevices.getDisplayMedia);
            showCallControl(videoSpeakerToggleBtn, true);
            setControlState(videoToggleMicBtn, false, 'unmute', 'mute');
            setControlState(videoToggleCamBtn, false, 'cameraOn', 'camera');
            setCallStatus('connecting', 'video');
            if (videoCallRingingUi) videoCallRingingUi.style.display = 'none';
            videoLocal.srcObject = localStream;
        } else {
            showCallControl(acceptCallBtn, false);
            showCallControl(rejectCallBtn, true);
            if(muteCallBtn) { showCallControl(muteCallBtn, true); setControlState(muteCallBtn, false, 'unmute', 'mute'); }
            if(speakerCallBtn) { speakerCallBtn.style.display = 'inline-block'; speakerCallBtn.style.background = 'rgba(255,255,255,0.15)'; }
            if(speakerToggleBtn) { showCallControl(speakerToggleBtn, true); }
            isSpeaker = false;
            setCallStatus('connecting', 'audio');
        }
        
        currentCallStatus = 'incoming';
        
        peerConnection = await createCallPeerConnection();
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        peerConnection.ontrack = (event) => {
            if (currentCallType === 'video') {
                videoRemote.srcObject = event.streams[0];
                videoRemote.play().catch(e => console.error("Play video failed", e));
            } else {
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.play().catch(e => console.error("Play audio failed", e));
            }
        };
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                currentCallDocRef.collection('receiverCandidates').add(event.candidate.toJSON());
            }
        };
        
        const callDoc = await currentCallDocRef.get();
        const callData = callDoc.data();
        
        const offerDescription = new RTCSessionDescription(callData.offer);
        await peerConnection.setRemoteDescription(offerDescription);
        
        const answerDescription = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answerDescription);
        
        await currentCallDocRef.update({ answer: { type: answerDescription.type, sdp: answerDescription.sdp }, status: 'connected' });
        
        callerCandidatesUnsubscribe = currentCallDocRef.collection('callerCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });
        
    } catch (error) {
        console.error("Accept call error", error);
        alert(error && (error.name === 'NotAllowedError' || error.name === 'SecurityError') ? callText('permissionDenied') : error && error.name === 'NotFoundError' ? callText('deviceMissing') : callText('callFailed'));
        if (activeCallId && currentCallDocRef) {
            currentCallDocRef.update({ status: 'rejected' }).catch(() => {});
        }
        endCall();
    }
}

if (acceptCallBtn) acceptCallBtn.addEventListener('click', acceptIncomingCall);
if (videoAcceptBtn) videoAcceptBtn.addEventListener('click', acceptIncomingCall);


// Reject or End Call
function handleRejectCall() {
    if (typeof activeGroupCallId !== 'undefined' && activeGroupCallId) {
        leaveGroupCall();
        return;
    }
    if (activeCallId && currentCallDocRef) {
        currentCallDocRef.update({ status: isCaller ? 'ended' : 'rejected', endedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
    }
    endCall();
}
if (rejectCallBtn) rejectCallBtn.addEventListener('click', handleRejectCall);
if (videoRejectBtn) videoRejectBtn.addEventListener('click', handleRejectCall);

// Mute Toggle
if(muteCallBtn) {
    muteCallBtn.addEventListener('click', () => {
        const activeStream = getActiveLocalStream();
        if (activeStream) {
            const audioTrack = activeStream.getAudioTracks()[0];
            if (audioTrack) {
                isMuted = !isMuted;
                audioTrack.enabled = !isMuted;
                setControlState(muteCallBtn, isMuted, 'unmute', 'mute');
            }
        }
    });
}

if(videoToggleMicBtn) {
    videoToggleMicBtn.addEventListener('click', () => {
        const activeStream = getActiveLocalStream();
        if (activeStream) {
            const audioTrack = activeStream.getAudioTracks()[0];
            if (audioTrack) {
                isMuted = !isMuted;
                audioTrack.enabled = !isMuted;
                setControlState(videoToggleMicBtn, isMuted, 'unmute', 'mute');
            }
        }
    });
}
if(videoToggleCamBtn) {
    videoToggleCamBtn.addEventListener('click', () => {
        const activeStream = getActiveLocalStream();
        if (activeStream) {
            const videoTrack = activeStream.getVideoTracks()[0];
            if (videoTrack) {
                isCamMuted = !isCamMuted;
                videoTrack.enabled = !isCamMuted;
                setControlState(videoToggleCamBtn, isCamMuted, 'cameraOn', 'camera');
            }
        }
    });
}

function toggleRemoteSound(mediaElement, button) {
    if (!button) return;
    if (typeof activeGroupCallId !== 'undefined' && activeGroupCallId && currentCallType === 'video') {
        const remoteVideos = [...document.querySelectorAll('#video-grid video')];
        const shouldMute = remoteVideos.some(video => !video.muted);
        remoteVideos.forEach(video => { video.muted = shouldMute; });
        isSpeakerOn = !shouldMute;
        setControlState(button, shouldMute, 'soundOff', 'speaker');
        return;
    }
    if (!mediaElement) return;
    mediaElement.muted = !mediaElement.muted;
    isSpeakerOn = !mediaElement.muted;
    setControlState(button, mediaElement.muted, 'soundOff', 'speaker');
}
if (speakerToggleBtn) speakerToggleBtn.addEventListener('click', () => toggleRemoteSound(remoteAudio, speakerToggleBtn));
if (videoSpeakerToggleBtn) videoSpeakerToggleBtn.addEventListener('click', () => toggleRemoteSound(videoRemote, videoSpeakerToggleBtn));

async function replaceOutgoingVideoTrack(nextTrack) {
    if (!nextTrack) return;
    if (typeof activeGroupCallId !== 'undefined' && activeGroupCallId && typeof groupPeerConnections !== 'undefined') {
        await Promise.all(Object.values(groupPeerConnections).map(async connection => {
            const sender = connection.getSenders().find(item => item.track && item.track.kind === 'video');
            if (sender) await sender.replaceTrack(nextTrack);
        }));
        return;
    }
    if (!peerConnection) return;
    const sender = peerConnection.getSenders().find(item => item.track && item.track.kind === 'video');
    if (sender) await sender.replaceTrack(nextTrack);
}

if (videoSwitchCameraBtn) {
    videoSwitchCameraBtn.addEventListener('click', async () => {
        const activeStream = getActiveLocalStream();
        if (!activeStream || isScreenSharing) return;
        try {
            const nextFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacingMode } }, audio: false });
            const nextTrack = cameraStream.getVideoTracks()[0];
            await replaceOutgoingVideoTrack(nextTrack);
            const oldTrack = activeStream.getVideoTracks()[0];
            if (oldTrack) { activeStream.removeTrack(oldTrack); oldTrack.stop(); }
            activeStream.addTrack(nextTrack);
            cameraFacingMode = nextFacingMode;
            videoLocal.srcObject = activeStream;
        } catch (error) {
            console.warn('Camera switch failed', error);
            alert(callText('deviceMissing'));
        }
    });
}

async function stopScreenShare() {
    if (!isScreenSharing) return;
    isScreenSharing = false;
    const activeStream = getActiveLocalStream();
    if (cameraTrackBeforeShare && cameraTrackBeforeShare.readyState === 'live') {
        await replaceOutgoingVideoTrack(cameraTrackBeforeShare).catch(() => {});
        videoLocal.srcObject = activeStream;
    }
    cameraTrackBeforeShare = null;
    if (videoShareScreenBtn) {
        videoShareScreenBtn.classList.remove('active');
        videoShareScreenBtn.setAttribute('aria-pressed', 'false');
        const label = videoShareScreenBtn.querySelector('[data-call-i18n]');
        if (label) { label.dataset.callI18n = 'shareScreen'; label.textContent = callText('shareScreen'); }
    }
}
if (videoShareScreenBtn) {
    videoShareScreenBtn.addEventListener('click', async () => {
        if (isScreenSharing) { await stopScreenShare(); return; }
        const activeStream = getActiveLocalStream();
        if (!navigator.mediaDevices.getDisplayMedia || !activeStream) return;
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            const displayTrack = displayStream.getVideoTracks()[0];
            cameraTrackBeforeShare = activeStream.getVideoTracks()[0] || null;
            await replaceOutgoingVideoTrack(displayTrack);
            isScreenSharing = true;
            videoLocal.srcObject = displayStream;
            displayTrack.addEventListener('ended', () => stopScreenShare());
            videoShareScreenBtn.classList.add('active');
            videoShareScreenBtn.setAttribute('aria-pressed', 'true');
            const label = videoShareScreenBtn.querySelector('[data-call-i18n]');
            if (label) { label.dataset.callI18n = 'stopShare'; label.textContent = callText('stopShare'); }
        } catch (error) {
            if (error && error.name !== 'NotAllowedError') console.warn('Screen share failed', error);
        }
    });
}
if (videoFullscreenBtn) {
    videoFullscreenBtn.addEventListener('click', async () => {
        const card = videoCallModal && videoCallModal.querySelector('.video-call-card');
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (card?.requestFullscreen) await card.requestFullscreen();
        } catch (error) { console.warn('Fullscreen failed', error); }
    });
}


function endCall() {
    stopRingbackTone();
    stopReceiverRingtone();
    if (unansweredCallTimeout) { clearTimeout(unansweredCallTimeout); unansweredCallTimeout = null; }
    if (callDurationInterval) { clearInterval(callDurationInterval); callDurationInterval = null; }
    if (callModal) callModal.classList.add('hidden');
    if (videoCallModal) videoCallModal.classList.add('hidden');
    
    // Save to call history
    if (currentCallPeer && rtcCurrentUser && window.db) {
        let duration = 0;
        let type = 'missed';
        
        if (callStartTime) {
            duration = Math.floor((Date.now() - callStartTime) / 1000);
            type = currentCallStatus;
        } else if (isCaller) {
            type = 'outgoing'; // caller hung up before answer
        } else {
            type = 'missed'; // incoming call not answered
        }

        const callRecord = {
            peer: currentCallPeer,
            type: type,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            duration: duration,
            seen: false
        };
        
        // Write to own history
        const myDocId = activeCallId ? activeCallId : window.db.collection('users').doc(rtcCurrentUser.toLowerCase()).collection('callHistory').doc().id;
        window.db.collection('users').doc(rtcCurrentUser.toLowerCase()).collection('callHistory').doc(myDocId).set(callRecord).catch(e => console.error("Call history error", e));
        
        // Recipients recover missed calls from their call documents on their next login.
    }

    callStartTime = null;
    currentCallPeer = null;
    currentCallStatus = null;
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (callUnsubscribe) {
        callUnsubscribe();
        callUnsubscribe = null;
    }
    if (callerCandidatesUnsubscribe) { callerCandidatesUnsubscribe(); callerCandidatesUnsubscribe = null; }
    if (receiverCandidatesUnsubscribe) { receiverCandidatesUnsubscribe(); receiverCandidatesUnsubscribe = null; }
    if (remoteAudio && remoteAudio.srcObject) remoteAudio.srcObject = null;
    if (remoteAudio) remoteAudio.muted = false;
    if (videoRemote && videoRemote.srcObject) { videoRemote.srcObject = null; }
    if (videoRemote) videoRemote.muted = false;
    if (videoCallRingingUi) videoCallRingingUi.style.display = 'flex';
    currentCallType = 'audio';
    if (videoLocal && videoLocal.srcObject) videoLocal.srcObject = null;
    isMuted = false;
    isCamMuted = false;
    isSpeakerOn = false;
    isScreenSharing = false;
    cameraTrackBeforeShare = null;
    updateCallDuration();
    setControlState(muteCallBtn, false, 'unmute', 'mute');
    setControlState(videoToggleMicBtn, false, 'unmute', 'mute');
    setControlState(videoToggleCamBtn, false, 'cameraOn', 'camera');
    setControlState(speakerToggleBtn, false, 'soundOff', 'speaker');
    setControlState(videoSpeakerToggleBtn, false, 'soundOff', 'speaker');
    if (videoShareScreenBtn) videoShareScreenBtn.classList.remove('active');
    activeCallId = null;
    currentCallDocRef = null;
}

// =========================================================
// GROUP CALL LOGIC (WebRTC Mesh)
// =========================================================

let groupPeerConnections = {};
let groupLocalStream = null;
let activeGroupCallId = null;
let groupCallUnsubscribe = null;
let groupSignalsUnsubscribe = null;
let groupCallTimerInterval = null;

// UI Elements
const groupCallModal = document.getElementById('group-call-modal');
const groupCallName = document.getElementById('group-call-name');
const groupCallRingingContainer = document.getElementById('group-call-ringing-container');
const groupCallActiveContainer = document.getElementById('group-call-active-container');
const groupCallInitiator = document.getElementById('group-call-initiator');
const groupCallParticipantsContainer = document.getElementById('group-call-participants');
const groupAcceptBtn = document.getElementById('group-accept-call-btn');
const groupRejectBtn = document.getElementById('group-reject-call-btn');
const groupMuteBtn = document.getElementById('group-mute-call-btn');
const groupSpeakerBtn = document.getElementById('group-speaker-call-btn');
const groupLeaveBtn = document.getElementById('group-leave-call-btn');
const groupRemoteAudios = document.getElementById('group-remote-audios');
// REVERTED: Speaker functionality removed

// 1. App triggers this when a user clicks the call button in a group
window.startGroupCall = async function(group, type = 'audio') {
    if (!rtcCurrentUser || activeGroupCallId) return;
    
    try {
        const constraints = type === 'video' ? { video: { facingMode: { ideal: cameraFacingMode } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } } : { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
        groupLocalStream = await navigator.mediaDevices.getUserMedia(constraints);
        await Promise.race([iceServersReady, new Promise(resolve => setTimeout(resolve, 5000))]);
        
        activeGroupCallId = group.id;
        currentCallType = type;
        if (groupCallName) groupCallName.textContent = group.name;
        
        // Update group document to signal active call if not joining an existing one
        if (!group.activeCall || !group.activeCall.initiator) {
            await window.db.collection('groups').doc(group.id).update({
                activeCall: {
                    initiator: rtcCurrentUser,
                    startTime: Date.now(),
                    type: type
                }
            });
        }
        
        showActiveGroupCallUI(type);
        await joinGroupCallMesh(group.id);
        
    } catch (e) {
        console.error("Fehler beim Starten des Gruppenanrufs:", e);
        alert(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? callText('permissionDenied') : e && e.name === 'NotFoundError' ? callText('deviceMissing') : callText('callFailed'));
    }
};

// Global Listener for Join Banner
document.addEventListener('DOMContentLoaded', () => {
    const joinBtn = document.getElementById('join-group-call-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            if (window.currentChat && window.currentChat.activeCall) {
                window.startGroupCall(window.currentChat, window.currentChat.activeCall.type || 'audio');
            }
        });
    }
});

window.handleGroupCallEnded = function(groupId) {
    if (activeGroupCallId === groupId) {
        leaveGroupCall();
    }
};

function showActiveGroupCallUI(type) {
    if (type === 'video') {
        videoCallModal.classList.remove('hidden');
        showCallControl(videoToggleMicBtn, true);
        showCallControl(videoToggleCamBtn, true);
        showCallControl(videoSwitchCameraBtn, true);
        showCallControl(videoShareScreenBtn, !!navigator.mediaDevices.getDisplayMedia);
        showCallControl(videoSpeakerToggleBtn, true);
        showCallControl(videoAcceptBtn, false);
        showCallControl(videoRejectBtn, true);
        setControlState(videoToggleMicBtn, false, 'unmute', 'mute');
        setControlState(videoToggleCamBtn, false, 'cameraOn', 'camera');
        setCallStatus('groupVideo', 'video');
        if (videoCallRingingUi) videoCallRingingUi.style.display = 'none';
        videoLocal.srcObject = groupLocalStream;
        
        // Setup grid columns dynamically based on participants
        const grid = document.getElementById('video-grid');
        if (grid) { grid.innerHTML = safeHTML(''); grid.style.gridTemplateColumns = '1fr'; } // Clear previous videos
        
        isMuted = false;
        isCamMuted = false;
        
    } else {
        groupCallRingingContainer.classList.add('hidden');
        groupCallActiveContainer.classList.remove('hidden');
        
        groupAcceptBtn.style.display = 'none';
        groupRejectBtn.style.display = 'none';
        groupMuteBtn.classList.remove('hidden');
        if (groupSpeakerBtn) groupSpeakerBtn.classList.remove('hidden');
        groupLeaveBtn.classList.remove('hidden');
        
        groupIsSpeaker = false;
        if (groupSpeakerBtn) groupSpeakerBtn.style.background = 'rgba(255,255,255,0.15)';
        
        groupCallModal.classList.remove('hidden');
        
        let seconds = 0;
        const statusEl = document.getElementById('group-call-status');
        if(groupCallTimerInterval) clearInterval(groupCallTimerInterval);
        groupCallTimerInterval = setInterval(() => {
            seconds++;
            statusEl.textContent = `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
        }, 1000);
    }
}

let pendingCandidates = {};

// 3. WebRTC Mesh Logic
async function joinGroupCallMesh(groupId) {
    const participantsRef = window.db.collection('groups').doc(groupId).collection('call_participants');
    const signalsRef = window.db.collection('groups').doc(groupId).collection('call_signals');
    
    // Add self to participants
    await participantsRef.doc(rtcCurrentUser).set({
        joinedAt: Date.now(),
        isMuted: false
    });
    
    // Listen to participants to render UI and detect newcomers
    groupCallUnsubscribe = participantsRef.onSnapshot(snapshot => {
        groupCallParticipantsContainer.innerHTML = safeHTML('');
        let count = 0;
        snapshot.docs.forEach(doc => {
            count++;
            const p = doc.data();
            const username = doc.id;
            
            const badge = document.createElement('div');
            badge.style.padding = '8px 12px';
            badge.style.borderRadius = '20px';
            badge.style.background = p.isMuted ? 'rgba(255,0,0,0.2)' : 'rgba(46, 213, 115, 0.2)';
            badge.style.display = 'flex';
            badge.style.alignItems = 'center';
            badge.style.gap = '8px';
            badge.innerHTML = safeHTML(`<span>${username}</span><span>${p.isMuted ? '🔇' : '🎙️'}</span>`);
            groupCallParticipantsContainer.appendChild(badge);
        });
        const participantCount = document.getElementById('group-call-participants-count');
        if (participantCount) {
            participantCount.dataset.count = String(count);
            participantCount.textContent = `${count} ${callText('participants')}`;
        }
        if (count === 1 && snapshot.docs[0] && snapshot.docs[0].id === rtcCurrentUser) {
            // we are the only one left, maybe end call?
        }
        
        // Ensure PC exists for all participants
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const peerId = change.doc.id;
                if (peerId !== rtcCurrentUser) {
                    // Create PC early if it doesn't exist to queue candidates
                    createPeerConnection(peerId, false, signalsRef);
                }
            }
        });
    });

    // Fetch existing participants to create offers
    const existing = await participantsRef.get();
    existing.docs.forEach(doc => {
        const peerId = doc.id;
        if (peerId !== rtcCurrentUser) {
            createPeerConnection(peerId, true, signalsRef);
        }
    });

    // Listen to incoming signals
    groupSignalsUnsubscribe = signalsRef.where('to', '==', rtcCurrentUser).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
                const signal = change.doc.data();
                const peerId = signal.from;
                const pc = createPeerConnection(peerId, false, signalsRef);
                
                try {
                    if (signal.type === 'offer') {
                        if (pc.signalingState !== 'stable') {
                            console.warn("Got offer but state is", pc.signalingState);
                            // Avoid crash, just ignore or recreate
                        } else {
                            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.data)));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            signalsRef.add({ from: rtcCurrentUser, to: peerId, type: 'answer', data: JSON.stringify(answer) });
                        }
                    } 
                    else if (signal.type === 'answer') {
                        if (pc.signalingState === 'have-local-offer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.data)));
                        } else {
                            console.warn("Got answer but state is", pc.signalingState);
                        }
                    } 
                    else if (signal.type === 'candidate') {
                        const candidate = new RTCIceCandidate(JSON.parse(signal.data));
                        if (pc.remoteDescription) {
                            await pc.addIceCandidate(candidate);
                        } else {
                            if (!pendingCandidates[peerId]) pendingCandidates[peerId] = [];
                            pendingCandidates[peerId].push(candidate);
                        }
                    }
                    
                    // Process queued candidates if remote description is now set
                    if (pc.remoteDescription && pendingCandidates[peerId] && pendingCandidates[peerId].length > 0) {
                        for (let c of pendingCandidates[peerId]) {
                            await pc.addIceCandidate(c).catch(e => console.error("Queued ICE error", e));
                        }
                        pendingCandidates[peerId] = [];
                    }
                } catch (e) {
                    console.error("Signal processing error:", e);
                }
            }
        });
    });
}

function createPeerConnection(peerId, isInitiator, signalsRef) {
    if (groupPeerConnections[peerId]) {
        // If we are forcing an offer but PC exists, we can still create offer below
        if (!isInitiator) return groupPeerConnections[peerId];
        // But if it exists and we are initiator, usually we just return it. 
        // Wait, if it exists, it means onSnapshot created it first.
        // We still need to create the offer if isInitiator is true and it hasn't been created!
    }
    
    let pc = groupPeerConnections[peerId];
    if (!pc) {
        pc = new RTCPeerConnection(servers);
        groupPeerConnections[peerId] = pc;
        pendingCandidates[peerId] = [];
        
        if (groupLocalStream) {
            groupLocalStream.getTracks().forEach(track => pc.addTrack(track, groupLocalStream));
        }
        
        pc.onicecandidate = event => {
            if (event.candidate) {
                signalsRef.add({
                    from: rtcCurrentUser,
                    to: peerId,
                    type: 'candidate',
                    data: JSON.stringify(event.candidate)
                });
            }
        };
        
        pc.ontrack = event => {
            if (currentCallType === 'video') {
                const grid = document.getElementById('video-grid');
                if (grid) {
                    let videoEl = document.getElementById(`video-remote-${peerId}`);
                    if (!videoEl) {
                        videoEl = document.createElement('video');
                        videoEl.id = `video-remote-${peerId}`;
                        videoEl.autoplay = true;
                        videoEl.playsInline = true;
                        videoEl.style.width = '100%';
                        videoEl.style.height = '100%';
                        videoEl.style.objectFit = 'cover';
                        videoEl.style.borderRadius = '8px';
                        
                        const wrapper = document.createElement('div');
                        wrapper.className = 'video-wrapper';
                        wrapper.style.position = 'relative';
                        wrapper.style.width = '100%';
                        wrapper.style.height = '100%';
                        wrapper.appendChild(videoEl);
                        grid.appendChild(wrapper);
                        
                        // Dynamically update grid columns based on children count
                        const count = grid.children.length;
                        if (count === 1) grid.style.gridTemplateColumns = '1fr';
                        else if (count === 2) grid.style.gridTemplateColumns = '1fr 1fr';
                        else if (count <= 4) grid.style.gridTemplateColumns = '1fr 1fr';
                        else grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
                    }
                    videoEl.srcObject = event.streams[0];
                }
            } else {
                let audioEl = document.getElementById(`audio-${peerId}`);
                if (!audioEl) {
                    audioEl = document.createElement('audio');
                    audioEl.id = `audio-${peerId}`;
                    audioEl.autoplay = true;
                    groupRemoteAudios.appendChild(audioEl);
                }
                audioEl.srcObject = event.streams[0];
            }
        };
        
        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                removePeerConnection(peerId);
            }
        };
    }
    
    if (isInitiator && pc.signalingState === 'stable') {
        pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            signalsRef.add({
                from: rtcCurrentUser,
                to: peerId,
                type: 'offer',
                data: JSON.stringify(offer)
            });
        }).catch(e => console.error("Create offer error", e));
    }
    
    return pc;
}

function removePeerConnection(peerId) {
    if (groupPeerConnections[peerId]) {
        groupPeerConnections[peerId].close();
        delete groupPeerConnections[peerId];
    }
    const audioEl = document.getElementById(`audio-${peerId}`);
    if (audioEl) audioEl.remove();
    
    const videoEl = document.getElementById(`video-remote-${peerId}`);
    if (videoEl && videoEl.parentElement) {
        videoEl.parentElement.remove();
        // Update grid columns
        const grid = document.getElementById('video-grid');
        if (grid) {
            const count = grid.children.length;
            if (count === 1) grid.style.gridTemplateColumns = '1fr';
            else if (count === 2) grid.style.gridTemplateColumns = '1fr 1fr';
            else if (count <= 4) grid.style.gridTemplateColumns = '1fr 1fr';
            else grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        }
    }
}

async function leaveGroupCall() {
    stopReceiverRingtone();
    if(groupCallTimerInterval) clearInterval(groupCallTimerInterval);
    const statusEl = document.getElementById('group-call-status');
    if (statusEl) statusEl.textContent = (window.TRANSLATIONS && window.TRANSLATIONS[window.currentLang] && window.TRANSLATIONS[window.currentLang].lbl_group_call) || 'Gruppenanruf';

    if (groupLocalStream) {
        groupLocalStream.getTracks().forEach(t => t.stop());
        groupLocalStream = null;
    }
    
    Object.keys(groupPeerConnections).forEach(removePeerConnection);
    
    if (groupCallUnsubscribe) groupCallUnsubscribe();
    if (groupSignalsUnsubscribe) groupSignalsUnsubscribe();
    
    if (activeGroupCallId) {
        const groupId = activeGroupCallId;
        activeGroupCallId = null;
        
        try {
            await window.db.collection('groups').doc(groupId).collection('call_participants').doc(rtcCurrentUser).delete();
            const snapshot = await window.db.collection('groups').doc(groupId).collection('call_participants').get();
            if (snapshot.empty) {
                // We were the last one, end the call
                await window.db.collection('groups').doc(groupId).update({
                    activeCall: firebase.firestore.FieldValue.delete()
                });
            }
        } catch(e) {}
    }
    
    groupCallModal.classList.add('hidden');
    videoCallModal.classList.add('hidden');
    if (videoLocal) videoLocal.srcObject = null;
    ensureDirectVideoGrid();
    if (videoCallRingingUi) videoCallRingingUi.style.display = 'flex';
    isScreenSharing = false;
    cameraTrackBeforeShare = null;
    groupRemoteAudios.innerHTML = safeHTML('');
}

if (groupLeaveBtn) {
    groupLeaveBtn.addEventListener('click', leaveGroupCall);
}

if (groupMuteBtn) {
    groupMuteBtn.addEventListener('click', async () => {
        if (!groupLocalStream) return;
        const audioTrack = groupLocalStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        groupMuteBtn.innerHTML = safeHTML(audioTrack.enabled ? '🎙️' : '🔇');
        groupMuteBtn.style.background = audioTrack.enabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,0,0,0.5)';
        
        if (activeGroupCallId) {
            await window.db.collection('groups').doc(activeGroupCallId).collection('call_participants').doc(rtcCurrentUser).update({
                isMuted: !audioTrack.enabled
            });
        }
    });
}

if (groupSpeakerBtn) {
    groupSpeakerBtn.addEventListener('click', async () => {
        groupIsSpeaker = !groupIsSpeaker;
        const audios = groupRemoteAudios.querySelectorAll('audio');
        for (let audioEl of audios) {
            if (typeof audioEl.setSinkId !== 'undefined') {
                try {
                    await audioEl.setSinkId(groupIsSpeaker ? 'default' : '');
                } catch(e) { console.warn("setSinkId failed", e); }
            }
        }
        groupSpeakerBtn.style.background = groupIsSpeaker ? '#2ed573' : 'rgba(255,255,255,0.15)';
    });
}
