const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

// 1. Add translations to phase2Additions
const transDe = `msg_confirm_block: 'Sind Sie sich sicher, dass Sie den Benutzer blockieren möchten? (Ja / Nein)' }`;
const transDeRep = `msg_confirm_block: 'Sind Sie sich sicher, dass Sie den Benutzer blockieren möchten? (Ja / Nein)', ctx_add_contact: 'Zu Kontakten hinzufügen', ctx_mute_user: 'Stummschalten', ctx_unmute_user: 'Stummschaltung aufheben', ctx_clear_chat: 'Chat leeren', ctx_block_user: 'Blockieren', ctx_unblock_user: 'Entblocken' }`;

const transEn = `msg_confirm_block: 'Are you sure you want to block this user? (Yes / No)' }`;
const transEnRep = `msg_confirm_block: 'Are you sure you want to block this user? (Yes / No)', ctx_add_contact: 'Add to Contacts', ctx_mute_user: 'Mute', ctx_unmute_user: 'Unmute', ctx_clear_chat: 'Clear Chat', ctx_block_user: 'Block', ctx_unblock_user: 'Unblock' }`;

const transFa = `msg_confirm_block: 'آیا مطمئن هستید که می‌خواهید این کاربر را مسدود کنید؟ (بله / خیر)' }`;
const transFaRep = `msg_confirm_block: 'آیا مطمئن هستید که می‌خواهید این کاربر را مسدود کنید؟ (بله / خیر)', ctx_add_contact: 'افزودن به مخاطبین', ctx_mute_user: 'بی‌صدا کردن', ctx_unmute_user: 'صدادار کردن', ctx_clear_chat: 'پاک کردن چت', ctx_block_user: 'مسدود کردن', ctx_unblock_user: 'رفع مسدودیت' }`;

const transAr = `msg_confirm_block: 'هل أنت متأكد أنك تريد حظر هذا المستخدم؟ (نعم / لا)' }`;
const transArRep = `msg_confirm_block: 'هل أنت متأكد أنك تريد حظر هذا المستخدم؟ (نعم / لا)', ctx_add_contact: 'إضافة إلى جهات الاتصال', ctx_mute_user: 'كتم الصوت', ctx_unmute_user: 'إلغاء كتم الصوت', ctx_clear_chat: 'مسح الدردشة', ctx_block_user: 'حظر', ctx_unblock_user: 'إلغاء الحظر' }`;

const transTr = `msg_confirm_block: 'Bu kullanıcıyı engellemek istediğinizden emin misiniz? (Evet / Hayır)' }`;
const transTrRep = `msg_confirm_block: 'Bu kullanıcıyı engellemek istediğinizden emin misiniz? (Evet / Hayır)', ctx_add_contact: 'Kişilere Ekle', ctx_mute_user: 'Sessize Al', ctx_unmute_user: 'Sesi Aç', ctx_clear_chat: 'Sohbeti Temizle', ctx_block_user: 'Engelle', ctx_unblock_user: 'Engeli Kaldır' }`;

js = js.replace(transDe, transDeRep)
       .replace(transEn, transEnRep)
       .replace(transFa, transFaRep)
       .replace(transAr, transArRep)
       .replace(transTr, transTrRep);

// 2. Update the dynamic logic in chatHeaderBtn click
const dynTarget = `dropdownMuteUser.innerHTML = isMuted ? '🔔 Stummschaltung aufheben' : '🔕 Stummschalten';
                dropdownBlockUser.innerHTML = isBlocked ? '✅ Entblocken' : '🚫 Blockieren';`;

const dynReplacement = `const t = typeof TRANSLATIONS !== 'undefined' ? (TRANSLATIONS[currentLang] || TRANSLATIONS['de']) : {};
                dropdownMuteUser.innerHTML = isMuted ? '🔔 ' + (t.ctx_unmute_user || 'Stummschaltung aufheben') : '🔕 ' + (t.ctx_mute_user || 'Stummschalten');
                dropdownBlockUser.innerHTML = isBlocked ? '✅ ' + (t.ctx_unblock_user || 'Entblocken') : '🚫 ' + (t.ctx_block_user || 'Blockieren');`;

js = js.replace(dynTarget, dynReplacement);

fs.writeFileSync('app.js', js);
console.log('Fixed dropdown dynamic translations in app.js');
