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
const videoRemote = document.getElementById('video-remote');
const videoLocal = document.getElementById('video-local');
const videoCallRingingUi = document.getElementById('video-call-ringing-ui');
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

(async () => {
  try {
    // Ruft die TURN-Server-Anmeldedaten mit dem korrekten API-Key ab
    const response = await fetch("https://doorimessenger.metered.live/api/v1/turn/credentials?apiKey=5d690342ab7fc7900677335bddc370bf89ea");
    const iceServers = await response.json();
    
    // Prüfen, ob die API ein gültiges Array zurückgibt
    if (Array.isArray(iceServers)) {
        servers.iceServers = iceServers;
        console.log("Metered.ca TURN-Server erfolgreich geladen:", iceServers);
    } else {
        console.error("Metered API hat kein Array zurückgegeben:", iceServers);
    }
  } catch (error) {
    console.error("Fehler beim Laden der TURN-Server-Anmeldedaten:", error);
  }
})();

// Initialize WebRTC after login
window.initWebRTC = function(username) {
    if (rtcCurrentUser === username) return; // Already initialized
    rtcCurrentUser = username;
    
    // Listen for incoming calls
    window.db.collection('calls')
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
    activeCallId = callId;
    isCaller = false;
    currentCallDocRef = window.db.collection('calls').doc(callId);
    currentCallType = data.callType || 'audio';
    
    currentCallPeer = data.caller;
    startReceiverRingtone();
    
    if (currentCallType === 'video') {
        videoCallName.textContent = data.caller;
        videoCallAvatar.textContent = data.caller.charAt(0).toUpperCase();
        videoCallStatus.textContent = "Eingehender Videoanruf...";
        
        videoAcceptBtn.style.display = 'inline-block';
        videoRejectBtn.style.display = 'inline-block';
        if(videoToggleMicBtn) videoToggleMicBtn.style.display = 'none';
        if(videoToggleCamBtn) videoToggleCamBtn.style.display = 'none';
        videoCallModal.classList.remove('hidden');
    } else {
        callName.textContent = data.caller;
        callAvatar.textContent = data.caller.charAt(0).toUpperCase();
        callStatus.textContent = "Eingehender Anruf...";
        
        acceptCallBtn.style.display = 'inline-block';
        rejectCallBtn.style.display = 'inline-block';
        if(muteCallBtn) muteCallBtn.style.display = 'none';
        if(speakerToggleBtn) { speakerToggleBtn.style.display = 'none'; speakerToggleBtn.style.background = 'rgba(255,255,255,0.15)'; isSpeakerOn = false; }
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
            if (callPrivacy === 'none') { alert("Dieser Benutzer hat Anrufe blockiert."); return; }
            if (callPrivacy === 'contacts') {
                const isContact = window.chatData && window.chatData.contacts && window.chatData.contacts.some(c => c.id.toLowerCase() === receiver.toLowerCase());
                if (!isContact) { alert("Dieser Benutzer erlaubt Anrufe nur von Kontakten."); return; }
            }
        }

        const constraints = type === 'video' ? { video: true, audio: true } : { audio: true };
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        isCaller = true;
        currentCallPeer = receiver;
        startRingbackTone();
        isMuted = false;
        isCamMuted = false;
        
        if (type === 'video') {
            if (videoCallRingingUi) videoCallRingingUi.style.display = 'flex';
            videoCallModal.classList.remove('hidden');
            videoCallName.textContent = receiver;
            videoCallAvatar.textContent = receiver.charAt(0).toUpperCase();
            videoCallStatus.textContent = "Wird angerufen...";
            videoAcceptBtn.style.display = 'none';
            if(videoToggleMicBtn) { videoToggleMicBtn.style.display = 'inline-block'; videoToggleMicBtn.style.background = 'rgba(255,255,255,0.15)'; videoToggleMicBtn.innerHTML = safeHTML('🎙️'); }
            if(videoToggleCamBtn) { videoToggleCamBtn.style.display = 'inline-block'; videoToggleCamBtn.style.background = 'rgba(255,255,255,0.15)'; videoToggleCamBtn.innerHTML = safeHTML('📹'); }
            videoLocal.srcObject = localStream;
        } else {
            callModal.classList.remove('hidden');
            callName.textContent = receiver;
            callAvatar.textContent = receiver.charAt(0).toUpperCase();
            callStatus.textContent = "Wird angerufen...";
            acceptCallBtn.style.display = 'none';
            if(muteCallBtn) { muteCallBtn.style.display = 'inline-block';
                if(speakerToggleBtn) speakerToggleBtn.style.display = 'inline-block'; muteCallBtn.style.background = 'rgba(255,255,255,0.15)'; muteCallBtn.innerHTML = safeHTML('🎙️'); }
            if(speakerCallBtn) { speakerCallBtn.style.display = 'inline-block'; speakerCallBtn.style.background = 'rgba(255,255,255,0.15)'; }
            isSpeaker = false;
        }
        
        peerConnection = new RTCPeerConnection(servers);
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
                    videoCallStatus.textContent = "Verbunden";
                    if (videoCallRingingUi) videoCallRingingUi.style.display = 'none';
                }
                else callStatus.textContent = "Verbunden";
                callStartTime = Date.now();
                currentCallStatus = 'outgoing';
                stopRingbackTone();
            }
            if (data?.status === 'rejected' || data?.status === 'ended') {
                endCall();
            }
        });
        
        currentCallDocRef.collection('receiverCandidates').onSnapshot(snapshot => {
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
        alert("Kamera/Mikrofon-Fehler: " + (error.name || "Unknown") + " - " + (error.message || "Timeout/Blocked"));
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
        const constraints = currentCallType === 'video' ? { video: true, audio: true } : { audio: true };
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        isMuted = false;
        isCamMuted = false;
        
        if (currentCallType === 'video') {
            videoAcceptBtn.style.display = 'none';
            if(videoToggleMicBtn) { videoToggleMicBtn.style.display = 'inline-block'; videoToggleMicBtn.style.background = 'rgba(255,255,255,0.15)'; videoToggleMicBtn.innerHTML = safeHTML('🎙️'); }
            if(videoToggleCamBtn) { videoToggleCamBtn.style.display = 'inline-block'; videoToggleCamBtn.style.background = 'rgba(255,255,255,0.15)'; videoToggleCamBtn.innerHTML = safeHTML('📹'); }
            if(videoSpeakerToggleBtn) { videoSpeakerToggleBtn.style.display = 'inline-block'; videoSpeakerToggleBtn.style.background = 'rgba(255,255,255,0.15)'; }
            videoCallStatus.textContent = "Verbunden";
            if (videoCallRingingUi) videoCallRingingUi.style.display = 'none';
            videoLocal.srcObject = localStream;
        } else {
            acceptCallBtn.style.display = 'none';
            if(muteCallBtn) { muteCallBtn.style.display = 'inline-block'; muteCallBtn.style.background = 'rgba(255,255,255,0.15)'; muteCallBtn.innerHTML = safeHTML('🎙️'); }
            if(speakerCallBtn) { speakerCallBtn.style.display = 'inline-block'; speakerCallBtn.style.background = 'rgba(255,255,255,0.15)'; }
            if(speakerToggleBtn) { speakerToggleBtn.style.display = 'inline-block'; speakerToggleBtn.style.background = 'rgba(255,255,255,0.15)'; }
            isSpeaker = false;
            callStatus.textContent = "Verbunden";
        }
        
        callStartTime = Date.now();
        currentCallStatus = 'incoming';
        
        peerConnection = new RTCPeerConnection(servers);
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
        
        currentCallDocRef.collection('callerCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });
        
    } catch (error) {
        console.error("Accept call error", error);
        alert("Kamera/Mikrofon-Fehler (Annahme): " + (error.name || "Unknown") + " - " + (error.message || "Timeout/Blocked"));
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
    if (activeCallId && currentCallDocRef) {
        currentCallDocRef.update({ status: isCaller ? 'ended' : 'rejected' }).catch(() => {});
    }
    endCall();
}
if (rejectCallBtn) rejectCallBtn.addEventListener('click', handleRejectCall);
if (videoRejectBtn) videoRejectBtn.addEventListener('click', handleRejectCall);

// Mute Toggle
if(muteCallBtn) {
    muteCallBtn.addEventListener('click', () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                isMuted = !isMuted;
                audioTrack.enabled = !isMuted;
                if (isMuted) {
                    muteCallBtn.style.background = '#ff4757';
                    muteCallBtn.innerHTML = safeHTML('<span style="position:relative;">🎙️<span style="position:absolute;left:50%;top:50%;width:2px;height:24px;background:#fff;transform:translate(-50%,-50%) rotate(45deg);"></span></span>');
                } else {
                    muteCallBtn.style.background = 'rgba(255,255,255,0.15)';
                    muteCallBtn.innerHTML = safeHTML('🎙️');
                }
            }
        }
    });
}

// REVERTED: Speaker toggle removed
if(videoToggleMicBtn) {
    videoToggleMicBtn.addEventListener('click', () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                isMuted = !isMuted;
                audioTrack.enabled = !isMuted;
                if (isMuted) {
                    videoToggleMicBtn.style.background = '#ff4757';
                    videoToggleMicBtn.innerHTML = safeHTML('<span style="position:relative;">🎙️<span style="position:absolute;left:50%;top:50%;width:2px;height:24px;background:#fff;transform:translate(-50%,-50%) rotate(45deg);"></span></span>');
                } else {
                    videoToggleMicBtn.style.background = 'rgba(255,255,255,0.15)';
                    videoToggleMicBtn.innerHTML = safeHTML('🎙️');
                }
            }
        }
    });
}
if(videoToggleCamBtn) {
    videoToggleCamBtn.addEventListener('click', () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                isCamMuted = !isCamMuted;
                videoTrack.enabled = !isCamMuted;
                if (isCamMuted) {
                    videoToggleCamBtn.style.background = '#ff4757';
                    videoToggleCamBtn.innerHTML = safeHTML('<span style="position:relative;">📹<span style="position:absolute;left:50%;top:50%;width:2px;height:24px;background:#fff;transform:translate(-50%,-50%) rotate(45deg);"></span></span>');
                } else {
                    videoToggleCamBtn.style.background = 'rgba(255,255,255,0.15)';
                    videoToggleCamBtn.innerHTML = safeHTML('📹');
                }
            }
        }
    });
}


function endCall() {
    stopRingbackTone();
    stopReceiverRingtone();
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
    if (remoteAudio && remoteAudio.srcObject) remoteAudio.srcObject = null;
    if (videoRemote && videoRemote.srcObject) { videoRemote.srcObject = null; }
    if (videoCallRingingUi) videoCallRingingUi.style.display = 'flex';
    currentCallType = 'audio';
    if (videoLocal && videoLocal.srcObject) videoLocal.srcObject = null;
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
        const constraints = type === 'video' ? { video: true, audio: true } : { audio: true };
        groupLocalStream = await navigator.mediaDevices.getUserMedia(constraints);
        
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
        alert("Medienzugriff verweigert oder Gerät nicht gefunden.");
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
        if(videoToggleMicBtn) { videoToggleMicBtn.style.display = 'inline-block'; videoToggleMicBtn.style.background = 'rgba(255,255,255,0.15)'; videoToggleMicBtn.innerHTML = safeHTML('🎙️'); }
        if(videoToggleCamBtn) { videoToggleCamBtn.style.display = 'inline-block'; videoToggleCamBtn.style.background = 'rgba(255,255,255,0.15)'; videoToggleCamBtn.innerHTML = safeHTML('📹'); }
        videoCallStatus.textContent = "Gruppen-Videoanruf";
        videoAcceptBtn.style.display = 'none';
        videoLocal.srcObject = groupLocalStream;
        
        // Setup grid columns dynamically based on participants
        const grid = document.getElementById('video-grid');
        if (grid) grid.innerHTML = safeHTML(''); // Clear previous videos
        
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
