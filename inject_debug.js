const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

const debugMenu = `    function openContextMenu(e, msg) {
        try {
            e.preventDefault();
            contextMessageId = msg.id;
            contextMessageText = msg.text || '';
            contextMessageSender = msg.sender_username;
            contextMessageMedia = msg.mediaType;
            
            ctxOverlay.classList.remove('hidden');
            
            const isSentByMe = msg.sender_username === currentUser;
            ctxEdit.style.display = isSentByMe ? 'block' : 'none';
            ctxDelete.style.display = isSentByMe ? 'block' : 'none';
            
            if (currentChat) {
                ctxPin.style.display = 'block';
                const isPinned = currentChat.pinnedMessageId === msg.id;
                ctxPin.textContent = isPinned ? ((TRANSLATIONS[currentLang] || TRANSLATIONS['en'])['ctx_unpin'] || 'Loslösen') : ((TRANSLATIONS[currentLang] || TRANSLATIONS['en'])['ctx_pin'] || 'Anheften');
            } else {
                ctxPin.style.display = 'none';
            }
            
            // Position menu securely
            let x = 0; let y = 0;
            if (e.clientX !== undefined) {
                x = e.clientX;
                y = e.clientY;
            } else if (e.touches && e.touches.length > 0) {
                x = e.touches[0].clientX;
                y = e.touches[0].clientY;
            }
            
            ctxMenu.style.left = x + 'px';
            ctxMenu.style.top = y + 'px';
            
            const rect = ctxMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) ctxMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
            if (rect.bottom > window.innerHeight) ctxMenu.style.top = (window.innerHeight - rect.height - 10) + 'px';
        } catch(err) {
            alert("Context menu error: " + err.message);
        }
    }`;

js = js.replace(/function openContextMenu\(e, msg\) \{[\s\S]*?if \(rect\.bottom > window\.innerHeight\) ctxMenu\.style\.top = \(window\.innerHeight - rect\.height - 10\) \+ 'px';\n    \}/g, debugMenu);

// Also let's wrap the event listener to catch errors there too!
const debugListener = `messagesContainer.addEventListener('contextmenu', (e) => {
        try {
            const msgEl = e.target.closest('.message');
            if (msgEl && currentChat) {
                const chatMsgs = messages.get(currentChat.id) || [];
                const msg = chatMsgs.find(m => String(m.id) === String(msgEl.dataset.id));
                if (msg) openContextMenu(e, msg);
                else alert("Message not found in chatMsgs! dataset.id=" + msgEl.dataset.id);
            }
        } catch(err) {
            alert("Listener error: " + err.message);
        }
    });`;

js = js.replace(/messagesContainer\.addEventListener\('contextmenu', \(e\) => {[\s\S]*?if \(msg\) openContextMenu\(e, msg\);\n        }\n    }\);/g, debugListener);

fs.writeFileSync('app.js', js, 'utf8');
console.log("Debug alerts injected.");
