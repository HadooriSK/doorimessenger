const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

// First, let's remove ALL existing contextmenu and touchstart listeners on messagesContainer
js = js.replace(/messagesContainer\.addEventListener\('contextmenu'[\s\S]*?\}\);/g, '');
js = js.replace(/messagesContainer\.addEventListener\('touchstart'[\s\S]*?\}\);/g, '');

// Now inject a foolproof listener right before the forward logic
const bulletproofListeners = `
    // BULLETPROOF CONTEXT MENU LISTENER
    messagesContainer.addEventListener('contextmenu', (e) => {
        try {
            e.preventDefault(); // ALWAYS prevent default inside the container
            const msgEl = e.target.closest('.message');
            if (msgEl && currentChat) {
                const chatMsgs = messages.get(currentChat.id) || [];
                const msgId = msgEl.dataset.id;
                const msg = chatMsgs.find(m => String(m.id) === String(msgId));
                if (msg) {
                    openContextMenu(e, msg);
                } else {
                    alert("Debug: Msg ID " + msgId + " not found in chatMsgs array!");
                }
            }
        } catch(err) {
            alert("Fatal contextmenu error: " + err.message);
        }
    }, true);

    let longPressTimer = null;
    messagesContainer.addEventListener('touchstart', (e) => {
        try {
            const msgEl = e.target.closest('.message');
            if (msgEl && currentChat) {
                longPressTimer = setTimeout(() => {
                    const chatMsgs = messages.get(currentChat.id) || [];
                    const msg = chatMsgs.find(m => String(m.id) === String(msgEl.dataset.id));
                    if (msg) {
                        openContextMenu(e, msg);
                    }
                }, 500);
            }
        } catch(err) {
            alert("Fatal touchstart error: " + err.message);
        }
    }, {passive: true});

    messagesContainer.addEventListener('touchend', () => { if(longPressTimer) clearTimeout(longPressTimer); });
    messagesContainer.addEventListener('touchmove', () => { if(longPressTimer) clearTimeout(longPressTimer); });
`;

js = js.replace(/\/\/ --- Forward Logic ---/g, bulletproofListeners + '\n    // --- Forward Logic ---');

fs.writeFileSync('app.js', js, 'utf8');
console.log("Bulletproof listeners injected!");
