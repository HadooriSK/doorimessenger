const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

const tAdd = `
    const extraOptions = {
        de: { ctx_add_contact: 'Zu Kontakten hinzufügen', ctx_mute_user: 'Stummschalten', ctx_unmute_user: 'Stummschaltung aufheben', ctx_clear_chat: 'Chat leeren', ctx_block_user: 'Blockieren', ctx_unblock_user: 'Entblocken', msg_confirm_clear: 'Diesen Chat wirklich für alle leeren?', msg_confirm_block: 'Sind Sie sich sicher, dass Sie den Benutzer blockieren möchten? (Ja / Nein)' },
        en: { ctx_add_contact: 'Add to contacts', ctx_mute_user: 'Mute', ctx_unmute_user: 'Unmute', ctx_clear_chat: 'Clear chat', ctx_block_user: 'Block', ctx_unblock_user: 'Unblock', msg_confirm_clear: 'Really clear this chat for everyone?', msg_confirm_block: 'Are you sure you want to block this user? (Yes / No)' },
        fa: { ctx_add_contact: 'افزودن به مخاطبین', ctx_mute_user: 'بی‌صدا کردن', ctx_unmute_user: 'باصدا کردن', ctx_clear_chat: 'پاک کردن چت', ctx_block_user: 'مسدود کردن', ctx_unblock_user: 'رفع مسدودیت', msg_confirm_clear: 'آیا واقعاً می‌خواهید این چت را برای همه پاک کنید؟', msg_confirm_block: 'آیا مطمئن هستید که می‌خواهید این کاربر را مسدود کنید؟ (بله / خیر)' },
        ar: { ctx_add_contact: 'أضف إلى جهات الاتصال', ctx_mute_user: 'كتم الصوت', ctx_unmute_user: 'إلغاء كتم الصوت', ctx_clear_chat: 'مسح الدردشة', ctx_block_user: 'حظر', ctx_unblock_user: 'إلغاء الحظر', msg_confirm_clear: 'هل تريد حقًا مسح هذه الدردشة للجميع؟', msg_confirm_block: 'هل أنت متأكد أنك تريد حظر هذا المستخدم؟ (نعم / لا)' },
        tr: { ctx_add_contact: 'Kişilere ekle', ctx_mute_user: 'Sessize al', ctx_unmute_user: 'Sesi aç', ctx_clear_chat: 'Sohbeti temizle', ctx_block_user: 'Engelle', ctx_unblock_user: 'Engeli kaldır', msg_confirm_clear: 'Bu sohbeti herkes için gerçekten temizlemek istiyor musunuz?', msg_confirm_block: 'Bu kullanıcıyı engellemek istediğinizden emin misiniz? (Evet / Hayır)' }
    };
    ['de', 'en', 'fa', 'ar', 'tr'].forEach(lang => {
        if(window.TRANSLATIONS && window.TRANSLATIONS[lang]) {
            Object.assign(window.TRANSLATIONS[lang], extraOptions[lang]);
        }
    });
`;

if (!js.includes('extraOptions')) {
    js = js.replace(/}\);\n}\n\n\/\/ Ensure translations are applied dynamically/, tAdd + '\n});\n}\n\n// Ensure translations are applied dynamically');
}

fs.writeFileSync('app.js', js, 'utf8');
console.log("Translations added.");
