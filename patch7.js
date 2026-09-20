const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

const appendCode = `
setTimeout(() => {
    // Translations for Clear Chat
    const additions = {
        de: { btn_clear_chat: 'Chat leeren', msg_confirm_clear: 'Diesen Chat wirklich für alle leeren?' },
        en: { btn_clear_chat: 'Clear Chat', msg_confirm_clear: 'Really clear this chat for everyone?' },
        fa: { btn_clear_chat: 'پاک کردن چت', msg_confirm_clear: 'آیا این چت برای همه پاک شود؟' },
        ar: { btn_clear_chat: 'مسح الدردشة', msg_confirm_clear: 'هل تريد حقًا مسح هذه الدردشة للجميع؟' },
        tr: { btn_clear_chat: 'Sohbeti Temizle', msg_confirm_clear: 'Bu sohbeti herkes için gerçekten temizle?' }
    };
    for(let lang in additions) {
        if(typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang]) {
            Object.assign(TRANSLATIONS[lang], additions[lang]);
        }
    }

    // Clear Chat Logic
    const clearBtn = document.getElementById('clear-chat-btn');
    if(clearBtn) {
        clearBtn.addEventListener('click', () => {
            if(typeof currentChat === 'undefined' || !currentChat) return;
            const msgs = typeof messages !== 'undefined' ? (messages.get(currentChat.id) || []) : [];
            const t = typeof TRANSLATIONS !== 'undefined' ? (TRANSLATIONS[currentLang] || TRANSLATIONS['de']) : {};
            
            if(confirm(t.msg_confirm_clear || 'Diesen Chat wirklich für alle leeren?')) {
                msgs.forEach(msg => {
                    if(typeof db !== 'undefined') db.collection('messages').doc(msg.id).delete().catch(()=>{});
                });
                if(typeof messages !== 'undefined') messages.set(currentChat.id, []);
                if(typeof renderMessages === 'function') renderMessages();
                
                // Close sidebar if open
                const sidebar = document.getElementById('group-info-sidebar');
                if(sidebar) sidebar.classList.add('hidden');
            }
        });
    }

    if(typeof applyTranslation === 'function') applyTranslation(currentLang);
}, 500);
`;

fs.writeFileSync('app.js', js + '\n' + appendCode);
console.log('app.js patched successfully for clear chat.');
