document.addEventListener('DOMContentLoaded', () => {
    window.logDebug = function(msg) {
        const d = document.getElementById('debug-log');
        if (d) d.innerText += '\n' + msg;
    };
    if(window.logDebug) window.logDebug('App v300 initialized');
    // --- State & DOM Elements ---
    let currentUser = null;
    let users = new Map(); // username -> profile { avatarUrl, status, lastSeen }
    let chatData = {
        personal: [{ id: 'saved', name: 'Gespeichertes', type: 'saved' }],
        rooms: [{ id: 'general', name: 'Allgemein', type: 'room' }],
        contacts: [],
        active_chats: []
    };
    let messages = new Map(); // chatId -> [msgObj]
    let currentChat = null;

document.getElementById('back-to-list-btn').addEventListener('click', () => {
    document.getElementById('chat-page').classList.remove('active');
    document.getElementById('start-page').classList.add('active');
    currentChat = null;
    // Fullscreen behavior removed per user request
});

    let blockedContacts = new Set();
    let mutedChats = new Set();
    let currentLang = localStorage.getItem('doori_lang') || 'en';
    window.currentLang = currentLang;
    let mediaRecorder; let audioChunks = []; let videoChunks = []; let recordingInterval; let recordingStartTime;
    let playerColor = localStorage.getItem('doori_player_color') || '#00d2d3';
    let playerGlass = localStorage.getItem('doori_player_glass') !== 'false';
    let editingMessageId = null;
    let unsubListeners = [];
    let unreadChats = new Set();

    const screens = { login: document.getElementById('login-screen'), chat: document.getElementById('chat-screen') };
    const loginForm = document.getElementById('login-form'); const usernameInput = document.getElementById('username-input'); const emailInput = document.getElementById('email-input'); const passwordInput = document.getElementById('password-input'); const idInput = document.getElementById('id-input'); const idHint = document.getElementById('id-hint'); const loginSubmitBtn = document.getElementById('login-submit-btn'); const loginError = document.getElementById('login-error');
    const tabLogin = document.getElementById('tab-login'); const tabRegister = document.getElementById('tab-register'); const verificationInfo = document.getElementById('verification-info');
    const forgotPasswordLink = document.getElementById('forgot-password-link'); const forgotUsernameIdLink = document.getElementById('forgot-username-id-link'); const resendVerificationLink = document.getElementById('resend-verification-link'); const resendVerificationContainer = document.getElementById('resend-verification-container'); const rememberMeCheckbox = document.getElementById('remember-me-checkbox'); const rememberMeContainer = document.getElementById('remember-me-container');
    let audioPlayer = null;
    let isRegisterMode = false;

    // Pre-fill username and id from localStorage
    if (localStorage.getItem('doori_saved_username')) {
        usernameInput.value = localStorage.getItem('doori_saved_username');
        idInput.value = localStorage.getItem('doori_saved_id') || '';
    }

    
    function getAllowedAvatarUrl(username, profileData) {
        if (!profileData || !profileData.avatarUrl) return null;
        if (username.toLowerCase() === currentUser.toLowerCase()) return profileData.avatarUrl;
        
        const vis = profileData.avatarVisibility || 'all';
        if (vis === 'none') return null;
        if (vis === 'contacts') {
            const isContact = chatData.contacts.some(c => c.id.toLowerCase() === username.toLowerCase());
            if (!isContact) return null;
        }
        return profileData.avatarUrl;
    }
    
    const sidebar = document.getElementById('sidebar'); const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const currentUserDisplay = document.getElementById('current-user-display');
    const lists = { personal: document.getElementById('list-personal'),
        chats: document.getElementById('list-chats'), rooms: document.getElementById('list-rooms'), contacts: document.getElementById('list-contacts') };
    
    const settingsBtn = document.getElementById('settings-tab-btn'); const settingsModal = document.getElementById('settings-modal'); const closeSettingsBtn = document.getElementById('close-settings-btn'); const logoutBtn = document.getElementById('logout-btn');
    const avatarUpload = document.getElementById('avatar-upload'); const settingsAvatar = document.getElementById('settings-avatar');
    const addContactBtn = document.getElementById('add-contact-btn'); const addContactModal = document.getElementById('add-contact-modal'); const closeAddContactBtn = document.getElementById('close-add-contact-btn'); const createGroupModal = document.getElementById('create-group-modal'); const closeGroupModalBtn = document.getElementById('close-group-modal-btn'); const createGroupSubmitBtn = document.getElementById('create-group-submit-btn'); const newGroupName = document.getElementById('new-group-name'); const newGroupType = document.getElementById('new-group-type');
    const editGroupModal = document.getElementById('edit-group-modal'); const closeEditGroupBtn = document.getElementById('close-edit-group-btn'); const confirmEditGroupBtn = document.getElementById('confirm-edit-group-btn'); const editGroupName = document.getElementById('edit-group-name'); const editGroupDesc = document.getElementById('edit-group-desc'); const editGroupAvatar = document.getElementById('edit-group-avatar'); const editGroupAvatarPreview = document.getElementById('edit-group-avatar-preview');
    let editGroupAvatarUrl = null;
    const langSelect = document.getElementById('lang-select');
    const loginLangSelect = document.getElementById('login-lang-select');
    const userSearchInput = document.getElementById('user-search-input'); const userSearchBtn = document.getElementById('user-search-btn');
    
    const chatHeaderInfo = document.querySelector('.chat-header-info'); const currentChatAvatar = document.getElementById('current-chat-avatar'); const currentChatName = document.getElementById('current-chat-name'); const currentChatStatus = document.getElementById('current-chat-status');
    const chatActions = document.getElementById('chat-actions'); const callBtn = document.getElementById('call-btn'); 
    const chatHeaderProfileBtn = document.getElementById('chat-header-profile-btn');
    const chatHeaderDropdown = document.getElementById('chat-header-dropdown');
    const dropdownAddContact = document.getElementById('dropdown-add-contact');
    const dropdownMuteUser = document.getElementById('dropdown-mute-user');
    const dropdownClearChat = document.getElementById('dropdown-clear-chat');
    const dropdownBlockUser = document.getElementById('dropdown-block-user');
    const blockedNotice = document.getElementById('blocked-notice'); const channelNotice = document.getElementById('channel-notice');
    const messagesContainer = document.getElementById('messages-container'); const messageForm = document.getElementById('message-form'); const messageInput = document.getElementById('message-input');
const doodleBtnGlobal = document.getElementById('doodle-btn');
if (doodleBtnGlobal) {
    doodleBtnGlobal.addEventListener('click', () => {
        if (window.initDoodleInvite && currentChat) {
            window.initDoodleInvite('@' + currentChat.id);
        } else if (!currentChat) {
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_select_chat || 'Bitte wähle zuerst einen Chat aus.');
        } else {
            console.error('Doodle ist nicht verfügbar.');
        }
    });
}
 const ttlSelect = document.getElementById('ttl-select'); const chatInputArea = document.querySelector('.chat-input-area');
    
    const emojiBtn = document.getElementById('emoji-btn'); const gifBtn = document.getElementById('gif-btn'); const emojiPicker = document.getElementById('emoji-picker'); const gifPicker = document.getElementById('gif-picker');
    const recordAudioBtn = document.getElementById('record-audio-btn'); const recordVideoBtn = document.getElementById('record-video-btn'); const recordingPreview = document.getElementById('recording-preview'); const liveVideoPreview = document.getElementById('live-video-preview'); const stopRecordingBtn = document.getElementById('stop-recording-btn'); const cancelRecordingBtn = document.getElementById('cancel-recording-btn'); const recordingTimeEl = document.getElementById('recording-time');
    const sendBtn = document.getElementById('send-btn'); const sendOptionsPopup = document.getElementById('send-options-popup'); const sendSilentBtn = document.getElementById('send-silent-btn'); const sendScheduleBtn = document.getElementById('send-schedule-btn');
    const scheduleModal = document.getElementById('schedule-modal'); const scheduleDatetime = document.getElementById('schedule-datetime'); const scheduleSubmitBtn = document.getElementById('schedule-submit-btn'); const closeScheduleModalBtn = document.getElementById('close-schedule-modal-btn');
    const buzzBtn = document.getElementById('buzz-btn');

    let globalAudioCtx = null;
    const unlockAudio = () => {
        if (!globalAudioCtx) globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    window.toggleMuteMember = async function(username, mute) {
        if (!currentChat || currentChat.type !== 'room' || !currentChat.admins.includes(currentUser)) return;
        try {
            if (mute) {
                await window.db.collection('groups').doc(currentChat.id).update({
                    mutedMembers: firebase.firestore.FieldValue.arrayUnion(username)
                });
            } else {
                await window.db.collection('groups').doc(currentChat.id).update({
                    mutedMembers: firebase.firestore.FieldValue.arrayRemove(username)
                });
            }
        } catch(e) { console.error("Error toggling mute", e); }
    };

    window.removeGroupMember = async function(username) {
        if (!currentChat || currentChat.type !== 'room' || !currentChat.admins.includes(currentUser)) return;
        try {
            await window.db.collection('groups').doc(currentChat.id).update({
                members: firebase.firestore.FieldValue.arrayRemove(username)
            });
            await window.sendSystemMessage(currentChat.id, 'removed', username);
        } catch(e) { console.error("Error removing member", e); }
    };
    
    // Admin toggles setup
    const copyLinkBtn = document.getElementById('copy-group-link-btn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            if (currentChat && currentChat.type === 'room') {
                const inviteId = currentChat.groupId || currentChat.id;
                const link = `${window.location.origin}${window.location.pathname}?join=${inviteId}`;
                navigator.clipboard.writeText(link).then(() => alert('Einladungslink kopiert!'));
            }
        });
    }

    const readonlyToggle = document.getElementById('group-readonly-toggle');
    if (readonlyToggle) {
        readonlyToggle.addEventListener('change', async (e) => {
            if (currentChat && currentChat.type === 'room' && currentChat.admins.includes(currentUser)) {
                await window.db.collection('groups').doc(currentChat.id).update({
                    isReadOnly: e.target.checked
                });
            }
        });
    }

    // Context Menu
    const ctxOverlay = document.getElementById('message-context-overlay'); const ctxMenu = document.getElementById('message-context-menu');
    const ctxReply = document.getElementById('ctx-reply'); const ctxCopy = document.getElementById('ctx-copy'); const ctxEdit = document.getElementById('ctx-edit');
    const ctxPin = document.getElementById('ctx-pin'); const ctxForward = document.getElementById('ctx-forward'); const ctxDelete = document.getElementById('ctx-delete');
    const ctxSelect = document.getElementById('ctx-select'); const ctxShare = document.getElementById('ctx-share'); const emojiReactionBar = document.getElementById('emoji-reaction-bar');
    let contextMessageId = null; let contextMessageText = ''; let longPressTimerMsg = null;
    let contextMessageSender = ''; let contextMessageMedia = null;
    
    // Chat List Context Menu
    const chatListCtxOverlay = document.getElementById('chat-list-context-overlay');
    const chatListCtxMenu = document.getElementById('chat-list-context-menu');
    const ctxChatPin = document.getElementById('ctx-chat-pin');
    let contextChatId = null;
    let contextChatType = null;
    let pinnedChats = [];
    let dmPins = {};
    
    // Reply & Forward
    const replyBanner = document.getElementById('reply-banner'); const replyBannerTitle = document.getElementById('reply-banner-title'); const replyBannerText = document.getElementById('reply-banner-text'); const cancelReplyBtn = document.getElementById('cancel-reply-btn');
    const forwardModal = document.getElementById('forward-modal'); const closeForwardModalBtn = document.getElementById('close-forward-modal-btn'); const forwardChatList = document.getElementById('forward-chat-list');
    const forwardSearchInput = document.getElementById('forward-search-input'); const forwardSearchBtn = document.getElementById('forward-search-btn');
    let replyingToMessage = null; // { id, sender, text }

    // Select & Pin
    const selectionActionBar = document.getElementById('selection-action-bar');
    const selectionCount = document.getElementById('selection-count');
    const selectionForwardBtn = document.getElementById('selection-forward-btn');
    const selectionDeleteBtn = document.getElementById('selection-delete-btn');
    const selectionCancelBtn = document.getElementById('selection-cancel-btn');
    const pinnedMessageBanner = document.getElementById('pinned-message-banner');
    const pinnedTextPreview = document.getElementById('pinned-text-preview');
    const unpinBtn = document.getElementById('unpin-btn');
    const forwardContactsList = document.getElementById('forward-contacts-list');
    
    let isSelectMode = false;
    let selectedMessages = new Set();
    let forwardMessagesQueue = [];
    const EMOJIS = ['😀','😂','🥰','😎','🤔','👍','👎','❤️','🔥','🎉','💩','✅','❌','👀','🙏'];
    const GIFS = ['https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif', 'https://upload.wikimedia.org/wikipedia/commons/a/a2/112_Bouncing_Ball.gif', 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Newtons_cradle_animation_book_2.gif', 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Bouncing_ball_animation.gif'];

    const TRANSLATIONS = {
        de: { login_title: 'Doori Messenger', login_subtitle: 'Bitte wähle einen Benutzernamen.', login_btn: 'Weiter', sec_personal: 'Persönlich', chat_saved: 'Gespeichertes', sec_rooms: 'Gruppen', sec_chats: 'Chats', chat_general: 'Allgemein', sec_contacts: 'Kontakte', sec_calls: 'Anrufe', status_online: 'Online', btn_block: 'Blockieren', btn_unblock: 'Entblocken', err_blocked: 'Du hast diesen Kontakt blockiert.', err_channel: 'Nur Administratoren können hier schreiben.', placeholder_msg: 'Nachricht schreiben...', placeholder_search: 'Benutzer suchen (@name)...', ttl_off: '🕒 Aus', btn_cancel: 'Abbrechen', btn_save: 'Speichern', btn_stop_send: '⏹ Senden', modal_new_room: 'Neuer Raum', lbl_room_name: 'Name der Gruppe / des Kanals', opt_group: 'Gruppe (Jeder kann schreiben)', opt_channel: 'Kanal (Nur Admins)', btn_create: 'Erstellen', modal_settings: 'Einstellungen', tab_profile: 'Profil', tab_privacy: 'Privatsphäre', tab_chats: 'Chats', btn_change_pic: 'Bild ändern', lbl_language: 'Sprache / Language', lbl_last_seen: '"Zuletzt online" anzeigen', lbl_read_receipts: 'Lesebestätigungen', lbl_searchable: 'In der Suche auffindbar sein', lbl_avatar_visibility: 'Profilbild sichtbar für', opt_vis_all: 'Alle', opt_vis_contacts: 'Nur Kontakte', opt_vis_none: 'Niemand', lbl_sound: 'Benachrichtigungstöne', lbl_storage_used: 'Lokaler Speicher genutzt:', btn_clear_cache: 'Cache leeren', btn_logout: 'Ausloggen', lbl_call_privacy: 'Wer darf mich anrufen?', err_calls_blocked: 'Dieser Benutzer hat Anrufe blockiert.', err_calls_contacts: 'Dieser Benutzer erlaubt Anrufe nur von Kontakten.', ctx_reply: 'Antworten', ctx_copy: 'Kopieren', ctx_edit: 'Bearbeiten', ctx_select: 'Auswählen', ctx_forward: 'Weiterleiten', ctx_pin: 'Anheften', ctx_unpin: 'Loslösen', ctx_share: 'Teilen', ctx_delete: 'Löschen', ctx_delete_for_me: 'Für mich löschen', ctx_msg_info: 'Nachrichten-Info', msg_read_at: 'Gelesen am: ', msg_unread: 'Noch nicht gelesen', msg_read_unknown: 'Gelesen (kein genauer Zeitpunkt verfügbar)', dlg_delete_title: 'Nachricht löschen?', dlg_delete_for_all: 'Für alle löschen', dlg_cancel: 'Abbrechen', lbl_theme_mode: 'App Design', opt_theme_dark: 'Immer Dunkel', opt_theme_light: 'Immer Hell', opt_theme_auto: 'Automatisch (Sonnenauf-/Untergang)' },
        en: { login_title: 'Doori Messenger', login_subtitle: 'Please choose a username.', login_btn: 'Continue', sec_personal: 'Personal', chat_saved: 'Saved Messages', sec_rooms: 'Groups', sec_chats: 'Chats', chat_general: 'General', sec_contacts: 'Contacts', sec_calls: 'Calls', status_online: 'Online', btn_block: 'Block', btn_unblock: 'Unblock', err_blocked: 'You blocked this contact.', err_channel: 'Only administrators can post here.', placeholder_msg: 'Write a message...', placeholder_search: 'Search user (@name)...', ttl_off: '🕒 Off', btn_cancel: 'Cancel', btn_save: 'Save', btn_stop_send: '⏹ Send', modal_new_room: 'New Room', lbl_room_name: 'Group / Channel Name', opt_group: 'Group (Anyone can write)', opt_channel: 'Channel (Admins only)', btn_create: 'Create', modal_settings: 'Settings', tab_profile: 'Profile', tab_privacy: 'Privacy', tab_chats: 'Chats', btn_change_pic: 'Change Picture', lbl_language: 'Language', lbl_last_seen: 'Show "Last seen"', lbl_read_receipts: 'Read Receipts', lbl_searchable: 'Discoverable in search', lbl_avatar_visibility: 'Profile picture visible for', opt_vis_all: 'Everyone', opt_vis_contacts: 'Contacts Only', opt_vis_none: 'Nobody', lbl_sound: 'Notification Sounds', lbl_storage_used: 'Local Storage used:', btn_clear_cache: 'Clear Cache', btn_logout: 'Logout', lbl_call_privacy: 'Who can call me?', err_calls_blocked: 'This user has blocked calls.', err_calls_contacts: 'This user only allows calls from contacts.', ctx_reply: 'Reply', ctx_copy: 'Copy', ctx_edit: 'Edit', ctx_select: 'Select', ctx_forward: 'Forward', ctx_pin: 'Pin', ctx_unpin: 'Unpin', ctx_share: 'Share', ctx_delete: 'Delete', ctx_delete_for_me: 'Delete for me', ctx_msg_info: 'Message Info', msg_read_at: 'Read at: ', msg_unread: 'Not read yet', msg_read_unknown: 'Read (no exact time available)', dlg_delete_title: 'Delete message?', dlg_delete_for_all: 'Delete for everyone', dlg_cancel: 'Cancel', lbl_theme_mode: 'App Theme', opt_theme_dark: 'Always Dark', opt_theme_light: 'Always Light', opt_theme_auto: 'Automatic (Sunrise/Sunset)' },
        fa: { login_title: 'دوری مسنجر', login_subtitle: 'لطفاً یک نام کاربری انتخاب کنید.', login_btn: 'ادامه', sec_personal: 'شخصی', chat_saved: 'پیام‌های ذخیره‌شده', sec_rooms: 'گروه‌ها', sec_chats: 'گفتگوها', chat_general: 'عمومی', sec_contacts: 'مخاطبین', sec_calls: 'تماس‌ها', status_online: 'آنلاین', btn_block: 'مسدود کردن', btn_unblock: 'رفع مسدودیت', err_blocked: 'شما این مخاطب را مسدود کرده‌اید.', err_channel: 'فقط مدیران می‌توانند اینجا پیام بفرستند.', placeholder_msg: 'پیام بنویسید...', placeholder_search: 'جستجوی کاربر (نام@)...', ttl_off: '🕒 خاموش', btn_cancel: 'لغو', btn_save: 'ذخیره', btn_stop_send: '⏹ ارسال', modal_new_room: 'اتاق جدید', lbl_room_name: 'نام گروه / کانال', opt_group: 'گروه (همه می‌توانند بنویسند)', opt_channel: 'کانال (فقط مدیران)', btn_create: 'ایجاد', modal_settings: 'تنظیمات', tab_profile: 'نمایه', tab_privacy: 'حریم خصوصی', tab_chats: 'گفتگوها', btn_change_pic: 'تغییر تصویر', lbl_language: 'زبان', lbl_last_seen: 'نمایش "آخرین بازدید"', lbl_read_receipts: 'رسید خوانده‌شدن', lbl_searchable: 'قابل جستجو بودن', lbl_avatar_visibility: 'نمایش عکس پروفایل برای', opt_vis_all: 'همه', opt_vis_contacts: 'فقط مخاطبین', opt_vis_none: 'هیچ‌کس', lbl_sound: 'صداهای اعلان', lbl_storage_used: 'فضای ذخیره‌سازی استفاده‌شده:', btn_clear_cache: 'پاک کردن حافظه پنهان', btn_logout: 'خروج', lbl_call_privacy: 'چه کسی می‌تواند با من تماس بگیرد؟', err_calls_blocked: 'این کاربر تماس‌ها را مسدود کرده است.', err_calls_contacts: 'این کاربر فقط اجازه تماس از طرف مخاطبین را می‌دهد.', ctx_reply: 'پاسخ دادن', ctx_copy: 'کپی کردن', ctx_edit: 'ویرایش', ctx_select: 'انتخاب', ctx_forward: 'ارسال مجدد', ctx_pin: 'سنجاق کردن', ctx_unpin: 'برداشتن سنجاق', ctx_share: 'اشتراک گذاری', ctx_delete: 'حذف', ctx_delete_for_me: 'حذف برای من', ctx_msg_info: 'اطلاعات پیام', msg_read_at: 'خوانده شده در: ', msg_unread: 'هنوز خوانده نشده', msg_read_unknown: 'خوانده شده (زمان دقیق در دسترس نیست)', dlg_delete_title: 'حذف پیام؟', dlg_delete_for_all: 'حذف برای همه', dlg_cancel: 'لغو', lbl_theme_mode: 'ظاهر برنامه', opt_theme_dark: 'همیشه تاریک', opt_theme_light: 'همیشه روشن', opt_theme_auto: 'خودکار (طلوع/غروب خورشید)' },
        ar: { login_title: 'دوري ماسنجر', login_subtitle: 'الرجاء اختيار اسم مستخدم.', login_btn: 'متابعة', sec_personal: 'شخصی', chat_saved: 'الرسائل المحفوظة', sec_rooms: 'المجموعات', sec_chats: 'الدردشات', chat_general: 'عام', sec_contacts: 'جهات الاتصال', sec_calls: 'المكالمات', status_online: 'متصل', btn_block: 'حظر', btn_unblock: 'إلغاء الحظر', err_blocked: 'لقد قمت بحظر جهة الاتصال هذه.', err_channel: 'فقط المسؤولون يمكنهم النشر هنا.', placeholder_msg: 'اكتب رسالة...', placeholder_search: 'ابحث عن مستخدم (اسم@)...', ttl_off: '🕒 إيقاف', btn_cancel: 'إلغاء', btn_save: 'حفظ', btn_stop_send: '⏹ إرسال', modal_new_room: 'غرفة جديدة', lbl_room_name: 'اسم المجموعة / القناة', opt_group: 'مجموعة (يمكن للجميع الكتابة)', opt_channel: 'قناة (للمسؤولين فقط)', btn_create: 'إنشاء', modal_settings: 'الإعدادات', tab_profile: 'الملف الشخصي', tab_privacy: 'الخصوصية', tab_chats: 'الدردشات', btn_change_pic: 'تغيير الصورة', lbl_language: 'اللغة', lbl_last_seen: 'إظهار "آخر ظهور"', lbl_read_receipts: 'مؤشرات قراءة الرسائل', lbl_searchable: 'قابل للبحث', lbl_avatar_visibility: 'صورة الملف الشخصي مرئية لـ', opt_vis_all: 'الجميع', opt_vis_contacts: 'جهات الاتصال فقط', opt_vis_none: 'لا أحد', lbl_sound: 'أصوات الإشعارات', lbl_storage_used: 'مساحة التخزين المستخدمة:', btn_clear_cache: 'مسح ذاكرة التخزين المؤقت', btn_logout: 'تسجيل خروج', lbl_call_privacy: 'من يمكنه الاتصال بي؟', err_calls_blocked: 'قام هذا المستخدم بحظر المكالمات.', err_calls_contacts: 'يسمح هذا المستخدم بالمكالمات من جهات الاتصال فقط.', ctx_reply: 'رد', ctx_copy: 'نسخ', ctx_edit: 'تعديل', ctx_select: 'تحديد', ctx_forward: 'تحويل', ctx_pin: 'تثبيت', ctx_unpin: 'إلغاء التثبيت', ctx_share: 'مشاركة', ctx_delete: 'حذف', ctx_delete_for_me: 'حذف بالنسبة لي', ctx_msg_info: 'معلومات الرسالة', msg_read_at: 'قرأ في: ', msg_unread: 'لم تقرأ بعد', msg_read_unknown: 'قرأ (لا يوجد وقت دقيق)', dlg_delete_title: 'حذف الرسالة؟', dlg_delete_for_all: 'حذف للجميع', dlg_cancel: 'إلغاء', lbl_theme_mode: 'مظهر التطبيق', opt_theme_dark: 'دائماً داكن', opt_theme_light: 'دائماً فاتح', opt_theme_auto: 'تلقائي (شروق/غروب الشمس)' },
        tr: { login_title: 'Doori Messenger', login_subtitle: 'Lütfen bir kullanıcı adı seçin.', login_btn: 'Devam et', sec_personal: 'Kişisel', chat_saved: 'Kaydedilen Mesajlar', sec_rooms: 'Gruplar', sec_chats: 'Sohbetler', chat_general: 'Genel', sec_contacts: 'Kişiler', sec_calls: 'Aramalar', status_online: 'Çevrimiçi', btn_block: 'Engelle', btn_unblock: 'Engeli Kaldır', err_blocked: 'Bu kişiyi engellediniz.', err_channel: 'Buraya yalnızca yöneticiler yazabilir.', placeholder_msg: 'Bir mesaj yazın...', placeholder_search: 'Kullanıcı ara (@isim)...', ttl_off: '🕒 Kapalı', btn_cancel: 'İptal', btn_save: 'Kaydet', btn_stop_send: '⏹ Gönder', modal_new_room: 'Yeni Oda', lbl_room_name: 'Grup / Kanal Adı', opt_group: 'Grup (Herkes yazabilir)', opt_channel: 'Kanal (Sadece yöneticiler)', btn_create: 'Oluştur', modal_settings: 'Ayarlar', tab_profile: 'Profil', tab_privacy: 'Gizlilik', tab_chats: 'Sohbetler', btn_change_pic: 'Resmi Değiştir', lbl_language: 'Dil', lbl_last_seen: '"Son görülme" durumunu göster', lbl_read_receipts: 'Okundu Bilgisi', lbl_searchable: 'Aramada bulunabilir ol', lbl_avatar_visibility: 'Profil resmini görebilecekler', opt_vis_all: 'Herkes', opt_vis_contacts: 'Sadece Kişiler', opt_vis_none: 'Hiç kimse', lbl_sound: 'Bildirim Sesleri', lbl_storage_used: 'Kullanılan Yerel Depolama:', btn_clear_cache: 'Önbelleği Temizle', btn_logout: 'Çıkış Yap', lbl_call_privacy: 'Beni kimler arayabilir?', err_calls_blocked: 'Bu kullanıcı aramaları engelledi.', err_calls_contacts: 'Bu kullanıcı yalnızca kişilerden gelen aramalara izin veriyor.', ctx_reply: 'Cevapla', ctx_copy: 'Kopyala', ctx_edit: 'Düzenle', ctx_select: 'Seç', ctx_forward: 'İlet', ctx_pin: 'Sabitle', ctx_unpin: 'Sabitlemeyi Kaldır', ctx_share: 'Paylaş', ctx_delete: 'Sil', ctx_delete_for_me: 'Benim için sil', ctx_msg_info: 'Mesaj Bilgisi', msg_read_at: 'Okunma zamanı: ', msg_unread: 'Henüz okunmadı', msg_read_unknown: 'Okundu (kesin zaman yok)', dlg_delete_title: 'Mesaj silinsin mi?', dlg_delete_for_all: 'Herkes için sil', dlg_cancel: 'İptal', lbl_theme_mode: 'Uygulama Teması', opt_theme_dark: 'Her Zaman Koyu', opt_theme_light: 'Her Zaman Açık', opt_theme_auto: 'Otomatik (Gündoğumu/Günbatımı)' }
    };
    window.TRANSLATIONS = TRANSLATIONS;
    Object.assign(TRANSLATIONS.de, { lbl_font_group: 'Schrift (Eigener Text)', ph_bio_placeholder: 'Ich bin neu hier...', lbl_font_preview: 'Vorschau', ph_preview_text: 'Hey, ich nutze Doori!', lbl_bio: 'Info / Über mich', lbl_font_color: 'Farbe', lbl_font_size: 'Größe', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Schreibmaschine', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Locker (Comic)', btn_custom_wallpaper: 'Eigene...', opt_color_pink: 'Hellrosa', opt_color_green: 'Hellgrün', opt_color_blue: 'Hellblau', opt_color_default: 'Standard (Weiß)', lbl_font_family: 'Schriftart', lbl_wallpaper: 'Chat-Hintergrundbild', btn_change_wallpaper: 'Bild auswählen', btn_remove_wallpaper: 'Entfernen', opt_font_small: 'Klein', opt_font_normal: 'Normal', opt_font_large: 'Groß',  tab_design: "Design", lbl_bio: "Info / Über mich", lbl_wallpaper: "Chat-Hintergrundbild", btn_change_wallpaper: "Bild auswählen", btn_remove_wallpaper: "Entfernen", lbl_font_size: "Schriftgröße", opt_font_small: "Klein", opt_font_normal: "Normal", opt_font_large: "Groß",  lbl_emoji: "Smilies", lbl_gif: "GIF", lbl_doodle: "Doodle zeichnen", lbl_file: "Datei senden", lbl_location: "Standort teilen", msg_location: "Standort ansehen",  ph_search_content: "Inhalte durchsuchen...", ph_id: "ID", ph_search: "Suchen...", ph_search_user: "Benutzer suchen (@name)...",  lbl_remember_me: "Angemeldet bleiben",  err_select_chat: "Bitte wähle zuerst einen Chat aus.", err_group_not_found: "Diese Gruppe existiert nicht oder wurde gelöscht.", err_join_group: "Fehler beim Beitreten der Gruppe.", msg_copied_clipboard: "Text in die Zwischenablage kopiert! (Teilen wird auf diesem Gerät nicht nativ unterstützt)", err_send_msg: "Nachricht konnte nicht gesendet werden (Offline?).", err_feature_update: "Diese Funktion steht im nächsten Update zur Verfügung.", err_group_username_req: "Bitte gib einen Benutzernamen für die Gruppe ein (z.B. @meinegruppe).", err_username_invalid: "Der Benutzername darf keine Leerzeichen enthalten und muss mindestens 2 Zeichen lang sein.", err_username_taken: "Dieser Benutzername ist bereits von einem anderen Benutzer belegt.", err_group_username_taken: "Dieser Gruppen-Benutzername ist bereits vergeben. Bitte wähle einen anderen.", err_create_group: "Fehler beim Erstellen der Gruppe.", err_search_self: "Das bist du selbst!", err_user_not_found_privacy: "Benutzername nicht gefunden (Privatsphäre).", msg_added_contact: " wurde zu den Kontakten hinzugefügt!", err_already_contact: " ist bereits ein Kontakt.", err_user_not_found2: "Benutzername nicht gefunden.", err_search: "Fehler bei der Suche.", msg_group_deleted: "Die Gruppe existiert nicht mehr.", prompt_new_group_name: "Neuer Gruppenname:", prompt_new_desc: "Neue Beschreibung:",  lbl_group_call: 'Gruppenanruf', lbl_incoming_invite: 'Neue Gruppeneinladung...', lbl_add_members: 'Mitglieder hinzufügen', sec_group_info: 'Gruppeninfo', sec_members: 'Mitglieder', btn_add_member: 'Mitglied hinzufügen', lbl_group_name: 'Name der Gruppe', msg_invited_you: 'hat dich in die Gruppe eingeladen:', btn_accept: 'Annehmen', btn_decline: 'Ablehnen', msg_invite_accepted: 'Einladung angenommen', msg_invite_declined: 'Einladung abgelehnt', sys_user_joined: 'ist der Gruppe beigetreten', sys_user_left: 'hat die Gruppe verlassen', sys_user_removed: 'wurde aus der Gruppe entfernt', btn_leave_group: 'Gruppe verlassen', lbl_admin_options: 'Admin Optionen', btn_copy_invite_link: '🔗 Einladungslink kopieren', lbl_admins_only: 'Nur Admins dürfen schreiben', msg_admin_kicked: 'Der Admin hat dich aus der Gruppe entfernt.', msg_link_copied: 'Einladungslink kopiert!', msg_muted_in_group: 'Du wurdest in dieser Gruppe stummgeschaltet.', msg_readonly_group: 'Nur Admins dürfen in dieser Gruppe schreiben.' });
    Object.assign(TRANSLATIONS.en, { lbl_font_group: 'Font (Own Text)', ph_bio_placeholder: 'I am new here...', lbl_font_preview: 'Preview', ph_preview_text: 'Hey, I am using Doori!', lbl_bio: 'About / Info', lbl_font_color: 'Color', lbl_font_size: 'Size', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Typewriter', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Casual (Comic)', btn_custom_wallpaper: 'Custom...', opt_color_pink: 'Light Pink', opt_color_green: 'Light Green', opt_color_blue: 'Light Blue', opt_color_default: 'Default (White)', lbl_font_family: 'Font Family', lbl_wallpaper: 'Chat Wallpaper', btn_change_wallpaper: 'Select Image', btn_remove_wallpaper: 'Remove', opt_font_small: 'Small', opt_font_normal: 'Normal', opt_font_large: 'Large',  tab_design: "Design", lbl_bio: "About / Info", lbl_wallpaper: "Chat Wallpaper", btn_change_wallpaper: "Select Image", btn_remove_wallpaper: "Remove", lbl_font_size: "Font Size", opt_font_small: "Small", opt_font_normal: "Normal", opt_font_large: "Large",  lbl_emoji: "Emojis", lbl_gif: "GIF", lbl_doodle: "Draw Doodle", lbl_file: "Send File", lbl_location: "Share Location", msg_location: "View Location",  ph_search_content: "Search content...", ph_id: "ID", ph_search: "Search...", ph_search_user: "Search user (@name)...",  lbl_remember_me: "Remember me",  err_select_chat: "Please select a chat first.", err_group_not_found: "This group does not exist or was deleted.", err_join_group: "Error joining the group.", msg_copied_clipboard: "Text copied to clipboard! (Sharing not natively supported)", err_send_msg: "Message could not be sent (Offline?).", err_feature_update: "This feature will be available in the next update.", err_group_username_req: "Please enter a username for the group (e.g. @mygroup).", err_username_invalid: "The username cannot contain spaces and must be at least 2 chars long.", err_username_taken: "This username is already taken by another user.", err_group_username_taken: "This group username is already taken. Please choose another one.", err_create_group: "Error creating the group.", err_search_self: "That is you!", err_user_not_found_privacy: "Username not found (Privacy).", msg_added_contact: " was added to your contacts!", err_already_contact: " is already a contact.", err_user_not_found2: "Username not found.", err_search: "Search failed.", msg_group_deleted: "The group no longer exists.", prompt_new_group_name: "New group name:", prompt_new_desc: "New description:",  lbl_group_call: 'Group Call', lbl_incoming_invite: 'New Group Invite...', lbl_add_members: 'Add members', sec_group_info: 'Group Info', sec_members: 'Members', btn_add_member: 'Add member', lbl_group_name: 'Group name', msg_invited_you: 'invited you to the group:', btn_accept: 'Accept', btn_decline: 'Decline', msg_invite_accepted: 'Invite accepted', msg_invite_declined: 'Invite declined', sys_user_joined: 'joined the group', sys_user_left: 'left the group', sys_user_removed: 'was removed from the group', btn_leave_group: 'Leave Group', lbl_admin_options: 'Admin Options', btn_copy_invite_link: '🔗 Copy Invite Link', lbl_admins_only: 'Only Admins can send messages', msg_admin_kicked: 'The Admin has removed you from the group.', msg_link_copied: 'Invite link copied!', msg_muted_in_group: 'You have been muted in this group.', msg_readonly_group: 'Only Admins can send messages in this group.' });
    Object.assign(TRANSLATIONS.fa, { lbl_font_group: 'فونت (متن خود)', ph_bio_placeholder: 'من اینجا جدید هستم...', lbl_font_preview: 'پیش‌نمایش', ph_preview_text: 'سلام، من از دوری استفاده می‌کنم!', lbl_bio: 'درباره من', lbl_font_color: 'رنگ', lbl_font_size: 'اندازه', opt_font_inter: 'استاندارد (Inter)', opt_font_courier: 'ماشین تحریر', opt_font_georgia: 'ظریف (Serif)', opt_font_comic: 'غیررسمی (Comic)', btn_custom_wallpaper: 'سفارشی...', opt_color_pink: 'صورتی روشن', opt_color_green: 'سبز روشن', opt_color_blue: 'آبی روشن', opt_color_default: 'پیش‌فرض (سفید)', lbl_font_family: 'نوع فونت', lbl_wallpaper: 'تصویر زمینه چت', btn_change_wallpaper: 'انتخاب تصویر', btn_remove_wallpaper: 'حذف', opt_font_small: 'کوچک', opt_font_normal: 'معمولی', opt_font_large: 'بزرگ',  tab_design: "طراحی", lbl_bio: "درباره من", lbl_wallpaper: "تصویر زمینه چت", btn_change_wallpaper: "انتخاب تصویر", btn_remove_wallpaper: "حذف", lbl_font_size: "اندازه فونت", opt_font_small: "کوچک", opt_font_normal: "معمولی", opt_font_large: "بزرگ",  lbl_emoji: "شکلک ها", lbl_gif: "گیف", lbl_doodle: "نقاشی کشیدن", lbl_file: "ارسال فایل", lbl_location: "اشتراک مکان", msg_location: "مشاهده مکان",  ph_search_content: "جستجوی محتوا...", ph_id: "شناسه", ph_search: "جستجو...", ph_search_user: "جستجوی کاربر (@name)...",  lbl_remember_me: "مرا به خاطر بسپار",  err_select_chat: "لطفاً ابتدا یک چت انتخاب کنید.", err_group_not_found: "این گروه وجود ندارد یا حذف شده است.", err_join_group: "خطا در پیوستن به گروه.", msg_copied_clipboard: "متن در کلیپ بورد کپی شد!", err_send_msg: "پیام ارسال نشد (آفلاین؟).", err_feature_update: "این قابلیت در بروزرسانی بعدی در دسترس خواهد بود.", err_group_username_req: "لطفا یک نام کاربری برای گروه وارد کنید (مثلا @mygroup).", err_username_invalid: "نام کاربری نمی‌تواند شامل فاصله باشد و باید حداقل 2 حرف داشته باشد.", err_username_taken: "این نام کاربری قبلاً توسط کاربر دیگری گرفته شده است.", err_group_username_taken: "این نام کاربری گروه قبلاً گرفته شده است. لطفاً یکی دیگر انتخاب کنید.", err_create_group: "خطا در ایجاد گروه.", err_search_self: "این خود شما هستید!", err_user_not_found_privacy: "نام کاربری یافت نشد (حریم خصوصی).", msg_added_contact: " به مخاطبین شما اضافه شد!", err_already_contact: " قبلاً در مخاطبین شما بوده است.", err_user_not_found2: "نام کاربری یافت نشد.", err_search: "جستجو ناموفق بود.", msg_group_deleted: "گروه دیگر وجود ندارد.", prompt_new_group_name: "نام گروه جدید:", prompt_new_desc: "توضیحات جدید:",  lbl_group_call: 'تماس گروهی', lbl_incoming_invite: 'دعوت به گروه جدید...', lbl_add_members: 'افزودن اعضا', sec_group_info: 'اطلاعات گروه', sec_members: 'اعضا', btn_add_member: 'افزودن عضو', lbl_group_name: 'نام گروه', msg_invited_you: 'شما را به گروه دعوت کرد:', btn_accept: 'پذیرفتن', btn_decline: 'رد کردن', msg_invite_accepted: 'دعوت پذیرفته شد', msg_invite_declined: 'دعوت رد شد', sys_user_joined: 'به گروه پیوست', sys_user_left: 'گروه را ترک کرد', sys_user_removed: 'از گروه حذف شد', btn_leave_group: 'ترک گروه', lbl_admin_options: 'گزینه‌های مدیر', btn_copy_invite_link: '🔗 کپی لینک دعوت', lbl_admins_only: 'فقط مدیران می‌توانند پیام ارسال کنند', msg_admin_kicked: 'مدیر شما را از گروه حذف کرده است.', msg_link_copied: 'لینک دعوت کپی شد!', msg_muted_in_group: 'شما در این گروه بی‌صدا شده‌اید.', msg_readonly_group: 'فقط مدیران می‌توانند در این گروه پیام ارسال کنند.' });
    Object.assign(TRANSLATIONS.ar, { lbl_font_group: 'الخط (نصك الخاص)', ph_bio_placeholder: 'أنا جديد هنا...', lbl_font_preview: 'معاينة', ph_preview_text: 'مرحبًا، أنا أستخدم دوري!', lbl_bio: 'حول / معلومات', lbl_font_color: 'اللون', lbl_font_size: 'الحجم', opt_font_inter: 'قياسي (Inter)', opt_font_courier: 'آلة كاتبة', opt_font_georgia: 'أنيق (Serif)', opt_font_comic: 'غير رسمي (Comic)', btn_custom_wallpaper: 'مخصص...', opt_color_pink: 'وردي فاتح', opt_color_green: 'أخضر فاتح', opt_color_blue: 'أزرق فاتح', opt_color_default: 'افتراضي (أبيض)', lbl_font_family: 'نوع الخط', lbl_wallpaper: 'خلفية الدردشة', btn_change_wallpaper: 'اختر صورة', btn_remove_wallpaper: 'إزالة', opt_font_small: 'صغير', opt_font_normal: 'عادي', opt_font_large: 'كبير',  tab_design: "التصميم", lbl_bio: "حول / معلومات", lbl_wallpaper: "خلفية الدردشة", btn_change_wallpaper: "اختر صورة", btn_remove_wallpaper: "إزالة", lbl_font_size: "حجم الخط", opt_font_small: "صغير", opt_font_normal: "عادي", opt_font_large: "كبير",  lbl_emoji: "الرموز التعبيرية", lbl_gif: "ملف GIF", lbl_doodle: "رسم خربشة", lbl_file: "إرسال ملف", lbl_location: "مشاركة الموقع", msg_location: "عرض الموقع",  ph_search_content: "البحث في المحتوى...", ph_id: "المعرف", ph_search: "بحث...", ph_search_user: "بحث عن مستخدم (@name)...",  lbl_remember_me: "تذكرني",  err_select_chat: "يرجى اختيار دردشة أولاً.", err_group_not_found: "هذه المجموعة غير موجودة أو تم حذفها.", err_join_group: "خطأ في الانضمام إلى المجموعة.", msg_copied_clipboard: "تم نسخ النص إلى الحافظة!", err_send_msg: "تعذر إرسال الرسالة (غير متصل؟).", err_feature_update: "ستكون هذه الميزة متاحة في التحديث القادم.", err_group_username_req: "يرجى إدخال اسم مستخدم للمجموعة (مثل @mygroup).", err_username_invalid: "لا يمكن أن يحتوي اسم المستخدم على مسافات ويجب أن يكون طوله حرفين على الأقل.", err_username_taken: "اسم المستخدم هذا مستخدم بالفعل من قبل مستخدم آخر.", err_group_username_taken: "اسم مستخدم المجموعة هذا مأخوذ. يرجى اختيار اسم آخر.", err_create_group: "خطأ في إنشاء المجموعة.", err_search_self: "هذا أنت!", err_user_not_found_privacy: "اسم المستخدم غير موجود (الخصوصية).", msg_added_contact: " تمت إضافته إلى جهات الاتصال الخاصة بك!", err_already_contact: " هو بالفعل جهة اتصال.", err_user_not_found2: "اسم المستخدم غير موجود.", err_search: "فشل البحث.", msg_group_deleted: "المجموعة لم تعد موجودة.", prompt_new_group_name: "اسم المجموعة الجديد:", prompt_new_desc: "وصف جديد:",  lbl_group_call: 'مكالمة جماعية', lbl_incoming_invite: 'دعوة مجموعة جديدة...', lbl_add_members: 'إضافة أعضاء', sec_group_info: 'معلومات المجموعة', sec_members: 'الأعضاء', btn_add_member: 'إضافة عضو', lbl_group_name: 'اسم المجموعة', msg_invited_you: 'دعاك إلى المجموعة:', btn_accept: 'قبول', btn_decline: 'رفض', msg_invite_accepted: 'تم قبول الدعوة', msg_invite_declined: 'تم رفض الدعوة', sys_user_joined: 'انضم إلى المجموعة', sys_user_left: 'غادر المجموعة', sys_user_removed: 'تمت إزالته من المجموعة', btn_leave_group: 'مغادرة المجموعة', lbl_admin_options: 'خيارات المشرف', btn_copy_invite_link: '🔗 نسخ رابط الدعوة', lbl_admins_only: 'المشرفون فقط يمكنهم إرسال رسائل', msg_admin_kicked: 'قام المشرف بإزالتك من المجموعة.', msg_link_copied: 'تم نسخ رابط الدعوة!', msg_muted_in_group: 'لقد تم كتم صوتك في هذه المجموعة.', msg_readonly_group: 'المشرفون فقط يمكنهم إرسال رسائل في هذه المجموعة.' });
    Object.assign(TRANSLATIONS.tr, { lbl_font_group: 'Yazı (Kendi Metniniz)', ph_bio_placeholder: 'Ben burada yeniyim...', lbl_font_preview: 'Önizleme', ph_preview_text: 'Merhaba, Doori kullanıyorum!', lbl_bio: 'Hakkımda / Bilgi', lbl_font_color: 'Renk', lbl_font_size: 'Boyut', opt_font_inter: 'Standart (Inter)', opt_font_courier: 'Daktilo', opt_font_georgia: 'Zarif (Serif)', opt_font_comic: 'Gündelik (Comic)', btn_custom_wallpaper: 'Özel...', opt_color_pink: 'Açık Pembe', opt_color_green: 'Açık Yeşil', opt_color_blue: 'Açık Mavi', opt_color_default: 'Varsayılan (Beyaz)', lbl_font_family: 'Yazı Tipi', lbl_wallpaper: 'Sohbet Duvar Kağıdı', btn_change_wallpaper: 'Resim Seç', btn_remove_wallpaper: 'Kaldır', opt_font_small: 'Küçük', opt_font_normal: 'Normal', opt_font_large: 'Büyük',  tab_design: "Tasarım", lbl_bio: "Hakkımda / Bilgi", lbl_wallpaper: "Sohbet Duvar Kağıdı", btn_change_wallpaper: "Resim Seç", btn_remove_wallpaper: "Kaldır", lbl_font_size: "Yazı Tipi Boyutu", opt_font_small: "Küçük", opt_font_normal: "Normal", opt_font_large: "Büyük",  lbl_emoji: "Emojiler", lbl_gif: "GIF", lbl_doodle: "Doodle Çiz", lbl_file: "Dosya Gönder", lbl_location: "Konum Paylaş", msg_location: "Konumu Görüntüle",  ph_search_content: "İçerik ara...", ph_id: "ID", ph_search: "Ara...", ph_search_user: "Kullanıcı ara (@name)...",  lbl_remember_me: "Beni hatırla",  err_select_chat: "Lütfen önce bir sohbet seçin.", err_group_not_found: "Bu grup mevcut değil veya silinmiş.", err_join_group: "Gruba katılırken hata oluştu.", msg_copied_clipboard: "Metin panoya kopyalandı!", err_send_msg: "Mesaj gönderilemedi (Çevrimdışı?).", err_feature_update: "Bu özellik bir sonraki güncellemede kullanıma sunulacak.", err_group_username_req: "Lütfen grup için bir kullanıcı adı girin (örn. @mygroup).", err_username_invalid: "Kullanıcı adı boşluk içeremez ve en az 2 karakter uzunluğunda olmalıdır.", err_username_taken: "Bu kullanıcı adı zaten başka bir kullanıcı tarafından alınmış.", err_group_username_taken: "Bu grup kullanıcı adı zaten alınmış. Lütfen başka bir tane seçin.", err_create_group: "Grup oluşturulurken hata oluştu.", err_search_self: "Bu sensin!", err_user_not_found_privacy: "Kullanıcı adı bulunamadı (Gizlilik).", msg_added_contact: " kişilerinize eklendi!", err_already_contact: " zaten bir kişi.", err_user_not_found2: "Kullanıcı adı bulunamadı.", err_search: "Arama başarısız.", msg_group_deleted: "Grup artık mevcut değil.", prompt_new_group_name: "Yeni grup adı:", prompt_new_desc: "Yeni açıklama:",  lbl_group_call: 'Grup Araması', lbl_incoming_invite: 'Yeni Grup Daveti...', lbl_add_members: 'Üye Ekle', sec_group_info: 'Grup Bilgisi', sec_members: 'Üyeler', btn_add_member: 'Üye ekle', lbl_group_name: 'Grup adı', msg_invited_you: 'seni gruba davet etti:', btn_accept: 'Kabul Et', btn_decline: 'Reddet', msg_invite_accepted: 'Davet kabul edildi', msg_invite_declined: 'Davet reddedildi', sys_user_joined: 'gruba katıldı', sys_user_left: 'gruptan ayrıldı', sys_user_removed: 'gruptan çıkarıldı', btn_leave_group: 'Gruptan Ayrıl', lbl_admin_options: 'Yönetici Seçenekleri', btn_copy_invite_link: '🔗 Davet Bağlantısını Kopyala', lbl_admins_only: 'Sadece Yöneticiler mesaj gönderebilir', msg_admin_kicked: 'Yönetici sizi gruptan çıkardı.', msg_link_copied: 'Davet bağlantısı kopyalandı!', msg_muted_in_group: 'Bu grupta sessize alındınız.', msg_readonly_group: 'Bu grupta sadece yöneticiler mesaj gönderebilir.' });

    Object.assign(TRANSLATIONS.de, { ctx_select: 'Auswählen', ctx_forward: 'Weiterleiten', ctx_pin: 'Anheften', ctx_unpin: 'Loslösen', msg_forwarded: 'Weitergeleitet', msg_pinned: 'Angeheftete Nachricht', modal_forward: 'Weiterleiten an...', btn_send_doodle: 'Als Bild senden', lbl_doodle_invite: 'Doodle Einladung', msg_clear_doodle: 'Wirklich alles löschen?', err_doodle_private_only: 'Doodle ist derzeit nur in privaten Chats verfügbar.', msg_doodle_rejected: 'Einladung abgelehnt.', doodle_title: 'Doodle Einladung', doodle_btn_accept: 'Mitzeichnen', doodle_btn_reject: 'Ablehnen', doodle_msg_accepted: 'Doodle Einladung angenommen', doodle_msg_closed: 'Doodle beendet', doodle_msg_rejected: 'Doodle Einladung abgelehnt', doodle_waiting: 'Wartet...', doodle_connecting: 'Verbunden...', doodle_rejected: 'Abgelehnt', title_minimize: 'Minimieren', title_maximize: 'Maximieren', title_close: 'Schließen', title_color: 'Farbe wählen', title_size: 'Stiftdicke', title_eraser: 'Radiergummi', title_clear: 'Alles löschen', doodle_session_with: 'Doodle Sitzung mit', doodle_connected: 'Verbunden', doodle_wants_to_draw: ' möchte mit dir zeichnen!' });
    Object.assign(TRANSLATIONS.en, { ctx_select: 'Select', ctx_forward: 'Forward', ctx_pin: 'Pin', ctx_unpin: 'Unpin', msg_forwarded: 'Forwarded', msg_pinned: 'Pinned Message', modal_forward: 'Forward to...', btn_send_doodle: 'Send as Image', lbl_doodle_invite: 'Doodle Invite', msg_clear_doodle: 'Clear everything?', err_doodle_private_only: 'Doodle is only available in private chats.', msg_doodle_rejected: 'Invite rejected.', doodle_title: 'Doodle Invite', doodle_btn_accept: 'Join', doodle_btn_reject: 'Decline', doodle_msg_accepted: 'Doodle Invite accepted', doodle_msg_closed: 'Doodle closed', doodle_msg_rejected: 'Doodle Invite rejected', doodle_waiting: 'Waiting...', doodle_connecting: 'Connecting...', doodle_rejected: 'Rejected', title_minimize: 'Minimize', title_maximize: 'Maximize', title_close: 'Close', title_color: 'Choose Color', title_size: 'Pen Size', title_eraser: 'Eraser', title_clear: 'Clear All', doodle_session_with: 'Doodle Session with', doodle_connected: 'Connected', doodle_wants_to_draw: ' wants to draw with you!' });
    Object.assign(TRANSLATIONS.fa, { ctx_select: 'انتخاب', ctx_forward: 'ارسال', ctx_pin: 'سنجاق کردن', ctx_unpin: 'برداشتن سنجاق', msg_forwarded: 'ارسال شده', msg_pinned: 'پیام سنجاق شده', modal_forward: 'ارسال به...', btn_send_doodle: 'ارسال به عنوان تصویر', lbl_doodle_invite: 'دعوت به دودل', msg_clear_doodle: 'آیا مطمئن هستید که می‌خواهید همه چیز را پاک کنید؟', err_doodle_private_only: 'دودل در حال حاضر فقط در چت‌های خصوصی در دسترس است.', msg_doodle_rejected: 'دعوت رد شد.', doodle_title: 'دعوت به دودل', doodle_btn_accept: 'پیوستن', doodle_btn_reject: 'رد کردن', doodle_msg_accepted: 'دعوت پذیرفته شد', doodle_msg_closed: 'دودل بسته شد', doodle_msg_rejected: 'دعوت رد شد', doodle_waiting: 'در حال انتظار...', doodle_connecting: 'در حال اتصال...', doodle_rejected: 'رد شد', title_minimize: 'کوچک کردن', title_maximize: 'بزرگ کردن', title_close: 'بستن', title_color: 'انتخاب رنگ', title_size: 'اندازه قلم', title_eraser: 'پاک‌کن', title_clear: 'پاک کردن همه', doodle_session_with: 'جلسه دودل با', doodle_connected: 'متصل شد', doodle_wants_to_draw: ' می‌خواهد با شما نقاشی کند!' });
    Object.assign(TRANSLATIONS.ar, { ctx_select: 'تحديد', ctx_forward: 'تحويل', ctx_pin: 'تثبيت', ctx_unpin: 'إلغاء التثبيت', msg_forwarded: 'محولة', msg_pinned: 'رسالة مثبتة', modal_forward: 'تحويل إلى...', btn_send_doodle: 'إرسال كصورة', lbl_doodle_invite: 'دعوة دودل', msg_clear_doodle: 'هل تريد مسح كل شيء؟', err_doodle_private_only: 'دودل متاح حاليا فقط في الدردشات الخاصة.', msg_doodle_rejected: 'تم رفض الدعوة.', doodle_title: 'دعوة دودل', doodle_btn_accept: 'انضمام', doodle_btn_reject: 'رفض', doodle_msg_accepted: 'تم قبول الدعوة', doodle_msg_closed: 'تم إغلاق دودل', doodle_msg_rejected: 'تم رفض الدعوة', doodle_waiting: 'قيد الانتظار...', doodle_connecting: 'جاري الاتصال...', doodle_rejected: 'مرفوض', title_minimize: 'تصغير', title_maximize: 'تكبير', title_close: 'إغلاق', title_color: 'اختر اللون', title_size: 'حجم القلم', title_eraser: 'ممحاة', title_clear: 'مسح الكل', doodle_session_with: 'جلسة دودل مع', doodle_connected: 'متصل', doodle_wants_to_draw: ' يريد أن يرسم معك!' });
    Object.assign(TRANSLATIONS.tr, { ctx_select: 'Seç', ctx_forward: 'İlet', ctx_pin: 'Sabitle', ctx_unpin: 'Sabitlemeyi Kaldır', msg_forwarded: 'İletildi', msg_pinned: 'Sabitlenmiş Mesaj', modal_forward: 'Şuna ilet...', btn_send_doodle: 'Resim olarak gönder', lbl_doodle_invite: 'Doodle Daveti', msg_clear_doodle: 'Her şeyi silmek istediğinize emin misiniz?', err_doodle_private_only: 'Doodle şu anda sadece özel sohbetlerde kullanılabilir.', msg_doodle_rejected: 'Davet reddedildi.', doodle_title: 'Doodle Daveti', doodle_btn_accept: 'Katıl', doodle_btn_reject: 'Reddet', doodle_msg_accepted: 'Doodle Daveti kabul edildi', doodle_msg_closed: 'Doodle kapatıldı', doodle_msg_rejected: 'Doodle Daveti reddedildi', doodle_waiting: 'Bekleniyor...', doodle_connecting: 'Bağlanıyor...', doodle_rejected: 'Reddedildi', title_minimize: 'Küçült', title_maximize: 'Büyüt', title_close: 'Kapat', title_color: 'Renk Seç', title_size: 'Kalem Boyutu', title_eraser: 'Silgi', title_clear: 'Tümünü Sil', doodle_session_with: 'Doodle Oturumu:', doodle_connected: 'Bağlandı', doodle_wants_to_draw: ' seninle çizim yapmak istiyor!' });

Object.assign(TRANSLATIONS.de, { tab_login: 'Login', tab_register: 'Registrieren', ph_username: '@benutzername', ph_email: 'deine@email.com', ph_password: 'Passwort', lnk_forgot_pwd: 'Passwort vergessen?', lnk_forgot_user_id: 'Benutzername / ID vergessen?', lnk_resend_verify: 'Bestätigungs-E-Mail erneut senden', prompt_email_id: 'Bitte gib deine E-Mail ein, um deine ID-Nummer zu erhalten:', prompt_email_verify: 'Bitte gib deine E-Mail-Adresse ein:', msg_id_sent: 'Eine E-Mail mit deiner ID-Nummer wurde gesendet.', msg_verify_sent: 'Ein Bestätigungslink wurde gesendet.', msg_verify_resent: 'Bestätigungs-E-Mail wurde erneut gesendet.', err_send: 'Fehler beim Senden: ', msg_spam_warn: 'Wichtig: Bitte überprüfe auch deinen Spam-Ordner!', prompt_email_pwd: 'Bitte gib deine E-Mail ein, um dein Passwort zurückzusetzen:', prompt_email_user: 'Bitte gib deine registrierte E-Mail-Adresse ein:', err_no_account: 'Kein Benutzerkonto gefunden.', msg_your_usernames: 'Dein(e) Benutzername(n):', msg_pwd_reset_sent: 'Eine E-Mail zum Zurücksetzen deines Passworts wurde versendet.', msg_legacy_acc: 'Dein Account nutzt noch das alte System. Bitte wechsle auf Registrieren.', msg_email_not_ver: 'Bitte bestätige zuerst deine E-Mail-Adresse über den gesendeten Link.', msg_wrong_pwd: 'Falsches Passwort oder E-Mail.', msg_user_taken: 'Dieser Benutzername ist bereits vergeben.', msg_email_taken: 'Diese E-Mail ist bereits registriert.', msg_weak_pwd: 'Das Passwort ist zu schwach.', err_user_not_found: 'Benutzername nicht gefunden.', err_invalid_id: 'Die eingegebene 6-stellige ID ist falsch.', err_login_failed: 'Fehler beim Login: ', err_unexpected: 'Ein unerwarteter Fehler ist aufgetreten: ', msg_acc_details_sent: 'Eine E-Mail mit deinen Daten wurde gesendet.', err_search_failed: 'Fehler beim Suchen: ' });
Object.assign(TRANSLATIONS.en, { tab_login: 'Login', tab_register: 'Register', ph_username: '@username', ph_email: 'your@email.com', ph_password: 'Password', lnk_forgot_pwd: 'Forgot password?', lnk_forgot_user_id: 'Forgot username / ID?', lnk_resend_verify: 'Resend verification email', prompt_email_id: 'Enter your email to receive your ID number:', prompt_email_verify: 'Please enter your email address:', msg_id_sent: 'An email with your ID number has been sent.', msg_verify_sent: 'A verification link has been sent.', msg_verify_resent: 'Verification email has been resent.', err_send: 'Error sending: ', msg_spam_warn: 'Important: Please also check your spam folder!', prompt_email_pwd: 'Enter your email to reset your password:', prompt_email_user: 'Enter your registered email address:', err_no_account: 'No account found.', msg_your_usernames: 'Your username(s):', msg_pwd_reset_sent: 'A password reset email has been sent.', msg_legacy_acc: 'Your account uses the old system. Please switch to Register.', msg_email_not_ver: 'Please verify your email first using the link sent.', msg_wrong_pwd: 'Wrong password or email.', msg_user_taken: 'This username is already taken.', msg_email_taken: 'This email is already registered.', msg_weak_pwd: 'The password is too weak.', err_user_not_found: 'Username not found.', err_invalid_id: 'The entered 6-digit ID is incorrect.', err_login_failed: 'Login failed: ', err_unexpected: 'An unexpected error occurred: ', msg_acc_details_sent: 'An email with your account details has been sent.', err_search_failed: 'Search failed: ' });
Object.assign(TRANSLATIONS.fa, { tab_login: 'ورود', tab_register: 'ثبت نام', ph_username: '@نام_کاربری', ph_email: 'your@email.com', ph_password: 'رمز عبور', lnk_forgot_pwd: 'رمز عبور را فراموش کرده‌اید؟', lnk_forgot_user_id: 'نام کاربری / شناسه را فراموش کرده‌اید؟', lnk_resend_verify: 'ارسال مجدد ایمیل تایید', prompt_email_id: 'ایمیل خود را برای دریافت شماره شناسایی وارد کنید:', prompt_email_verify: 'لطفاً آدرس ایمیل خود را وارد کنید:', msg_id_sent: 'ایمیلی حاوی شماره شناسایی شما ارسال شد.', msg_verify_sent: 'لینک تأیید ارسال شد.', msg_verify_resent: 'ایمیل تایید مجدداً ارسال شد.', err_send: 'خطا در ارسال: ', msg_spam_warn: 'مهم: لطفاً پوشه اسپم خود را نیز بررسی کنید!', prompt_email_pwd: 'ایمیل خود را برای بازنشانی رمز عبور وارد کنید:', prompt_email_user: 'ایمیل ثبت نامی خود را وارد کنید:', err_no_account: 'هیچ حسابی یافت نشد.', msg_your_usernames: 'نام(های) کاربری شما:', msg_pwd_reset_sent: 'ایمیل بازنشانی رمز عبور ارسال شد.', msg_legacy_acc: 'حساب شما از سیستم قدیمی استفاده می‌کند. لطفاً ثبت نام کنید.', msg_email_not_ver: 'لطفاً ابتدا ایمیل خود را تأیید کنید.', msg_wrong_pwd: 'رمز عبور یا ایمیل اشتباه است.', msg_user_taken: 'این نام کاربری از قبل گرفته شده است.', msg_email_taken: 'این ایمیل قبلاً ثبت شده است.', msg_weak_pwd: 'رمز عبور بسیار ضعیف است.', err_user_not_found: 'نام کاربری یافت نشد.', err_invalid_id: 'شناسه ۶ رقمی وارد شده اشتباه است.', err_login_failed: 'خطا در ورود: ', err_unexpected: 'خطای غیرمنتظره‌ای رخ داد: ', msg_acc_details_sent: 'ایمیلی حاوی اطلاعات حساب شما ارسال شد.', err_search_failed: 'خطا در جستجو: ' });
Object.assign(TRANSLATIONS.ar, { tab_login: 'تسجيل الدخول', tab_register: 'تسجيل', ph_username: '@اسم_المستخدم', ph_email: 'your@email.com', ph_password: 'كلمة المرور', lnk_forgot_pwd: 'هل نسيت كلمة المرور؟', lnk_forgot_user_id: 'هل نسيت اسم المستخدم / المعرف؟', lnk_resend_verify: 'إعادة إرسال بريد التحقق', prompt_email_id: 'أدخل بريدك الإلكتروني لتلقي رقم التعريف الخاص بك:', prompt_email_verify: 'يرجى إدخال عنوان بريدك الإلكتروني:', msg_id_sent: 'تم إرسال بريد إلكتروني يحتوي على رقم التعريف الخاص بك.', msg_verify_sent: 'تم إرسال رابط التحقق.', msg_verify_resent: 'تم إعادة إرسال بريد التحقق.', err_send: 'خطأ في الإرسال: ', msg_spam_warn: 'هام: يرجى التحقق من مجلد البريد العشوائي (Spam)!', prompt_email_pwd: 'أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور:', prompt_email_user: 'أدخل عنوان بريدك الإلكتروني المسجل:', err_no_account: 'لم يتم العثور على حساب.', msg_your_usernames: 'اسم (أسماء) المستخدم الخاصة بك:', msg_pwd_reset_sent: 'تم إرسال بريد إعادة تعيين كلمة المرور.', msg_legacy_acc: 'حسابك يستخدم النظام القديم. يرجى التبديل إلى التسجيل.', msg_email_not_ver: 'يرجى التحقق من بريدك الإلكتروني أولاً.', msg_wrong_pwd: 'كلمة المرور أو البريد الإلكتروني خاطئ.', msg_user_taken: 'اسم المستخدم هذا مأخوذ.', msg_email_taken: 'هذا البريد الإلكتروني مسجل بالفعل.', msg_weak_pwd: 'كلمة المرور ضعيفة جداً.', err_user_not_found: 'اسم المستخدم غير موجود.', err_invalid_id: 'المعرف المكون من 6 أرقام غير صحيح.', err_login_failed: 'فشل تسجيل الدخول: ', err_unexpected: 'حدث خطأ غير متوقع: ', msg_acc_details_sent: 'تم إرسال بريد إلكتروني يحتوي على تفاصيل حسابك.', err_search_failed: 'فشل البحث: ' });
Object.assign(TRANSLATIONS.tr, { tab_login: 'Giriş Yap', tab_register: 'Kayıt Ol', ph_username: '@kullaniciadi', ph_email: 'senin@email.com', ph_password: 'Şifre', lnk_forgot_pwd: 'Şifremi unuttum?', lnk_forgot_user_id: 'Kullanıcı adı / Kimlik mi unuttunuz?', lnk_resend_verify: 'Doğrulama e-postasını yeniden gönder', prompt_email_id: 'Kimlik numaranızı almak için e-postanızı girin:', prompt_email_verify: 'Lütfen e-posta adresinizi girin:', msg_id_sent: 'Kimlik numaranızı içeren bir e-posta gönderildi.', msg_verify_sent: 'Bir doğrulama bağlantısı gönderildi.', msg_verify_resent: 'Doğrulama e-postası yeniden gönderildi.', err_send: 'Gönderme hatası: ', msg_spam_warn: 'Önemli: Lütfen spam klasörünüzü de kontrol edin!', prompt_email_pwd: 'Şifrenizi sıfırlamak için e-postanızı girin:', prompt_email_user: 'Kayıtlı e-posta adresinizi girin:', err_no_account: 'Hesap bulunamadı.', msg_your_usernames: 'Kullanıcı ad(lar)ınız:', msg_pwd_reset_sent: 'Şifre sıfırlama e-postası gönderildi.', msg_legacy_acc: 'Hesabınız eski sistemi kullanıyor. Lütfen Kayıt Ol a geçin.', msg_email_not_ver: 'Lütfen önce gönderilen bağlantı ile e-postanızı doğrulayın.', msg_wrong_pwd: 'Yanlış şifre veya e-posta.', msg_user_taken: 'Bu kullanıcı adı zaten alınmış.', msg_email_taken: 'Bu e-posta zaten kayıtlı.', msg_weak_pwd: 'Şifre çok zayıf.', err_user_not_found: 'Kullanıcı adı bulunamadı.', err_invalid_id: 'Girilen 6 haneli kimlik yanlış.', err_login_failed: 'Giriş başarısız: ', err_unexpected: 'Beklenmeyen bir hata oluştu: ', msg_acc_details_sent: 'Hesap bilgilerinizi içeren bir e-posta gönderildi.', err_search_failed: 'Arama başarısız: ' });

Object.assign(TRANSLATIONS.de, { ph_username: 'Benutzername (mind. 10 Zeichen)', hint_username: 'Mindestens 10 Zeichen erforderlich.', ph_id_number: '6-stellige ID-Nummer', hint_id_number: '6-stellige ID (wird per E-Mail gesendet).', msg_not_verified: 'Bitte bestätige zuerst deine E-Mail über den Link.', msg_verify_login: 'Bitte logge dich ein, um deinen Account zu aktivieren.' });
Object.assign(TRANSLATIONS.en, { ph_username: 'Username (min. 10 chars)', hint_username: 'At least 10 characters required.', ph_id_number: '6-digit ID number', hint_id_number: '6-digit ID (sent via email).', msg_not_verified: 'Please verify your email via the link first.', msg_verify_login: 'Please log in to activate your account.' });
Object.assign(TRANSLATIONS.fa, { ph_username: 'نام کاربری (حداقل ۱۰ حرف)', hint_username: 'حداقل ۱۰ حرف لازم است.', ph_id_number: 'شماره شناسایی ۶ رقمی', hint_id_number: 'شناسه ۶ رقمی (از طریق ایمیل ارسال می‌شود).', msg_not_verified: 'لطفا ابتدا ایمیل خود را تایید کنید.', msg_verify_login: 'لطفا برای فعال‌سازی حساب خود وارد شوید.' });
Object.assign(TRANSLATIONS.ar, { ph_username: 'اسم المستخدم (10 أحرف على الأقل)', hint_username: 'مطلوب 10 أحرف على الأقل.', ph_id_number: 'رقم تعريف من 6 أرقام', hint_id_number: 'معرف من 6 أرقام (يُرسل عبر البريد الإلكتروني).', msg_not_verified: 'الرجاء التحقق من بريدك الإلكتروني عبر الرابط أولاً.', msg_verify_login: 'الرجاء تسجيل الدخول لتنشيط حسابك.' });
Object.assign(TRANSLATIONS.tr, { ph_username: 'Kullanıcı adı (en az 10 karakter)', hint_username: 'En az 10 karakter gereklidir.', ph_id_number: '6 haneli kimlik numarası', hint_id_number: '6 haneli kimlik (e-posta ile gönderilir).', msg_not_verified: 'Lütfen önce link üzerinden e-postanızı doğrulayın.', msg_verify_login: 'Hesabınızı etkinleştirmek için lütfen giriş yapın.' });

    Object.assign(TRANSLATIONS.de, { btn_new_group: '➕ Neue Gruppe erstellen', lbl_group_desc: 'Beschreibung der Gruppe (optional)', lbl_privacy_public: 'Öffentlich', lbl_privacy_public_desc: 'Jeder kann diese Gruppe suchen und beitreten.', lbl_privacy_private: 'Privat', lbl_privacy_private_desc: 'Nur über Einladung zugänglich. Unsichtbar in der Suche.', err_no_public_groups: 'Keine öffentlichen Gruppen gefunden.', err_search_failed: 'Suche fehlgeschlagen.', lbl_public_group: 'Öffentliche Gruppe', btn_join: 'Beitreten', btn_open: 'Öffnen', call_missed: 'Verpasst', call_incoming: 'Eingehend', call_outgoing: 'Ausgehend', lbl_min: 'Min', lbl_just_now: 'Gerade eben', btn_add_user: 'Hinzufügen' });
    Object.assign(TRANSLATIONS.en, { btn_new_group: '➕ Create New Group', lbl_group_desc: 'Group Description (optional)', lbl_privacy_public: 'Public', lbl_privacy_public_desc: 'Anyone can search and join this group.', lbl_privacy_private: 'Private', lbl_privacy_private_desc: 'Accessible via invite only. Hidden from search.', err_no_public_groups: 'No public groups found.', err_search_failed: 'Search failed.', lbl_public_group: 'Public Group', btn_join: 'Join', btn_open: 'Open', call_missed: 'Missed', call_incoming: 'Incoming', call_outgoing: 'Outgoing', lbl_min: 'Min', lbl_just_now: 'Just now', btn_add_user: 'Add' });
    Object.assign(TRANSLATIONS.fa, { btn_new_group: '➕ ایجاد گروه جدید', lbl_group_desc: 'توضیحات گروه (اختیاری)', lbl_privacy_public: 'عمومی', lbl_privacy_public_desc: 'همه می‌توانند این گروه را جستجو کرده و به آن بپیوندند.', lbl_privacy_private: 'خصوصی', lbl_privacy_private_desc: 'فقط با دعوتنامه قابل دسترسی است. پنهان از جستجو.', err_no_public_groups: 'هیچ گروه عمومی یافت نشد.', err_search_failed: 'جستجو ناموفق بود.', lbl_public_group: 'گروه عمومی', btn_join: 'پیوستن', btn_open: 'باز کردن', call_missed: 'از دست رفته', call_incoming: 'ورودی', call_outgoing: 'خروجی', lbl_min: 'دقیقه', lbl_just_now: 'همین الان', btn_add_user: 'افزودن' });
    Object.assign(TRANSLATIONS.ar, { btn_new_group: '➕ إنشاء مجموعة جديدة', lbl_group_desc: 'وصف المجموعة (اختياري)', lbl_privacy_public: 'عام', lbl_privacy_public_desc: 'يمكن لأي شخص البحث والانضمام إلى هذه المجموعة.', lbl_privacy_private: 'خاص', lbl_privacy_private_desc: 'يمكن الوصول إليه عبر الدعوة فقط. مخفي من البحث.', err_no_public_groups: 'لم يتم العثور على مجموعات عامة.', err_search_failed: 'فشل البحث.', lbl_public_group: 'مجموعة عامة', btn_join: 'انضمام', btn_open: 'فتح', call_missed: 'فائتة', call_incoming: 'واردة', call_outgoing: 'صادرة', lbl_min: 'دقيقة', lbl_just_now: 'الآن', btn_add_user: 'إضافة' });
    Object.assign(TRANSLATIONS.tr, { btn_new_group: '➕ Yeni Grup Oluştur', lbl_group_desc: 'Grup Açıklaması (isteğe bağlı)', lbl_privacy_public: 'Herkese Açık', lbl_privacy_public_desc: 'Herkes bu grubu arayabilir ve katılabilir.', lbl_privacy_private: 'Gizli', lbl_privacy_private_desc: 'Yalnızca davetle erişilebilir. Aramalarda gizlidir.', err_no_public_groups: 'Herkese açık grup bulunamadı.', err_search_failed: 'Arama başarısız.', lbl_public_group: 'Herkese Açık Grup', btn_join: 'Katıl', btn_open: 'Aç', call_missed: 'Cevapsız', call_incoming: 'Gelen', call_outgoing: 'Giden', lbl_min: 'Dk', lbl_just_now: 'Az önce', btn_add_user: 'Ekle' });
    function getTranslatedChatName(chat) {
        if (!chat) return '';
        if (chat.id === 'saved') return (TRANSLATIONS[currentLang] || TRANSLATIONS['en'])['chat_saved'];
        const cname = (chat.name || '').toLowerCase().trim();
        if (chat.id === 'general' || cname === 'allgemein' || cname === 'general') return (TRANSLATIONS[currentLang] || TRANSLATIONS['en'])['chat_general'];
        return chat.name;
    }

    function applyTranslation(lang) {
        currentLang = lang; localStorage.setItem('doori_lang', lang);
        window.currentLang = lang;
        if (['fa', 'ar'].includes(lang)) document.body.classList.add('rtl-mode'); else document.body.classList.remove('rtl-mode');
        const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                if (el.tagName === 'INPUT') {
                    el.placeholder = t[key];
                } else if (el.tagName === 'TEXTAREA' && el.hasAttribute('placeholder')) {
                    el.placeholder = t[key];
                } else {
                    el.textContent = t[key];
                }
            }
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (t[key]) el.title = t[key];
        });
        if (langSelect.value !== lang) langSelect.value = lang;
        if (loginLangSelect && loginLangSelect.value !== lang) loginLangSelect.value = lang;
        renderChatList();
        if (currentChat) {
            currentChatName.textContent = getTranslatedChatName(currentChat);
        }
    }

    function initPickers() {
        EMOJIS.forEach(e => { const s = document.createElement('span'); s.textContent = e; s.onclick = () => { messageInput.value += e; emojiPicker.classList.add('hidden'); }; emojiPicker.appendChild(s); });
        GIFS.forEach(url => { const img = document.createElement('img'); img.src = url; img.onclick = () => { sendMessage('', 'gif', url); gifPicker.classList.add('hidden'); }; document.getElementById('gif-grid').appendChild(img); });
    }
    initPickers();
    applyTranslation(currentLang);
    emojiBtn.addEventListener('click', (e) => { e.stopPropagation(); emojiPicker.classList.toggle('hidden'); gifPicker.classList.add('hidden'); });
    gifBtn.addEventListener('click', (e) => { e.stopPropagation(); gifPicker.classList.toggle('hidden'); emojiPicker.classList.add('hidden'); });
    document.addEventListener('click', (e) => { 
        if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) emojiPicker.classList.add('hidden'); 
        if (!gifPicker.contains(e.target) && e.target !== gifBtn) gifPicker.classList.add('hidden'); 
        if (!sendOptionsPopup.contains(e.target) && e.target !== sendBtn) sendOptionsPopup.classList.add('hidden');
    });

    // --- Network Layer ---
    const bc = new BroadcastChannel('doori_messenger');
    bc.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'user_login') {
            handleUserOnline(data.username);
        }
    };

    function publishEvent(data) { bc.postMessage(data); }

    
    let lastOnlineInterval = null;
    function startOnlineTracking() {
        if(lastOnlineInterval) clearInterval(lastOnlineInterval);
        const update = (e, force = false) => {
            try {
                if(!currentUser || !window.db) return;
                let fb = typeof firebase !== 'undefined' ? firebase : window.firebase;
                if(!fb) return;
                
                const isVisible = document.visibilityState === 'visible';
                if (force || isVisible || (e && e.type === 'visibilitychange')) {
                    window.db.collection('userData').doc(currentUser.toLowerCase()).set({ 
                        lastSeen: fb.firestore.FieldValue.serverTimestamp(),
                        isOnline: isVisible
                    }, { merge: true }).catch(()=>{});
                }
            } catch(err) {
                console.error("Tracking error:", err);
            }
        };
        update(null, true); // Force update on load regardless of visibility
        lastOnlineInterval = setInterval(() => {
            if (document.visibilityState === 'visible') update();
        }, 60000);
        document.addEventListener('visibilitychange', update);
        window.addEventListener('pagehide', update);
        window.addEventListener('beforeunload', update);
    }

    window.formatLastSeenTime = function(ls, isOnline = false, forceOffline = false) {
        try {
            const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en'];
            if (!ls) return '(Kein Zeitstempel vorhanden)';
            
            let lsMs = ls;
            if (ls === 'online') {
                lsMs = Date.now();
            } else if (typeof ls === 'number') {
                lsMs = ls;
            } else if (ls && typeof ls.toMillis === 'function') {
                lsMs = ls.toMillis();
            } else if (ls && typeof ls.seconds !== 'undefined') {
                lsMs = ls.seconds * 1000;
            } else if (ls && typeof ls._seconds !== 'undefined') {
                lsMs = ls._seconds * 1000;
            } else {
                return '(Zeitstempel-Fehler)';
            }

            const now = Date.now();
            const diffMs = now - lsMs;
            
            const isTrulyOnline = isOnline && !forceOffline;
            if (isTrulyOnline) return t.ls_online || 'Online';
            
            if (diffMs < 0) return (t.ls_minutes || 'zuletzt online vor {m} Minuten').replace('{m}', 1); // Clock skew protection
            if (diffMs < 60000) return (t.ls_minutes || 'zuletzt online vor {m} Minuten').replace('{m}', 1);
            
            const diffMinutes = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffDays < 3 && diffDays >= 0) {
                if (diffMinutes < 60) return (t.ls_minutes || 'zuletzt online vor {m} Minuten').replace('{m}', Math.max(1, diffMinutes));
                
                const date = new Date(lsMs);
                const today = new Date();
                const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
                
                const timeStr = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
                
                if (isToday) {
                    return (t.ls_today || 'zuletzt online heute um {t}').replace('{t}', timeStr);
                } else if (diffDays <= 1) {
                    return (t.ls_yesterday || 'zuletzt online gestern um {t}').replace('{t}', timeStr);
                } else {
                    const dateStr = date.toLocaleDateString(window.currentLang, {day: '2-digit', month: '2-digit', year: 'numeric'});
                    return (t.ls_days || 'zuletzt online am {d} um {t}').replace('{d}', dateStr).replace('{t}', timeStr);
                }
            } else if (diffDays <= 7 && diffDays >= 0) {
                return t.ls_week || 'zuletzt online diese Woche';
            } else if (diffDays <= 30 && diffDays >= 0) {
                return t.ls_month || 'zuletzt online diesen Monat';
            } else {
                return t.ls_long_time || 'vor langer Zeit online';
            }
        } catch(e) {
            return '(Formatierungs-Fehler)';
        }
    };

    let isSpeakerphoneOn = false;
    window.toggleSpeakerphone = function() {
        isSpeakerphoneOn = !isSpeakerphoneOn;
        const btns = ['speaker-toggle-btn', 'video-speaker-toggle-btn', 'group-speaker-toggle-btn'];
        btns.forEach(id => {
            const btn = document.getElementById(id);
            if(btn) {
                btn.style.color = isSpeakerphoneOn ? '#2ed573' : '#fff';
                btn.style.background = isSpeakerphoneOn ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255,255,255,0.15)';
            }
        });
        console.log('Speakerphone toggled: ', isSpeakerphoneOn, '(Note: Web API relies on OS for actual audio routing on mobile)');
    };
    
    // Attach speaker listeners
    setTimeout(() => {
        ['speaker-toggle-btn', 'video-speaker-toggle-btn', 'group-speaker-toggle-btn'].forEach(id => {
            const btn = document.getElementById(id);
            if(btn) btn.addEventListener('click', window.toggleSpeakerphone);
        });
    }, 2000);

    // --- Core Functions ---
    async function loadUserData() {
        messages = new Map(); // Force fresh start for Firestore
        try {
            const docSnap = await window.db.collection('userData').doc(currentUser.toLowerCase()).get();
            if (docSnap.exists) {
                const data = docSnap.data();
                if (data.chatData) {
                    chatData.personal = data.chatData.personal || [{ id: 'saved', name: 'Gespeichertes', type: 'saved' }];
                    chatData.contacts = data.chatData.contacts || [];
    chatData.active_chats = data.chatData.active_chats || [];
    if (chatData.active_chats.length === 0 && chatData.contacts.length > 0) { chatData.active_chats = JSON.parse(JSON.stringify(chatData.contacts)); }
                    chatData.rooms = []; // Handled by global groups listener
                }
                if (data.blockedContacts) blockedContacts = new Set(data.blockedContacts);
                if (data.mutedChats) mutedChats = new Set(data.mutedChats);
                if (data.pinnedChats) pinnedChats = data.pinnedChats;
                if (data.dmPins) dmPins = data.dmPins;
            } else {
                // Fallback / Auto-Migration from old localStorage
                const saved = localStorage.getItem(`doori_${currentUser}`);
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (parsed.chatData) {
                            chatData.personal = parsed.chatData.personal || [{ id: 'saved', name: 'Gespeichertes', type: 'saved' }];
                            chatData.contacts = parsed.chatData.contacts || [];
    chatData.active_chats = parsed.chatData.active_chats || [];
    if (chatData.active_chats.length === 0 && chatData.contacts.length > 0) { chatData.active_chats = JSON.parse(JSON.stringify(chatData.contacts)); }
                            chatData.rooms = [];
                        }
                        if (parsed.blockedContacts) blockedContacts = new Set(parsed.blockedContacts);
                        if (parsed.mutedChats) mutedChats = new Set(parsed.mutedChats);
                        // Push old data to cloud
                        saveUserData();
                        migrateOldMessages();
                    } catch(e) { console.error("Migration error", e); }
                }
            }
            
            // Also fetch own profile from users collection
            const userSnap = await window.db.collection('users').doc(currentUser.toLowerCase()).get();
            if (userSnap.exists) {
                const uData = userSnap.data();
                users.set(currentUser, { avatarUrl: uData.avatarUrl || null, status: 'Online', searchable: uData.searchable !== false, avatarVisibility: uData.avatarVisibility || 'all', callPrivacy: uData.callPrivacy || 'all' });
                
                const searchableToggle = document.getElementById('setting-searchable');
                if (searchableToggle) searchableToggle.checked = uData.searchable !== false;
                
                const avatarVisSelect = document.getElementById('setting-avatar-visibility');
                if (avatarVisSelect) avatarVisSelect.value = uData.avatarVisibility || 'all';
                const callPrivSelect = document.getElementById('setting-call-privacy');
                if (callPrivSelect) callPrivSelect.value = uData.callPrivacy || 'all';
            } else {
                if (!users.has(currentUser)) users.set(currentUser, { avatarUrl: null, status: 'Online' });
            }
            
            migrateOldMessages();
        } catch(e) {
            console.error("Load UserData error", e);
            if (!users.has(currentUser)) users.set(currentUser, { avatarUrl: null, status: 'Online' });
        }
        
        applyTranslation(currentLang);
        setupFirestoreListeners();
        startOnlineTracking();
        renderChatList();
        // selectChat('general', 'room');
        publishEvent({ type: 'user_login', username: currentUser });
    }

    async function handleJoinGroupLink(groupId) {
        try {
            let groupDoc;
            if (/^\d{6}$/.test(groupId)) {
                const snapshot = await window.db.collection('groups').where('groupId', '==', groupId).get();
                if (!snapshot.empty) groupDoc = snapshot.docs[0];
            }
            if (!groupDoc) groupDoc = await window.db.collection('groups').doc(groupId).get();
            
            if (!groupDoc || !groupDoc.exists) {
                alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_group_not_found || 'Diese Gruppe existiert nicht oder wurde gelöscht.');
                return;
            }
            const groupData = groupDoc.data();
            if (groupData.members && groupData.members.includes(currentUser)) {
                // Already a member
                selectChat(groupId, 'room');
                return;
            }
            if (confirm(`Möchtest du der Gruppe '${groupData.name}' beitreten?`)) {
                await window.db.collection('groups').doc(groupId).update({
                    members: firebase.firestore.FieldValue.arrayUnion(currentUser)
                });
                await window.sendSystemMessage(groupId, 'joined');
                selectChat(groupId, 'room');
            }
        } catch(e) {
            console.error("Error joining group via link", e);
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_join_group || 'Fehler beim Beitreten der Gruppe.');
        }
    }

    function setupFirestoreListeners() {
        unsubListeners.forEach(u => u());
        unsubListeners = [];
        
        // Listener 1: Private Messages (DMs & Saved)
        let initialDMLoad = true;
        const dmListener = window.db.collection('messages')
            .where('participants', 'array-contains', currentUser.toLowerCase())
            .onSnapshot(snapshot => {
                let changed = false;
                snapshot.docChanges().forEach(change => {
                    const msg = change.doc.data();
                    msg.id = change.doc.id;
                    const chatId = (msg.isPublic || msg.chat_id === 'saved') ? msg.chat_id : (msg.sender_username === currentUser ? msg.recipient_username : msg.sender_username);
                    
                    if (change.type === 'removed') {
                        if (messages.has(chatId)) {
                            const chatMsgs = messages.get(chatId);
                            const existingIdx = chatMsgs.findIndex(m => m.id === msg.id);
                            if (existingIdx >= 0) {
                                chatMsgs.splice(existingIdx, 1);
                                changed = true;
                            }
                        }
                    } else if (change.type === 'added' || change.type === 'modified') {
                        if (msg.type === 'group_invite' && !msg.participants.includes(currentUser.toLowerCase())) {
                            return; // Only process if current user is a participant
                        }

                        if (chatId !== 'saved' && msg.sender_username !== currentUser) {
                            if (!chatData.active_chats.find(c => c.id === chatId)) {
                        chatData.active_chats.push({ id: chatId, name: chatId, type: 'dm', isSecret: false });
                        saveUserData();
                        renderChatList();
                    }
                    if (!chatData.contacts.find(c => c.id === chatId)) {
                                chatData.contacts.push({ id: chatId, name: chatId, type: 'dm', isSecret: false });
                            }
                        }
                        
                        if (!messages.has(chatId)) messages.set(chatId, []);
                        const chatMsgs = messages.get(chatId);
                        const existingIdx = chatMsgs.findIndex(m => m.id === msg.id);
                        if (existingIdx >= 0) chatMsgs[existingIdx] = msg;
                        else {
                            chatMsgs.push(msg);
                            if (change.type === 'added' && msg.sender_username !== currentUser) {
                                if (chatId !== currentChat?.id) {
                                    unreadChats.add(chatId);
                                } else if (msg.read === false) {
                                    window.db.collection('messages').doc(msg.id).update({ read: true, readAt: Date.now() }).catch(e=>console.log(e));
                                }
                            }
                            // Trigger popup for new pending invites
                            if (change.type === 'added' && msg.type === 'group_invite' && msg.invite_status === 'pending' && msg.sender_username !== currentUser) {
                                if (window.showGlobalInvitePopup) window.showGlobalInvitePopup(msg);
                            }
                        }
                        
                        if (!initialDMLoad && change.type === 'added' && !msg.silent && msg.sender_username !== currentUser && !blockedContacts.has(msg.sender_username) && !mutedChats.has(msg.sender_username)) {
                            if (msg.mediaType === 'buzz') {
                                if (typeof triggerBuzzShake === 'function') triggerBuzzShake();
                            } else {
                                playSound();
                            }
                        }
                        changed = true;
                    }
                });
                initialDMLoad = false;
                if (changed) {
                    messages.forEach((msgs, id) => msgs.sort((a,b) => a.timestamp - b.timestamp));
                    saveUserData();
                    renderChatList();
                    renderMessages();
                }
            });
            
        // Listener 2: Public Rooms
        let initialRoomLoad = true;
        const roomListener = window.db.collection('messages')
            .where('isPublic', '==', true)
            .onSnapshot(snapshot => {
                let changed = false;
                snapshot.docChanges().forEach(change => {
                    const msg = change.doc.data();
                    msg.id = change.doc.id;
                    const chatId = msg.chat_id;
                    
                    if (change.type === 'removed') {
                        if (messages.has(chatId)) {
                            const chatMsgs = messages.get(chatId);
                            const existingIdx = chatMsgs.findIndex(m => m.id === msg.id);
                            if (existingIdx >= 0) {
                                chatMsgs.splice(existingIdx, 1);
                                changed = true;
                            }
                        }
                    } else if (change.type === 'added' || change.type === 'modified') {
                        if (!messages.has(chatId)) messages.set(chatId, []);
                        const chatMsgs = messages.get(chatId);
                        const existingIdx = chatMsgs.findIndex(m => m.id === msg.id);
                        if (existingIdx >= 0) chatMsgs[existingIdx] = msg;
                        else {
                            chatMsgs.push(msg);
                            if (change.type === 'added' && msg.sender_username !== currentUser && chatId !== currentChat?.id) {
                                unreadChats.add(chatId);
                            }
                        }
                        
                        if (!initialRoomLoad && change.type === 'added' && !msg.silent && msg.sender_username !== currentUser && !blockedContacts.has(msg.sender_username) && !mutedChats.has(chatId)) {
                            if (msg.mediaType === 'buzz') {
                                if (typeof triggerBuzzShake === 'function') triggerBuzzShake();
                            } else {
                                playSound();
                            }
                        }
                        changed = true;
                    }
                });
                initialRoomLoad = false;
                if (changed) {
                    messages.forEach((msgs, id) => msgs.sort((a,b) => a.timestamp - b.timestamp));
                    saveUserData();
                    renderChatList();
                    renderMessages();
                }
            });
            
        // Listener 3: Groups
        const groupsListener = window.db.collection('groups')
            .where('members', 'array-contains', currentUser)
            .onSnapshot(snapshot => {
                let changed = false;
                snapshot.docChanges().forEach(change => {
                    const group = change.doc.data();
                    if (change.type === 'added' || change.type === 'modified') {
                        group.type = 'room'; // Ensure local type is room
                        const existingIdx = chatData.rooms.findIndex(r => r.id === group.id);
                        if (existingIdx >= 0) chatData.rooms[existingIdx] = group;
                        else chatData.rooms.push(group);
                        changed = true;
                    } else if (change.type === 'removed') {
                        const existingIdx = chatData.rooms.findIndex(r => r.id === group.id);
                        if (existingIdx >= 0) {
                            const groupName = chatData.rooms[existingIdx].name;
                            chatData.rooms.splice(existingIdx, 1);
                            changed = true;
                            if (currentChat && currentChat.id === group.id) {
                                selectChat('general', 'room');
                            }
                        }
                    }
                });
                if (changed) {
                    renderChatList();
                    if (currentChat && currentChat.type === 'room') {
                        const updatedGroup = chatData.rooms.find(r => r.id === currentChat.id);
                        if (updatedGroup) {
                            currentChat = updatedGroup;
                            window.currentChat = updatedGroup;
                            if (typeof renderGroupInfo === 'function' && !document.getElementById('group-info-sidebar').classList.contains('hidden')) {
                                renderGroupInfo();
                            }
                        } else if (currentChat.id !== 'general') {
                            selectChat('general', 'room');
                        }
                        
                        // Toggle Banner if the current group has an active call
                        const groupCallBanner = document.getElementById('group-call-banner');
                        if (groupCallBanner && currentChat.type === 'room') {
                            if (currentChat.activeCall && currentChat.activeCall.initiator) {
                                groupCallBanner.classList.remove('hidden');
                            } else {
                                groupCallBanner.classList.add('hidden');
                            }
                        }
                    }
                }
            });
            
        unsubListeners.push(dmListener, roomListener, groupsListener);
    }

    async function migrateOldMessages() {
        // Disabled to prevent resource exhaustion and browser freezing
        return;
    }

    function saveUserData() {
        if (!currentUser) return;
        
        const dataToSave = {
            chatData: chatData,
            blockedContacts: Array.from(blockedContacts),
            mutedChats: Array.from(mutedChats),
            pinnedChats: pinnedChats,
            dmPins: dmPins
        };
        
        window.db.collection('userData').doc(currentUser.toLowerCase()).set(dataToSave, { merge: true })
            .catch(e => console.error("Save UserData Error", e));
            
        const p = users.get(currentUser);
        if (p) {
            const isSearchable = document.getElementById('setting-searchable') ? document.getElementById('setting-searchable').checked : true;

            const avatarVis = document.getElementById('setting-avatar-visibility') ? document.getElementById('setting-avatar-visibility').value : 'all';
            const callPriv = document.getElementById('setting-call-privacy') ? document.getElementById('setting-call-privacy').value : 'all';
            window.db.collection('users').doc(currentUser.toLowerCase()).set({ avatarUrl: p.avatarUrl || null, searchable: isSearchable, avatarVisibility: avatarVis, callPrivacy: callPriv }, { merge: true })
                .catch(e => console.error("Save User Profile Error", e));
        }
    }

    function renderMessages() {
        if (!currentChat) return;
        const msgs = messages.get(currentChat.id) || [];
        const now = Date.now();
        const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];
        
        let shouldScroll = false;
        const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 50;
        
        const currentIds = new Set();
        let lastPinnedMsg = null;
        
        // Cache DOM nodes to avoid O(N^2) querySelector calls
        const domNodes = new Map();
        Array.from(messagesContainer.children).forEach(child => {
            if (child.dataset.id) {
                domNodes.set(child.dataset.id, child);
            }
        });
        
        const doodleTypes = ['doodle_invite', 'doodle_accept', 'doodle_close', 'doodle_reject'];
        let latestDoodleIndex = -1;
        msgs.forEach((msg, idx) => {
            if (doodleTypes.includes(msg.mediaType) || (msg.text && msg.text.includes('Doodle Einladung abgelehnt'))) {
                latestDoodleIndex = idx;
            }
        });
        
        msgs.forEach((msg, idx) => {
            if (msg.expires_at && now > msg.expires_at) return;
            if (msg.deletedFor && msg.deletedFor.includes(currentUser)) return;
            
            // Only show the LATEST doodle message
            if ((doodleTypes.includes(msg.mediaType) || (msg.text && msg.text.includes('Doodle Einladung abgelehnt'))) && idx !== latestDoodleIndex) {
                return; 
            }
            if (msg.isPinned) lastPinnedMsg = msg;
            currentIds.add(msg.id);
            
            const isSentByMe = msg.sender_username === currentUser;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            let ticks = ''; 
            if(isSentByMe && currentChat.type !== 'saved') {
                if (currentChat.type === 'dm') {
                    ticks = msg.read !== false ? ' <span style="color:#34b7f1; margin-left:3px;">✓✓</span>' : ' <span style="color:#999; margin-left:3px;">✓✓</span>';
                } else {
                    ticks = ' <span style="color:#999; margin-left:3px;">✓✓</span>'; // Group chats only show grey for now
                }
            }
            
            let contentHtml = '';
            
            if (msg.isForwarded) {
                contentHtml += `<div class="forwarded-tag">↪️ ${(TRANSLATIONS[currentLang]||TRANSLATIONS['en']).msg_forwarded || 'Weitergeleitet'}</div>`;
            }
            if (msg.replyTo) {
                contentHtml += `<div class="reply-preview"><span class="reply-preview-sender">${msg.replyTo.sender}</span>${msg.replyTo.text}</div>`;
            }
            
            if (msg.mediaType === 'image') { contentHtml += `<img src="${msg.mediaUrl}" style="max-width:100%; border-radius:8px; margin-bottom:5px;"><br>${msg.text}`; }
            else if (msg.mediaType === 'video') { contentHtml += renderCustomPlayer(getCachedBlobUrl(msg), 'video') + (msg.text ? `<br>${msg.text}`:''); }
            else if (msg.mediaType === 'audio') { contentHtml += renderCustomPlayer(getCachedBlobUrl(msg), 'audio') + (msg.text ? `<br>${msg.text}`:''); }
            else if (msg.mediaType === 'gif') { contentHtml += `<img src="${msg.mediaUrl}" class="gif-msg"><br>${msg.text}`; }
            else if (msg.mediaType === 'buzz') { contentHtml += `<div class="buzz-message">⚡ BUZZ! ⚡</div>`; }
            else if (msg.mediaType === 'doodle_invite') {
                contentHtml += `<div class="doodle-invite-msg" style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; text-align: center; margin-top: 5px;">🎨 <b>${t.doodle_title || 'Doodle Einladung'}</b><br><br><button class="submit-btn" style="padding: 8px 15px; font-size: 14px;" onclick="this.disabled=true; this.textContent='${t.doodle_connecting || 'Verbunden...'}'; if(window.acceptDoodleInvite) window.acceptDoodleInvite('${msg.sender}')">${t.doodle_btn_accept || 'Mitzeichnen'}</button>
                    <button class="submit-btn" style="padding: 8px 15px; font-size: 14px; background: var(--bg-red); color: white; margin-left: 5px;" onclick="this.disabled=true; this.textContent='${t.doodle_rejected || 'Abgelehnt'}'; if(window.rejectDoodleInvite) window.rejectDoodleInvite('${msg.sender}')">${t.doodle_btn_reject || 'Ablehnen'}</button></div>`;
            }
            else if (msg.mediaType === 'doodle_accept') {
                contentHtml += `<div class="doodle-invite-msg" style="background: rgba(46, 213, 115, 0.1); color: #2ed573; padding: 10px; border-radius: 8px; text-align: center; margin-top: 5px;">✅ <b>${t.doodle_msg_accepted || 'Doodle Einladung angenommen'}</b></div>`;
                if(msg.sender !== currentUser && window.handleDoodleAccept) {
                    window.handleDoodleAccept(msg.timestamp);
                }
            }
            else if (msg.mediaType === 'doodle_close') {
                contentHtml += `<div class="doodle-invite-msg" style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; text-align: center; margin-top: 5px;">❌ <b>${t.doodle_msg_closed || 'Doodle beendet'}</b></div>`;
                if(msg.sender !== currentUser && window.handleDoodleClose) {
                    window.handleDoodleClose(msg.timestamp);
                }
            }
            else if (msg.mediaType === 'location') {
                contentHtml += `<a href="https://maps.google.com/?q=${msg.mediaUrl}" target="_blank" class="location-msg" style="display:inline-flex; align-items:center; gap:8px; background:rgba(0,210,211,0.1); color:var(--accent); padding:10px 15px; border-radius:12px; text-decoration:none; font-weight:600;"><span style="font-size:20px;">📍</span> ${(t.msg_location || 'Standort ansehen')}</a>`;
            }
            else if (msg.mediaType === 'doodle_reject') {
                contentHtml += `<div class="doodle-invite-msg" style="background: rgba(255,107,107,0.1); color: #ff6b6b; padding: 10px; border-radius: 8px; text-align: center; margin-top: 5px;">❌ <b>${t.doodle_msg_rejected || 'Doodle Einladung abgelehnt'}</b></div>`;
            }
            else { 
                let processedText = msg.text || '';
                if (currentChat && currentChat.type === 'room') {
                    processedText = processedText.replace(/@[\w]+/gi, match => {
                        if (match.toLowerCase() === currentUser) {
                            return `<span class="mention" style="background: rgba(46, 213, 115, 0.3); color: #2ed573; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${match}</span>`;
                        } else {
                            return `<span class="mention" style="color: var(--accent); font-weight: bold;">${match}</span>`;
                        }
                    });
                }
                contentHtml += processedText; 
                if(msg.edited) contentHtml += `<span class="edited-tag">(bearbeitet)</span>`; 
            }
            
            let reactionsHtml = '';
            if (msg.reactions && Object.keys(msg.reactions).length > 0) {
                reactionsHtml += `<div class="reactions-bar">`;
                for (const [emoji, users] of Object.entries(msg.reactions)) {
                    if (users.length > 0) {
                        const hasMyReaction = users.includes(currentUser);
                        reactionsHtml += `<div class="reaction-bubble ${hasMyReaction ? 'active' : ''}">${emoji} ${users.length}</div>`;
                    }
                }
                reactionsHtml += `</div>`;
            }
            
            let ttlHtml = ''; 
            if (msg.ttl) { if(msg.expires_at) { const remaining = Math.max(0, Math.ceil((msg.expires_at - now)/1000)); ttlHtml = `<span class="ttl-indicator">⏳ ${remaining}s</span>`; } else ttlHtml = `<span class="ttl-indicator">⏳ ${msg.ttl}s</span>`; }
            let statusHtml = ''; if(msg.silent) statusHtml += `<span class="status-indicator">🔕</span>`; if(msg.isSecret) statusHtml += `<span class="status-indicator">🔒</span>`;
            
            const hash = (msg.text || '') + (msg.edited ? '1':'0') + msg.mediaType + timeStr + JSON.stringify(msg.reactions||{}) + (msg.replyTo?'1':'0') + msg.type + msg.invite_status + (msg.read ? '1':'0') + (msg.deletedFor ? JSON.stringify(msg.deletedFor) : '');
            
            let expectedInner = '';
            let className = '';

            if (msg.type === 'group_invite') {
                className = msg.sender_username === currentUser ? 'message sent' : 'message received';
                let inviteText = `💌 Einladung zur Gruppe: <b>${msg.invite_group_name}</b>`;
                let btnHtml = '';
                if (msg.invite_status === 'pending') {
                    if (msg.sender_username !== currentUser) {
                        btnHtml = `<div style="margin-top:10px; display:flex; gap:10px; justify-content:center;">
                            <button class="submit-btn" style="padding:5px 10px; font-size:12px;" onclick="acceptGroupInvite('${msg.invite_group_id}', '${msg.id}', '${msg.sender_username}', '${msg.invite_group_name}')">${t.btn_accept || 'Annehmen'}</button>
                            <button class="danger-btn" style="padding:5px 10px; font-size:12px;" onclick="declineGroupInvite('${msg.invite_group_id}', '${msg.id}', '${msg.sender_username}', '${msg.invite_group_name}')">${t.btn_decline || 'Ablehnen'}</button>
                        </div>`;
                    } else {
                        inviteText += `<br><span style="font-size:11px; color:#aaa;">(Wartet auf Antwort...)</span>`;
                    }
                } else if (msg.invite_status === 'accepted') {
                    inviteText += `<br><span style="font-size:12px; color:var(--accent);">${t.msg_invite_accepted || 'Einladung angenommen'}</span>`;
                } else if (msg.invite_status === 'declined') {
                    inviteText += `<br><span style="font-size:12px; color:#ff4757;">${t.msg_invite_declined || 'Einladung abgelehnt'}</span>`;
                }
                
                expectedInner = `
                    <div class="message-content" style="background: rgba(37, 211, 102, 0.1); border: 1px solid rgba(37,211,102,0.3);">
                        <div class="sender">${msg.sender_username}</div>
                        <div class="text" style="text-align:center;">
                            ${inviteText}
                            ${btnHtml}
                        </div>
                        <div class="time">${timeStr}</div>
                    </div>
                `;
            }
            else if (msg.type === 'system') {
                className = 'message system';
                const t = window.TRANSLATIONS[window.currentLang] || {};
                let actionText = '';
                if (msg.system_action === 'joined') actionText = t.sys_user_joined || 'ist der Gruppe beigetreten';
                if (msg.system_action === 'left') actionText = t.sys_user_left || 'hat die Gruppe verlassen';
                if (msg.system_action === 'removed') actionText = t.sys_user_removed || 'wurde aus der Gruppe entfernt';
                expectedInner = `<div class="system-message-text">${msg.system_target} ${actionText}</div>`;

            } else {
                
                let customStyle = '';
                if(msg.fontFamily && msg.fontFamily !== 'Inter') {
                    customStyle += `font-family: ${msg.fontFamily}; `;
                    // Dynamically load Google Font if needed
                    if(msg.fontFamily === 'Outfit' || msg.fontFamily === 'Poppins') {
                        if(!document.getElementById('font-'+msg.fontFamily)) {
                            const link = document.createElement('link');
                            link.id = 'font-'+msg.fontFamily;
                            link.href = 'https://fonts.googleapis.com/css2?family=' + msg.fontFamily + ':wght@300;400;500;600&display=swap';
                            link.rel = 'stylesheet';
                            document.head.appendChild(link);
                        }
                    }
                }
                if(msg.fontColor && msg.fontColor !== 'default') customStyle += `color: ${msg.fontColor}; `;
                if(msg.fontSize) {
                    let px = '15px';
                    if(msg.fontSize === 'small') px = '13px';
                    if(msg.fontSize === 'large') px = '18px';
                    if(msg.fontSize !== 'normal') customStyle += `font-size: ${px}; `;
                }
                let styleAttr = customStyle ? ` style="${customStyle}"` : '';
                expectedInner = `<div class="message-sender">${isSentByMe ? 'Du' : msg.sender_username}</div><div class="message-bubble"${styleAttr}><div>${contentHtml}</div></div>${reactionsHtml}<div class="message-time">${ttlHtml} ${statusHtml} ${timeStr}${ticks}</div>`;
    
                className = `message ${isSentByMe ? 'sent' : 'received'}`;
            }
            
            let div = domNodes.get(msg.id);
            if (div) {
                if (div.dataset.hash !== hash) {
                    div.className = className;
                    div.innerHTML = expectedInner;
                    div.dataset.hash = hash;
                }
            } else {
                div = document.createElement('div');
                div.className = className;
                div.dataset.id = msg.id;
                div.dataset.hash = hash;
                div.innerHTML = expectedInner;
                messagesContainer.appendChild(div);
                shouldScroll = true;
            }
        });
        
        Array.from(messagesContainer.children).forEach(el => {
            if (el.dataset.id && !currentIds.has(el.dataset.id)) el.remove();
        });

        if (shouldScroll || isAtBottom) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        if (currentChat && currentChat.pinnedMessageId && currentChat.pinnedMessageText) {
            pinnedTextPreview.textContent = currentChat.pinnedMessageText;
            pinnedMessageBanner.classList.remove('hidden');
            const lbl = (TRANSLATIONS[currentLang] || TRANSLATIONS['en']).msg_pinned || 'Angeheftete Nachricht';
            pinnedMessageBanner.querySelector('.pinned-label').textContent = lbl;
        } else {
            pinnedMessageBanner.classList.add('hidden');
        }
        initCustomPlayers();
    }

    // --- Context Menu Logic ---
        function openContextMenu(e, msg) {
            console.log('Dynamic openContextMenu called for msg.id:', msg.id);
            try {
                if (e.type !== 'touchstart') e.preventDefault();
                
                // Cleanup old if exists
                const oldOverlay = document.getElementById('dynamic-context-overlay');
                if (oldOverlay) oldOverlay.remove();

                const isSentByMe = msg.sender_username === currentUser;
                const isPinned = currentChat ? currentChat.pinnedMessageId === msg.id : false;
                const t = window.TRANSLATIONS[currentLang] || window.TRANSLATIONS['en'] || {};

                const overlay = document.createElement('div');
                overlay.id = 'dynamic-context-overlay';
                // Bulletproof styling
                overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.01); z-index: 2147483647; display: block; opacity: 1; visibility: visible; pointer-events: auto;';
                
                overlay.addEventListener('click', (ev) => { if(ev.target === overlay) overlay.remove(); });
                overlay.addEventListener('contextmenu', (ev) => { ev.preventDefault(); overlay.remove(); });

                const menu = document.createElement('div');
                menu.className = 'context-menu glass-panel';
                menu.style.cssText = 'position: absolute; min-width: 200px; padding: 10px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 2147483647; display: block; opacity: 1; visibility: visible; pointer-events: auto;';
                
                // Emoji Bar
                const emojiBar = document.createElement('div');
                emojiBar.className = 'emoji-reaction-bar';
                const emojis = ['❤️', '👍', '😂', '👎', '🔥'];
                emojis.forEach(emj => {
                    const span = document.createElement('span');
                    span.className = 'reaction-emoji';
                    span.textContent = emj;
                    span.onclick = async () => {
                        const originalMsgs = window.messages.get(currentChat.id) || [];
                        const orig = originalMsgs.find(m => m.id === msg.id);
                        if (orig) {
                            let currentReactions = orig.reactions || {};
                            let emojiUsers = currentReactions[emj] || [];
                            if (emojiUsers.includes(currentUser)) {
                                emojiUsers = emojiUsers.filter(u => u !== currentUser);
                            } else {
                                emojiUsers.push(currentUser);
                            }
                            currentReactions[emj] = emojiUsers;
                            try {
                                await window.db.collection('messages').doc(msg.id).update({ reactions: currentReactions });
                            } catch(err) { console.error(err); }
                        }
                        overlay.remove();
                    };
                    emojiBar.appendChild(span);
                });
                menu.appendChild(emojiBar);

                const optsContainer = document.createElement('div');
                optsContainer.className = 'context-menu-options';

                const addOpt = (text, isDanger, onClick) => {
                    const opt = document.createElement('div');
                    opt.className = 'context-option' + (isDanger ? ' text-danger' : '');
                    opt.textContent = text;
                    opt.onclick = () => { onClick(); overlay.remove(); };
                    optsContainer.appendChild(opt);
                };

                addOpt(t['ctx_reply'] || 'Antworten', false, () => {
                    replyingToMessage = { id: msg.id, sender: msg.sender_username, text: msg.text || (msg.mediaType ? `[${msg.mediaType}]` : '') };
                    const bannerTitle = document.getElementById('reply-banner-title');
                    const bannerText = document.getElementById('reply-banner-text');
                    if(bannerTitle) bannerTitle.textContent = `Antwort auf ${msg.sender_username === currentUser ? 'dich' : msg.sender_username}:`;
                    if(bannerText) bannerText.textContent = replyingToMessage.text;
                    const banner = document.getElementById('reply-banner');
                    if(banner) banner.classList.remove('hidden');
                    const input = document.getElementById('message-input');
                    if(input) input.focus();
                });

                addOpt(t['ctx_copy'] || 'Kopieren', false, () => {
                    navigator.clipboard.writeText(msg.text || '').then(() => {
                        const toast = document.getElementById('toast-notification');
                        if(toast) { toast.textContent = 'Kopiert!'; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), 3000); }
                    });
                });

                if (isSentByMe) {
                    addOpt(t['ctx_edit'] || 'Bearbeiten', false, () => {
                        if (msg.mediaType) { alert("Medien können nicht bearbeitet werden."); return; }
                        editingMessageId = msg.id;
                        const input = document.getElementById('message-input');
                        if(input) { input.value = msg.text || ''; input.focus(); }
                    });
                }

                addOpt(t['ctx_select'] || 'Auswählen', false, () => {
                    isSelectionMode = true;
                    selectedMessages.clear();
                    selectedMessages.add(msg.id);
                    const bar = document.getElementById('selection-action-bar');
                    if(bar) bar.classList.remove('hidden');
                    renderMessages(currentChat ? currentChat.id : null);
                });

                addOpt(t['ctx_forward'] || 'Weiterleiten', false, () => {
                    forwardMessageId = msg.id;
                    const fm = document.getElementById('forward-modal');
                    if(fm) { fm.classList.remove('hidden'); if(typeof populateForwardList === 'function') populateForwardList(); }
                });

                if (currentChat) {
                    addOpt(isPinned ? (t['ctx_unpin'] || 'Loslösen') : (t['ctx_pin'] || 'Anheften'), false, async () => {
                        if (currentChat.type === 'dm') {
                            if(!window.dmPins) window.dmPins = {};
                            if (isPinned) {
                                delete window.dmPins[currentChat.id];
                                currentChat.pinnedMessageId = null;
                                currentChat.pinnedMessageText = null;
                            } else {
                                window.dmPins[currentChat.id] = { id: msg.id, text: msg.text || (msg.mediaType ? `[${msg.mediaType}]` : '') };
                                currentChat.pinnedMessageId = msg.id;
                                currentChat.pinnedMessageText = window.dmPins[currentChat.id].text;
                            }
                            if(typeof saveUserData === 'function') saveUserData();
                            renderMessages();
                        } else {
                            try {
                                await window.db.collection('groups').doc(currentChat.id).update({
                                    pinnedMessageId: isPinned ? null : msg.id,
                                    pinnedMessageText: isPinned ? null : (msg.text || `[${msg.mediaType}]`)
                                });
                            } catch(e) { console.error("Pin error", e); }
                        }
                    });
                }

                addOpt(t['ctx_share'] || 'Teilen', false, () => {
                    if (navigator.share) {
                        navigator.share({ title: 'Nachricht von ' + msg.sender_username, text: msg.text || '' }).catch(console.error);
                    } else {
                        alert('Teilen wird in diesem Browser nicht unterstützt.');
                    }
                });

                if (isSentByMe) {
                    if (currentChat && currentChat.type === 'dm') {
                        addOpt(t['ctx_msg_info'] || 'Nachrichten-Info', false, () => {
                            if (msg.read) {
                                if (msg.readAt) {
                                    const d = new Date(msg.readAt);
                                    alert((t['msg_read_at'] || 'Gelesen am: ') + d.toLocaleDateString() + ', ' + d.toLocaleTimeString());
                                } else {
                                    alert(t['msg_read_unknown'] || 'Gelesen (kein genauer Zeitpunkt verfügbar)');
                                }
                            } else {
                                alert(t['msg_unread'] || 'Noch nicht gelesen');
                            }
                        });
                    }
                }

                addOpt(t['ctx_delete'] || 'Löschen', true, () => {
                    const modal = document.createElement('div');
                    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:2147483647; display:flex; justify-content:center; align-items:center;';
                    
                    const dialog = document.createElement('div');
                    dialog.className = 'glass-panel';
                    dialog.style.cssText = 'background:var(--panel-bg); padding:20px; border-radius:12px; width:300px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.5); border:1px solid var(--panel-border);';
                    
                    const title = document.createElement('h3');
                    title.textContent = t['dlg_delete_title'] || 'Nachricht löschen?';
                    title.style.cssText = 'margin-top:0; margin-bottom:20px; font-size:16px; color:var(--text-primary);';
                    dialog.appendChild(title);
                    
                    const btnForMe = document.createElement('button');
                    btnForMe.className = 'submit-btn';
                    btnForMe.style.cssText = 'width:100%; margin-bottom:10px; padding:10px; border-radius:8px; font-size:14px; background:transparent; border:1px solid var(--accent); color:var(--accent);';
                    btnForMe.textContent = t['ctx_delete_for_me'] || 'Für mich löschen';
                    btnForMe.onclick = async () => {
                        modal.remove();
                        const df = msg.deletedFor || [];
                        if(!df.includes(currentUser)) df.push(currentUser);
                        await window.db.collection('messages').doc(msg.id).update({ deletedFor: df }).catch(console.error);
                        const msgs = window.messages.get(currentChat ? currentChat.id : null);
                        if(msgs) {
                            const idx = msgs.findIndex(m => m.id === msg.id);
                            if(idx !== -1) msgs[idx].deletedFor = df;
                            renderMessages(currentChat ? currentChat.id : null);
                        }
                    };
                    dialog.appendChild(btnForMe);
                    
                    if (isSentByMe) {
                        const btnForAll = document.createElement('button');
                        btnForAll.className = 'danger-btn';
                        btnForAll.style.cssText = 'width:100%; margin-bottom:10px; padding:10px; border-radius:8px; font-size:14px;';
                        btnForAll.textContent = t['dlg_delete_for_all'] || 'Für alle löschen';
                        btnForAll.onclick = async () => {
                            modal.remove();
                            await window.db.collection('messages').doc(msg.id).delete().catch(console.error);
                            const msgs = window.messages.get(currentChat ? currentChat.id : null);
                            if(msgs) {
                                const idx = msgs.findIndex(m => m.id === msg.id);
                                if(idx !== -1) msgs.splice(idx, 1);
                                renderMessages(currentChat ? currentChat.id : null);
                            }
                        };
                        dialog.appendChild(btnForAll);
                    }
                    
                    const btnCancel = document.createElement('button');
                    btnCancel.style.cssText = 'width:100%; padding:10px; border-radius:8px; font-size:14px; background:transparent; border:none; color:var(--text-secondary); cursor:pointer;';
                    btnCancel.textContent = t['dlg_cancel'] || 'Abbrechen';
                    btnCancel.onclick = () => modal.remove();
                    dialog.appendChild(btnCancel);
                    
                    modal.appendChild(dialog);
                    document.body.appendChild(modal);
                });

                menu.appendChild(optsContainer);
                overlay.appendChild(menu);
                document.body.appendChild(overlay);

                let x = 0; let y = 0;
                if (e.clientX !== undefined) { x = e.clientX; y = e.clientY; }
                else if (e.touches && e.touches.length > 0) { x = e.touches[0].clientX; y = e.touches[0].clientY; }

                const menuWidth = 250; 
                const menuHeight = 350;
                
                let finalX = x;
                let finalY = y;
                
                if (x + menuWidth > window.innerWidth) finalX = Math.max(0, window.innerWidth - menuWidth - 20);
                if (y + menuHeight > window.innerHeight) finalY = Math.max(0, window.innerHeight - menuHeight - 20);
                
                menu.style.left = finalX + 'px';
                menu.style.top = finalY + 'px';

                // Real adjustment
                setTimeout(() => {
                    const rect = menu.getBoundingClientRect();
                    if (rect.right > window.innerWidth && rect.width > 0) menu.style.left = Math.max(0, window.innerWidth - rect.width - 10) + 'px';
                    if (rect.bottom > window.innerHeight && rect.height > 0) menu.style.top = Math.max(0, window.innerHeight - rect.height - 10) + 'px';
                }, 10);
            } catch(err) { console.error('DYNAMIC CONTEXT ERROR', err); }
        }

        

    
    messagesContainer.addEventListener('touchend', () => clearTimeout(longPressTimerMsg));
    messagesContainer.addEventListener('touchmove', () => clearTimeout(longPressTimerMsg));

    ctxOverlay.addEventListener('click', (e) => {
        if (e.target === ctxOverlay) ctxOverlay.classList.add('hidden');
    });

    ctxCopy.addEventListener('click', () => {
        if(contextMessageText) navigator.clipboard.writeText(contextMessageText);
        ctxOverlay.classList.add('hidden');
    });

    ctxShare.addEventListener('click', async () => {
        ctxOverlay.classList.add('hidden');
        const textToShare = contextMessageText || (contextMessageMedia ? `[${contextMessageMedia}]` : '');
        if (navigator.share && textToShare) {
            try {
                await navigator.share({
                    title: 'Nachricht aus Doori Messenger',
                    text: textToShare
                });
            } catch (err) { console.error('Share failed', err); }
        } else {
            if (textToShare) {
                navigator.clipboard.writeText(textToShare);
                alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_copied_clipboard || 'Text in die Zwischenablage kopiert! (Teilen wird auf diesem Gerät nicht nativ unterstützt)');
            }
        }
    });

    ctxEdit.addEventListener('click', () => {
        messageInput.value = contextMessageText;
        messageInput.focus();
        editingMessageId = contextMessageId;
        replyingToMessage = null;
        replyBanner.classList.add('hidden');
        ctxOverlay.classList.add('hidden');
    });

    ctxDelete.addEventListener('click', async () => {
        if(confirm("Nachricht endgültig löschen?")) {
            try { await window.db.collection('messages').doc(contextMessageId).delete(); } catch(e) {}
        }
        ctxOverlay.classList.add('hidden');
    });

    // --- Select Mode ---
    ctxSelect.addEventListener('click', () => {
        isSelectMode = true;
        selectedMessages.clear();
        selectionActionBar.classList.remove('hidden');
        toggleMessageSelection(contextMessageId);
        ctxOverlay.classList.add('hidden');
    });

    function toggleMessageSelection(id) {
        if (!isSelectMode) return;
        const el = messagesContainer.querySelector(`.message[data-id="${id}"]`);
        if (!el) return;
        if (selectedMessages.has(id)) {
            selectedMessages.delete(id);
            el.classList.remove('selected');
        } else {
            selectedMessages.add(id);
            el.classList.add('selected');
        }
        selectionCount.textContent = `${selectedMessages.size} ${(TRANSLATIONS[currentLang] || TRANSLATIONS['en']).ctx_select || 'ausgewählt'}`;
        if (selectedMessages.size === 0) exitSelectMode();
    }

    function exitSelectMode() {
        isSelectMode = false;
        selectedMessages.clear();
        selectionActionBar.classList.add('hidden');
        document.querySelectorAll('.message.selected').forEach(el => el.classList.remove('selected'));
    }

    selectionCancelBtn.addEventListener('click', exitSelectMode);

    messagesContainer.addEventListener('click', (e) => {
        if (!isSelectMode) return;
        const msgEl = e.target.closest('.message');
        if (msgEl && msgEl.dataset.id) {
            e.preventDefault();
            e.stopPropagation();
            toggleMessageSelection(msgEl.dataset.id);
        }
    });

    
    // BULLETPROOF CONTEXT MENU LISTENER
    messagesContainer.addEventListener('contextmenu', (e) => {
        try {
            console.log('Contextmenu event fired on PC!');
            e.preventDefault(); // ALWAYS prevent default inside the container
            const msgEl = e.target.closest('.message');
            console.log('msgEl found:', !!msgEl, msgEl);
            if (msgEl && currentChat) {
                const chatMsgs = messages.get(currentChat.id) || [];
                const msgId = msgEl.dataset.id;
                const msg = chatMsgs.find(m => String(m.id) === String(msgId));
                console.log('msg found in array:', !!msg, 'searched for id:', msgId, 'in array of size:', chatMsgs.length);
                if (msg) {
                    openContextMenu(e, msg);
                } else {
                    console.error("Debug: Msg ID " + msgId + " not found in chatMsgs array!");
                }
            } else {
                console.log('msgEl or currentChat is null. msgEl:', !!msgEl, 'currentChat:', !!currentChat);
            }
        } catch(err) {
            console.error('FATAL CONTEXTMENU ERROR:', err);
        }
    }, true);

    // Use existing longPressTimerMsg instead of redeclaring longPressTimer
    messagesContainer.addEventListener('touchstart', (e) => {
        try {
            const msgEl = e.target.closest('.message');
            if (msgEl && currentChat) {
                messagesContainer.dataset.touchStartX = e.touches[0].clientX;
                messagesContainer.dataset.touchStartY = e.touches[0].clientY;
                msgEl.style.userSelect = 'none';
                msgEl.style.webkitUserSelect = 'none';
                longPressTimerMsg = setTimeout(() => {
                    window.getSelection().removeAllRanges();
                    const chatMsgs = messages.get(currentChat.id) || [];
                    const msg = chatMsgs.find(m => String(m.id) === String(msgEl.dataset.id));
                    if (msg) {
                        openContextMenu(e, msg);
                    }
                }, 500);
            }
        } catch(err) {
            console.error("Fatal touchstart error: " + err.message);
        }
    }, {passive: true});

    messagesContainer.addEventListener('touchend', (e) => { 
        if(longPressTimerMsg) clearTimeout(longPressTimerMsg); 
        const msgEl = e.target.closest('.message');
        if (msgEl) { setTimeout(() => { msgEl.style.userSelect = ''; msgEl.style.webkitUserSelect = ''; }, 100); }
    });
    messagesContainer.addEventListener('touchmove', (e) => {
        if(longPressTimerMsg) {
            const dx = Math.abs(e.touches[0].clientX - (messagesContainer.dataset.touchStartX || e.touches[0].clientX));
            const dy = Math.abs(e.touches[0].clientY - (messagesContainer.dataset.touchStartY || e.touches[0].clientY));
            if (dx > 10 || dy > 10) clearTimeout(longPressTimerMsg);
        }
    });

    // --- Forward Logic ---
    function openForwardModal(messageIds) {
        forwardMessagesQueue = Array.from(messageIds);
        if (forwardMessagesQueue.length === 0) return;
        forwardModal.classList.remove('hidden');
        renderForwardContactsList('');
    }

    ctxForward.addEventListener('click', () => {
        openForwardModal([contextMessageId]);
        ctxOverlay.classList.add('hidden');
    });

    selectionForwardBtn.addEventListener('click', () => {
        openForwardModal(selectedMessages);
        exitSelectMode();
    });

    selectionDeleteBtn.addEventListener('click', async () => {
        if(confirm("Markierte Nachrichten löschen?")) {
            for(let id of selectedMessages) {
                try { await window.db.collection('messages').doc(id).delete(); } catch(e) {}
            }
        }
        exitSelectMode();
    });

    closeForwardModalBtn.addEventListener('click', () => {
        forwardModal.classList.add('hidden');
        forwardMessagesQueue = [];
    });

    forwardSearchInput.addEventListener('input', (e) => {
        renderForwardContactsList(e.target.value.trim().toLowerCase());
    });

    function renderForwardContactsList(filter) {
        forwardContactsList.innerHTML = '';
        const allChats = [
            ...Array.from(users.keys()).filter(u => u !== currentUser).map(c => ({ id: c, name: '@'+c, type: 'dm', isContact: true })),
            ...Array.from(rooms.values()).map(r => ({ id: r.id, name: r.name, type: r.type, isContact: false }))
        ];
        
        allChats.forEach(chat => {
            if (filter && !chat.name.toLowerCase().includes(filter)) return;
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `
                <div class="avatar">${chat.isContact ? chat.name.charAt(1).toUpperCase() : chat.name.charAt(0).toUpperCase()}</div>
                <div style="flex:1;">
                    <div class="chat-item-name">${chat.name}</div>
                </div>
            `;
            div.onclick = async () => {
                forwardModal.classList.add('hidden');
                if (forwardMessagesQueue.length === 0) return;
                
                for (let id of forwardMessagesQueue) {
                    try {
                        const origDoc = await window.db.collection('messages').doc(id).get();
                        if (origDoc.exists) {
                            const data = origDoc.data();
                            let payload = {
                                text: data.text || '',
                                sender_username: currentUser,
                                type: chat.type,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                isForwarded: true
                            };
                            if (chat.type === 'dm') {
                                payload.receiver_username = chat.id;
                                payload.participants = [currentUser, chat.id];
                                payload.chatId = [currentUser, chat.id].sort().join('_');
                            } else {
                                payload.roomId = chat.id;
                            }
                            if (data.mediaUrl) payload.mediaUrl = data.mediaUrl;
                            if (data.mediaType) payload.mediaType = data.mediaType;
                            
                            await window.db.collection('messages').add(payload);
                        }
                    } catch(e) { console.error(e); }
                }
                forwardMessagesQueue = [];
                alert((TRANSLATIONS[currentLang] || TRANSLATIONS['en'])['msg_forwarded'] || 'Weitergeleitet!');
            };
            forwardContactsList.appendChild(div);
        });
    }

    // --- Pin Logic ---
    ctxPin.addEventListener('click', async () => {
        ctxOverlay.classList.add('hidden');
        if (!currentChat) return;
        if (currentChat.type === 'dm') {
            if(!dmPins) dmPins = {};
            const isUnpinning = currentChat.pinnedMessageId === contextMessageId;
            if (isUnpinning) {
                delete dmPins[currentChat.id];
                currentChat.pinnedMessageId = null;
                currentChat.pinnedMessageText = null;
            } else {
                dmPins[currentChat.id] = {
                    id: contextMessageId,
                    text: contextMessageText || (contextMessageMedia ? `[${contextMessageMedia}]` : '')
                };
                currentChat.pinnedMessageId = contextMessageId;
                currentChat.pinnedMessageText = dmPins[currentChat.id].text;
            }
            saveUserData();
            renderMessages();
            return;
        }
        try {
            const isUnpinning = currentChat.pinnedMessageId === contextMessageId;
            await window.db.collection('groups').doc(currentChat.id).update({
                pinnedMessageId: isUnpinning ? null : contextMessageId,
                pinnedMessageText: isUnpinning ? null : (contextMessageText || `[${contextMessageMedia}]`)
            });
        } catch(e) { console.error("Pin error", e); }
    });

    unpinBtn.addEventListener('click', async () => {
        if (!currentChat) return;
        if (currentChat.type === 'dm') {
            if(dmPins) delete dmPins[currentChat.id];
            saveUserData();
            currentChat.pinnedMessageId = null;
            currentChat.pinnedMessageText = null;
            renderMessages();
            return;
        }
        try {
            await window.db.collection('groups').doc(currentChat.id).update({
                pinnedMessageId: null,
                pinnedMessageText: null
            });
        } catch(e) { console.error(e); }
    });

    pinnedMessageBanner.addEventListener('click', (e) => {
        if (e.target.closest('#unpin-btn')) return;
        if (currentChat && currentChat.pinnedMessageId) {
            const el = messagesContainer.querySelector(`.message[data-id="${currentChat.pinnedMessageId}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });


    // --- Reply ---
    ctxReply.addEventListener('click', () => {
        replyingToMessage = { id: contextMessageId, sender: contextMessageSender, text: contextMessageText || (contextMessageMedia ? `[${contextMessageMedia}]` : '') };
        replyBannerTitle.textContent = `Antwort auf ${contextMessageSender === currentUser ? 'dich' : contextMessageSender}:`;
        replyBannerText.textContent = replyingToMessage.text;
        replyBanner.classList.remove('hidden');
        messageInput.focus();
        ctxOverlay.classList.add('hidden');
    });

    cancelReplyBtn.addEventListener('click', () => {
        replyingToMessage = null;
        replyBanner.classList.add('hidden');
    });

    // --- Emoji Reactions ---
    emojiReactionBar.addEventListener('click', async (e) => {
        if(e.target.classList.contains('reaction-emoji')) {
            const emoji = e.target.textContent;
            const originalMsgs = messages.get(currentChat.id) || [];
            const orig = originalMsgs.find(m => m.id === contextMessageId);
            if (orig) {
                let currentReactions = orig.reactions || {};
                let emojiUsers = currentReactions[emoji] || [];
                if (emojiUsers.includes(currentUser)) {
                    emojiUsers = emojiUsers.filter(u => u !== currentUser);
                } else {
                    emojiUsers.push(currentUser);
                }
                currentReactions[emoji] = emojiUsers;
                try {
                    await window.db.collection('messages').doc(contextMessageId).update({ reactions: currentReactions });
                } catch(err) { console.error("Reaction failed", err); }
            }
            ctxOverlay.classList.add('hidden');
        }
    });

    // --- Message Sending ---
    window.sendMessage = sendMessage;
async function sendMessage(text, mediaType = null, mediaUrl = null, silent = false, scheduleTime = null) {
        if (!currentChat) return;
        if (currentChat.type === 'channel' && !currentChat.isAdmin) return;
        if (blockedContacts.has(currentChat.id)) return;
        if (editingMessageId && !mediaType) { 
            try {
                window.db.collection('messages').doc(editingMessageId).update({ text: text, edited: true });
            } catch(e) { console.error("Edit failed", e); }
            editingMessageId = null; 
            return; 
        }

        let ttl = parseInt(ttlSelect.value); let expiresAt = null; if (ttl > 0 && currentChat.type === 'dm') expiresAt = null; else if(ttl > 0) expiresAt = Date.now() + (ttl * 1000); 
        let processedText = text; if(currentChat.isSecret && !mediaType && text) processedText = await encryptMessage(text);

        const msgObj = {
            id: Date.now().toString() + Math.random().toString(36).substr(2,9),
            sender_username: currentUser,
            chat_id: currentChat.id,
            text: processedText, mediaType, mediaUrl, ttl, expires_at: expiresAt, silent, isSecret: currentChat.isSecret, edited: false,
            timestamp: scheduleTime || Date.now(),
            read: false,
            reactions: {},
            fontFamily: localStorage.getItem('doori_font_family') || 'Inter',
            fontColor: localStorage.getItem('doori_font_color') || 'default',
            fontSize: localStorage.getItem('doori_font_size') || 'normal'
        };
        
        if (replyingToMessage) {
            msgObj.replyTo = replyingToMessage;
            replyingToMessage = null;
            replyBanner.classList.add('hidden');
        }

        const doodleTypes = ['doodle_invite', 'doodle_accept', 'doodle_close', 'doodle_reject'];
        if (doodleTypes.includes(mediaType) || (processedText && processedText.includes('Doodle Einladung abgelehnt'))) {
            const existingMsgs = messages.get(currentChat.id) || [];
            existingMsgs.forEach(m => {
                if (doodleTypes.includes(m.mediaType) || (m.text && m.text.includes('Doodle Einladung abgelehnt'))) {
                    if (window.db) window.db.collection('messages').doc(m.id).delete().catch(()=>{});
                }
            });
        }

        if (scheduleTime && scheduleTime > Date.now()) { setTimeout(() => { executeSendMessage(msgObj); }, scheduleTime - Date.now()); return; }
        executeSendMessage(msgObj);
    }

    async function executeSendMessage(msgObj) {
        let isPublic = currentChat.type === 'room' || currentChat.type === 'channel';
        let docData = { ...msgObj, isPublic: isPublic };
        if (!isPublic) {
            let other = currentChat.type === 'saved' ? currentUser : currentChat.id;
            docData.participants = [currentUser.toLowerCase(), other.toLowerCase()];
            if (currentChat.type === 'dm') docData.recipient_username = currentChat.id;
        }
        
        try {
            await window.db.collection('messages').doc(msgObj.id).set(docData);
            if (!msgObj.silent) playSound();
        } catch (e) {
            console.error("Error saving to Firestore", e);
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_send_msg || 'Nachricht konnte nicht gesendet werden (Offline?).');
        }
    }

    function handleEditMessage(msgId, chatId, newText) {
        const chatMsgs = messages.get(chatId);
        if (chatMsgs) {
            const msg = chatMsgs.find(m => m.id === msgId);
            if (msg) { msg.text = newText; msg.edited = true; if (currentChat?.id === chatId) renderMessages(); }
        }
    }

    // Buzz Functionality
    buzzBtn.addEventListener('click', () => {
        if (!currentChat) return;
        triggerBuzzShake();
        sendMessage('', 'buzz');
    });

    window.triggerBuzzShake = function() {
        playBuzzSound();
        const chatEl = document.getElementById('main-chat');
        if (chatEl) {
            chatEl.classList.remove('buzz-shake');
            void chatEl.offsetWidth; // trigger reflow
            chatEl.classList.add('buzz-shake');
            setTimeout(() => chatEl.classList.remove('buzz-shake'), 800);
        }
    };

    function playBuzzSound() {
        if(!document.getElementById('setting-sound').checked) return;
        try {
            let ctx = globalAudioCtx;
            if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); globalAudioCtx = ctx; }
            if (ctx.state === 'suspended') ctx.resume();
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc1.type = 'sawtooth';
            osc2.type = 'square';
            osc1.frequency.value = 60; // Deep vibration
            osc2.frequency.value = 65; // Beat frequency creates shaking effect
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            
            gain.gain.setValueAtTime(1.0, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            
            osc1.start(); osc2.start();
            osc1.stop(ctx.currentTime + 0.8); osc2.stop(ctx.currentTime + 0.8);
        } catch(e) {}
    }

    function playSound() { if(document.getElementById('setting-sound').checked) { let ctx = globalAudioCtx; if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); globalAudioCtx = ctx; } if (ctx.state === 'suspended') ctx.resume(); const osc = ctx.createOscillator(); osc.connect(ctx.destination); osc.frequency.value = 800; osc.start(); osc.stop(ctx.currentTime + 0.1); } }

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault(); const text = messageInput.value.trim();
        if (text) { sendMessage(text); messageInput.value = ''; }
    });

    // Recording
    let isRecordingCancelled = false;
    async function startRecording(type) {
        isRecordingCancelled = false;
        try {
            const constraints = {
                audio: true,
                video: type === 'video' ? { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } } : false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (isRecordingCancelled) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            
            let options = undefined;
            if (type === 'video') {
                options = { videoBitsPerSecond: 100000 };
            }
            mediaRecorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
            
            let chunks = [];
            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            mediaRecorder.onstop = async () => {
                let mType = mediaRecorder.mimeType || (type === "video" ? "video/mp4" : "audio/mp4");
                if (mType.includes(';')) mType = mType.split(';')[0];
                const blob = new Blob(chunks, { type: mType });
                
                // Show uploading indicator
                const uploadIndicator = document.createElement('div');
                uploadIndicator.id = 'upload-indicator';
                uploadIndicator.style.cssText = 'position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--accent); color: #000; padding: 10px 20px; border-radius: 20px; font-weight: bold; z-index: 1000; box-shadow: 0 4px 15px rgba(0,0,0,0.3);';
                uploadIndicator.textContent = 'Verarbeite...';
                document.body.appendChild(uploadIndicator);

                const reader = new FileReader();
                reader.onloadend = () => { 
                    if(document.getElementById('upload-indicator')) document.getElementById('upload-indicator').remove();
                    sendMessage('', type, reader.result); 
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start();
            if (type === 'video') { liveVideoPreview.srcObject = stream; liveVideoPreview.classList.remove('hidden'); liveVideoPreview.play().catch(e => console.error(e)); }
            recordingPreview.classList.remove('hidden'); messageForm.style.opacity = '0';
            recordingStartTime = Date.now();
            recordingInterval = setInterval(() => { const sec = Math.floor((Date.now() - recordingStartTime)/1000); recordingTimeEl.textContent = `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`; }, 1000);
        } catch(e) { 
            console.error("Recording error:", e);
            alert("Aufnahme-Fehler: " + e.message + " (" + e.name + ")");
        }
    }
    recordAudioBtn.addEventListener('click', () => startRecording('audio')); recordVideoBtn.addEventListener('click', () => startRecording('video'));
    stopRecordingBtn.addEventListener('click', () => { if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); cleanupRecording(); });
    function cancelRecordingAction() {
        isRecordingCancelled = true;
        if(mediaRecorder && mediaRecorder.state !== 'inactive') { mediaRecorder.onstop = null; mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(t=>t.stop()); } 
        cleanupRecording(); 
    }
    cancelRecordingBtn.addEventListener('click', cancelRecordingAction);
    
    let recordingTouchStartX = 0;
    recordingPreview.addEventListener('touchstart', (e) => { recordingTouchStartX = e.touches[0].clientX; }, {passive: true});
    recordingPreview.addEventListener('touchmove', (e) => {
        if (!recordingTouchStartX) return;
        if (recordingTouchStartX - e.touches[0].clientX > 40) { cancelRecordingAction(); recordingTouchStartX = 0; }
    }, {passive: true});
    recordingPreview.addEventListener('touchend', () => { recordingTouchStartX = 0; }, {passive: true});

    function cleanupRecording() { clearInterval(recordingInterval); recordingPreview.classList.add('hidden'); messageForm.style.opacity = '1'; recordingTimeEl.textContent = '00:00'; liveVideoPreview.classList.add('hidden'); liveVideoPreview.srcObject = null; }

    // Media Upload
    document.getElementById('media-upload').addEventListener('change', (e) => {
        const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
        reader.onloadend = () => { const type = file.type.startsWith('video') ? 'video' : (file.type.startsWith('audio') || file.type === 'application/octet-stream') ? 'audio' : 'image'; sendMessage('', type, reader.result); };
        reader.readAsDataURL(file); e.target.value = '';
    });



    // --- Chat Selection ---
    async function markMessagesAsRead(chatId) {
        if (!chatId || chatId === 'saved' || chatId === 'general') return;
        const chatMsgs = messages.get(chatId) || [];
        const unreadMsgs = chatMsgs.filter(m => m.sender_username !== currentUser && m.read === false);
        if (unreadMsgs.length > 0) {
            try {
                const batch = window.db.batch();
                unreadMsgs.forEach(m => {
                    batch.update(window.db.collection('messages').doc(m.id), { read: true, readAt: Date.now() });
                });
                await batch.commit();
            } catch(e) { console.error("Failed to mark messages as read:", e); }
        }
    }

    function selectChat(id, type) {
        // Switch to chat view
        document.getElementById('start-page').classList.remove('active');
        document.getElementById('chat-page').classList.add('active');
        // Fullscreen behavior removed per user request

        let chat = chatData.personal.find(c=>c.id===id) || chatData.rooms.find(c=>c.id===id) || chatData.contacts.find(c=>c.id===id) || chatData.active_chats.find(c=>c.id===id);
        if (!chat && type === 'dm') { chat = { id, name: id, type: 'dm', isSecret: false }; chatData.active_chats.push(chat); }
        if (!chat) return;
        currentChat = chat;
        window.currentChat = chat;
        
        currentChatName.textContent = getTranslatedChatName(chat);
        if (type === 'saved') currentChatAvatar.textContent = '💾';
        else if (type === 'room' || type === 'channel') currentChatAvatar.textContent = '#';
        else {
            const profile = users.get(chat.name);
            const aUrl = getAllowedAvatarUrl(chat.name, profile);
            if (aUrl) { currentChatAvatar.innerHTML = `<img src="${aUrl}" class="avatar-img">`; }
            else { currentChatAvatar.textContent = chat.name.replace('@','').charAt(0).toUpperCase(); }
        }

        if (type === 'dm') {
            currentChatStatus.style.display = 'inline-block'; if (callBtn) callBtn.style.display = 'flex';
            currentChatStatus.textContent = '...';
            
            // Realtime listener for online status
            if (window.currentChatStatusListener) {
                window.currentChatStatusListener(); // Unsubscribe previous listener
            }
            
            if (window.currentChatStatusUpdateInterval) {
                clearInterval(window.currentChatStatusUpdateInterval);
            }
            window.currentChatStatusListener = window.db.collection('userData').doc(id.toLowerCase()).onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    window.currentChatLastSeenData = data;
                    window.currentChatLastUpdateReceivedAt = Date.now(); // local clock immune to skew
                    const privacy = data.lastSeenPrivacy || 'all';
                    const amIContact = (data.chatData && data.chatData.contacts && data.chatData.contacts.some(c => c.id === currentUser));
                    
                    const updateText = () => {
                        if (privacy === 'none') {
                            currentChatStatus.textContent = 'Versteckt (Privatsphäre)';
                        } else if (privacy === 'contacts' && !amIContact) {
                            currentChatStatus.textContent = 'Versteckt (Nur Kontakte)';
                        } else {
                            const localElapsedMs = window.currentChatLastUpdateReceivedAt ? (Date.now() - window.currentChatLastUpdateReceivedAt) : 0;
                            const forceOffline = localElapsedMs > 150000; // 2.5 minutes
                            currentChatStatus.textContent = window.formatLastSeenTime(window.currentChatLastSeenData.lastSeen, window.currentChatLastSeenData.isOnline, forceOffline);
                        }
                    };
                    
                    updateText();
                    
                    if (window.currentChatStatusUpdateInterval) {
                        clearInterval(window.currentChatStatusUpdateInterval);
                    }
                    window.currentChatStatusUpdateInterval = setInterval(updateText, 60000); // Update text every minute
                } else {
                    currentChatStatus.textContent = '';
                }
            }, err => {
                console.error("Status Listener Error:", err);
                currentChatStatus.textContent = '';
            });

 const doodleBtn = document.getElementById('doodle-btn'); if (doodleBtn) doodleBtn.style.display = 'inline-block'; const videoBtn = document.getElementById('video-call-btn'); if (videoBtn) videoBtn.style.display = 'flex'; const callContainer = document.getElementById('call-buttons-container'); if(callContainer) callContainer.style.display = 'flex';
            // Dropdown setup is handled on click
            const gi = document.getElementById('group-info-btn'); if (gi) gi.style.display = 'none';
            if (dmPins && dmPins[id]) {
                currentChat.pinnedMessageId = dmPins[id].id;
                currentChat.pinnedMessageText = dmPins[id].text;
            } else {
                currentChat.pinnedMessageId = null;
                currentChat.pinnedMessageText = null;
            }
            const groupCallBanner = document.getElementById('group-call-banner'); if (groupCallBanner) groupCallBanner.classList.add('hidden');
        } else if (type === 'room') {
            currentChatStatus.style.display = 'inline-block';
            const memberCount = chat.members ? chat.members.length : 0;
            currentChatStatus.textContent = memberCount + ' ' + ((window.TRANSLATIONS[window.currentLang] || {}).sec_members || 'Mitglieder');
            if (callBtn) callBtn.style.display = 'flex'; const doodleBtn = document.getElementById('doodle-btn'); if (doodleBtn) doodleBtn.style.display = 'inline-block'; const videoBtn = document.getElementById('video-call-btn'); if (videoBtn) videoBtn.style.display = 'flex'; const callContainer = document.getElementById('call-buttons-container'); if(callContainer) callContainer.style.display = 'flex';
            const gi = document.getElementById('group-info-btn'); if (gi) gi.style.display = (id === 'general') ? 'none' : 'inline-block';
            
            const groupCallBanner = document.getElementById('group-call-banner');
            if (groupCallBanner) {
                if (chat.activeCall && chat.activeCall.initiator) {
                    groupCallBanner.classList.remove('hidden');
                } else {
                    groupCallBanner.classList.add('hidden');
                }
            }
        } else {
            currentChatStatus.style.display = 'none'; if (callBtn) callBtn.style.display = 'none'; const doodleBtn = document.getElementById('doodle-btn'); if (doodleBtn) doodleBtn.style.display = 'none'; const videoBtn = document.getElementById('video-call-btn'); if (videoBtn) videoBtn.style.display = 'none'; const callContainer = document.getElementById('call-buttons-container'); if(callContainer) callContainer.style.display = 'none';
            const gi = document.getElementById('group-info-btn'); if (gi) gi.style.display = 'none';
            const groupCallBanner = document.getElementById('group-call-banner'); if (groupCallBanner) groupCallBanner.classList.add('hidden');
        }
        

        ttlSelect.style.display = (type === 'dm' && currentChat.isSecret) || type === 'room' || type === 'channel' ? 'inline-block' : 'none';

        document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        unreadChats.delete(id);
        const activeEl = document.querySelector(`.chat-item[data-id="${id}"]`); if (activeEl) { activeEl.classList.add('active'); activeEl.classList.remove('unread'); }
        
        markMessagesAsRead(id);
        // if (window.innerWidth <= 768 && sidebar) sidebar.classList.remove('active');
        
        blockedNotice.classList.toggle('hidden', !blockedContacts.has(id));
        channelNotice.classList.toggle('hidden', !(type === 'channel' && !chat.isAdmin));
        
        let canWrite = !(blockedContacts.has(id) || (type === 'channel' && !chat.isAdmin));
        let mutedMsgText = '';
        
        if (type === 'room' && id !== 'general') {
            const isAdmin = chat.admins && chat.admins.includes(currentUser);
            const isMuted = chat.mutedMembers && chat.mutedMembers.includes(currentUser);
            
            if (isMuted) {
                canWrite = false;
                mutedMsgText = 'Du wurdest in dieser Gruppe stummgeschaltet.';
            } else if (chat.isReadOnly && !isAdmin) {
                canWrite = false;
                mutedMsgText = 'Nur Admins dürfen in dieser Gruppe schreiben.';
            }
        }
        
        let mutedNotice = document.getElementById('muted-notice');
        if (!mutedNotice) {
            mutedNotice = document.createElement('div');
            mutedNotice.id = 'muted-notice';
            mutedNotice.style.padding = '15px';
            mutedNotice.style.textAlign = 'center';
            mutedNotice.style.color = '#ff4757';
            mutedNotice.style.background = 'var(--bg-secondary)';
            mutedNotice.style.borderRadius = '12px';
            mutedNotice.style.margin = '10px 20px';
            const mainChat = document.getElementById('main-chat');
            if (mainChat && chatInputArea) {
                mainChat.insertBefore(mutedNotice, chatInputArea);
            }
        }
        
        if (mutedNotice) {
            mutedNotice.style.display = mutedMsgText ? 'block' : 'none';
            mutedNotice.textContent = mutedMsgText;
        }
        chatInputArea.style.display = canWrite ? 'flex' : 'none';
        
        renderMessages();
    }

    function renderChatList() {
        lists.personal.innerHTML = ''; lists.rooms.innerHTML = ''; lists.contacts.innerHTML = ''; if(lists.chats) lists.chats.innerHTML = '';
        const createItem = (chat) => {
            const div = document.createElement('div'); 
            let classNames = 'chat-item';
            if (currentChat && currentChat.id === chat.id) classNames += ' active';
            else if (unreadChats.has(chat.id)) classNames += ' unread';
            div.className = classNames;
            div.dataset.id = chat.id; div.dataset.type = chat.type;
            let avatarHtml = '';
            if (chat.type === 'saved') avatarHtml = '💾'; else if (chat.type === 'room' || chat.type === 'channel') avatarHtml = '#';
            else {
                const p = users.get(chat.name);
                const aUrl = getAllowedAvatarUrl(chat.name, p);
                if(aUrl) avatarHtml = `<img src="${aUrl}" class="avatar-img">`; else avatarHtml = chat.name.replace('@','').charAt(0).toUpperCase();
            }
            const isPinned = pinnedChats && pinnedChats.includes(chat.id);
            const pinHtml = isPinned ? '<span style="font-size:12px; margin-right:5px;">📌</span>' : '';
            div.innerHTML = `<div class="avatar ${chat.type === 'room' || chat.type === 'channel' ? 'room-avatar' : ''}">${avatarHtml}</div><div class="chat-item-info"><span class="chat-item-name">${pinHtml}${getTranslatedChatName(chat)}</span></div>`;
            div.addEventListener('click', () => selectChat(chat.id, chat.type));
            
            const openChatCtx = (e, clientX, clientY) => {
                e.preventDefault();
                contextChatId = chat.id;
                contextChatType = chat.type;
                ctxChatPin.textContent = isPinned ? '📌 Loslösen' : '📌 Anheften';
                chatListCtxOverlay.classList.remove('hidden');
                chatListCtxMenu.style.left = clientX + 'px';
                chatListCtxMenu.style.top = clientY + 'px';
            };
            
            div.addEventListener('contextmenu', (e) => openChatCtx(e, e.clientX, e.clientY));
            
            let chatLongPressTimer;
            div.addEventListener('touchstart', (e) => {
                chatLongPressTimer = setTimeout(() => {
                    openChatCtx(e, e.touches[0].clientX, e.touches[0].clientY);
                }, 500);
            });
            div.addEventListener('touchend', () => clearTimeout(chatLongPressTimer));
            div.addEventListener('touchmove', () => clearTimeout(chatLongPressTimer));

            return div;
        };
        
        const sortPinned = (a, b) => {
            const aPinned = pinnedChats && pinnedChats.includes(a.id);
            const bPinned = pinnedChats && pinnedChats.includes(b.id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return 0;
        };
        
        [...chatData.personal].sort(sortPinned).forEach(c => lists.personal.appendChild(createItem(c)));
        [...chatData.rooms].sort(sortPinned).forEach(c => lists.rooms.appendChild(createItem(c)));
        [...chatData.contacts].sort(sortPinned).forEach(c => lists.contacts.appendChild(createItem(c)));
    if(lists.chats) { [...chatData.personal].forEach(c => lists.chats.appendChild(createItem(c))); [...chatData.active_chats].sort(sortPinned).forEach(c => lists.chats.appendChild(createItem(c))); }
    }

    chatListCtxOverlay.addEventListener('click', (e) => {
        if (e.target === chatListCtxOverlay) chatListCtxOverlay.classList.add('hidden');
    });

    ctxChatPin.addEventListener('click', () => {
        if (!contextChatId) return;
        if (!pinnedChats) pinnedChats = [];
        if (pinnedChats.includes(contextChatId)) {
            pinnedChats = pinnedChats.filter(id => id !== contextChatId);
        } else {
            pinnedChats.push(contextChatId);
        }
        saveUserData();
        renderChatList();
        chatListCtxOverlay.classList.add('hidden');
    });
    // --- Actions & Settings ---
    if (chatHeaderProfileBtn) {
        chatHeaderProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentChat) {
                chatHeaderDropdown.classList.toggle('hidden');
                const isBlocked = blockedContacts.has(currentChat.id);
                const isMuted = mutedChats.has(currentChat.id);
                const isContact = chatData.contacts.some(c => c.id === currentChat.id);
                
                const t = typeof TRANSLATIONS !== 'undefined' ? (TRANSLATIONS[currentLang] || TRANSLATIONS['de']) : {};
                dropdownAddContact.innerHTML = '👤 ' + (t.ctx_add_contact || 'Zu Kontakten hinzufügen');
                dropdownClearChat.innerHTML = '🗑️ ' + (t.ctx_clear_chat || 'Chat leeren');
                dropdownMuteUser.innerHTML = isMuted ? '🔔 ' + (t.ctx_unmute_user || 'Stummschaltung aufheben') : '🔕 ' + (t.ctx_mute_user || 'Stummschalten');
                dropdownBlockUser.innerHTML = isBlocked ? '✅ ' + (t.ctx_unblock_user || 'Entblocken') : '🚫 ' + (t.ctx_block_user || 'Blockieren');
                dropdownAddContact.style.display = isContact ? 'none' : 'flex';
                
                if (currentChat.type === 'dm' || currentChat.type === 'saved') {
                    dropdownBlockUser.style.display = 'flex';
                } else {
                    dropdownBlockUser.style.display = 'none';
                }
            }
        });
    }
    
    document.addEventListener('click', () => {
        if (chatHeaderDropdown) chatHeaderDropdown.classList.add('hidden');
    });

    if (dropdownMuteUser) {
        dropdownMuteUser.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentChat) return;
            if (mutedChats.has(currentChat.id)) mutedChats.delete(currentChat.id);
            else mutedChats.add(currentChat.id);
            saveUserData();
            chatHeaderDropdown.classList.add('hidden');
        });
    }

    if (dropdownBlockUser) {
        dropdownBlockUser.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentChat || currentChat.type !== 'dm') return;
            
            const t = typeof TRANSLATIONS !== 'undefined' ? (TRANSLATIONS[currentLang] || TRANSLATIONS['de']) : {};
            if (!blockedContacts.has(currentChat.id)) {
                if (!confirm(t.msg_confirm_block || 'Sind Sie sich sicher, dass Sie den Benutzer blockieren möchten? (Ja / Nein)')) {
                    return;
                }
            }

            if (blockedContacts.has(currentChat.id)) blockedContacts.delete(currentChat.id);
            else blockedContacts.add(currentChat.id);
            saveUserData();
            chatHeaderDropdown.classList.add('hidden');
            selectChat(currentChat.id, currentChat.type);
        });
    }

    if (dropdownAddContact) {
        dropdownAddContact.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentChat) return;
            if (!chatData.contacts.find(c => c.id === currentChat.id)) {
                chatData.contacts.push({ id: currentChat.id, name: currentChat.id, type: 'dm', isSecret: false });
                saveUserData();
                renderChatList();
                chatHeaderDropdown.classList.add('hidden');
                alert(currentChat.id + ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_added_contact || ' wurde zu den Kontakten hinzugefügt!'));
            } else {
                alert(currentChat.id + ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_already_contact || ' ist bereits ein Kontakt.'));
            }
        });
    }

    if (dropdownClearChat) {
        dropdownClearChat.addEventListener('click', (e) => {
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
        });
    }
    document.getElementById('unblock-btn').addEventListener('click', () => { if(currentChat) { blockedContacts.delete(currentChat.id); saveUserData(); selectChat(currentChat.id, currentChat.type); } });

    
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.id === 'settings-tab-btn') {
                settingsModal.classList.remove('hidden');
                langSelect.value = currentLang;
                const p = users.get(currentUser);
                if(p && p.avatarUrl) settingsAvatar.innerHTML = `<img src="${p.avatarUrl}" class="avatar-img">`;
                else settingsAvatar.textContent = currentUser.replace('@','').charAt(0).toUpperCase();
                
                if (p) {
                    if(document.getElementById('setting-searchable')) document.getElementById('setting-searchable').checked = p.searchable !== false;
                    if(document.getElementById('setting-avatar-visibility')) document.getElementById('setting-avatar-visibility').value = p.avatarVisibility || 'all';
                    if(document.getElementById('setting-call-privacy')) document.getElementById('setting-call-privacy').value = p.callPrivacy || 'all';
                if(document.getElementById('setting-last-seen')) document.getElementById('setting-last-seen').checked = p.lastSeenPrivacy !== 'none';
                if(document.getElementById('setting-last-seen')) document.getElementById('setting-last-seen').checked = p.lastSeenPrivacy !== 'none';
                }
                updateStorageUsage();
                return;
            }
            document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tab = btn.getAttribute('data-tab');
            document.querySelectorAll('.chat-items-container').forEach(c => c.style.display = 'none');
            
            if (tab === 'contacts') document.getElementById('list-contacts').style.display = 'block';
            if (tab === 'calls') {
                document.getElementById('list-calls').style.display = 'block';
                if (currentUser && window.db) {
                    window.db.collection('users').doc(currentUser).collection('callHistory')
                        .where('type', '==', 'missed')
                        .where('seen', '==', false)
                        .get()
                        .then(snapshot => {
                            if (!snapshot.empty) {
                                const batch = window.db.batch();
                                snapshot.forEach(doc => batch.update(doc.ref, { seen: true }));
                                batch.commit().catch(console.error);
                            }
                        }).catch(console.error);
                }
            }
            if (tab === 'rooms') document.getElementById('list-rooms').style.display = 'block';
            if (tab === 'chats') document.getElementById('list-chats').style.display = 'block';
            if (tab === 'personal') document.getElementById('list-personal').style.display = 'block';

            const createGroupBtn = document.getElementById('sidebar-create-group-btn');
            if (createGroupBtn) {
                if (tab === 'rooms') {
                    createGroupBtn.classList.remove('hidden');
                } else {
                    createGroupBtn.classList.add('hidden');
                }
            }
        });
    });
    
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        langSelect.value = currentLang;
        const p = users.get(currentUser);
        if(p && p.avatarUrl) settingsAvatar.innerHTML = `<img src="${p.avatarUrl}" class="avatar-img">`;
        else settingsAvatar.textContent = currentUser.replace('@','').charAt(0).toUpperCase();
        
        if (p) {
            if(document.getElementById('setting-searchable')) document.getElementById('setting-searchable').checked = p.searchable !== false;
            if(document.getElementById('setting-avatar-visibility')) document.getElementById('setting-avatar-visibility').value = p.avatarVisibility || 'all';
            if(document.getElementById('setting-call-privacy')) document.getElementById('setting-call-privacy').value = p.callPrivacy || 'all';
        }
        updateStorageUsage();
    });
    
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });
    
    const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }
    
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            applyTranslation(langSelect.value);
            saveUserData();
            settingsModal.classList.add('hidden');
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm(TRANSLATIONS[currentLang]?.lbl_logout_confirm || "Möchtest du dich wirklich ausloggen?")) {
                window.auth.signOut().then(() => {
                    location.reload();
                }).catch(err => console.error("Logout error", err));
            }
        });
    }
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active');
            document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(e.target.dataset.tab).classList.add('active');
        });
    });
    // langSelect.addEventListener('change', (e) => applyTranslation(e.target.value));
    if (loginLangSelect) loginLangSelect.addEventListener('change', (e) => applyTranslation(e.target.value));
    avatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
        reader.onloadend = () => {
            if(!users.has(currentUser)) users.set(currentUser, {});
            users.get(currentUser).avatarUrl = reader.result;
            settingsAvatar.innerHTML = `<img src="${reader.result}" class="avatar-img">`;
            saveUserData(); renderChatList(); publishEvent({type: 'user_update', username: currentUser, profile: users.get(currentUser)});
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('clear-cache-btn').addEventListener('click', () => { if(confirm("Gesamten Chatverlauf löschen?")) { messages.clear(); saveUserData(); renderMessages(); } });
    function updateStorageUsage() { let total = 0; for(let i in localStorage) { if(localStorage.hasOwnProperty(i)) { total += ((localStorage[i].length + i.length) * 2); } } document.getElementById('storage-usage').textContent = (total / (1024*1024)).toFixed(2) + " MB"; }

    addContactBtn.addEventListener('click', () => addContactModal.classList.remove('hidden')); closeAddContactBtn.addEventListener('click', () => addContactModal.classList.add('hidden'));
    
    const openSelectContactsBtn = document.getElementById('open-select-contacts-btn');
    const selectContactsModal = document.getElementById('select-contacts-modal');
    const closeSelectContactsBtn = document.getElementById('close-select-contacts-btn');
    const confirmSelectContactsBtn = document.getElementById('confirm-select-contacts-btn');

    if (openSelectContactsBtn && selectContactsModal) {
        openSelectContactsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            selectContactsModal.classList.remove('hidden');
        });
    }
    if (closeSelectContactsBtn && selectContactsModal) {
        closeSelectContactsBtn.addEventListener('click', () => {
            selectContactsModal.classList.add('hidden');
        });
    }
    if (confirmSelectContactsBtn && selectContactsModal) {
        confirmSelectContactsBtn.addEventListener('click', () => {
            selectContactsModal.classList.add('hidden');
        });
    }

    const sidebarCreateGroupBtn = document.getElementById('sidebar-create-group-btn');
    if (sidebarCreateGroupBtn) {
        sidebarCreateGroupBtn.addEventListener('click', () => {
            const newGroupName = document.getElementById('new-group-name');
            const newGroupDesc = document.getElementById('new-group-desc');
            const newGroupUsername = document.getElementById('new-group-username');
            if(newGroupName) newGroupName.value = '';
            if(newGroupDesc) newGroupDesc.value = '';
            if(newGroupUsername) newGroupUsername.value = '';
            if (typeof window.clearGroupSelection === 'function') {
                window.clearGroupSelection();
            }
            createGroupModal.classList.remove('hidden');
        });
    }

    let newGroupAvatarUrl = '';
    const newGroupAvatarInput = document.getElementById('new-group-avatar');
    const newGroupAvatarPreview = document.getElementById('new-group-avatar-preview');
    if (newGroupAvatarInput) {
        newGroupAvatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    newGroupAvatarUrl = evt.target.result;
                    if(newGroupAvatarPreview) newGroupAvatarPreview.innerHTML = `<img src="${newGroupAvatarUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    closeGroupModalBtn.addEventListener('click', () => createGroupModal.classList.add('hidden'));
    
    if (editGroupAvatar) {
        editGroupAvatar.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) return alert("Bild zu groß! Max. 2MB erlaubt.");
                const reader = new FileReader();
                reader.onload = (e) => {
                    editGroupAvatarUrl = e.target.result;
                    if(editGroupAvatarPreview) editGroupAvatarPreview.innerHTML = `<img src="${editGroupAvatarUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (closeEditGroupBtn) closeEditGroupBtn.addEventListener('click', () => editGroupModal.classList.add('hidden'));
    
    if (confirmEditGroupBtn) {
        confirmEditGroupBtn.addEventListener('click', async () => {
            if (!currentChat || currentChat.type !== 'room') return;
            const n = editGroupName.value.trim();
            const d = editGroupDesc.value.trim();
            if (!n) return alert("Gruppenname darf nicht leer sein.");
            try {
                const updateData = { name: n, description: d };
                if (editGroupAvatarUrl) updateData.avatar = editGroupAvatarUrl;
                
                await window.db.collection('groups').doc(currentChat.id).update(updateData);
                
                currentChat.name = n;
                currentChat.description = d;
                if (editGroupAvatarUrl) currentChat.avatar = editGroupAvatarUrl;
                
                window.renderGroupInfo();
                document.getElementById('current-chat-name').textContent = currentChat.name;
                if (currentChat.avatar && currentChatAvatar) currentChatAvatar.innerHTML = `<img src="${currentChat.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`;
                
                editGroupModal.classList.add('hidden');
            } catch (e) {
                console.error("Fehler beim Aktualisieren der Gruppe", e);
                alert("Fehler beim Speichern!");
            }
        });
    }
    createGroupSubmitBtn.addEventListener('click', async () => {
        const n = newGroupName.value.trim();
        const descInput = document.getElementById('new-group-desc');
        const desc = descInput ? descInput.value.trim() : '';
        const privacyRadio = document.querySelector('input[name="new-group-privacy"]:checked');
        const privacy = privacyRadio ? privacyRadio.value : 'public';
        
        let username = document.getElementById('new-group-username').value.trim().toLowerCase();
        if (username && !username.startsWith('@')) username = '@' + username;

        const idInput = document.getElementById('new-group-id');
        const groupUid = idInput ? idInput.value.trim() : '';

        if(!n) {
            alert((window.TRANSLATIONS[window.currentLang] || {}).err_group_name_req || 'Bitte gib einen Namen für die Gruppe ein.');
            return;
        }
        if(!username) {
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_group_username_req || 'Bitte gib einen Benutzernamen für die Gruppe ein (z.B. @meinegruppe).');
            return;
        }
        if(/\s/.test(username) || username.length < 3) {
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_username_invalid || 'Der Benutzername darf keine Leerzeichen enthalten und muss mindestens 2 Zeichen lang sein.');
            return;
        }
        if(!groupUid || groupUid.length !== 6 || !/^\d{6}$/.test(groupUid)) {
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_group_id_invalid || 'Die Gruppen-ID muss aus genau 6 Zahlen bestehen.');
            return;
        }
        if(!groupUid || groupUid.length !== 6 || !/^\d{6}$/.test(groupUid)) {
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_group_id_invalid || 'Die Gruppen-ID muss aus genau 6 Zahlen bestehen.');
            return;
        }

        createGroupSubmitBtn.textContent = 'Wird geprüft...';
        createGroupSubmitBtn.disabled = true;

        try {
            const userRef = await window.db.collection('users').doc(username).get();
            if (userRef.exists) {
                alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_username_taken || 'Dieser Benutzername ist bereits von einem anderen Benutzer belegt.');
                createGroupSubmitBtn.textContent = (window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).btn_create || 'Erstellen';
                createGroupSubmitBtn.disabled = false;
                return;
            }
            const groupRef = await window.db.collection('groups').doc(username).get();
            if (groupRef.exists) {
                alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_group_username_taken || 'Dieser Gruppen-Benutzername ist bereits vergeben. Bitte wähle einen anderen.');
                createGroupSubmitBtn.textContent = (window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).btn_create || 'Erstellen';
                createGroupSubmitBtn.disabled = false;
                return;
            }
        } catch(e) { console.error(e); }

        const id = username; 
        const selectedMemberIds = Array.from(document.querySelectorAll('.selected-member-badge')).map(el => el.dataset.id);
        createGroupSubmitBtn.textContent = 'Erstelle...';
        try {
                let finalAvatarUrl = newGroupAvatarUrl;
                if (newGroupAvatarUrl && newGroupAvatarUrl.startsWith('data:')) {
                    try {
                        const storageRef = firebase.storage().ref();
                        const fileRef = storageRef.child('avatars/' + id + '.jpg');
                        await fileRef.putString(newGroupAvatarUrl, 'data_url');
                        finalAvatarUrl = await fileRef.getDownloadURL();
                    } catch (e) {
                        console.error('Group avatar upload failed', e);
                    }
                }

                const newGroup = {
                    id: id,
                    name: n,
                    creator: currentUser,
                    admins: [currentUser],
                    members: [currentUser], // Only creator initially
                    type: 'room',
                    description: desc,
                    privacy: privacy,
                    avatarUrl: finalAvatarUrl,
                    searchable: privacy === 'public'
                };
                await window.db.collection('groups').doc(id).set(newGroup);
                
                // Send Invites to others asynchronously so it doesn't block UI
                selectedMemberIds.forEach(memberId => {
                    if (memberId !== currentUser) {
                        window.sendGroupInvite(id, n, memberId).catch(console.error);
                    }
                });
                
                chatData.rooms.push(newGroup);
                createGroupModal.classList.add('hidden'); 
                newGroupName.value = '';
                if(descInput) descInput.value = '';
                newGroupAvatarUrl = '';
                if(newGroupAvatarPreview) newGroupAvatarPreview.innerHTML = '📷';
                if(newGroupAvatarInput) newGroupAvatarInput.value = '';
                document.getElementById('selected-members-container').innerHTML = '';
                
                // Force switch to active chats list so it shows up in sidebar
                document.getElementById('start-page').classList.remove('active');
                document.getElementById('chat-page').classList.add('active');
                
                selectChat(id, 'room');
            } catch (e) { 
                console.error("Error creating group", e); 
                alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_create_group || 'Fehler beim Erstellen der Gruppe.');
            }
            createGroupSubmitBtn.textContent = (window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).btn_create || 'Erstellen';
            createGroupSubmitBtn.disabled = false;
    });

    // --- Global Sidebar Search ---
    const globalSearchInput = document.getElementById('message-search-input');
    const globalSearchBtn = document.getElementById('message-search-btn');
    const globalSearchResults = document.getElementById('message-search-results');

    async function handleGlobalSearch() {
        if (!globalSearchInput || !globalSearchResults) return;
        let q = globalSearchInput.value.trim().toLowerCase();
        if (!q) {
            globalSearchResults.style.display = 'none';
            globalSearchResults.innerHTML = '';
            return;
        }

        const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];

        globalSearchBtn.textContent = '...';
        globalSearchBtn.disabled = true;
        globalSearchResults.innerHTML = '';
        globalSearchResults.style.display = 'flex';

        try {
            // Search public groups
            const groupsSnap = await window.db.collection('groups').where('privacy', '==', 'public').get();
            let foundGroups = 0;
            
            groupsSnap.forEach(doc => {
                const grp = doc.data();
                if ((grp.name && grp.name.toLowerCase().includes(q)) || (grp.id && grp.id.toLowerCase().includes(q)) || (grp.groupId && grp.groupId.includes(q))) {
                    const isMember = chatData.rooms.find(r => r.id === grp.id);
                    const div = document.createElement('div');
                    div.style.display = 'flex'; div.style.alignItems = 'center'; div.style.gap = '10px'; div.style.padding = '8px'; div.style.background = 'rgba(255,255,255,0.1)'; div.style.borderRadius = '8px';
                    
                    const avContainer = document.createElement('div');
                    avContainer.style.flexShrink = '0';
                    avContainer.innerHTML = grp.avatarUrl ? `<img src="${grp.avatarUrl}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">` : `<div style="width:30px;height:30px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#000;font-size:14px;font-weight:bold;">${grp.name.charAt(0).toUpperCase()}</div>`;
                    
                    const info = document.createElement('div');
                    info.style.flex = '1';
                    let displayId = grp.id.startsWith('@') ? grp.id : '';
                    info.innerHTML = `<div style="font-size: 13px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; max-width: 150px; white-space: nowrap;">${grp.name}</div><div style="font-size: 11px; color: #aaa;">${displayId ? displayId + ' • ' : ''}${t.lbl_public_group || 'Öffentliche Gruppe'}</div>`;
                    
                    const actionBtn = document.createElement('button');
                    actionBtn.className = 'icon-btn';
                    if (isMember) {
                        actionBtn.textContent = t.btn_open || 'Öffnen';
                        actionBtn.style.fontSize = '11px'; actionBtn.style.padding = '4px 8px'; actionBtn.style.width = 'auto'; actionBtn.style.background = 'var(--panel-border)';
                        actionBtn.addEventListener('click', () => selectChat(grp.id, 'room'));
                    } else {
                        actionBtn.textContent = t.btn_join || 'Beitreten';
                        actionBtn.style.fontSize = '11px'; actionBtn.style.padding = '4px 8px'; actionBtn.style.width = 'auto'; actionBtn.style.background = 'var(--accent)'; actionBtn.style.color = '#000';
                        actionBtn.addEventListener('click', async () => {
                            actionBtn.disabled = true; actionBtn.textContent = '...';
                            try {
                                await window.db.collection('groups').doc(grp.id).update({
                                    members: firebase.firestore.FieldValue.arrayUnion(currentUser)
                                });
                                chatData.rooms.push(grp);
                                saveUserData();
                                renderChatList();
                                selectChat(grp.id, 'room');
                            } catch(e) { console.error('Join error', e); actionBtn.disabled = false; actionBtn.textContent = t.btn_join || 'Beitreten'; }
                        });
                    }
                    
                    div.appendChild(avContainer);
                    div.appendChild(info);
                    div.appendChild(actionBtn);
                    globalSearchResults.appendChild(div);
                    foundGroups++;
                }
            });

            if (foundGroups === 0) {
                globalSearchResults.innerHTML = `<div style="font-size: 12px; color: #aaa; text-align: center;">${t.err_no_public_groups || 'Keine öffentlichen Gruppen gefunden.'}</div>`;
            }

        } catch (e) {
            console.error('Search error', e);
            globalSearchResults.innerHTML = `<div style="font-size: 12px; color: var(--error); text-align: center;">${t.err_search_failed || 'Suche fehlgeschlagen.'}</div>`;
        }

        globalSearchBtn.textContent = '🔍';
        globalSearchBtn.disabled = false;
    }

    if (globalSearchBtn) {
        globalSearchBtn.addEventListener('click', handleGlobalSearch);
    }
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleGlobalSearch(); });
    }

    // --- Search Users ---
    async function handleUserSearch() {
        let q = userSearchInput.value.trim();
        const searchIdInput = document.getElementById('user-search-id');
        let idVal = searchIdInput ? searchIdInput.value.trim() : '';
        
        if (!q || !idVal) {
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_search_empty || "Bitte Benutzername und die 6-stellige ID eingeben.");
            return;
        }
        if (!q.startsWith('@')) q = '@' + q;
        const lowerQ = q.toLowerCase();
        
        const resultContainer = document.getElementById('user-search-result');
        if (resultContainer) {
            resultContainer.style.display = 'none';
            resultContainer.innerHTML = '';
        }

        if (lowerQ === currentUser.toLowerCase()) {
            if (resultContainer) {
                resultContainer.style.display = 'flex';
                resultContainer.innerHTML = `<span style="color: var(--error);">Das bist du selbst!</span>`;
            } else alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_search_self || 'Das bist du selbst!');
            return;
        }

        const btnOriginalText = userSearchBtn.textContent;
        userSearchBtn.textContent = '...';
        userSearchBtn.disabled = true;

        try {
            const docRef = window.db.collection('users').doc(lowerQ);
            const docSnap = await docRef.get();
            if (docSnap.exists && docSnap.data().id_number === idVal) {
                if (docSnap.data().searchable === false) {
                    if (resultContainer) {
                        resultContainer.style.display = 'flex';
                        resultContainer.innerHTML = `<span style="color: var(--error);">Benutzername nicht gefunden (Privatsphäre).</span>`;
                    } else alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_user_not_found_privacy || 'Benutzername nicht gefunden (Privatsphäre).');
                    return;
                }
                
                const uData = docSnap.data();
                if (resultContainer) {
                    const aUrl = getAllowedAvatarUrl(q, uData);
                    const avatarImg = aUrl 
                        ? `<img src="${aUrl}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">`
                        : `<div style="width: 50px; height: 50px; border-radius: 50%; background: var(--panel-bg); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: var(--text-primary);">${q.replace('@','').charAt(0).toUpperCase()}</div>`;
                    
                    resultContainer.innerHTML = `
                        ${avatarImg}
                        <span style="font-weight: bold;">${q}</span>
                        <button id="start-search-chat-btn" style="background: var(--accent); color: #000; border: none; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; margin-top: 5px;">Als Kontakt hinzufügen</button>
                    `;
                    resultContainer.style.display = 'flex';
                    
                    document.getElementById('start-search-chat-btn').addEventListener('click', () => {
                        if(!chatData.contacts.find(c=>c.id===q)) { chatData.contacts.push({id: q, name: q, type: 'dm', isSecret: false}); saveUserData(); renderChatList(); alert(q + ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_added_contact || ' wurde zu den Kontakten hinzugefügt!')); } else { alert(q + ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_already_contact || ' ist bereits ein Kontakt.')); }
                    });
                } else {
                    if(!chatData.contacts.find(c=>c.id===q)) { chatData.contacts.push({id: q, name: q, type: 'dm', isSecret: false}); saveUserData(); renderChatList(); alert(q + ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_added_contact || ' wurde zu den Kontakten hinzugefügt!')); } else { alert(q + ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_already_contact || ' ist bereits ein Kontakt.')); }
                }
            } else {
                if (resultContainer) {
                    resultContainer.style.display = 'flex';
                    resultContainer.innerHTML = `<span style="color: var(--error);">Dieser Benutzername existiert nicht.</span>`;
                } else alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_user_not_found2 || 'Benutzername nicht gefunden.');
            }
        } catch (error) {
            console.error("Search Error:", error);
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_search || 'Fehler bei der Suche.');
        } finally {
            userSearchBtn.textContent = btnOriginalText;
            userSearchBtn.disabled = false;
        }
    }
    userSearchBtn.addEventListener('click', handleUserSearch);
    userSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserSearch();
    });

    // Send Options Popup
    let longPressTimer;
    sendBtn.addEventListener('mousedown', () => { longPressTimer = setTimeout(() => sendOptionsPopup.classList.remove('hidden'), 500); });
    sendBtn.addEventListener('mouseup', () => clearTimeout(longPressTimer));
    sendBtn.addEventListener('mouseleave', () => clearTimeout(longPressTimer));
    sendBtn.addEventListener('touchstart', () => { longPressTimer = setTimeout(() => sendOptionsPopup.classList.remove('hidden'), 500); });
    sendBtn.addEventListener('touchend', () => clearTimeout(longPressTimer));
    
    sendSilentBtn.addEventListener('click', () => { const text = messageInput.value.trim(); if(text) { sendMessage(text, null, null, true); messageInput.value = ''; sendOptionsPopup.classList.add('hidden'); } });
    sendScheduleBtn.addEventListener('click', () => { scheduleModal.classList.remove('hidden'); sendOptionsPopup.classList.add('hidden'); });
    closeScheduleModalBtn.addEventListener('click', () => scheduleModal.classList.add('hidden'));
    scheduleSubmitBtn.addEventListener('click', () => { const text = messageInput.value.trim(); const dt = new Date(scheduleDatetime.value).getTime(); if(text && dt > Date.now()) { sendMessage(text, null, null, false, dt); messageInput.value = ''; scheduleModal.classList.add('hidden'); } });

    // --- Firebase Auth & Login Logic ---
    tabLogin.addEventListener('click', () => {
        isRegisterMode = false;
        tabLogin.style.fontWeight = 'bold'; tabLogin.style.color = 'var(--accent)'; tabLogin.style.borderBottom = '2px solid var(--accent)';
        tabRegister.style.fontWeight = 'normal'; tabRegister.style.color = 'var(--text-secondary)'; tabRegister.style.borderBottom = 'none';
        emailInput.classList.add('hidden'); emailInput.removeAttribute('required');
        idInput.classList.remove('hidden'); idInput.setAttribute('required', 'true');
        idHint.classList.add('hidden'); // Hide hint during login
        verificationInfo.classList.add('hidden');
        if (resendVerificationContainer) resendVerificationContainer.style.display = 'none';
        if (rememberMeContainer) rememberMeContainer.style.display = 'flex';
        document.getElementById('forgot-links').style.display = 'none';
        loginSubmitBtn.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).tab_login || 'Einloggen';
        document.getElementById('forgot-links').style.display = 'flex'; loginSubmitBtn.style.display = 'block';
        loginError.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
        isRegisterMode = true;
        tabRegister.style.fontWeight = 'bold'; tabRegister.style.color = 'var(--accent)'; tabRegister.style.borderBottom = '2px solid var(--accent)';
        tabLogin.style.fontWeight = 'normal'; tabLogin.style.color = 'var(--text-secondary)'; tabLogin.style.borderBottom = 'none';
        emailInput.classList.remove('hidden'); emailInput.setAttribute('required', 'true');
        idInput.classList.add('hidden'); idInput.removeAttribute('required');
        idHint.classList.remove('hidden'); // Show hint during registration
        verificationInfo.classList.add('hidden');
        if (resendVerificationContainer) resendVerificationContainer.style.display = 'none';
        if (rememberMeContainer) rememberMeContainer.style.display = 'none';
        loginSubmitBtn.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).tab_register || 'Registrieren'; loginSubmitBtn.style.display = 'block';
        loginError.classList.add('hidden');
    });


    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt((TRANSLATIONS[currentLang] || TRANSLATIONS.en).prompt_email_pwd || "Bitte gib deine E-Mail-Adresse ein, um dein Passwort zurückzusetzen:");
            if (!email) return;
            try {
                await window.auth.sendPasswordResetEmail(email.trim());
                verificationInfo.innerHTML = ((TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_pwd_reset_sent || "Eine E-Mail...") + "<br><strong style='color:#ffcc00; display:block; margin-top:8px;'>" + ((TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_spam_warn || "Wichtig: Spam-Ordner") + "</strong>";
                verificationInfo.classList.remove('hidden');
                loginError.classList.add('hidden');
            } catch (error) {
                loginError.textContent = "Fehler: " + error.message;
                loginError.classList.remove('hidden');
                verificationInfo.classList.add('hidden');
            }
        });
    }

    if (forgotUsernameIdLink) {
        forgotUsernameIdLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt((TRANSLATIONS[currentLang] || TRANSLATIONS.en).prompt_email_user || "Bitte gib deine registrierte E-Mail-Adresse ein:");
            if (!email) return;
            try {
                const snapshot = await window.db.collection('users').where('email', '==', email.trim()).get();
                if (snapshot.empty) {
                    alert((TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_no_account || "Kein Benutzerkonto gefunden.");
                    return;
                }
                
                let accounts = [];
                snapshot.forEach(doc => {
                    accounts.push({
                        username: doc.data().username,
                        id_number: doc.data().id_number || 'Keine ID'
                    });
                });
                
                let accountsHtml = accounts.map(a => `<p><strong>Username:</strong> ${a.username}<br><strong>ID Number:</strong> ${a.id_number}</p>`).join('');

                await fetch('https://api.brevo.com/v3/smtp/email', {
                  method: 'POST',
                  headers: {
                    'Accept': 'application/json',
                    'api-key': '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',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    sender: { name: "Doori Messenger", email: "noreply@doori-messenger.de" },
                    to: [{ email: email.trim() }],
                    subject: "Your Doori Messenger Account Details",
                    htmlContent: `<html><body style="font-family: sans-serif; line-height: 1.6;"><h2>Hello,</h2><p>You requested your Doori Messenger account details.</p>${accountsHtml}<p>Please keep your ID safe as you need it for every login. NEVER share your password with anyone!</p></body></html>`
                  })
                });
                
                alert((TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_acc_details_sent || "Eine E-Mail mit deinen Daten wurde gesendet.");
                
            } catch (error) {
                alert(((TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_send || "Fehler beim Senden: ") + error.message);
            }
        });
    }

    if (resendVerificationLink) {
        resendVerificationLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim() || prompt((TRANSLATIONS[currentLang] || TRANSLATIONS.en).prompt_email_verify || "Bitte gib deine E-Mail-Adresse ein:");
            if (!email) return;
            
            try {
                const snapshot = await window.db.collection('users').where('email', '==', email).limit(1).get();
                if (snapshot.empty) {
                    alert((TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_no_account || "Kein Benutzerkonto gefunden.");
                    return;
                }
                const doc = snapshot.docs[0];
                const username = doc.data().username;
                const generatedId = doc.data().id_number;
                const verificationToken = doc.data().verificationToken;
                
                const verifyLink = `https://doori-messenger.de/?verify=${verificationToken}&u=${encodeURIComponent(username)}`;
                
                await fetch('https://api.brevo.com/v3/smtp/email', {
                  method: 'POST',
                  headers: {
                    'Accept': 'application/json',
                    'api-key': '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',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    sender: { name: "Doori Messenger", email: "noreply@doori-messenger.de" },
                    to: [{ email: email }],
                    subject: "Verify your Doori Messenger Account",
                    htmlContent: `<html><body style="font-family: sans-serif; line-height: 1.6;"><h2>Welcome to Doori Messenger</h2><p>Your account has been created successfully.</p><p><strong>Username:</strong> ${username}</p><p><strong>Your 6-digit ID Number:</strong> ${generatedId}</p><p style="color: #d93025; font-weight: bold;">Important: You must keep this 6-digit ID safe. You will need it for every login! You can share this ID number with others so they can find you, but NEVER share your password with anyone!</p><p>To activate your account and access the messenger, please click the verification link below:</p><p><a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; background: #00d2d3; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email & Login</a></p><p>Or copy this link into your browser: <br>${verifyLink}</p></body></html>`
                  })
                });
                alert((TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_verify_resent || "Bestätigungs-E-Mail wurde erneut gesendet.");
                if (resendVerificationContainer) resendVerificationContainer.style.display = 'none';
            } catch(e) {
                alert(((TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_send || "Fehler beim Senden: ") + e.message);
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const verifyToken = urlParams.get('verify');
    const verifyUser = urlParams.get('u');
    if (verifyToken && verifyUser) {
        const verifyUserLower = verifyUser.toLowerCase();
        localStorage.setItem('doori_verify_token_' + verifyUserLower, verifyToken);
        // Auto-verify in the background using unauthenticated access allowed by new Firestore rules
        window.db.collection('users').doc(verifyUserLower).update({
            isVerified: true,
            verifyAttempt: verifyToken
        }).then(() => {
            console.log("Account successfully auto-verified via link!");
            verificationInfo.innerHTML = "✅ Account erfolgreich verifiziert! Du kannst dich jetzt einloggen.";
            verificationInfo.style.color = "#2ed573";
        }).catch(err => {
            console.warn("Auto-verify failed (maybe already verified or invalid token):", err);
        });

        setTimeout(() => {
            tabLogin.click();
            usernameInput.value = verifyUser;
            verificationInfo.innerHTML = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_verify_login || "Please log in to confirm your email address and activate your account.";
            verificationInfo.classList.remove('hidden');
        }, 500);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        loginError.classList.add('hidden');
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = 'Lädt...';
        
        let username = usernameInput.value.trim(); 
        let password = passwordInput.value.trim();
        let idVal = idInput.value.trim();
        
        if (!username || !password || (!isRegisterMode && !idVal)) {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = isRegisterMode ? ((TRANSLATIONS[currentLang]||TRANSLATIONS.en).tab_register||'Registrieren') : ((TRANSLATIONS[currentLang]||TRANSLATIONS.en).tab_login||'Einloggen');
            return;
        }

        let rawUsername = username.replace('@', '');
        if (isRegisterMode && !/^.{10,}$/.test(rawUsername)) {
            loginError.textContent = (TRANSLATIONS[currentLang]||TRANSLATIONS.en).hint_username || 'Mindestens 10 Zeichen erforderlich.';
            loginError.classList.remove('hidden');
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = isRegisterMode ? ((TRANSLATIONS[currentLang]||TRANSLATIONS.en).tab_register||'Registrieren') : ((TRANSLATIONS[currentLang]||TRANSLATIONS.en).tab_login||'Einloggen');
            return;
        }
        
        if (!username.startsWith('@')) username = '@' + username;
        const usernameLower = username.toLowerCase();

        try {
            if (isRegisterMode) {
                window.isRegistering = true;
                let email = emailInput.value.trim();
                if (!email) return;
                
                try {
                    // Check if username is taken in Firestore
                    const userDocRef = window.db.collection('users').doc(usernameLower);
                    const userDocSnap = await userDocRef.get();
                    if (userDocSnap.exists && userDocSnap.data().uid) {
                        throw new Error('username-taken');
                    }
                    
                    // Register via Firebase Auth
                    const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
                    const user = userCredential.user;
                    
                    const generatedId = Math.floor(100000 + Math.random() * 900000).toString();
                    
                    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

                    await userDocRef.set({
                        uid: user.uid,
                        username: username,
                        email: email,
                        id_number: generatedId,
                        isVerified: false,
                        verificationToken: verificationToken,
                        createdAt: new Date().toISOString()
                    }, { merge: true });
                    
                    const verifyLink = `https://doori-messenger.de/?verify=${verificationToken}&u=${encodeURIComponent(username)}`;
                    
                    try {
                        await fetch('https://api.brevo.com/v3/smtp/email', {
                          method: 'POST',
                          headers: {
                            'Accept': 'application/json',
                            'api-key': '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',
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            sender: { name: "Doori Messenger", email: "noreply@doori-messenger.de" },
                            to: [{ email: email }],
                            subject: "Verify your Doori Messenger Account",
                            htmlContent: `<html><body style="font-family: sans-serif; line-height: 1.6;"><h2>Welcome to Doori Messenger</h2><p>Your account has been created successfully.</p><p><strong>Username:</strong> ${username}</p><p><strong>Your 6-digit ID Number:</strong> ${generatedId}</p><p style="color: #d93025; font-weight: bold;">Important: You must keep this 6-digit ID safe. You will need it for every login! You can share this ID number with others so they can find you, but NEVER share your password with anyone!</p><p>To activate your account and access the messenger, please click the verification link below:</p><p><a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; background: #00d2d3; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email & Login</a></p><p>Or copy this link into your browser: <br>${verifyLink}</p></body></html>`
                          })
                        });
                        verificationInfo.innerHTML = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_verify_sent || "Please check your email to verify your account.";
                        verificationInfo.classList.remove('hidden');
                    } catch(e) { console.error("Brevo error", e); }
                    
                    // Do not log in immediately. Log them out and force verification.
                    await window.auth.signOut();
                    
                    loginSubmitBtn.disabled = false;
                    loginSubmitBtn.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).tab_register || 'Registrieren';
                    loginError.classList.add('hidden');
                    
                } catch (error) {
                    if (error.message === 'username-taken') {
                        loginError.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_user_taken || 'Dieser Benutzername ist bereits vergeben.';
                    } else if (error.code === 'auth/email-already-in-use') {
                        loginError.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_email_taken || 'Diese E-Mail-Adresse ist bereits registriert.';
                    } else if (error.code === 'auth/weak-password') {
                        loginError.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_weak_pwd || 'Das Passwort ist zu schwach (mindestens 6 Zeichen).';
                    } else if (error.message && error.message.includes('client is offline')) {
                        loginError.innerHTML = '<b>Datenbank-Fehler (Offline)</b><br>1. Hast du in der <a href="https://console.firebase.google.com/" target="_blank" style="color:var(--accent);">Firebase Console</a> unter <b>Firestore Database</b> auf "Datenbank erstellen" geklickt?<br>2. Falls ja, deaktiviere bitte kurz deinen Ad-Blocker (z.B. uBlock), da dieser Firebase blockieren könnte.';
                    } else {
                        loginError.textContent = 'Fehler bei der Registrierung: ' + error.message;
                    }
                    loginError.classList.remove('hidden');
                }
            } else {
                // Login Mode
                try {
                    // First get the email for this username from Firestore
                    const userDocRef = window.db.collection('users').doc(usernameLower);
                    const userDocSnap = await userDocRef.get();
                    if (!userDocSnap.exists) {
                        throw new Error('user-not-found');
                    }
                    
                    const userEmail = userDocSnap.data().email;
                    const storedId = userDocSnap.data().id_number;
                    const isVerified = userDocSnap.data().isVerified;
                    const verificationToken = userDocSnap.data().verificationToken;
                    
                    if (!userEmail) {
                        throw new Error('legacy-account');
                    }
                    if (storedId && storedId !== idVal) {
                        throw new Error('invalid-id');
                    }
                    
                    const localToken = localStorage.getItem('doori_verify_token_' + usernameLower) || localStorage.getItem('doori_verify_token_' + username);
                    const effectiveToken = verifyToken || localToken;
                    
                    if (isVerified === false) {
                        if (!effectiveToken || effectiveToken !== verificationToken) {
                            throw new Error('not-verified');
                        }
                        window.isVerifying = true;
                    }
                    
                    // Login via Firebase Auth
                    
                    // Set persistence
                    if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                        await window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                        localStorage.setItem('doori_saved_username', username);
                        localStorage.setItem('doori_saved_id', idVal);
                    } else {
                        await window.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
                        localStorage.removeItem('doori_saved_username');
                        localStorage.removeItem('doori_saved_id');
                    }
                    const userCredential = await window.auth.signInWithEmailAndPassword(userEmail, password);

                    const user = userCredential.user;
                    
                    if (isVerified === false && effectiveToken === verificationToken) {
                        await userDocRef.update({ isVerified: true });
                        // Only clear URL if we actually had verifyToken in URL
                        if (verifyToken) {
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                        localStorage.removeItem('doori_verify_token_' + usernameLower);
                        localStorage.removeItem('doori_verify_token_' + username);
                    }
                    
                    performLogin(username);
                } catch (error) {
                    console.error("Login Flow Error:", error);
                    if (resendVerificationContainer) resendVerificationContainer.style.display = 'none';
                    if (error.message === 'user-not-found') {
                        loginError.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_user_not_found || 'Benutzername nicht gefunden.';
                    } else if (error.message === 'invalid-id') {
                        loginError.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_invalid_id || 'Die eingegebene 6-stellige ID ist falsch.';
                    } else if (error.message === 'legacy-account') {
                        loginError.innerHTML = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_legacy_acc || 'Dein Account nutzt noch das alte System...';
                    } else if (error.message === 'not-verified') {
                        loginError.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_not_verified || 'Bitte bestätige zuerst deine E-Mail über den Link.';
                        if (resendVerificationContainer) resendVerificationContainer.style.display = 'block';
                    } else if (error.message === 'email-not-verified') {
                        loginError.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_email_not_ver || 'Bitte bestätige zuerst deine E-Mail-Adresse...';
                        if (resendVerificationContainer) resendVerificationContainer.style.display = 'block';
                    } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                        loginError.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).msg_wrong_pwd || 'Falsches Passwort oder E-Mail.';
                    } else {
                        loginError.textContent = ((TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_login_failed || 'Fehler beim Login: ') + (error.message || JSON.stringify(error));
                    }
                    loginError.classList.remove('hidden');
                }
            }
        } catch (criticalError) {
            console.error("Critical Login Error:", criticalError);
            alert(((TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_unexpected || "Ein unerwarteter Fehler ist aufgetreten: ") + criticalError.message);
        } finally {
            window.isRegistering = false;
            if(loginSubmitBtn.style.display !== 'none') {
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.textContent = isRegisterMode ? ((TRANSLATIONS[currentLang]||TRANSLATIONS.en).tab_register||'Registrieren') : ((TRANSLATIONS[currentLang]||TRANSLATIONS.en).tab_login||'Einloggen');
            }
        }
    });

    function performLogin(username) {
        currentUser = username; window.currentUser = username;
        if(window.initWebRTC) window.initWebRTC(username);
        if(currentUserDisplay) currentUserDisplay.textContent = currentUser;
        screens.login.classList.remove('active');
        screens.chat.classList.add('active');
        loadUserData();
        loadCallHistory(username);
    }
    
    let callHistoryUnsubscribe = null;
    function loadCallHistory(username) {
        if (callHistoryUnsubscribe) callHistoryUnsubscribe();
        callHistoryUnsubscribe = window.db.collection('users').doc(username).collection('callHistory')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(snapshot => {
                const listEl = document.getElementById('list-calls');
                if (!listEl) return;
                
                listEl.innerHTML = '';
                let unreadCount = 0;
                
                const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (!data.seen && data.type === 'missed') unreadCount++;
                    
                    const timeStr = data.timestamp ? new Date(data.timestamp.toMillis()).toLocaleString() : (t.lbl_just_now || 'Gerade eben');
                    
                    let iconStr = '';
                    let color = '';
                    if (data.type === 'missed') { iconStr = '📞 ' + (t.call_missed || 'Verpasst'); color = 'var(--error)'; }
                    else if (data.type === 'incoming') { iconStr = '📞 ' + (t.call_incoming || 'Eingehend'); color = 'var(--success)'; }
                    else { iconStr = '📞 ' + (t.call_outgoing || 'Ausgehend'); color = 'var(--success)'; }
                    
                    let durStr = '';
                    if (data.duration > 0) {
                        const m = Math.floor(data.duration / 60);
                        const s = data.duration % 60;
                        durStr = `${m}:${s.toString().padStart(2, '0')}`;
                    } else {
                        durStr = '';
                    }
                    
                    const el = document.createElement('div');
                    el.className = 'chat-item';
                    if (!data.seen && data.type === 'missed') el.classList.add('unread');
                    
                    const p = users.get(data.peer);
                    let avatarHtml = data.peer.charAt(0).toUpperCase();
                    const aUrl = getAllowedAvatarUrl(data.peer, p);
                    if (aUrl) avatarHtml = `<img src="${aUrl}" class="avatar-img">`;
                    
                    el.innerHTML = `
                        <div class="avatar" style="color:${color}; border-color:${color};">${avatarHtml}</div>
                        <div class="chat-item-info">
                            <span class="chat-item-name" style="color:${color};">${data.peer}</span>
                            <span class="chat-item-last-message" style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">${iconStr} - ${timeStr} ${durStr ? '('+durStr+' '+(t.lbl_min || 'Min')+')' : ''}</span>
                        </div>
                    `;
                    el.onclick = () => {
                        if (!data.seen && data.type === 'missed') {
                            doc.ref.update({seen: true}).catch(e=>{});
                        }
                        selectChat(data.peer, 'dm');
                    };
                    listEl.appendChild(el);
                });
                
                // Add badge to Anrufe header if there are unread
                const badgeContainer = document.getElementById('calls-badge-container');
                if (badgeContainer) {
                    let badge = document.getElementById('calls-badge');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.id = 'calls-badge';
                        badge.style.cssText = 'background:#c62828; color:white; border-radius:10px; padding:2px 6px; font-size:0.75rem; margin-left:10px;';
                        badgeContainer.appendChild(badge);
                    }
                    if (unreadCount > 0) {
                        badge.textContent = unreadCount;
                        badge.style.display = 'inline-block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }, err => {
                console.error("Error loading call history:", err);
            });
    }

    // Custom Player
    function getCachedBlobUrl(msg) {
        if (msg._blobUrl) return msg._blobUrl;
        let b64 = msg.mediaUrl || msg.fileData;
        if (!b64 || !b64.startsWith('data:')) return b64;
        try {
            let safeUrl = b64.replace(/(data:(audio|video)\/[a-zA-Z0-9]+);.*?base64,/, '$1;base64,');
            const parts = safeUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)[1];
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--) u8arr[n] = bstr.charCodeAt(n);
            const blob = new Blob([u8arr], {type: mime});
            msg._blobUrl = URL.createObjectURL(blob);
            return msg._blobUrl;
        } catch(e) {
            return b64;
        }
    }

    function renderCustomPlayer(url, type) {
        let safeUrl = url || '';
        if(safeUrl.startsWith('data:')) {
            safeUrl = safeUrl.replace(/(data:(audio|video)\/[a-zA-Z0-9]+);.*?base64,/, '$1;base64,');
        }
        const id = 'player_' + Math.random().toString(36).substr(2,9);
        let html = `<div class="custom-player" id="${id}" style="${playerGlass ? '' : 'backdrop-filter:none; background:rgba(16,30,38,0.9);'} border-color:${playerColor};">`;
        if(type === 'video') html += `<div class="custom-player-video-container"><video src="${safeUrl}" playsinline preload="metadata"></video></div>`;
        else html += `<audio src="${safeUrl}" playsinline preload="metadata"></audio>`;
        html += `<div class="custom-player-controls"><button class="player-btn play-btn" style="background:${playerColor};">▶</button><div class="player-progress-container"><div class="player-progress-bar" style="background:${playerColor};"></div></div><span class="player-time">0:00 / 0:00</span></div></div>`;
        return html;
    }
    function initCustomPlayers() {
        document.querySelectorAll('.custom-player').forEach(playerEl => {
            if(playerEl.dataset.initialized) return; playerEl.dataset.initialized = 'true';
            const media = playerEl.querySelector('video, audio'); const playBtn = playerEl.querySelector('.play-btn'); const progBar = playerEl.querySelector('.player-progress-bar'); const progCont = playerEl.querySelector('.player-progress-container'); const timeEl = playerEl.querySelector('.player-time');
            if(!media) return;
            const fmt = (s) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
            playBtn.onclick = () => { if(media.paused) { const p = media.play(); if(p !== undefined) { p.then(() => { playBtn.textContent = '\u23F8'; }).catch(e => { console.log('play err', e); alert('Media Play Error: ' + e.message); }); } else { playBtn.textContent = '\u23F8'; } } else { media.pause(); playBtn.textContent = '\u25B6'; } };
            media.ontimeupdate = () => { if(media.duration) { progBar.style.width = (media.currentTime/media.duration*100)+'%'; timeEl.textContent = `${fmt(media.currentTime)} / ${fmt(media.duration)}`; } };
            media.onloadedmetadata = () => { timeEl.textContent = `0:00 / ${fmt(media.duration)}`; };
            media.onended = () => { playBtn.textContent = '\u25B6'; progBar.style.width = '0%'; };
            progCont.onclick = (e) => { const r = progCont.getBoundingClientRect(); const pct = (e.clientX - r.left)/r.width; media.currentTime = pct * media.duration; };
        });
    }

    setInterval(() => {
        if(currentChat) renderMessages();
    }, 1000);

    // Auto-Login
    window.auth.onAuthStateChanged(async (user) => {
        if (user && !currentUser) {
            if (window.isRegistering) return;
            try {
                const q = await window.db.collection('users').where('uid', '==', user.uid).get();
                if (!q.empty) {
                    const doc = q.docs[0];
                    if (doc.data().isVerified === false && !window.isVerifying) {
                        window.auth.signOut();
                    } else {
                        performLogin(doc.data().username);
                    }
                }
            } catch (err) { console.error("Auto-login error", err); }
        }
    });

    // --- Group Member Selection Logic ---
    const groupMemberSearchInput = document.getElementById('group-member-search');
    const groupMemberSearchBtn = document.getElementById('group-member-search-btn');
    const groupMemberSearchResult = document.getElementById('group-member-search-result');
    const groupContactsList = document.getElementById('group-contacts-list');
    const selectedMembersContainer = document.getElementById('selected-members-container');
    const selectedMembers = new Set();

    window.clearGroupSelection = function() {
        selectedMembers.clear();
        if (selectedMembersContainer) selectedMembersContainer.innerHTML = '';
        renderGroupContacts();
    };

    window.renderGroupContacts = function() {
        if (!groupContactsList) return;
        groupContactsList.innerHTML = '';
        chatData.contacts.forEach(c => {
            if (selectedMembers.has(c.id)) return;
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `
                <div class="avatar">${c.id.charAt(0).toUpperCase()}</div>
                <div class="chat-item-info"><span class="chat-item-name">${c.id}</span></div>
                <button class="icon-btn text-btn" style="color:var(--accent); font-size:1rem;">+</button>
            `;
            div.addEventListener('click', () => {
                addSelectedMember(c.id);
                renderGroupContacts();
            });
            groupContactsList.appendChild(div);
        });
    }

    function addSelectedMember(username) {
        if (selectedMembers.has(username) || username.toLowerCase() === currentUser.toLowerCase()) return;
        selectedMembers.add(username);
        
        const badge = document.createElement('div');
        badge.className = 'selected-member-badge';
        badge.dataset.id = username;
        badge.innerHTML = `<span>${username}</span><span class="remove-member">✖</span>`;
        badge.querySelector('.remove-member').addEventListener('click', () => {
            selectedMembers.delete(username);
            badge.remove();
            renderGroupContacts();
        });
        selectedMembersContainer.appendChild(badge);
    }

    
    if (groupMemberSearchBtn) {
        groupMemberSearchBtn.addEventListener('click', async () => {
            let q = groupMemberSearchInput.value.trim().toLowerCase();
            const groupSearchIdInput = document.getElementById('group-member-search-id');
            let idVal = groupSearchIdInput ? groupSearchIdInput.value.trim() : '';
            
            if (!q || !idVal) {
                alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_search_empty || "Bitte Benutzername und die 6-stellige ID eingeben.");
                return;
            }
            if (!q.startsWith('@')) q = '@' + q;
            if (q === currentUser.toLowerCase()) return;
            
            try {
                const docRef = window.db.collection('users').doc(q);
                const docSnap = await docRef.get();
                if (docSnap.exists && docSnap.data().id_number === idVal) {
                    groupMemberSearchResult.style.display = 'flex';
                    groupMemberSearchResult.innerHTML = `
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div class="avatar">${q.charAt(0).toUpperCase()}</div>
                            <span>${q}</span>
                        </div>
                        <button class="submit-btn" id="add-searched-member" style="padding: 5px 15px; font-size: 14px; min-width: auto; height: auto; border-radius: 20px;">${(window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).btn_add_user || 'Hinzufügen'}</button>
                    `;
                    document.getElementById('add-searched-member').addEventListener('click', () => {
                        addSelectedMember(q);
                        groupMemberSearchResult.style.display = 'none';
                        groupMemberSearchInput.value = '';
                        renderGroupContacts();
                    });
                } else {
                    groupMemberSearchResult.style.display = 'flex';
                    groupMemberSearchResult.innerHTML = `<span style="color:var(--danger);" data-i18n="err_user_not_found">Dieser Benutzer existiert nicht.</span>`;
                }
            } catch (e) { console.error(e); }
        });
    }

    // --- Group Info Sidebar Logic ---
    const groupInfoBtn = document.getElementById('group-info-btn');
    const groupInfoSidebar = document.getElementById('group-info-sidebar');
    const closeGroupInfoBtn = document.getElementById('close-group-info-btn');
    const groupInfoName = document.getElementById('group-info-name');
    const groupInfoAvatar = document.getElementById('group-info-avatar');
    const groupMembersList = document.getElementById('group-members-list');
    const groupInfoActions = document.getElementById('group-info-actions');
    const addMemberBtn = document.getElementById('add-member-btn');
    const leaveGroupBtn = document.getElementById('leave-group-btn');

    if (leaveGroupBtn) {
        leaveGroupBtn.addEventListener('click', async () => {
            if (confirm((window.TRANSLATIONS[window.currentLang] || {}).btn_leave_group + '?')) {
                await window.removeGroupMember(currentUser);
                groupInfoSidebar.classList.add('hidden');
                selectChat('general', 'room');
            }
        });
    }
    if (groupInfoBtn) {
        groupInfoBtn.addEventListener('click', () => {
            groupInfoSidebar.classList.remove('hidden');
            window.renderGroupInfo();
        });
    }

    if (closeGroupInfoBtn) {
        closeGroupInfoBtn.addEventListener('click', () => {
            groupInfoSidebar.classList.add('hidden');
        });
    }
    
    const deleteGroupBtn = document.getElementById('delete-group-btn');
    if (deleteGroupBtn) {
        deleteGroupBtn.addEventListener('click', async () => {
            if (confirm("Möchtest du diese Gruppe wirklich löschen?")) {
                try {
                    await window.db.collection('groups').doc(currentChat.id).delete();
                    groupInfoSidebar.classList.add('hidden');
                    chatData.rooms = chatData.rooms.filter(r => r.id !== currentChat.id);
                    renderChatList();
                    selectChat('saved', 'saved');
                } catch(e) { console.error(e); }
            }
        });
    }

    const editGroupBtn = document.getElementById('edit-group-btn');
    if (editGroupBtn) {
        editGroupBtn.addEventListener('click', () => {
            if (!currentChat) return;
            editGroupName.value = currentChat.name || '';
            editGroupDesc.value = currentChat.description || '';
            if (currentChat.avatar) {
                editGroupAvatarPreview.innerHTML = `<img src="${currentChat.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`;
                editGroupAvatarUrl = currentChat.avatar;
            } else {
                editGroupAvatarPreview.innerHTML = '📷';
                editGroupAvatarUrl = null;
            }
            editGroupModal.classList.remove('hidden');
        });
    }
    
    window.removeGroupMember = async function(username) {
        if (!currentChat || currentChat.type !== 'room') return;
        try {
            const newMembers = currentChat.members.filter(m => m !== username);
            const newAdmins = currentChat.admins.filter(m => m !== username);
            await window.db.collection('groups').doc(currentChat.id).update({
                members: newMembers,
                admins: newAdmins
            });
            window.sendSystemMessage(currentChat.id, 'kicked', username);
            window.renderGroupInfo();
        } catch(e) { console.error(e); }
    };
    
    window.toggleGroupAdmin = async function(username, makeAdmin) {
        if (!currentChat || currentChat.type !== 'room') return;
        try {
            let newAdmins = currentChat.admins || [];
            if (makeAdmin) {
                if (!newAdmins.includes(username)) newAdmins.push(username);
            } else {
                newAdmins = newAdmins.filter(m => m !== username);
            }
            await window.db.collection('groups').doc(currentChat.id).update({
                admins: newAdmins
            });
            window.renderGroupInfo();
        } catch(e) { console.error(e); }
    };

    window.renderGroupInfo = function() {
        if (!currentChat || currentChat.type !== 'room' || !groupInfoSidebar) return;
        
        groupInfoName.textContent = currentChat.name;
        groupInfoAvatar.textContent = currentChat.name.charAt(0).toUpperCase();
        
        groupMembersList.innerHTML = '';
        
        const isAdmin = currentChat.admins && currentChat.admins.includes(currentUser);
        groupInfoActions.style.display = isAdmin ? 'flex' : 'none';
        if (leaveGroupBtn) leaveGroupBtn.style.display = 'block';
        
        const isCreator = currentChat.creator === currentUser;
        
        const deleteGroupBtn = document.getElementById('delete-group-btn');
        if (deleteGroupBtn) {
            deleteGroupBtn.style.display = isCreator ? 'block' : 'none';
        }
        
        const editGroupBtn = document.getElementById('edit-group-btn');
        if (editGroupBtn) {
            editGroupBtn.style.display = isAdmin ? 'block' : 'none';
        }
        
        const adminActions = document.getElementById('group-admin-actions');
        if (adminActions) {
            if (isAdmin) {
                adminActions.classList.remove('hidden');
                document.getElementById('group-readonly-toggle').checked = !!currentChat.isReadOnly;
            } else {
                adminActions.classList.add('hidden');
            }
        }
        
        if (currentChat.members) {
            currentChat.members.forEach(member => {
                const isMemberAdmin = currentChat.admins && currentChat.admins.includes(member);
                const isCreator = currentChat.creator === member;
                
                const div = document.createElement('div');
                div.className = 'member-item';
                
                let badges = '';
                if (isCreator) badges += '<span class="admin-badge">Ersteller</span>';
                else if (isMemberAdmin) badges += '<span class="admin-badge">Admin</span>';
                
                let actions = '';
                if (isAdmin && member !== currentUser && !isCreator) {
                    const isMuted = currentChat.mutedMembers && currentChat.mutedMembers.includes(member);
                    const adminBtnText = isMemberAdmin ? '👑-' : '👑+';
                    const adminTitle = isMemberAdmin ? 'Adminrechte entziehen' : 'Zum Admin machen';
                    actions = `
                        <button class="icon-btn" style="background: rgba(255,255,255,0.1); color: gold; border-radius: 5px; padding: 5px 8px; font-size: 14px;" onclick="toggleGroupAdmin('${member}', ${!isMemberAdmin})" title="${adminTitle}">${adminBtnText}</button>
                        <button class="icon-btn" style="background: ${isMuted ? '#ff4757' : 'rgba(255,255,255,0.1)'}; color: #fff; border-radius: 5px; padding: 5px 8px; font-size: 14px;" onclick="toggleMuteMember('${member}', ${!isMuted})" title="${isMuted ? 'Stummschaltung aufheben' : 'Stummschalten'}">${isMuted ? '🔊' : '🔇'}</button>
                        <button class="icon-btn danger" onclick="removeGroupMember('${member}')" title="Entfernen">✖</button>
                    `;
                }
                
                div.innerHTML = `
                    <div class="member-item-info">
                        <div class="avatar">${member.charAt(0).toUpperCase()}</div>
                        <span>${member} ${badges}</span>
                    </div>
                    ${actions}
                `;
                groupMembersList.appendChild(div);
            });
        }
        applyTranslation(currentLang);
    }

    window.removeGroupMember = async function(username) {
        if (!currentChat || currentChat.type !== 'room') return;
        if (currentChat.creator === username && currentUser !== username) {
            alert("Der Ersteller der Gruppe kann nicht entfernt werden.");
            return;
        }
        try {
            const newMembers = currentChat.members.filter(m => m !== username);
            const newAdmins = currentChat.admins.filter(m => m !== username);
            await window.db.collection('groups').doc(currentChat.id).update({
                members: newMembers,
                admins: newAdmins
            });
            await window.sendSystemMessage(currentChat.id, 'removed', username);
        } catch(e) { console.error("Error removing member", e); }
    };

    if (addMemberBtn) {
        const addMemberModal = document.getElementById('add-member-to-group-modal');
        const closeAddMemberBtn = document.getElementById('close-add-member-to-group-btn');
        const addMemberContactsBtn = document.getElementById('add-member-group-from-contacts-btn');
        const addMemberSearchBtn = document.getElementById('add-member-group-search-btn');
        const addMemberSearchInput = document.getElementById('add-member-group-search-input');
        const selectContactsModal = document.getElementById('select-contacts-modal');

        addMemberBtn.addEventListener('click', () => {
            if (addMemberModal) {
                addMemberModal.classList.remove('hidden');
            }
        });

        if (closeAddMemberBtn) {
            closeAddMemberBtn.addEventListener('click', () => {
                addMemberModal.classList.add('hidden');
            });
        }

        if (addMemberContactsBtn) {
            addMemberContactsBtn.addEventListener('click', () => {
                addMemberModal.classList.add('hidden');
                
                const confirmSelectContactsBtn = document.getElementById('confirm-select-contacts-btn');
                const oldClick = confirmSelectContactsBtn.onclick || function() { selectContactsModal.classList.add('hidden'); };
                
                confirmSelectContactsBtn.onclick = () => {
                    selectContactsModal.classList.add('hidden');
                    const selected = Array.from(document.querySelectorAll('.selected-member-badge')).map(el => el.dataset.id);
                    selected.forEach(u => {
                        if (!currentChat.members.includes(u) && u !== currentUser) {
                            window.sendGroupInvite(currentChat.id, currentChat.name, u);
                        }
                    });
                    if (selected.length > 0) {
                        alert((window.TRANSLATIONS[window.currentLang] || {}).msg_invite_sent || "Einladung gesendet.");
                    }
                    window.clearGroupSelection();
                    confirmSelectContactsBtn.onclick = oldClick;
                };
                
                window.clearGroupSelection();
                if (window.renderGroupContacts) window.renderGroupContacts();
                if (selectContactsModal) selectContactsModal.classList.remove('hidden');
            });
        }

        if (addMemberSearchBtn) {
            addMemberSearchBtn.addEventListener('click', async () => {
                const query = addMemberSearchInput.value.trim().toLowerCase();
                if (!query) return;
                
                let u = query;
                if (!u.startsWith('@') && !/^\d{6}$/.test(u)) u = '@' + u;

                if (currentChat.members.includes(u)) {
                    alert('Benutzer ist bereits in der Gruppe.');
                    return;
                }

                try {
                    let userDoc;
                    if (/^\d{6}$/.test(query)) {
                        const snapshot = await window.db.collection('users').where('idNumber', '==', query).get();
                        if (!snapshot.empty) userDoc = snapshot.docs[0];
                    } else {
                        userDoc = await window.db.collection('users').doc(u).get();
                    }

                    if (userDoc && userDoc.exists) {
                        const targetUser = userDoc.id;
                        if (currentChat.members.includes(targetUser)) {
                            alert('Benutzer ist bereits in der Gruppe.');
                            return;
                        }
                        window.sendGroupInvite(currentChat.id, currentChat.name, targetUser);
                        alert((window.TRANSLATIONS[window.currentLang] || {}).msg_invite_sent || "Einladung gesendet.");
                        addMemberModal.classList.add('hidden');
                        addMemberSearchInput.value = '';
                    } else {
                        alert((window.TRANSLATIONS[window.currentLang] || {}).err_user_not_found || "Benutzer existiert nicht.");
                    }
                } catch(e) {
                    console.error(e);
                }
            });
        }
    }

    // --- Invite Modal Logic ---
    window.pendingInvites = window.pendingInvites || [];
    
    window.showInviteModal = function(msg) {
        const modal = document.getElementById('invite-modal');
        if (!modal.classList.contains('hidden')) {
            window.pendingInvites.push(msg);
            return;
        }
        
        document.getElementById('invite-avatar').textContent = msg.sender_username.charAt(1).toUpperCase();
        document.getElementById('invite-group-name').textContent = msg.invite_group_name;
        document.getElementById('invite-sender').textContent = 'von ' + msg.sender_username;
        
        document.getElementById('accept-invite-btn').onclick = () => {
            window.acceptGroupInvite(msg.invite_group_id, msg.id, msg.sender_username, msg.invite_group_name);
            window.closeInviteModal();
        };
        
        document.getElementById('reject-invite-btn').onclick = () => {
            window.declineGroupInvite(msg.invite_group_id, msg.id, msg.sender_username, msg.invite_group_name);
            window.closeInviteModal();
        };
        
        modal.classList.remove('hidden');
        playSound(); // Optional: play sound for popup
    };

    window.closeInviteModal = function() {
        document.getElementById('invite-modal').classList.add('hidden');
        if (window.pendingInvites.length > 0) {
            setTimeout(() => {
                window.showInviteModal(window.pendingInvites.shift());
            }, 500);
        }
    };

    // --- Group Invitations & System Messages ---
    window.acceptGroupInvite = async function(groupId, msgId, sender, groupName) {
        try {
            await window.db.collection('messages').doc(msgId).update({ invite_status: 'accepted' }).catch(()=>{});
            
            const groupRef = window.db.collection('groups').doc(groupId);
            const doc = await groupRef.get();
            if (doc.exists) {
                const groupData = doc.data();
                if (!groupData.members.includes(currentUser)) {
                    await groupRef.update({
                        members: firebase.firestore.FieldValue.arrayUnion(currentUser)
                    });
                    await window.sendSystemMessage(groupId, 'joined', currentUser);
                }
                
                if (!chatData.rooms.find(r => r.id === groupId)) {
                    if (!groupData.members.includes(currentUser)) groupData.members.push(currentUser);
                    chatData.rooms.push(groupData);
                    renderChatList();
                }
            }
        } catch(e) { console.error(e); }
    };

    window.declineGroupInvite = async function(groupId, msgId, sender, groupName) {
        try {
            await window.db.collection('messages').doc(msgId).update({ invite_status: 'declined' }).catch(()=>{});
        } catch(e) { console.error(e); }
    };

    window.sendGroupInvite = async function(groupId, groupName, inviteeUsername) {
        if (!groupId || !inviteeUsername) return;
        try {
            const invitesQuery = await window.db.collection('messages')
                .where('type', '==', 'group_invite')
                .where('recipient_username', '==', inviteeUsername.toLowerCase())
                .get();
            const batch = window.db.batch();
            invitesQuery.forEach(doc => {
                if (doc.data().sender_username === currentUser && doc.data().invite_status === 'pending') {
                    batch.delete(doc.ref);
                }
            });
            await batch.commit();
        } catch(e) { console.error('Error clearing old invites', e); }
        const msgRef = window.db.collection('messages').doc();
        const msg = {
            id: msgRef.id,
            chat_id: inviteeUsername.toLowerCase(),
            sender_username: currentUser,
            recipient_username: inviteeUsername.toLowerCase(),
            timestamp: Date.now(),
            text: '',
            isPublic: false,
            participants: [currentUser.toLowerCase(), inviteeUsername.toLowerCase()],
            type: 'group_invite',
            invite_status: 'pending',
            invite_group_id: groupId,
            invite_group_name: groupName
        };
        await msgRef.set(msg);
    };

    window.showGlobalInvitePopup = showGlobalInvitePopup;
    function showGlobalInvitePopup(msg) {
        const popup = document.getElementById('global-invite-popup');
        const textEl = document.getElementById('global-invite-text');
        const acceptBtn = document.getElementById('global-invite-accept-btn');
        const declineBtn = document.getElementById('global-invite-decline-btn');
        const closeBtn = document.getElementById('global-invite-close-btn');
        
        if (!popup) return;
        
        const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en'];
        textEl.innerHTML = ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_invited_by || 'Du wurdest von <b>{sender}</b> in die Gruppe <b>{group}</b> eingeladen.').replace('{sender}', msg.sender_username).replace('{group}', msg.invite_group_name);
        
        const closePopup = () => { popup.classList.add('hidden'); };
        
        acceptBtn.onclick = () => {
            window.acceptGroupInvite(msg.invite_group_id, msg.id, msg.sender_username, msg.invite_group_name);
            closePopup();
        };
        declineBtn.onclick = () => {
            window.declineGroupInvite(msg.invite_group_id, msg.id, msg.sender_username, msg.invite_group_name);
            closePopup();
        };
        closeBtn.onclick = closePopup;
        
        popup.classList.remove('hidden');
        if (typeof playSound === 'function') playSound();
    };

    window.sendSystemMessage = async function(groupId, action, targetUser) {
        const msgRef = window.db.collection('messages').doc();
        const msg = {
            id: msgRef.id,
            chat_id: groupId,
            sender_username: 'system',
            timestamp: Date.now(),
            text: '',
            isPublic: true,
            type: 'system',
            system_action: action, // 'joined', 'left', 'removed'
            system_target: targetUser
        };
        await msgRef.set(msg);
    };

    

    
    // --- Phase 2: Features (Fixed Scope) ---
    // Translations
    const phase2Additions = {
        de: { 
            lbl_group_username: 'Gruppen-Benutzername (z.B. @meinegruppe)',
            lbl_choose_from_contacts: 'Aus Kontakten wählen:', 
            lbl_or_search_user: 'Oder Benutzer suchen:', 
            ph_group_id: 'Gruppen-ID (6-stellig)', 
            err_group_id_invalid: 'Die Gruppen-ID muss aus genau 6 Zahlen bestehen.', 
            err_group_id_taken: 'Diese Gruppen-ID ist bereits vergeben. Bitte wähle eine andere.',
            btn_choose_from_contacts: 'Aus Kontakten wählen',
            btn_done: 'Fertig',
            ph_search_user_id: 'Benutzer suchen (@name) oder ID...',
            ls_online: 'Online', ls_minutes: 'zuletzt online vor {m} Minuten', ls_today: 'zuletzt online heute um {t}', ls_yesterday: 'zuletzt online gestern um {t}', ls_days: 'zuletzt online am {d} um {t}', ls_week: 'zuletzt online diese Woche', ls_month: 'zuletzt online diesen Monat', ls_long_time: 'vor langer Zeit online'
        },
        en: { 
            lbl_group_username: 'Group Username (e.g. @mygroup)',
            lbl_choose_from_contacts: 'Choose from contacts:', 
            lbl_or_search_user: 'Or search user:', 
            ph_group_id: 'Group ID (6 digits)', 
            err_group_id_invalid: 'The Group ID must consist of exactly 6 digits.', 
            err_group_id_taken: 'This Group ID is already taken. Please choose another.',
            btn_choose_from_contacts: 'Choose from contacts',
            btn_done: 'Done',
            ph_search_user_id: 'Search user (@name) or ID...',
            ls_online: 'Online', ls_minutes: 'last seen {m} minutes ago', ls_today: 'last seen today at {t}', ls_yesterday: 'last seen yesterday at {t}', ls_days: 'last seen {d} days ago', ls_week: 'last seen this week', ls_month: 'last seen this month', ls_long_time: 'last seen a long time ago'
        },
        fa: { 
            lbl_group_username: 'نام کاربری گروه (مثال @mygroup)',
            lbl_choose_from_contacts: 'انتخاب از مخاطبین:', 
            lbl_or_search_user: 'یا جستجوی کاربر:', 
            ph_group_id: 'شناسه گروه (۶ رقم)', 
            err_group_id_invalid: 'شناسه گروه باید دقیقاً ۶ عدد باشد.', 
            err_group_id_taken: 'این شناسه گروه قبلاً گرفته شده است. لطفاً شناسه دیگری انتخاب کنید.',
            btn_choose_from_contacts: 'انتخاب از مخاطبین',
            btn_done: 'تایید'
        },
        ar: { 
            lbl_group_username: 'اسم مستخدم المجموعة (مثل @mygroup)',
            lbl_choose_from_contacts: 'اختر من جهات الاتصال:', 
            lbl_or_search_user: 'أو ابحث عن مستخدم:', 
            ph_group_id: 'معرف المجموعة (6 أرقام)', 
            err_group_id_invalid: 'يجب أن يتكون معرف المجموعة من 6 أرقام بالضبط.', 
            err_group_id_taken: 'معرف المجموعة هذا مأخوذ بالفعل. يرجى اختيار واحد آخر.',
            btn_choose_from_contacts: 'اختر من جهات الاتصال',
            btn_done: 'تم'
        },
        tr: { 
            lbl_group_username: 'Grup Kullanıcı Adı (ör. @benimgrup)',
            lbl_choose_from_contacts: 'Kişilerden seç:', 
            lbl_or_search_user: 'Veya kullanıcı ara:', 
            ph_group_id: 'Grup Kimliği (6 haneli)', 
            err_group_id_invalid: 'Grup Kimliği tam olarak 6 rakamdan oluşmalıdır.', 
            err_group_id_taken: 'Bu Grup Kimliği zaten alınmış. Lütfen başka bir tane seçin.',
            btn_choose_from_contacts: 'Kişilerden seç',
            btn_done: 'Bitti',
            ph_search_user_id: 'Kullanıcı ara (@name) veya ID...',
            ls_online: 'Çevrimiçi', ls_minutes: 'son görülme {m} dakika önce', ls_today: 'son görülme bugün {t}', ls_yesterday: 'son görülme dün {t}', ls_days: 'son görülme {d} gün önce', ls_week: 'son görülme bu hafta', ls_month: 'son görülme bu ay', ls_long_time: 'uzun zaman önce görüldü'
        }
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
            list.innerHTML = `<span style="color: var(--text-secondary);">${t.msg_no_blocked || 'Keine blockierten Kontakte.'}</span>`;
            return;
        }
        blockedContacts.forEach(username => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '5px 0';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.innerHTML = `
                <span>${username}</span>
                <button class="text-btn" style="color: var(--bg-red); font-size: 12px; padding: 5px;" onclick="window.unblockUser('${username}')">${t.btn_unblock || 'Entblocken'}</button>
            `;
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

    

});



// Plus Menu Logic
const plusMenuBtn = document.getElementById('plus-menu-btn');
const plusMenuDropdown = document.getElementById('plus-menu-dropdown');
if (plusMenuBtn && plusMenuDropdown) {
    plusMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        plusMenuDropdown.classList.toggle('hidden');
    });
    
    document.addEventListener('click', (e) => {
        if (!plusMenuBtn.contains(e.target) && !plusMenuDropdown.contains(e.target)) {
            plusMenuDropdown.classList.add('hidden');
        }
    });
    
    // Close menu when clicking items (except doodle which might open a modal)
    plusMenuDropdown.querySelectorAll('.popup-item').forEach(item => {
        item.addEventListener('click', () => {
            if (item.id !== 'doodle-btn') {
                plusMenuDropdown.classList.add('hidden');
            }
        });
    });
}

// Location Sharing Logic
const menuLocationBtn = document.getElementById('menu-location-btn');
if (menuLocationBtn) {
    menuLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("Dein Browser unterstützt diese Funktion leider nicht.");
            return;
        }
        
        const originalHtml = menuLocationBtn.innerHTML;
        menuLocationBtn.innerHTML = '⏳ <span data-i18n="lbl_location">Standort wird abgerufen...</span>';
        
        navigator.geolocation.getCurrentPosition((position) => {
            menuLocationBtn.innerHTML = originalHtml;
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            sendMessage('', 'location', lat + ',' + lng);
            if (plusMenuDropdown) plusMenuDropdown.classList.add('hidden');
        }, (error) => {
            menuLocationBtn.innerHTML = originalHtml;
            console.error("GPS Fehler:", error);
            alert("Standort konnte nicht abgerufen werden. Bitte überprüfe die Berechtigungen deines Browsers/Geräts.");
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
}

// ==========================================
// PHASE 1: Design & Profil Einstellungen
// ==========================================

// --- Wallpaper Logic ---
const wallpaperUpload = document.getElementById('wallpaper-upload');
const removeWallpaperBtn = document.getElementById('remove-wallpaper-btn');
const messagesContainerEl = document.getElementById('messages-container'); // The chat area

function applyWallpaper(dataUrl) {
    if(dataUrl) {
        messagesContainerEl.style.backgroundImage = 'url(' + dataUrl + ')';
        messagesContainerEl.style.backgroundSize = 'cover';
        messagesContainerEl.style.backgroundPosition = 'center';
        messagesContainerEl.style.backgroundAttachment = 'fixed';
        if(removeWallpaperBtn) removeWallpaperBtn.classList.remove('hidden');
    } else {
        messagesContainerEl.style.backgroundImage = 'none';
        if(removeWallpaperBtn) removeWallpaperBtn.classList.add('hidden');
    }
}

const savedWallpaper = localStorage.getItem('doori_wallpaper');
if(savedWallpaper) applyWallpaper(savedWallpaper);

if(wallpaperUpload) {
    wallpaperUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            const dataUrl = evt.target.result;
            try {
                localStorage.setItem('doori_wallpaper', dataUrl);
                applyWallpaper(dataUrl);
            } catch(err) {
                alert("Das Bild ist zu groß zum Speichern. Bitte wähle ein kleineres Bild.");
            }
        };
        reader.readAsDataURL(file);
    });
}

if(removeWallpaperBtn) {
    removeWallpaperBtn.addEventListener('click', function() {
        localStorage.removeItem('doori_wallpaper');
        applyWallpaper(null);
    });
}

// --- Font Size Logic ---
const fontSizeSelect = document.getElementById('setting-font-size');

function applyFontSize(size) {
    let px = '15px'; // normal
    if(size === 'small') px = '13px';
    if(size === 'large') px = '18px';
    
    let styleEl = document.getElementById('custom-font-size-style');
    if(!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-font-size-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `.msg-sent .msg-bubble, .message.sent .message-bubble, #message-input { font-size: ${px} !important; }`;
}

const savedFontSize = localStorage.getItem('doori_font_size') || 'normal';
applyFontSize(savedFontSize);
if(fontSizeSelect) {
    fontSizeSelect.value = savedFontSize;
    fontSizeSelect.addEventListener('change', function(e) {
        const size = e.target.value;
        localStorage.setItem('doori_font_size', size);
        applyFontSize(size);
    });
}

// --- Bio Logic ---
const bioInput = document.getElementById('setting-bio');
let bioSaveTimeout;

if(bioInput) {
    bioInput.addEventListener('input', function(e) {
        clearTimeout(bioSaveTimeout);
        const newBio = e.target.value.trim();
        bioSaveTimeout = setTimeout(() => {
            if(window.currentUser) {
                window.db.collection('users').doc(window.currentUser).set({ bio: newBio }, { merge: true }).catch(console.error);
                if(window.users && window.users.has(window.currentUser)) {
                    let uData = window.users.get(window.currentUser);
                    uData.bio = newBio;
                    window.users.set(window.currentUser, uData);
                }
            }
        }, 1000);
    });
}

// Subscribe to auth state or listen for currentUser changes to populate bio
if(window.firebase) {
    firebase.auth().onAuthStateChanged(user => {
        if(user && user.displayName) {
            window.db.collection('users').doc(user.displayName).get().then(doc => {
                if(doc.exists && doc.data().bio && bioInput) {
                    bioInput.value = doc.data().bio;
                }
            });
        }
    });
}

// Show Bio in Group Info / Contact Info
const originalRenderGroupInfo = window.renderGroupInfo;
if(originalRenderGroupInfo) {
    window.renderGroupInfo = function() {
        originalRenderGroupInfo();
        setTimeout(() => {
            const sideHeader = document.querySelector('.group-info-header');
            if(sideHeader && window.currentChat && window.currentChat.type === 'dm') {
                const targetUser = window.currentChat.id;
                const uData = window.users ? window.users.get(targetUser) : null;
                if(uData && uData.bio) {
                    // Avoid duplicate bio insertion
                    if(!document.getElementById('profile-bio-display')) {
                        const bioEl = document.createElement('div');
                        bioEl.id = 'profile-bio-display';
                        bioEl.style.marginTop = '10px';
                        bioEl.style.padding = '10px';
                        bioEl.style.background = 'rgba(255,255,255,0.05)';
                        bioEl.style.borderRadius = '8px';
                        bioEl.style.fontStyle = 'italic';
                        bioEl.style.color = 'var(--text-secondary)';
                        bioEl.style.fontSize = '13px';
                        bioEl.textContent = '"' + uData.bio + '"';
                        sideHeader.appendChild(bioEl);
                    }
                }
            }
        }, 100);
    };
}

// ==========================================
// PHASE 1 FIXES: Fonts, Colors, Wallpapers & Translations
// ==========================================

// Fix Translations globally
if (window.TRANSLATIONS) {
    const extraTrans = {
        de: { lbl_font_family: 'Schriftart', lbl_font_color: 'Schriftfarbe (Eigener Text)', opt_color_default: 'Standard (Weiß)', opt_color_blue: 'Hellblau', opt_color_green: 'Hellgrün', opt_color_pink: 'Hellrosa', btn_custom_wallpaper: 'Eigene...', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Schreibmaschine', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Locker (Comic)' },
        en: { lbl_font_family: 'Font Family', lbl_font_color: 'Font Color (Own Text)', opt_color_default: 'Default (White)', opt_color_blue: 'Light Blue', opt_color_green: 'Light Green', opt_color_pink: 'Light Pink', btn_custom_wallpaper: 'Custom...', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Typewriter', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Casual (Comic)' },
        fa: { lbl_font_family: 'نوع فونت', lbl_font_color: 'رنگ فونت (متن خود)', opt_color_default: 'پیش‌فرض (سفید)', opt_color_blue: 'آبی روشن', opt_color_green: 'سبز روشن', opt_color_pink: 'صورتی روشن', btn_custom_wallpaper: 'سفارشی...', opt_font_inter: 'استاندارد (Inter)', opt_font_courier: 'ماشین تحریر', opt_font_georgia: 'ظریف (Serif)', opt_font_comic: 'غیررسمی (Comic)' },
        ar: { lbl_font_family: 'نوع الخط', lbl_font_color: 'لون الخط (نصك الخاص)', opt_color_default: 'افتراضي (أبيض)', opt_color_blue: 'أزرق فاتح', opt_color_green: 'أخضر فاتح', opt_color_pink: 'وردي فاتح', btn_custom_wallpaper: 'مخصص...', opt_font_inter: 'قياسي (Inter)', opt_font_courier: 'آلة كاتبة', opt_font_georgia: 'أنيق (Serif)', opt_font_comic: 'غير رسمي (Comic)' },
        tr: { lbl_font_family: 'Yazı Tipi', lbl_font_color: 'Yazı Rengi (Kendi Metniniz)', opt_color_default: 'Varsayılan (Beyaz)', opt_color_blue: 'Açık Mavi', opt_color_green: 'Açık Yeşil', opt_color_pink: 'Açık Pembe', btn_custom_wallpaper: 'Özel...', opt_font_inter: 'Standart (Inter)', opt_font_courier: 'Daktilo', opt_font_georgia: 'Zarif (Serif)', opt_font_comic: 'Gündelik (Comic)' }
    };
    
    // Also re-apply the previous translations because the regex replacement failed for de, en, fa earlier
    const prevTrans = {
        de: { tab_design: 'Design', lbl_bio: 'Info / Über mich', lbl_wallpaper: 'Chat-Hintergrundbild', btn_change_wallpaper: 'Bild auswählen', btn_remove_wallpaper: 'Entfernen', lbl_font_size: 'Schriftgröße', opt_font_small: 'Klein', opt_font_normal: 'Normal', opt_font_large: 'Groß', ctx_delete_for_me: 'Für mich löschen', ctx_msg_info: 'Nachrichten-Info', msg_read_at: 'Gelesen am: ', msg_unread: 'Noch nicht gelesen', msg_read_unknown: 'Gelesen (kein genauer Zeitpunkt verfügbar)', dlg_delete_title: 'Nachricht löschen?', dlg_delete_for_all: 'Für alle löschen', dlg_cancel: 'Abbrechen' },
        en: { tab_design: 'Design', lbl_bio: 'About / Info', lbl_wallpaper: 'Chat Wallpaper', btn_change_wallpaper: 'Select Image', btn_remove_wallpaper: 'Remove', lbl_font_size: 'Font Size', opt_font_small: 'Small', opt_font_normal: 'Normal', opt_font_large: 'Large', ctx_delete_for_me: 'Delete for me', ctx_msg_info: 'Message Info', msg_read_at: 'Read at: ', msg_unread: 'Not read yet', msg_read_unknown: 'Read (no exact time available)', dlg_delete_title: 'Delete message?', dlg_delete_for_all: 'Delete for everyone', dlg_cancel: 'Cancel' },
        fa: { tab_design: 'طراحی', lbl_bio: 'درباره من', lbl_wallpaper: 'تصویر زمینه چت', btn_change_wallpaper: 'انتخاب تصویر', btn_remove_wallpaper: 'حذف', lbl_font_size: 'اندازه فونت', opt_font_small: 'کوچک', opt_font_normal: 'معمولی', opt_font_large: 'بزرگ', ctx_delete_for_me: 'حذف برای من', ctx_msg_info: 'اطلاعات پیام', msg_read_at: 'خوانده شده در: ', msg_unread: 'هنوز خوانده نشده', msg_read_unknown: 'خوانده شده (زمان دقیق در دسترس نیست)', dlg_delete_title: 'حذف پیام؟', dlg_delete_for_all: 'حذف برای همه', dlg_cancel: 'لغو' },
        ar: { tab_design: 'التصميم', lbl_bio: 'حول / معلومات', lbl_wallpaper: 'خلفية الدردشة', btn_change_wallpaper: 'اختر صورة', btn_remove_wallpaper: 'إزالة', lbl_font_size: 'حجم الخط', opt_font_small: 'صغير', opt_font_normal: 'عادي', opt_font_large: 'كبير', ctx_delete_for_me: 'حذف بالنسبة لي', ctx_msg_info: 'معلومات الرسالة', msg_read_at: 'قرأ في: ', msg_unread: 'لم تقرأ بعد', msg_read_unknown: 'قرأ (لا يوجد وقت دقيق)', dlg_delete_title: 'حذف الرسالة؟', dlg_delete_for_all: 'حذف للجميع', dlg_cancel: 'إلغاء' },
        tr: { tab_design: 'Tasarım', lbl_bio: 'Hakkımda / Bilgi', lbl_wallpaper: 'Sohbet Duvar Kağıdı', btn_change_wallpaper: 'Resim Seç', btn_remove_wallpaper: 'Kaldır', lbl_font_size: 'Yazı Tipi Boyutu', opt_font_small: 'Küçük', opt_font_normal: 'Normal', opt_font_large: 'Büyük', ctx_delete_for_me: 'Benim için sil', ctx_msg_info: 'Mesaj Bilgisi', msg_read_at: 'Okunma zamanı: ', msg_unread: 'Henüz okunmadı', msg_read_unknown: 'Okundu (kesin zaman yok)', dlg_delete_title: 'Mesaj silinsin mi?', dlg_delete_for_all: 'Herkes için sil', dlg_cancel: 'İptal' }
    };

    ['de', 'en', 'fa', 'ar', 'tr'].forEach(lang => {
        if(window.TRANSLATIONS && window.TRANSLATIONS[lang]) {
            Object.assign(window.TRANSLATIONS[lang], prevTrans[lang], extraTrans[lang]);
        }
    
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

});
}

// Ensure translations are applied dynamically
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(typeof applyTranslation === 'function') applyTranslation(window.currentLang || 'de');
    }, 1000);
});

// Re-apply when settings tab is opened to be safe
const designTabBtn = document.querySelector('[data-tab="tab-design"]');
if (designTabBtn) {
    designTabBtn.addEventListener('click', () => {
        if(typeof applyTranslation === 'function') applyTranslation(window.currentLang || 'de');
    });
}


// --- Font Family Logic ---
const fontFamilySelect = document.getElementById('setting-font-family');
function applyFontFamily(family) {
    let styleEl = document.getElementById('custom-font-family-style');
    if(!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-font-family-style';
        document.head.appendChild(styleEl);
    }
    if (family === 'Inter') {
        styleEl.innerHTML = '';
    } else {
        styleEl.innerHTML = `.msg-sent .msg-bubble, .message.sent .message-bubble, #message-input { font-family: ${family} !important; }`;
    }
}
const savedFontFamily = localStorage.getItem('doori_font_family') || 'Inter';
applyFontFamily(savedFontFamily);
if(fontFamilySelect) {
    fontFamilySelect.value = savedFontFamily;
    fontFamilySelect.addEventListener('change', function(e) {
        const val = e.target.value;
        localStorage.setItem('doori_font_family', val);
        applyFontFamily(val);
    });
}

// --- Font Color Logic (for own messages) ---
const fontColorSelect = document.getElementById('setting-font-color');
function applyFontColor(color) {
    let styleEl = document.getElementById('custom-font-color-style');
    if(!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-font-color-style';
        document.head.appendChild(styleEl);
    }
    if(color === 'default') {
        styleEl.innerHTML = '';
    } else {
        styleEl.innerHTML = `.msg-sent .msg-bubble, .message.sent .message-bubble, #message-input { color: ${color} !important; }`;
    }
}
const savedFontColor = localStorage.getItem('doori_font_color') || 'default';
applyFontColor(savedFontColor);
if(fontColorSelect) {
    fontColorSelect.value = savedFontColor;
    fontColorSelect.addEventListener('change', function(e) {
        const val = e.target.value;
        localStorage.setItem('doori_font_color', val);
        applyFontColor(val);
    });
}

// --- Predefined Wallpaper Logic ---
window.selectPredefinedWallpaper = function(filename) {
    try {
        localStorage.setItem('doori_wallpaper', filename);
        if(typeof applyWallpaper === 'function') {
            applyWallpaper(filename);
        }
    } catch(e) {}
};

// ====== PHASE 1.3: GROUP TRANSLATIONS ======
if (window.TRANSLATIONS) {
    const tAdd = {
        de: { lbl_font_group: 'Schrift (Eigener Text)', lbl_bio: 'Info / Über mich', lbl_font_color: 'Farbe', lbl_font_size: 'Größe' },
        en: { lbl_font_group: 'Font (Own Text)', lbl_bio: 'About / Info', lbl_font_color: 'Color', lbl_font_size: 'Size' },
        fa: { lbl_font_group: 'فونت (متن خود)', lbl_bio: 'درباره من', lbl_font_color: 'رنگ', lbl_font_size: 'اندازه' },
        ar: { lbl_font_group: 'الخط (نصك الخاص)', lbl_bio: 'حول / معلومات', lbl_font_color: 'اللون', lbl_font_size: 'الحجم' },
        tr: { lbl_font_group: 'Yazı (Kendi Metniniz)', lbl_bio: 'Hakkımda / Bilgi', lbl_font_color: 'Renk', lbl_font_size: 'Boyut' }
    };
    ['de', 'en', 'fa', 'ar', 'tr'].forEach(lang => {
        if(window.TRANSLATIONS[lang]) {
            Object.assign(window.TRANSLATIONS[lang], tAdd[lang]);
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if(typeof applyTranslation === 'function') applyTranslation(window.currentLang || 'de'); }, 1500);
    
    const themeSelect = document.getElementById('setting-theme-mode');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            localStorage.setItem('doori_theme_mode', e.target.value);
            window.applyTheme();
        });
    }
    
    // Initial call
    window.applyTheme();
});

// --- Theme & Light/Dark Mode Logic ---
let autoThemeInterval = null;

window.applyTheme = function() {
    const mode = localStorage.getItem('doori_theme_mode') || 'dark'; // Default to dark
    const select = document.getElementById('setting-theme-mode');
    if(select) select.value = mode;

    if (mode === 'light') {
        document.body.classList.add('light-mode');
        if(autoThemeInterval) clearInterval(autoThemeInterval);
    } else if (mode === 'dark') {
        document.body.classList.remove('light-mode');
        if(autoThemeInterval) clearInterval(autoThemeInterval);
    } else if (mode === 'auto') {
        checkAutoTheme();
        if(!autoThemeInterval) autoThemeInterval = setInterval(checkAutoTheme, 5 * 60 * 1000); // 5 mins
    }
};

window.checkAutoTheme = async function() {
    let lat = localStorage.getItem('themeLat');
    let lng = localStorage.getItem('themeLng');

    if (!lat || !lng) {
        if ("geolocation" in navigator) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
                localStorage.setItem('themeLat', lat);
                localStorage.setItem('themeLng', lng);
            } catch(e) {
                console.error("Geolocation failed", e);
                // Fallback to light mode if location fails
                document.body.classList.add('light-mode');
                return;
            }
        } else {
            document.body.classList.add('light-mode');
            return;
        }
    }

    try {
        const d = new Date();
        const dateStr = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
        const cacheKey = `sunset_${dateStr}`;
        let sunsetData = localStorage.getItem(cacheKey);

        if (!sunsetData) {
            const res = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`);
            const data = await res.json();
            if(data.status === 'OK') {
                sunsetData = JSON.stringify({
                    sunrise: data.results.sunrise,
                    sunset: data.results.sunset
                });
                localStorage.setItem(cacheKey, sunsetData);
            }
        }

        if (sunsetData) {
            const parsed = JSON.parse(sunsetData);
            const sunriseTime = new Date(parsed.sunrise).getTime();
            const sunsetTime = new Date(parsed.sunset).getTime();
            const now = Date.now();

            if (now >= sunriseTime && now < sunsetTime) {
                // Daytime -> Light mode
                document.body.classList.add('light-mode');
            } else {
                // Nighttime -> Dark mode
                document.body.classList.remove('light-mode');
            }
        }
    } catch(e) {
        console.error("Failed to check auto theme", e);
        document.body.classList.add('light-mode'); // default fallback
    }
};


