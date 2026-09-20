const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

const targetMenu = `messagesContainer.addEventListener('contextmenu', (e) => {
        const msgEl = e.target.closest('.message');
        if (msgEl && currentChat) {
            const chatMsgs = messages.get(currentChat.id) || [];
            const msg = chatMsgs.find(m => m.id === msgEl.dataset.id || String(m.id) === String(msgEl.dataset.id));
            if (msg) openContextMenu(e, msg);
        }
    });`;

// In case the find predicate was strictly checking types or there was some anomaly:
js = js.replace(/messagesContainer\.addEventListener\('contextmenu', \(e\) => {[\s\S]*?if \(msg\) openContextMenu\(e, msg\);\n        }\n    }\);/g, targetMenu);

// Also fix the dropdown translations so they apply to all items consistently.
const dropdownTarget = `dropdownMuteUser.innerHTML = isMuted ? '🔔 ' + (t.ctx_unmute_user || 'Stummschaltung aufheben') : '🔕 ' + (t.ctx_mute_user || 'Stummschalten');
                dropdownBlockUser.innerHTML = isBlocked ? '✅ ' + (t.ctx_unblock_user || 'Entblocken') : '🚫 ' + (t.ctx_block_user || 'Blockieren');
                dropdownAddContact.style.display = isContact ? 'none' : 'flex';`;

const dropdownReplacement = `dropdownAddContact.innerHTML = '👤 ' + (t.ctx_add_contact || 'Zu Kontakten hinzufügen');
                dropdownClearChat.innerHTML = '🗑️ ' + (t.ctx_clear_chat || 'Chat leeren');
                dropdownMuteUser.innerHTML = isMuted ? '🔔 ' + (t.ctx_unmute_user || 'Stummschaltung aufheben') : '🔕 ' + (t.ctx_mute_user || 'Stummschalten');
                dropdownBlockUser.innerHTML = isBlocked ? '✅ ' + (t.ctx_unblock_user || 'Entblocken') : '🚫 ' + (t.ctx_block_user || 'Blockieren');
                dropdownAddContact.style.display = isContact ? 'none' : 'flex';`;

js = js.replace(dropdownTarget, dropdownReplacement);

fs.writeFileSync('app.js', js, 'utf8');
console.log("Fixes applied to app.js.");
