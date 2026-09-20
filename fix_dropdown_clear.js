const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

const target = `dropdownClearChat.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentChat) return;
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_feature_update || 'Diese Funktion steht im nächsten Update zur Verfügung.');
            chatHeaderDropdown.classList.add('hidden');
        });`;

const replacement = `dropdownClearChat.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentChat) return;
            const msgs = messages.get(currentChat.id) || [];
            const t = typeof TRANSLATIONS !== 'undefined' ? (TRANSLATIONS[currentLang] || TRANSLATIONS['de']) : {};
            if(confirm(t.msg_confirm_clear || 'Diesen Chat wirklich für alle leeren?')) {
                msgs.forEach(msg => {
                    db.collection('messages').doc(msg.id).delete().catch(()=>{});
                });
                messages.set(currentChat.id, []);
                renderMessages();
                const sidebar = document.getElementById('group-info-sidebar');
                if(sidebar && !sidebar.classList.contains('hidden')) sidebar.classList.add('hidden');
            }
            chatHeaderDropdown.classList.add('hidden');
        });`;

js = js.replace(target, replacement);

fs.writeFileSync('app.js', js);
console.log('Fixed dropdownClearChat logic');
