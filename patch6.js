const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

const appendCode = `
// --- Phase 2: Features ---
setTimeout(() => {
    // 1. Translations
    const additions = {
        de: { lbl_blocked_contacts: 'Blockierte Kontakte', btn_unblock: 'Entblocken', lbl_enter_to_send: 'Mit Enter senden', btn_export_chat: 'Chat exportieren', msg_no_blocked: 'Keine blockierten Kontakte.', msg_chat_exported: 'Chat erfolgreich exportiert.' },
        en: { lbl_blocked_contacts: 'Blocked Contacts', btn_unblock: 'Unblock', lbl_enter_to_send: 'Send with Enter', btn_export_chat: 'Export Chat', msg_no_blocked: 'No blocked contacts.', msg_chat_exported: 'Chat exported successfully.' },
        fa: { lbl_blocked_contacts: 'مخاطبین مسدود شده', btn_unblock: 'رفع مسدودیت', lbl_enter_to_send: 'ارسال با اینتر', btn_export_chat: 'خروجی چت', msg_no_blocked: 'هیچ مخاطب مسدود شده ای وجود ندارد.', msg_chat_exported: 'چت با موفقیت صادر شد.' },
        ar: { lbl_blocked_contacts: 'جهات الاتصال المحظورة', btn_unblock: 'إلغاء الحظر', lbl_enter_to_send: 'إرسال بواسطة إدخال', btn_export_chat: 'تصدير الدردشة', msg_no_blocked: 'لا توجد جهات اتصال محظورة.', msg_chat_exported: 'تم تصدير الدردشة بنجاح.' },
        tr: { lbl_blocked_contacts: 'Engellenen Kişiler', btn_unblock: 'Engeli Kaldır', lbl_enter_to_send: 'Enter ile Gönder', btn_export_chat: 'Sohbeti Dışa Aktar', msg_no_blocked: 'Engellenen kişi yok.', msg_chat_exported: 'Sohbet başarıyla dışa aktarıldı.' }
    };
    for(let lang in additions) {
        if(typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang]) {
            Object.assign(TRANSLATIONS[lang], additions[lang]);
        }
    }

    // 2. Blocked Contacts Logic
    window.renderBlockedContacts = function() {
        const list = document.getElementById('blocked-contacts-list');
        if(!list) return;
        list.innerHTML = '';
        const t = TRANSLATIONS[currentLang] || TRANSLATIONS['de'];
        if(typeof blockedContacts === 'undefined' || blockedContacts.size === 0) {
            list.innerHTML = \`<span style="color: var(--text-secondary);">\${t.msg_no_blocked || 'Keine blockierten Kontakte.'}</span>\`;
            return;
        }
        blockedContacts.forEach(username => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '5px 0';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.innerHTML = \`
                <span>\${username}</span>
                <button class="text-btn" style="color: var(--bg-red); font-size: 12px; padding: 5px;" onclick="window.unblockUser('\${username}')">\${t.btn_unblock || 'Entblocken'}</button>
            \`;
            list.appendChild(div);
        });
    };

    window.unblockUser = function(username) {
        if(typeof blockedContacts !== 'undefined') {
            blockedContacts.delete(username);
            localStorage.setItem('doori_blocked_contacts', JSON.stringify(Array.from(blockedContacts)));
            window.renderBlockedContacts();
            if (typeof currentChat !== 'undefined' && currentChat && currentChat.id === username) {
                if(typeof selectChat === 'function') selectChat(currentChat.id, currentChat.type);
            }
        }
    };

    const settingsBtn = document.getElementById('settings-tab-btn');
    if(settingsBtn) {
        settingsBtn.addEventListener('click', () => { setTimeout(window.renderBlockedContacts, 100); });
    }

    // 3. Export Chat Logic
    const exportBtn = document.getElementById('export-chat-btn');
    if(exportBtn) {
        exportBtn.addEventListener('click', () => {
            if(typeof currentChat === 'undefined' || !currentChat) return;
            const msgs = typeof messages !== 'undefined' ? (messages.get(currentChat.id) || []) : [];
            let textContent = "Chat Export: " + (currentChat.name || currentChat.id) + "\\n\\n";
            msgs.forEach(msg => {
                const timeStr = new Date(msg.timestamp).toLocaleString();
                let txt = msg.text || '';
                if(msg.mediaType) txt += \` [\${msg.mediaType}]\`;
                textContent += \`[\${timeStr}] \${msg.sender_username}: \${txt}\\n\`;
            });
            
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`chat_export_\${currentChat.id}_\${Date.now()}.txt\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // 4. Enter to Send Logic
    const messageInput = document.getElementById('message-input');
    const messageForm = document.getElementById('message-form');
    if(messageInput && messageForm) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const enterToggle = document.getElementById('setting-enter-send');
                const enterToSend = enterToggle ? enterToggle.checked : true; // Default true
                if (enterToSend && !e.shiftKey) {
                    e.preventDefault();
                    // trigger submit
                    const evt = new Event('submit', { cancelable: true, bubbles: true });
                    messageForm.dispatchEvent(evt);
                }
            }
        });
    }

    // Call applyTranslation to immediately update any visible new UI
    if(typeof applyTranslation === 'function') applyTranslation(currentLang);
}, 500);
`;

fs.writeFileSync('app.js', js + '\n' + appendCode);
console.log('app.js patched successfully.');
