$content = Get-Content "C:\Users\hidis\.gemini\antigravity\scratch\web-messenger\app_fixed.js" -Raw
$startIdx = $content.IndexOf("    const EMOJIS =")
$endIdx = $content.IndexOf("    function applyTranslation")

if ($startIdx -lt 0 -or $endIdx -lt 0) {
    Write-Output "Could not find start or end index!"
    exit 1
}

$goodConstants = @"
    const EMOJIS = ['😀','😂','🥰','😎','🤔','😢','😡','👍','👎','❤️','🔥','🎉'];
    const GIFS = ['https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', 'https://media.giphy.com/media/l0HlOBZcl7sbV6Vg8/giphy.gif', 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', 'https://media.giphy.com/media/26AHONQ79FdWZhAIw/giphy.gif'];

    const TRANSLATIONS = {
        de: { login_title: "Doori Messenger", login_subtitle: "Bitte wähle einen Benutzernamen.", login_btn: "Weiter", sec_personal: "Persönlich", chat_saved: "Gespeichertes", sec_rooms: "Gruppen & Kanäle", chat_general: "Allgemein", sec_contacts: "Kontakte", status_online: "Online", btn_block: "Blockieren", btn_unblock: "Entblocken", err_blocked: "Du hast diesen Kontakt blockiert.", err_channel: "Nur Administratoren können hier schreiben.", placeholder_msg: "Nachricht schreiben...", placeholder_search: "Benutzer suchen (@name)...", ttl_off: "⏱️ Aus", btn_cancel: "❌", btn_stop_send: "▶ Senden", modal_new_room: "Neuer Raum", lbl_room_name: "Name der Gruppe / des Kanals", opt_group: "Gruppe (Jeder kann schreiben)", opt_channel: "Kanal (Nur Admins)", btn_create: "Erstellen", modal_settings: "Einstellungen", tab_profile: "Profil", tab_privacy: "Privatsphäre", tab_chats: "Chats", btn_change_pic: "Bild ändern", lbl_language: "Sprache / Language", lbl_last_seen: "`"Zuletzt online`" anzeigen", lbl_read_receipts: "Lesebestätigungen", lbl_sound: "Benachrichtigungstöne", lbl_storage_used: "Lokaler Speicher genutzt:", btn_clear_cache: "Cache leeren" },
        en: { login_title: "Doori Messenger", login_subtitle: "Please choose a username.", login_btn: "Continue", sec_personal: "Personal", chat_saved: "Saved Messages", sec_rooms: "Groups & Channels", chat_general: "General", sec_contacts: "Contacts", status_online: "Online", btn_block: "Block", btn_unblock: "Unblock", err_blocked: "You blocked this contact.", err_channel: "Only admins can post here.", placeholder_msg: "Write a message...", placeholder_search: "Search user (@name)...", ttl_off: "⏱️ Off", btn_cancel: "❌", btn_stop_send: "▶ Send", modal_new_room: "New Room", lbl_room_name: "Group / Channel Name", opt_group: "Group (Anyone can write)", opt_channel: "Channel (Admins only)", btn_create: "Create", modal_settings: "Settings", tab_profile: "Profile", tab_privacy: "Privacy", tab_chats: "Chats", btn_change_pic: "Change Picture", lbl_language: "Language", lbl_last_seen: "Show `"Last Seen`"", lbl_read_receipts: "Read Receipts", lbl_sound: "Notification Sounds", lbl_storage_used: "Local Storage Used:", btn_clear_cache: "Clear Cache" },
        fa: { login_title: "دوری مسنجر", login_subtitle: "لطفاً یک نام کاربری انتخاب کنید.", login_btn: "ادامه", sec_personal: "شخصی", chat_saved: "پیام‌های ذخیره‌شده", sec_rooms: "گروه‌ها و کانال‌ها", chat_general: "عمومی", sec_contacts: "مخاطبین", status_online: "آنلاین", btn_block: "مسدود کردن", btn_unblock: "رفع مسدودی", err_blocked: "شما این مخاطب را مسدود کرده‌اید.", err_channel: "فقط مدیران می‌توانند اینجا پیام ارسال کنند.", placeholder_msg: "پیامی بنویسید...", placeholder_search: "جستجوی کاربر (@نام)...", ttl_off: "⏱️ خاموش", btn_cancel: "❌", btn_stop_send: "▶ ارسال", modal_new_room: "اتاق جدید", lbl_room_name: "نام گروه / کانال", opt_group: "گروه (همه می‌توانند بنویسند)", opt_channel: "کانال (فقط مدیران)", btn_create: "ایجاد", modal_settings: "تنظیمات", tab_profile: "پروفایل", tab_privacy: "حریم خصوصی", tab_chats: "چت‌ها", btn_change_pic: "تغییر عکس", lbl_language: "زبان", lbl_last_seen: "نمایش `"آخرین بازدید`"", lbl_read_receipts: "رسید خواندن پیام", lbl_sound: "صداهای اعلان", lbl_storage_used: "فضای ذخیره‌سازی محلی استفاده‌شده:", btn_clear_cache: "پاک کردن حافظه پنهان" },
        ar: { login_title: "دوري ماسنجر", login_subtitle: "يرجى اختيار اسم مستخدم.", login_btn: "متابعة", sec_personal: "شخصي", chat_saved: "الرسائل المحفوظة", sec_rooms: "المجموعات والقنوات", chat_general: "عام", sec_contacts: "جهات الاتصال", status_online: "متصل", btn_block: "حظر", btn_unblock: "إلغاء الحظر", err_blocked: "لقد قمت بحظر جهة الاتصال هذه.", err_channel: "المشرفون فقط يمكنهم النشر هنا.", placeholder_msg: "اكتب رسالة...", placeholder_search: "البحث عن مستخدم (@اسم)...", ttl_off: "⏱️ إيقاف", btn_cancel: "❌", btn_stop_send: "▶ إرسال", modal_new_room: "غرفة جديدة", lbl_room_name: "اسم المجموعة / القناة", opt_group: "مجموعة (يمكن للجميع الكتابة)", opt_channel: "قناة (للمشرفين فقط)", btn_create: "إنشاء", modal_settings: "الإعدادات", tab_profile: "الملف الشخصي", tab_privacy: "الخصوصية", tab_chats: "الدردشات", btn_change_pic: "تغيير الصورة", lbl_language: "اللغة", lbl_last_seen: "إظهار `"آخر ظهور`"", lbl_read_receipts: "إيصالات القراءة", lbl_sound: "أصوات الإشعارات", lbl_storage_used: "مساحة التخزين المحلية المستخدمة:", btn_clear_cache: "مسح ذاكرة التخزين المؤقت" }
    };

"@

$newContent = $content.Substring(0, $startIdx) + $goodConstants + $content.Substring($endIdx)

$newContent = $newContent.Replace("loginSubmitBtn.textContent = 'Ldt...';", "loginSubmitBtn.textContent = 'Lädt...';")
$newContent = $newContent.Replace("loginError.textContent = 'Bitte besttige zuerst deine E-Mail-Adresse ber den Link, den wir dir gesendet haben.';", "loginError.textContent = 'Bitte bestätige zuerst deine E-Mail-Adresse über den Link, den wir dir gesendet haben.';")
$newContent = $newContent.Replace("playBtn.textContent = '?';", "playBtn.textContent = '▶️';")
$newContent = $newContent.Replace("playBtn.textContent = '?'", "playBtn.textContent = '⏸️'")
$newContent = $newContent.Replace("currentChatAvatar.textContent = '??';", "currentChatAvatar.textContent = '💾';")
$newContent = $newContent.Replace("currentChatAvatar.textContent = '??'", "currentChatAvatar.textContent = '💾'")

[System.IO.File]::WriteAllText("C:\Users\hidis\.gemini\antigravity\scratch\web-messenger\app.js", $newContent, [System.Text.Encoding]::UTF8)
Write-Output "Successfully built app.js!"
