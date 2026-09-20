const fs = require('fs');

const path = 'app.js';
let content = fs.readFileSync(path, 'utf8');

const translations = {
    de: {
        err_select_chat: 'Bitte wähle zuerst einen Chat aus.',
        err_group_not_found: 'Diese Gruppe existiert nicht oder wurde gelöscht.',
        err_join_group: 'Fehler beim Beitreten der Gruppe.',
        msg_copied_clipboard: 'Text in die Zwischenablage kopiert! (Teilen wird auf diesem Gerät nicht nativ unterstützt)',
        err_send_msg: 'Nachricht konnte nicht gesendet werden (Offline?).',
        err_feature_update: 'Diese Funktion steht im nächsten Update zur Verfügung.',
        err_group_username_req: 'Bitte gib einen Benutzernamen für die Gruppe ein (z.B. @meinegruppe).',
        err_username_invalid: 'Der Benutzername darf keine Leerzeichen enthalten und muss mindestens 2 Zeichen lang sein.',
        err_username_taken: 'Dieser Benutzername ist bereits von einem anderen Benutzer belegt.',
        err_group_username_taken: 'Dieser Gruppen-Benutzername ist bereits vergeben. Bitte wähle einen anderen.',
        err_create_group: 'Fehler beim Erstellen der Gruppe.',
        err_search_self: 'Das bist du selbst!',
        err_user_not_found_privacy: 'Benutzername nicht gefunden (Privatsphäre).',
        msg_added_contact: ' wurde zu den Kontakten hinzugefügt!',
        err_already_contact: ' ist bereits ein Kontakt.',
        err_user_not_found2: 'Benutzername nicht gefunden.',
        err_search: 'Fehler bei der Suche.',
        msg_group_deleted: 'Die Gruppe existiert nicht mehr.',
        prompt_new_group_name: 'Neuer Gruppenname:',
        prompt_new_desc: 'Neue Beschreibung:'
    },
    en: {
        err_select_chat: 'Please select a chat first.',
        err_group_not_found: 'This group does not exist or was deleted.',
        err_join_group: 'Error joining the group.',
        msg_copied_clipboard: 'Text copied to clipboard! (Sharing not natively supported)',
        err_send_msg: 'Message could not be sent (Offline?).',
        err_feature_update: 'This feature will be available in the next update.',
        err_group_username_req: 'Please enter a username for the group (e.g. @mygroup).',
        err_username_invalid: 'The username cannot contain spaces and must be at least 2 chars long.',
        err_username_taken: 'This username is already taken by another user.',
        err_group_username_taken: 'This group username is already taken. Please choose another one.',
        err_create_group: 'Error creating the group.',
        err_search_self: 'That is you!',
        err_user_not_found_privacy: 'Username not found (Privacy).',
        msg_added_contact: ' was added to your contacts!',
        err_already_contact: ' is already a contact.',
        err_user_not_found2: 'Username not found.',
        err_search: 'Search failed.',
        msg_group_deleted: 'The group no longer exists.',
        prompt_new_group_name: 'New group name:',
        prompt_new_desc: 'New description:'
    },
    fa: {
        err_select_chat: 'لطفاً ابتدا یک چت انتخاب کنید.',
        err_group_not_found: 'این گروه وجود ندارد یا حذف شده است.',
        err_join_group: 'خطا در پیوستن به گروه.',
        msg_copied_clipboard: 'متن در کلیپ بورد کپی شد!',
        err_send_msg: 'پیام ارسال نشد (آفلاین؟).',
        err_feature_update: 'این قابلیت در بروزرسانی بعدی در دسترس خواهد بود.',
        err_group_username_req: 'لطفا یک نام کاربری برای گروه وارد کنید (مثلا @mygroup).',
        err_username_invalid: 'نام کاربری نمی‌تواند شامل فاصله باشد و باید حداقل 2 حرف داشته باشد.',
        err_username_taken: 'این نام کاربری قبلاً توسط کاربر دیگری گرفته شده است.',
        err_group_username_taken: 'این نام کاربری گروه قبلاً گرفته شده است. لطفاً یکی دیگر انتخاب کنید.',
        err_create_group: 'خطا در ایجاد گروه.',
        err_search_self: 'این خود شما هستید!',
        err_user_not_found_privacy: 'نام کاربری یافت نشد (حریم خصوصی).',
        msg_added_contact: ' به مخاطبین شما اضافه شد!',
        err_already_contact: ' قبلاً در مخاطبین شما بوده است.',
        err_user_not_found2: 'نام کاربری یافت نشد.',
        err_search: 'جستجو ناموفق بود.',
        msg_group_deleted: 'گروه دیگر وجود ندارد.',
        prompt_new_group_name: 'نام گروه جدید:',
        prompt_new_desc: 'توضیحات جدید:'
    },
    ar: {
        err_select_chat: 'يرجى اختيار دردشة أولاً.',
        err_group_not_found: 'هذه المجموعة غير موجودة أو تم حذفها.',
        err_join_group: 'خطأ في الانضمام إلى المجموعة.',
        msg_copied_clipboard: 'تم نسخ النص إلى الحافظة!',
        err_send_msg: 'تعذر إرسال الرسالة (غير متصل؟).',
        err_feature_update: 'ستكون هذه الميزة متاحة في التحديث القادم.',
        err_group_username_req: 'يرجى إدخال اسم مستخدم للمجموعة (مثل @mygroup).',
        err_username_invalid: 'لا يمكن أن يحتوي اسم المستخدم على مسافات ويجب أن يكون طوله حرفين على الأقل.',
        err_username_taken: 'اسم المستخدم هذا مستخدم بالفعل من قبل مستخدم آخر.',
        err_group_username_taken: 'اسم مستخدم المجموعة هذا مأخوذ. يرجى اختيار اسم آخر.',
        err_create_group: 'خطأ في إنشاء المجموعة.',
        err_search_self: 'هذا أنت!',
        err_user_not_found_privacy: 'اسم المستخدم غير موجود (الخصوصية).',
        msg_added_contact: ' تمت إضافته إلى جهات الاتصال الخاصة بك!',
        err_already_contact: ' هو بالفعل جهة اتصال.',
        err_user_not_found2: 'اسم المستخدم غير موجود.',
        err_search: 'فشل البحث.',
        msg_group_deleted: 'المجموعة لم تعد موجودة.',
        prompt_new_group_name: 'اسم المجموعة الجديد:',
        prompt_new_desc: 'وصف جديد:'
    },
    tr: {
        err_select_chat: 'Lütfen önce bir sohbet seçin.',
        err_group_not_found: 'Bu grup mevcut değil veya silinmiş.',
        err_join_group: 'Gruba katılırken hata oluştu.',
        msg_copied_clipboard: 'Metin panoya kopyalandı!',
        err_send_msg: 'Mesaj gönderilemedi (Çevrimdışı?).',
        err_feature_update: 'Bu özellik bir sonraki güncellemede kullanıma sunulacak.',
        err_group_username_req: 'Lütfen grup için bir kullanıcı adı girin (örn. @mygroup).',
        err_username_invalid: 'Kullanıcı adı boşluk içeremez ve en az 2 karakter uzunluğunda olmalıdır.',
        err_username_taken: 'Bu kullanıcı adı zaten başka bir kullanıcı tarafından alınmış.',
        err_group_username_taken: 'Bu grup kullanıcı adı zaten alınmış. Lütfen başka bir tane seçin.',
        err_create_group: 'Grup oluşturulurken hata oluştu.',
        err_search_self: 'Bu sensin!',
        err_user_not_found_privacy: 'Kullanıcı adı bulunamadı (Gizlilik).',
        msg_added_contact: ' kişilerinize eklendi!',
        err_already_contact: ' zaten bir kişi.',
        err_user_not_found2: 'Kullanıcı adı bulunamadı.',
        err_search: 'Arama başarısız.',
        msg_group_deleted: 'Grup artık mevcut değil.',
        prompt_new_group_name: 'Yeni grup adı:',
        prompt_new_desc: 'Yeni açıklama:'
    }
};

// 1. Inject translations into TRANSLATIONS blocks in app.js
for (const lang of ['de', 'en', 'fa', 'ar', 'tr']) {
    let props = Object.entries(translations[lang]).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
    
    // Find the first occurrence of Object.assign(TRANSLATIONS.<lang>, {
    const searchStr = `Object.assign(TRANSLATIONS.${lang}, {`;
    const replaceStr = `Object.assign(TRANSLATIONS.${lang}, { ${props}, `;
    content = content.replace(searchStr, replaceStr);
}

// 2. Replace hardcoded strings in code with localized equivalents
const replacements = [
    { s: /alert\('Bitte wähle zuerst einen Chat aus\.'\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_select_chat || 'Bitte wähle zuerst einen Chat aus.')" },
    { s: /alert\("Diese Gruppe existiert nicht oder wurde gelöscht\."\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_group_not_found || 'Diese Gruppe existiert nicht oder wurde gelöscht.')" },
    { s: /alert\("Fehler beim Beitreten der Gruppe\."\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_join_group || 'Fehler beim Beitreten der Gruppe.')" },
    { s: /alert\("Text in die Zwischenablage kopiert! \(Teilen wird auf diesem Gerät nicht nativ unterstützt\)"\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_copied_clipboard || 'Text in die Zwischenablage kopiert! (Teilen wird auf diesem Gerät nicht nativ unterstützt)')" },
    { s: /alert\("Nachricht konnte nicht gesendet werden \(Offline\?\)\."\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_send_msg || 'Nachricht konnte nicht gesendet werden (Offline?).')" },
    { s: /alert\('Diese Funktion steht im nächsten Update zur Verfügung\.'\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_feature_update || 'Diese Funktion steht im nächsten Update zur Verfügung.')" },
    { s: /alert\('Bitte gib einen Benutzernamen für die Gruppe ein \(z\.B\. @meinegruppe\)\.'\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_group_username_req || 'Bitte gib einen Benutzernamen für die Gruppe ein (z.B. @meinegruppe).')" },
    { s: /alert\('Der Benutzername darf keine Leerzeichen enthalten und muss mindestens 2 Zeichen lang sein\.'\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_username_invalid || 'Der Benutzername darf keine Leerzeichen enthalten und muss mindestens 2 Zeichen lang sein.')" },
    { s: /alert\('Dieser Benutzername ist bereits von einem anderen Benutzer belegt\.'\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_username_taken || 'Dieser Benutzername ist bereits von einem anderen Benutzer belegt.')" },
    { s: /alert\('Dieser Gruppen-Benutzername ist bereits vergeben\. Bitte wähle einen anderen\.'\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_group_username_taken || 'Dieser Gruppen-Benutzername ist bereits vergeben. Bitte wähle einen anderen.')" },
    { s: /alert\("Fehler beim Erstellen der Gruppe\."\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_create_group || 'Fehler beim Erstellen der Gruppe.')" },
    { s: /alert\("Das bist du selbst!"\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_search_self || 'Das bist du selbst!')" },
    { s: /alert\("Benutzername nicht gefunden \(Privatsphäre\)\."\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_user_not_found_privacy || 'Benutzername nicht gefunden (Privatsphäre).')" },
    { s: /alert\(currentChat\.id \+ ' wurde zu deinen Kontakten hinzugefügt\.'\)/g, r: "alert(currentChat.id + ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_added_contact || ' wurde zu den Kontakten hinzugefügt!'))" },
    { s: /alert\(currentChat\.id \+ ' ist bereits ein Kontakt\.'\)/g, r: "alert(currentChat.id + ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_already_contact || ' ist bereits ein Kontakt.'))" },
    { s: /alert\(q \+ ' wurde zu den Kontakten hinzugefügt!'\)/g, r: "alert(q + ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_added_contact || ' wurde zu den Kontakten hinzugefügt!'))" },
    { s: /alert\(q \+ ' ist bereits ein Kontakt\.'\)/g, r: "alert(q + ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_already_contact || ' ist bereits ein Kontakt.'))" },
    { s: /alert\("Benutzername nicht gefunden\."\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_user_not_found2 || 'Benutzername nicht gefunden.')" },
    { s: /alert\("Fehler bei der Suche\."\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_search || 'Fehler bei der Suche.')" },
    { s: /alert\("Die Gruppe existiert nicht mehr\."\)/g, r: "alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_group_deleted || 'Die Gruppe existiert nicht mehr.')" },
    
    // Prompts
    { s: /prompt\("Neuer Gruppenname:", currentChat\.name\)/g, r: "prompt((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).prompt_new_group_name || 'Neuer Gruppenname:', currentChat.name)" },
    { s: /prompt\("Neue Beschreibung:", currentChat\.description \|\| ""\)/g, r: "prompt((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).prompt_new_desc || 'Neue Beschreibung:', currentChat.description || '')" },
    
    // global-invite-text
    { s: /textEl\.innerHTML = `Du wurdest von <b>\$\{msg\.sender_username\}<\/b> in die Gruppe <b>\$\{msg\.invite_group_name\}<\/b> eingeladen\.`;/g, r: "textEl.innerHTML = ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_invited_by || 'Du wurdest von <b>{sender}</b> in die Gruppe <b>{group}</b> eingeladen.').replace('{sender}', msg.sender_username).replace('{group}', msg.invite_group_name);" }
];

for (let r of replacements) {
    content = content.replace(r.s, r.r);
}

fs.writeFileSync(path, content);
console.log("Done refactoring hardcoded text.");
