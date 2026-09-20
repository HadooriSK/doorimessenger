const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

// 1. Add msg.id
js = js.replace(/const msg = change\.doc\.data\(\);/g, 'const msg = change.doc.data();\n                    msg.id = change.doc.id;');

// 2. Add block confirmation
const blockLogicTarget = `if (!currentChat || currentChat.type !== 'dm') return;
            if (blockedContacts.has(currentChat.id)) blockedContacts.delete(currentChat.id);`;

const blockLogicReplacement = `if (!currentChat || currentChat.type !== 'dm') return;
            
            const t = typeof TRANSLATIONS !== 'undefined' ? (TRANSLATIONS[currentLang] || TRANSLATIONS['de']) : {};
            if (!blockedContacts.has(currentChat.id)) {
                if (!confirm(t.msg_confirm_block || 'Sind Sie sich sicher, dass Sie den Benutzer blockieren möchten? (Ja / Nein)')) {
                    return;
                }
            }

            if (blockedContacts.has(currentChat.id)) blockedContacts.delete(currentChat.id);`;

js = js.replace(blockLogicTarget, blockLogicReplacement);

// 3. Add translations for msg_confirm_block
const transTarget = `msg_confirm_clear: 'Diesen Chat wirklich für alle leeren?' }`;
const transReplacement = `msg_confirm_clear: 'Diesen Chat wirklich für alle leeren?', msg_confirm_block: 'Sind Sie sich sicher, dass Sie den Benutzer blockieren möchten? (Ja / Nein)' }`;

const transTargetEn = `msg_confirm_clear: 'Really clear this chat for everyone?' }`;
const transReplacementEn = `msg_confirm_clear: 'Really clear this chat for everyone?', msg_confirm_block: 'Are you sure you want to block this user? (Yes / No)' }`;

const transTargetFa = `msg_confirm_clear: 'آیا این چت برای همه پاک شود؟' }`;
const transReplacementFa = `msg_confirm_clear: 'آیا این چت برای همه پاک شود؟', msg_confirm_block: 'آیا مطمئن هستید که می‌خواهید این کاربر را مسدود کنید؟ (بله / خیر)' }`;

const transTargetAr = `msg_confirm_clear: 'هل تريد حقًا مسح هذه الدردشة للجميع؟' }`;
const transReplacementAr = `msg_confirm_clear: 'هل تريد حقًا مسح هذه الدردشة للجميع؟', msg_confirm_block: 'هل أنت متأكد أنك تريد حظر هذا المستخدم؟ (نعم / لا)' }`;

const transTargetTr = `msg_confirm_clear: 'Bu sohbeti herkes için gerçekten temizle?' }`;
const transReplacementTr = `msg_confirm_clear: 'Bu sohbeti herkes için gerçekten temizle?', msg_confirm_block: 'Bu kullanıcıyı engellemek istediğinizden emin misiniz? (Evet / Hayır)' }`;

js = js.replace(transTarget, transReplacement)
       .replace(transTargetEn, transReplacementEn)
       .replace(transTargetFa, transReplacementFa)
       .replace(transTargetAr, transReplacementAr)
       .replace(transTargetTr, transReplacementTr);

fs.writeFileSync('app.js', js);
console.log('Fixed msg.id and added block confirm dialog!');
