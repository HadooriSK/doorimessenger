const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

// The marker where my bad code started
const marker = '// --- Phase 2: Features ---';
const idx = js.indexOf(marker);

if (idx !== -1) {
    // 1. Remove the bad code from the bottom
    let mainJS = js.substring(0, idx);
    
    // 2. The good code we want to insert INSIDE DOMContentLoaded
    const goodCode = `
    // --- Phase 2: Features (Fixed Scope) ---
    // Translations
    const phase2Additions = {
        de: { lbl_blocked_contacts: 'Blockierte Kontakte', btn_unblock: 'Entblocken', lbl_enter_to_send: 'Mit Enter senden', btn_export_chat: 'Chat exportieren', msg_no_blocked: 'Keine blockierten Kontakte.', msg_chat_exported: 'Chat erfolgreich exportiert.', btn_clear_chat: 'Chat leeren', msg_confirm_clear: 'Diesen Chat wirklich für alle leeren?' },
        en: { lbl_blocked_contacts: 'Blocked Contacts', btn_unblock: 'Unblock', lbl_enter_to_send: 'Send with Enter', btn_export_chat: 'Export Chat', msg_no_blocked: 'No blocked contacts.', msg_chat_exported: 'Chat exported successfully.', btn_clear_chat: 'Clear Chat', msg_confirm_clear: 'Really clear this chat for everyone?' },
        fa: { lbl_blocked_contacts: 'مخاطبین مسدود شده', btn_unblock: 'رفع مسدودیت', lbl_enter_to_send: 'ارسال با اینتر', btn_export_chat: 'خروجی چت', msg_no_blocked: 'هیچ مخاطب مسدود شده ای وجود ندارد.', msg_chat_exported: 'چت با موفقیت صادر شد.', btn_clear_chat: 'پاک کردن چت', msg_confirm_clear: 'آیا این چت برای همه پاک شود؟' },
        ar: { lbl_blocked_contacts: 'جهات الاتصال المحظورة', btn_unblock: 'إلغاء الحظر', lbl_enter_to_send: 'إرسال بواسطة إدخال', btn_export_chat: 'تصدير الدردشة', msg_no_blocked: 'لا توجد جهات اتصال محظورة.', msg_chat_exported: 'تم تصدير الدردشة بنجاح.', btn_clear_chat: 'مسح الدردشة', msg_confirm_clear: 'هل تريد حقًا مسح هذه الدردشة للجميع؟' },
        tr: { lbl_blocked_contacts: 'Engellenen Kişiler', btn_unblock: 'Engeli Kaldır', lbl_enter_to_send: 'Enter ile Gönder', btn_export_chat: 'Sohbeti Dışa Aktar', msg_no_blocked: 'Engellenen kişi yok.', msg_chat_exported: 'Sohbet başarıyla dışa aktarıldı.', btn_clear_chat: 'Sohbeti Temizle', msg_confirm_clear: 'Bu sohbeti herkes için gerçekten temizle?' }
    };
    for(let lang in phase2Additions) {
        if(TRANSLATIONS[lang]) {
            Object.assign(TRANSLATIONS[lang], phase2Additions[lang]);
        }
    }

    // Blocked Contacts
    window.renderBlockedContacts = function() {
        const list = document.getElementById('blocked-contacts-list');
        if(!list) return;
        list.innerHTML = '';
        const t = TRANSLATIONS[currentLang] || TRANSLATIONS['de'];
        if(blockedContacts.size === 0) {
            list.innerHTML = \\\`<span style="color: var(--text-secondary);">\\\${t.msg_no_blocked || 'Keine blockierten Kontakte.'}</span>\\\`;
            return;
        }
        blockedContacts.forEach(username => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '5px 0';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.innerHTML = \\\`
                <span>\\\${username}</span>
                <button class="text-btn" style="color: var(--bg-red); font-size: 12px; padding: 5px;" onclick="window.unblockUser('\\\${username}')">\\\${t.btn_unblock || 'Entblocken'}</button>
            \\\`;
            list.appendChild(div);
        });
    };

    window.unblockUser = function(username) {
        blockedContacts.delete(username);
        localStorage.setItem('doori_blocked_contacts', JSON.stringify(Array.from(blockedContacts)));
        saveUserData();
        window.renderBlockedContacts();
        if (currentChat && currentChat.id === username) {
            selectChat(currentChat.id, currentChat.type);
        }
    };

    const sBtn = document.getElementById('settings-tab-btn');
    if(sBtn) sBtn.addEventListener('click', () => { setTimeout(window.renderBlockedContacts, 100); });

    // Export Chat
    const exBtn = document.getElementById('export-chat-btn');
    if(exBtn) {
        exBtn.addEventListener('click', () => {
            if(!currentChat) return;
            const msgs = messages.get(currentChat.id) || [];
            let textContent = "Chat Export: " + (currentChat.name || currentChat.id) + "\\n\\n";
            msgs.forEach(msg => {
                const timeStr = new Date(msg.timestamp).toLocaleString();
                let txt = msg.text || '';
                if(msg.mediaType) txt += \\\` [\\\${msg.mediaType}]\\\`;
                textContent += \\\`[\\\${timeStr}] \\\${msg.sender_username}: \\\${txt}\\n\\\`;
            });
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \\\`chat_export_\\\${currentChat.id}_\\\${Date.now()}.txt\\\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // Clear Chat
    const cBtn = document.getElementById('clear-chat-btn');
    if(cBtn) {
        cBtn.addEventListener('click', () => {
            if(!currentChat) return;
            const msgs = messages.get(currentChat.id) || [];
            const t = TRANSLATIONS[currentLang] || TRANSLATIONS['de'];
            if(confirm(t.msg_confirm_clear || 'Diesen Chat wirklich für alle leeren?')) {
                msgs.forEach(msg => {
                    db.collection('messages').doc(msg.id).delete().catch(()=>{});
                });
                messages.set(currentChat.id, []);
                renderMessages();
                const sidebar = document.getElementById('group-info-sidebar');
                if(sidebar) sidebar.classList.add('hidden');
            }
        });
    }

    // Enter to Send
    if(messageInput && messageForm) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const enterToggle = document.getElementById('setting-enter-send');
                const enterToSend = enterToggle ? enterToggle.checked : true;
                if (enterToSend && !e.shiftKey) {
                    e.preventDefault();
                    messageForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            }
        });
    }

    setTimeout(() => { if(typeof applyTranslation === 'function') applyTranslation(currentLang); }, 100);
`;

    // Insert goodCode before "window.declineGroupInvite" (which is near the end of the closure)
    // Wait, let's find a reliable anchor.
    // "    window.declineGroupInvite = async function(msgId) {"
    const anchor = 'window.declineGroupInvite = async function(msgId) {';
    mainJS = mainJS.replace(anchor, goodCode + '\n    ' + anchor);

    fs.writeFileSync('app.js', mainJS);
    console.log('Fixed app.js by moving Phase 2 logic inside DOMContentLoaded.');
} else {
    console.log('Marker not found!');
}
