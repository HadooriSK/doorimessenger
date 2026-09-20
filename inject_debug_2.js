const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

const debugListenerStr = `    messagesContainer.addEventListener('contextmenu', (e) => {
        try {
            const msgEl = e.target.closest('.message');
            if (msgEl && currentChat) {
                const chatMsgs = messages.get(currentChat.id) || [];
                const msg = chatMsgs.find(m => String(m.id) === String(msgEl.dataset.id));
                if (msg) {
                    openContextMenu(e, msg);
                } else {
                    alert("Debug: Msg not found in chatMsgs. dataset.id=" + msgEl.dataset.id);
                }
            } else {
                if(!msgEl) alert("Debug: Not clicking a message!");
                if(!currentChat) alert("Debug: No currentChat!");
            }
        } catch(err) {
            alert("Debug Listener Error: " + err.message);
        }
    });

    messagesContainer.addEventListener('touchstart', (e) => {
        try {
            const msgEl = e.target.closest('.message');
            if (msgEl && currentChat) {
                longPressTimerMsg = setTimeout(() => {
                    const chatMsgs = messages.get(currentChat.id) || [];
                    const msg = chatMsgs.find(m => String(m.id) === String(msgEl.dataset.id));
                    if (msg) openContextMenu(e, msg);
                    else alert("Debug Touch: Msg not found! dataset.id=" + msgEl.dataset.id);
                }, 500);
            }
        } catch(err) {
            alert("Debug Touch Error: " + err.message);
        }
    });`;

// Because the file has multiple listeners, let's just replace them based on exact match of the first line
js = js.replace(/messagesContainer\.addEventListener\('contextmenu', \(e\) => \{[\s\S]*?messagesContainer\.addEventListener\('touchstart', \(e\) => \{[\s\S]*?\}\);/g, debugListenerStr);

fs.writeFileSync('app.js', js, 'utf8');
console.log("Injected debug into listeners!");
