
const doodleContainer = document.getElementById('doodle-container');
const doodleCanvas = document.getElementById('doodle-canvas');
const doodleCtx = doodleCanvas ? doodleCanvas.getContext('2d') : null;

const doodleColorPicker = document.getElementById('doodle-color-picker');
const doodleSizeSlider = document.getElementById('doodle-size-slider');
const doodleColorPresets = document.getElementById('doodle-color-presets');
const doodleBackgroundSelect = document.getElementById('doodle-background-select');
const doodleDownloadBtn = document.getElementById('doodle-download-btn');
const doodleEraserBtn = document.getElementById('doodle-eraser-btn');
const doodleClearBtn = document.getElementById('doodle-clear-btn');
const doodleSendBtn = document.getElementById('doodle-send-btn');
const doodleCloseBtn = document.getElementById('doodle-close-btn');
const doodleMinimizeBtn = document.getElementById('doodle-minimize-btn');
const doodleMaximizeBtn = document.getElementById('doodle-maximize-btn');
const doodleHeader = document.getElementById('doodle-header');
const doodleBottomBar = document.getElementById('doodle-bottom-bar');
const doodleCanvasWrapper = document.getElementById('doodle-canvas-wrapper');

const doodleInviteModal = document.getElementById('doodle-invite-modal');
const doodleAcceptBtn = document.getElementById('doodle-accept-btn');
const doodleDeclineBtn = document.getElementById('doodle-decline-btn');

let isDrawing = false;
let doodleColor = '#172b3a';
let doodleBackground = '#ffffff';
let doodleSize = 3;
let isEraser = false;

// FIRESTORE SYNC STATE
let currentDoodleDocRef = null;
let currentDoodlePeer = null;
let doodleSessionStartTime = 0;
let doodleSessionUnsubscribe = null;
let doodleStrokesUnsubscribe = null;
let currentStroke = [];
let localStrokesDrawn = new Set();
let receivedStrokesCount = 0; // to avoid drawing our own strokes twice

// DRAG/RESIZE
let isDraggingDoodle = false;
let doodleDragOffsetX = 0;
let doodleDragOffsetY = 0;

// INIT
if(doodleCanvas) {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    doodleCanvas.addEventListener('mousedown', startPosition);
    doodleCanvas.addEventListener('mouseup', endPosition);
    doodleCanvas.addEventListener('mousemove', draw);
    
    doodleCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startPosition(e.touches[0]); }, {passive: false});
    doodleCanvas.addEventListener('touchend', (e) => { e.preventDefault(); endPosition(); });
    doodleCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); }, {passive: false});
}

function resizeCanvas() {
    if(!doodleCanvas || !doodleCtx) return;
    
    const rect = doodleCanvas.parentElement.getBoundingClientRect();
    if(rect.width === 0 || rect.height === 0) return; // Element is hidden
    
    const oldWidth = doodleCanvas.width;
    const oldHeight = doodleCanvas.height;
    
    let tempCanvas = null;
    if(oldWidth > 0 && oldHeight > 0) {
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = oldWidth;
        tempCanvas.height = oldHeight;
        const tempCtx = tempCanvas.getContext('2d');
        try { tempCtx.drawImage(doodleCanvas, 0, 0); } catch(e) {}
    }
    
    doodleCanvas.width = rect.width;
    doodleCanvas.height = Math.max(rect.height - 60, 100); // header height
    
    doodleCtx.fillStyle = doodleBackground;
    doodleCtx.fillRect(0, 0, doodleCanvas.width, doodleCanvas.height);
    
    if(tempCanvas) {
        try { doodleCtx.drawImage(tempCanvas, 0, 0); } catch(e) {}
    }
}

function clearCanvas() {
    if(!doodleCtx) return;
    doodleCtx.fillStyle = doodleBackground;
    doodleCtx.fillRect(0, 0, doodleCanvas.width, doodleCanvas.height);
}

let isDoodleMinimized = false;
let isDoodleMaximized = false;
let preMaxDoodleRect = null;

if(doodleCloseBtn) {
    const closeHandler = (e) => { 
        e.preventDefault(); e.stopPropagation(); 
        if(window.sendMessage && currentDoodlePeer) window.sendMessage('', 'doodle_close', null);
        endDoodle(); 
    };
    doodleCloseBtn.addEventListener('click', closeHandler);
    doodleCloseBtn.addEventListener('touchstart', closeHandler, {passive: false});
}

if(doodleMinimizeBtn) {
    doodleMinimizeBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        isDoodleMinimized = !isDoodleMinimized;
        if(isDoodleMinimized) {
            doodleCanvasWrapper.style.display = 'none';
            doodleBottomBar.style.display = 'none';
            doodleContainer.style.height = 'auto';
            doodleMinimizeBtn.textContent = '➕';
        } else {
            doodleCanvasWrapper.style.display = 'flex';
            doodleBottomBar.style.display = 'flex';
            if(isDoodleMaximized) doodleContainer.style.height = '100vh';
            else doodleContainer.style.height = preMaxDoodleRect ? preMaxDoodleRect.height : '600px';
            doodleMinimizeBtn.textContent = '➖';
            setTimeout(resizeCanvas, 50);
        }
    });
}

if(doodleMaximizeBtn) {
    doodleMaximizeBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if(isDoodleMinimized) return;
        isDoodleMaximized = !isDoodleMaximized;
        if(isDoodleMaximized) {
            preMaxDoodleRect = {
                width: doodleContainer.style.width,
                height: doodleContainer.style.height,
                left: doodleContainer.style.left,
                top: doodleContainer.style.top
            };
            doodleContainer.style.width = '100vw';
            doodleContainer.style.height = '100vh';
            doodleContainer.style.left = '0px';
            doodleContainer.style.top = '0px';
            doodleMaximizeBtn.textContent = '🗗';
        } else {
            if(preMaxDoodleRect) {
                doodleContainer.style.width = preMaxDoodleRect.width;
                doodleContainer.style.height = preMaxDoodleRect.height;
                doodleContainer.style.left = preMaxDoodleRect.left;
                doodleContainer.style.top = preMaxDoodleRect.top;
            }
            doodleMaximizeBtn.textContent = '🔲';
        }
        setTimeout(resizeCanvas, 50);
    });
}

if(doodleSendBtn) doodleSendBtn.addEventListener('click', () => {
    sendDoodleAsImage();
});

if(doodleColorPicker) {
    doodleColorPicker.addEventListener('change', (e) => {
        doodleColor = e.target.value;
        isEraser = false;
        doodleEraserBtn.style.background = 'transparent';
    });
}
if(doodleColorPresets) {
    doodleColorPresets.addEventListener('click', event => {
        const button = event.target.closest('[data-color]');
        if(!button) return;
        doodleColor = button.dataset.color;
        doodleColorPicker.value = doodleColor;
        isEraser = false;
        doodleEraserBtn?.classList.remove('active');
        doodleColorPresets.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
    });
}
if(doodleBackgroundSelect) {
    doodleBackgroundSelect.addEventListener('change', event => {
        doodleBackground = event.target.value;
        clearCanvas();
        sendDoodleAction({ action: 'background', color: doodleBackground });
    });
}
if(doodleDownloadBtn) {
    doodleDownloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = doodleCanvas.toDataURL('image/png');
        link.download = `doori-doodle-${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
    });
}
if(doodleSizeSlider) {
    doodleSizeSlider.addEventListener('input', (e) => doodleSize = e.target.value);
}
if(doodleEraserBtn) {
    doodleEraserBtn.addEventListener('click', () => {
        isEraser = !isEraser;
        doodleEraserBtn.style.background = isEraser ? 'var(--bg-hover)' : 'transparent';
    });
}
if(doodleClearBtn) {
    doodleClearBtn.addEventListener('click', () => {
        clearCanvas();
        sendDoodleAction({ action: 'clear' });
    });
}

// DRAGGING
if(doodleHeader && doodleContainer) {
    doodleHeader.addEventListener('mousedown', (e) => {
        if(e.target.closest('button') || e.target.closest('input')) return;
        isDraggingDoodle = true;
        doodleDragOffsetX = e.clientX - doodleContainer.getBoundingClientRect().left;
        doodleDragOffsetY = e.clientY - doodleContainer.getBoundingClientRect().top;
        doodleContainer.style.transition = 'none';
    });
    
    doodleHeader.addEventListener('touchstart', (e) => {
        if(e.target.closest('button') || e.target.closest('input')) return;
        isDraggingDoodle = true;
        doodleDragOffsetX = e.touches[0].clientX - doodleContainer.getBoundingClientRect().left;
        doodleDragOffsetY = e.touches[0].clientY - doodleContainer.getBoundingClientRect().top;
        doodleContainer.style.transition = 'none';
        e.preventDefault(); 
    }, {passive: false});
}

// RESIZING LOGIC
let isResizingDoodle = false;
let startWidth, startHeight, startX, startY;
const doodleResizer = document.querySelector('.doodle-resizer');

function initResize(clientX, clientY) {
    isResizingDoodle = true;
    startWidth = parseInt(document.defaultView.getComputedStyle(doodleContainer).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(doodleContainer).height, 10);
    startX = clientX;
    startY = clientY;
    doodleContainer.style.transition = 'none';
}

function doResize(clientX, clientY) {
    if(!isResizingDoodle) return;
    const newWidth = startWidth + clientX - startX;
    const newHeight = startHeight + clientY - startY;
    if(newWidth > 150) doodleContainer.style.width = newWidth + 'px';
    if(newHeight > 200) doodleContainer.style.height = newHeight + 'px';
}

function stopResize() {
    if(isResizingDoodle) {
        isResizingDoodle = false;
        resizeCanvas();
    }
}

if(doodleResizer) {
    doodleResizer.addEventListener('mousedown', (e) => { initResize(e.clientX, e.clientY); e.preventDefault(); e.stopPropagation(); });
    doodleResizer.addEventListener('touchstart', (e) => { initResize(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); e.stopPropagation(); }, {passive: false});
}

document.addEventListener('mousemove', (e) => {
    if(isDraggingDoodle) {
        let newX = e.clientX - doodleDragOffsetX;
        let newY = e.clientY - doodleDragOffsetY;
        if(newX < 0) newX = 0;
        if(newY < 0) newY = 0;
        if(newX > window.innerWidth - 50) newX = window.innerWidth - 50;
        if(newY > window.innerHeight - 50) newY = window.innerHeight - 50;
        doodleContainer.style.left = newX + 'px';
        doodleContainer.style.top = newY + 'px';
        doodleContainer.style.right = 'auto';
    }
    doResize(e.clientX, e.clientY);
});
document.addEventListener('touchmove', (e) => {
    if(isDraggingDoodle) {
        let newX = e.touches[0].clientX - doodleDragOffsetX;
        let newY = e.touches[0].clientY - doodleDragOffsetY;
        if(newX < 0) newX = 0;
        if(newY < 0) newY = 0;
        if(newX > window.innerWidth - 50) newX = window.innerWidth - 50;
        if(newY > window.innerHeight - 50) newY = window.innerHeight - 50;
        doodleContainer.style.left = newX + 'px';
        doodleContainer.style.top = newY + 'px';
        doodleContainer.style.right = 'auto';
        e.preventDefault();
    }
    if(isResizingDoodle) { doResize(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }
}, {passive: false});

document.addEventListener('mouseup', () => { isDraggingDoodle = false; stopResize(); });
document.addEventListener('touchend', () => { isDraggingDoodle = false; stopResize(); });


// DRAWING LOGIC
function getMousePos(e) {
    const rect = doodleCanvas.getBoundingClientRect();
    const scaleX = doodleCanvas.width / rect.width;
    const scaleY = doodleCanvas.height / rect.height;
    
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function startPosition(e) {
    isDrawing = true;
    currentStroke = [];
    draw(e);
}

function endPosition() {
    isDrawing = false;
    doodleCtx.beginPath();
    
    if(currentStroke.length > 0) {
        const strokeData = {
            action: 'stroke',
            color: isEraser ? doodleBackground : doodleColor,
            size: doodleSize,
            points: currentStroke
        };
        sendDoodleAction(strokeData);
    }
}

function draw(e) {
    if(!isDrawing) return;
    const pos = getMousePos(e);
    
    doodleCtx.lineWidth = doodleSize;
    doodleCtx.lineCap = 'round';
    doodleCtx.lineJoin = 'round';
    doodleCtx.strokeStyle = isEraser ? doodleBackground : doodleColor;
    
    doodleCtx.lineTo(pos.x, pos.y);
    doodleCtx.stroke();
    doodleCtx.beginPath();
    doodleCtx.moveTo(pos.x, pos.y);
    
    // Normalize coordinates (0 to 1) for cross-device sync
    currentStroke.push({
        nx: pos.x / doodleCanvas.width,
        ny: pos.y / doodleCanvas.height
    });
}

function drawRemoteStroke(strokeData) {
    if(!doodleCtx || !doodleCanvas) return;
    doodleCtx.beginPath();
    doodleCtx.lineWidth = strokeData.size;
    doodleCtx.lineCap = 'round';
    doodleCtx.lineJoin = 'round';
    doodleCtx.strokeStyle = strokeData.color;
    
    strokeData.points.forEach((p, i) => {
        const px = p.nx * doodleCanvas.width;
        const py = p.ny * doodleCanvas.height;
        if(i === 0) doodleCtx.moveTo(px, py);
        else doodleCtx.lineTo(px, py);
    });
    doodleCtx.stroke();
    doodleCtx.beginPath();
}

function sendDoodleAsImage() {
    if(!window.currentUser || !window.currentChat) return;
    const dataUrl = doodleCanvas.toDataURL('image/png');
    if(window.sendMessage) {
        doodleSendBtn.disabled = true;
        doodleSendBtn.textContent = "...";
        window.sendMessage('', 'image', dataUrl).then(() => {
            doodleSendBtn.disabled = false;
            if(window.TRANSLATIONS) doodleSendBtn.textContent = window.TRANSLATIONS[window.currentLang].btn_send_doodle || "Als Bild senden";
            endDoodle();
        }).catch(e => {
            console.error("Error sending doodle", e);
            doodleSendBtn.disabled = false;
            if(window.TRANSLATIONS) doodleSendBtn.textContent = window.TRANSLATIONS[window.currentLang].btn_send_doodle || "Als Bild senden";
        });
    }
}

// FIRESTORE SYNC LOGIC
function sendDoodleAction(data) {
    if(!currentDoodleDocRef) return;
    
    const actionId = Date.now() + '_' + window.db.collection('temp').doc().id;
    localStrokesDrawn.add(actionId);
    
    data.id = actionId;
    data.sender = window.currentUser.toLowerCase();
    data.timestamp = Date.now();
    
    currentDoodleDocRef.collection('strokes').doc(actionId).set(data).catch(e=>console.error('Stroke err', e));
}

function handleRemoteAction(data) {
    if(!doodleCtx || !doodleCanvas) return;
    if(localStrokesDrawn.has(data.id)) return; // Ignore our own strokes
    if(data.sender === window.currentUser.toLowerCase()) return;
    
    receivedStrokesCount++;
    const st = document.getElementById('doodle-status');
    if(st) {
        const t = window.TRANSLATIONS ? (window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']) : { doodle_connected: 'Verbunden' };
        st.textContent = '🟢 ' + (t.doodle_connected || 'Verbunden') + ' (' + receivedStrokesCount + ')';
    }
    
    if(data.action === 'clear') {
        clearCanvas();
    } else if (data.action === 'background') {
        doodleBackground = data.color || '#ffffff';
        if(doodleBackgroundSelect) doodleBackgroundSelect.value = doodleBackground;
        clearCanvas();
    } else if (data.action === 'stroke') {
        doodleCtx.save();
        doodleCtx.beginPath();
        doodleCtx.lineWidth = data.size || 3;
        doodleCtx.lineCap = 'round';
        doodleCtx.lineJoin = 'round';
        doodleCtx.strokeStyle = data.color || '#000000';
        
        if (data.points && data.points.length > 0) {
            data.points.forEach((p, i) => {
                const px = p.nx * doodleCanvas.width;
                const py = p.ny * doodleCanvas.height;
                if(i === 0) {
                    doodleCtx.moveTo(px, py);
                    if(data.points.length === 1) doodleCtx.lineTo(px+0.1, py+0.1); // Force a dot
                }
                else doodleCtx.lineTo(px, py);
            });
            doodleCtx.stroke();
        }
        doodleCtx.restore();
    }
}

function getSessionId(userA, userB) {
    const arr = [userA.toLowerCase(), userB.toLowerCase()].sort();
    return 'session_' + arr[0] + '_' + arr[1];
}

// INITIATOR SENDS INVITE
async function initDoodleInvite(peerId) {
    if(!window.currentUser) return;
    const peerClean = normalizeUsername(peerId);
    
    const sessionId = getSessionId(window.currentUser, peerClean);
    const docRef = window.db.collection('doodle_sessions').doc(sessionId);
    
    try {
        currentDoodlePeer = peerClean;
        currentDoodleDocRef = docRef;
        
        // THEN set invite
        doodleSessionStartTime = Date.now();
        await currentDoodleDocRef.set({
            type: 'invite',
            ts: doodleSessionStartTime,
            caller: window.currentUser.toLowerCase(),
            receiver: peerClean
        }, {merge: true});
        
        // Clear old strokes just in case FIRST
        const snap = await currentDoodleDocRef.collection('strokes').get();
        const batch = window.db.batch();
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();

        // THEN send message
        if(window.sendMessage) {
            window.sendMessage('', 'doodle_invite', null);
        }
        
        doodleSessionUnsubscribe = currentDoodleDocRef.onSnapshot(doc => {
            const data = doc.data();
            if(!data) return;
            if(data.ts && data.ts < doodleSessionStartTime) return; // Ignore stale cache
            
            if(data.type === 'reject') {
                if(window.sendMessage) window.sendMessage('', 'doodle_reject', null, false);
                endDoodle();
            } else if (data.type === 'end') {
                endDoodle();
            } else if (data.type === 'accept') {
                openDoodleWorkspace();
                const st = document.getElementById('doodle-status');
                if(st) { 
                    const t = window.TRANSLATIONS ? (window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']) : { doodle_connected: 'Verbunden' };
                    st.textContent = '🟢 ' + (t.doodle_connected || 'Verbunden') + ' (' + receivedStrokesCount + ')'; 
                    st.style.color = '#2ed573'; 
                }
                if(!doodleStrokesUnsubscribe) startStrokesListener();
            }
        });
    } catch(e) {
        console.error('Error checking doodle session', e);
    }
}
window.initDoodleInvite = initDoodleInvite;

// RECEIVER ACCEPTS
function acceptDoodleInvite(caller) {
    const btn = typeof event !== 'undefined' ? event.target : null;
    if(btn) { btn.disabled = true; }
    
    currentDoodlePeer = caller.toLowerCase();
    const sessionId = getSessionId(window.currentUser, caller);
    currentDoodleDocRef = window.db.collection('doodle_sessions').doc(sessionId);
    
    doodleSessionStartTime = Date.now();
    currentDoodleDocRef.set({
        type: 'accept',
        ts: doodleSessionStartTime
    }, {merge: true}).then(() => {
        if(window.sendMessage) window.sendMessage('', 'doodle_accept', null);
    }).catch(e=>console.error('Accept err', e));
    
    openDoodleWorkspace();
    startStrokesListener();
    const st = document.getElementById('doodle-status');
    if(st) { 
        const t = window.TRANSLATIONS ? (window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']) : { doodle_connected: 'Verbunden' };
        st.textContent = '🟢 ' + (t.doodle_connected || 'Verbunden'); 
        st.style.color = '#2ed573'; 
    }
    
    doodleSessionUnsubscribe = currentDoodleDocRef.onSnapshot(doc => {
        const data = doc.data();
        if(!data) return;
        if(data.ts && data.ts < doodleSessionStartTime) return; // Ignore stale cache
        if(data.type === 'end') {
            endDoodle();
        }
    });
}
window.acceptDoodleInvite = acceptDoodleInvite;

// RECEIVER REJECTS
function rejectDoodleInvite(caller) {
    const btn = typeof event !== 'undefined' ? event.target : null;
    if(btn) { btn.disabled = true; }
    
    const sessionId = getSessionId(window.currentUser, caller);
    const docRef = window.db.collection('doodle_sessions').doc(sessionId);
    docRef.set({ type: 'reject' }, {merge: true}).catch(e=>console.error('reject err', e));
    
    // Also notify explicitly in chat
    if(window.sendMessage) window.sendMessage('', 'doodle_reject', null, false);
}
window.rejectDoodleInvite = rejectDoodleInvite;

function startStrokesListener() {
    if(!currentDoodleDocRef) return;
    doodleStrokesUnsubscribe = currentDoodleDocRef.collection('strokes')
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                try {
                if(change.type === 'added') {
                    handleRemoteAction(change.doc.data());
                }
                } catch(e) { console.error('Error handling remote action', e); }
            });
        });
}

function openDoodleWorkspace() {
    if(!doodleContainer) return;
    
    // Reset states
    isDoodleMinimized = false;
    isDoodleMaximized = false;
    if(doodleCanvasWrapper) doodleCanvasWrapper.style.display = 'flex';
    if(doodleBottomBar) doodleBottomBar.style.display = 'flex';
    if(doodleMinimizeBtn) doodleMinimizeBtn.textContent = '➖';
    if(doodleMaximizeBtn) doodleMaximizeBtn.textContent = '🔲';

    doodleContainer.classList.remove('hidden');
    doodleContainer.style.setProperty('display', 'flex', 'important');
    clearCanvas();
    localStrokesDrawn.clear();
    receivedStrokesCount = 0;
    
    // Calculate wider size and perfectly center it
    const w = Math.min(450, window.innerWidth - 20);
    const h = Math.min(600, window.innerHeight - 100);
    
    doodleContainer.style.position = 'fixed';
    doodleContainer.style.zIndex = '999999';
    doodleContainer.style.width = w + 'px';
    doodleContainer.style.height = h + 'px';
    doodleContainer.style.left = ((window.innerWidth - w) / 2) + 'px';
    doodleContainer.style.top = ((window.innerHeight - h) / 2) + 'px';
    doodleContainer.style.right = 'auto';
    doodleContainer.style.transform = 'none';
    
    setTimeout(resizeCanvas, 100);
}

function endDoodle() {
    try {
        if(doodleStrokesUnsubscribe) { doodleStrokesUnsubscribe(); doodleStrokesUnsubscribe = null; }
        if(doodleSessionUnsubscribe) { doodleSessionUnsubscribe(); doodleSessionUnsubscribe = null; }
        
        if(currentDoodleDocRef) {
            currentDoodleDocRef.set({ type: 'end' }, {merge: true}).catch(()=>{});
        }
        currentDoodleDocRef = null;
        currentDoodlePeer = null;
        
        if(doodleContainer) {
            doodleContainer.classList.add('hidden');
            doodleContainer.style.setProperty('display', 'none', 'important');
        }
    } catch(e) {
        console.error('Error closing doodle', e);
        if(doodleContainer) {
            doodleContainer.classList.add('hidden');
            doodleContainer.style.setProperty('display', 'none', 'important');
        }
    }
}
window.endDoodle = endDoodle;

window.handleDoodleAccept = function(ts) {
    if(ts && ts < doodleSessionStartTime) return; // Ignore old messages
    openDoodleWorkspace();
    const st = document.getElementById('doodle-status');
    if(st) { 
        const t = window.TRANSLATIONS ? (window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']) : { doodle_connected: 'Verbunden' };
        st.textContent = '🟢 ' + (t.doodle_connected || 'Verbunden') + ' (' + receivedStrokesCount + ')'; 
        st.style.color = '#2ed573'; 
    }
    if(!doodleStrokesUnsubscribe) startStrokesListener();
};

window.handleDoodleClose = function(ts) {
    if(ts && ts < doodleSessionStartTime) return; // Ignore old messages
    endDoodle();
};


let currentPendingDoodleCaller = null;
window.showDoodleInviteModal = function(caller) {
    currentPendingDoodleCaller = caller;
    const modal = document.getElementById('doodle-invite-modal');
    const text = document.getElementById('doodle-invite-text');
    if(modal && text) {
        const t = window.TRANSLATIONS ? (window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']) : { doodle_wants_to_draw: ' möchte mit dir zeichnen!' };
        text.textContent = '@' + caller + (t.doodle_wants_to_draw || ' möchte mit dir zeichnen!');
        modal.classList.remove('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const accBtn = document.getElementById('doodle-accept-btn');
    const rejBtn = document.getElementById('doodle-reject-btn');
    if(accBtn) accBtn.addEventListener('click', () => {
        document.getElementById('doodle-invite-modal').classList.add('hidden');
        if(currentPendingDoodleCaller && window.acceptDoodleInvite) {
            window.acceptDoodleInvite(currentPendingDoodleCaller);
        }
    });
    if(rejBtn) rejBtn.addEventListener('click', () => {
        document.getElementById('doodle-invite-modal').classList.add('hidden');
        if(currentPendingDoodleCaller && window.rejectDoodleInvite) {
            window.rejectDoodleInvite(currentPendingDoodleCaller);
        }
    });
});


let globalDoodleInviteUnsubscribe = null;
function initGlobalDoodleListener() {
    if(!window.currentUser || !window.db) return;
    if(globalDoodleInviteUnsubscribe) globalDoodleInviteUnsubscribe();
    
    globalDoodleInviteUnsubscribe = window.db.collection('doodle_sessions')
        .where('receiver', '==', window.currentUser.toLowerCase())
        .where('type', '==', 'invite')
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                if(change.type === 'added' || change.type === 'modified') {
                    const data = change.doc.data();
                    // Check if it's a new invite (within last 30 seconds)
                    if(data.ts && Date.now() - data.ts < 30000) {
                        if(window.showDoodleInviteModal) {
                            window.showDoodleInviteModal(data.caller);
                        }
                    }
                }
            });
        });
}

// Call initGlobalDoodleListener when currentUser is set
const checkUserInterval = setInterval(() => {
    if(window.currentUser) {
        initGlobalDoodleListener();
        clearInterval(checkUserInterval);
    }
}, 1000);
