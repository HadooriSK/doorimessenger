document.addEventListener('DOMContentLoaded', () => {
    window.logDebug = function(msg) {
        const d = document.getElementById('debug-log');
        if (d) d.innerText += '\n' + msg;
    };
    if(window.logDebug) window.logDebug('App v300 initialized');
    // --- State & DOM Elements ---
    let currentUser = null;
    let users = window.users || new Map(); // username -> profile { avatarUrl, status, lastSeen }
    window.users = users;
    let chatData = window.chatData || {
        personal: [{ id: 'saved', name: 'Gespeichertes', type: 'saved' }],
        rooms: [{ id: 'general', name: 'Allgemein', type: 'room' }],
        contacts: [],
        active_chats: []
    };
    window.chatData = chatData;
    let messages = window.messages || new Map(); // chatId -> [msgObj]
    window.messages = messages;
    let currentChat = null;
    try {
        Object.defineProperty(window, 'currentChat', {
            get() { return currentChat; },
            set(v) { currentChat = v; },
            configurable: true
        });
    } catch(e) { window.currentChat = currentChat; }

const chatLayout = document.querySelector('.chat-container');
const prefersSplitMessenger = () => window.matchMedia('(min-width: 900px)').matches;
function syncMessengerLayout(showChat = !!currentChat) {
    const start = document.getElementById('start-page');
    const chat = document.getElementById('chat-page');
    const split = prefersSplitMessenger();
    chatLayout?.classList.toggle('split-view', split);
    chatLayout?.classList.toggle('awaiting-chat', split && !showChat);
    if (split) {
        start.classList.add('active');
        chat.classList.add('active');
    } else if (!showChat) {
        start.classList.add('active');
        chat.classList.remove('active');
    }
}
window.addEventListener('resize', () => syncMessengerLayout(!!currentChat));
syncMessengerLayout(false);

document.getElementById('back-to-list-btn').addEventListener('click', () => {
    document.getElementById('chat-page').classList.remove('active');
    document.getElementById('start-page').classList.add('active');
    chatLayout?.classList.remove('split-view');
    currentChat = null;
    syncMessengerLayout(false);
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
    let mentionedChats = new Set();
    let activeChatFilter = 'all';
    const PAGE_SIZE = 40;
    const visibleMessageLimits = new Map();
    window.PAGE_SIZE = PAGE_SIZE;
    window.visibleMessageLimits = visibleMessageLimits;
    window.starredMessages = [];
    window.isMessageStarred = function(msgId) {
        return Array.isArray(window.starredMessages) && window.starredMessages.some(m => String(m.id) === String(msgId));
    };
    window.toggleStarMessage = function(msg) {
        if (!window.starredMessages) window.starredMessages = [];
        const idx = window.starredMessages.findIndex(m => String(m.id) === String(msg.id));
        if (idx >= 0) {
            window.starredMessages.splice(idx, 1);
        } else {
            window.starredMessages.push({
                id: msg.id,
                chatId: currentChat ? currentChat.id : (msg.chatId || ''),
                chatType: currentChat ? currentChat.type : (msg.chatType || 'dm'),
                chatName: currentChat ? currentChat.name : (msg.sender_username || ''),
                sender: msg.sender_username,
                text: msg.text || '',
                mediaType: msg.mediaType || null,
                mediaUrl: msg.mediaUrl || null,
                timestamp: msg.timestamp || Date.now()
            });
        }
        if (typeof saveUserData === 'function') saveUserData();
        if (currentChat) renderMessages();
    };

    const screens = { login: document.getElementById('login-screen'), chat: document.getElementById('chat-screen') };
    const loginForm = document.getElementById('login-form'); const usernameInput = document.getElementById('username-input'); const emailInput = document.getElementById('email-input'); const passwordInput = document.getElementById('password-input'); const idInput = document.getElementById('id-input'); const idHint = document.getElementById('id-hint'); const loginSubmitBtn = document.getElementById('login-submit-btn'); const loginError = document.getElementById('login-error');
    const tabLogin = document.getElementById('tab-login'); const tabRegister = document.getElementById('tab-register'); const verificationInfo = document.getElementById('verification-info');
    const forgotPasswordLink = document.getElementById('forgot-password-link'); const forgotUsernameIdLink = document.getElementById('forgot-username-id-link'); const resendVerificationLink = document.getElementById('resend-verification-link'); const resendVerificationContainer = document.getElementById('resend-verification-container'); const rememberMeCheckbox = document.getElementById('remember-me-checkbox'); const rememberMeContainer = document.getElementById('remember-me-container');
    let audioPlayer = null;
    let isRegisterMode = false;
    let isRecoveryMode = false;

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

    window.getAllowedProfilePics = function(username, profileData) {
        if (!profileData) return [];
        let pics = (profileData.profilePics && profileData.profilePics.length > 0) ? profileData.profilePics : (profileData.avatarUrl ? [profileData.avatarUrl] : []);
        if (pics.length === 0) return [];
        
        if (username.toLowerCase() === currentUser.toLowerCase()) return pics;
        
        const vis = profileData.avatarVisibility || 'all';
        if (vis === 'none') return [];
        if (vis === 'contacts') {
            const isContact = chatData.contacts.some(c => c.id.toLowerCase() === username.toLowerCase());
            if (!isContact) return [];
        }
        return pics;
    };
    
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
    const chatMoreBtn = document.getElementById('chat-more-btn');
    const dropdownAddContact = document.getElementById('dropdown-add-contact');
    const dropdownMuteUser = document.getElementById('dropdown-mute-user');
    const dropdownClearChat = document.getElementById('dropdown-clear-chat');
    const dropdownBlockUser = document.getElementById('dropdown-block-user');
    const detailsStatusMirror = document.getElementById('details-chat-status');
    if (currentChatStatus && detailsStatusMirror && typeof MutationObserver !== 'undefined') {
        new MutationObserver(() => { detailsStatusMirror.textContent = currentChatStatus.textContent; })
            .observe(currentChatStatus, { childList: true, characterData: true, subtree: true });
    }
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
    const GIFS = ['https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', 'https://media.giphy.com/media/10yXFkBJ0MwGQ0/giphy.gif', 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', 'https://media.giphy.com/media/2rtQMJvhzOnRe/giphy.gif', 'https://media.giphy.com/media/l1J9u3TZfpmeCEkZa/giphy.gif', 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif', 'https://media.giphy.com/media/nFjDu1LjEADh6/giphy.gif', 'https://media.giphy.com/media/98maV70oAqIZtEYqB4/giphy.gif', 'https://media.giphy.com/media/jPAdK8Nfzzwt2/giphy.gif', 'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif'];

    const TRANSLATIONS = {
        de: { login_title: 'Doori Messenger', login_subtitle: 'Bitte wähle einen Benutzernamen.', login_btn: 'Weiter', sec_personal: 'Persönlich', chat_saved: 'Gespeichertes', sec_rooms: 'Gruppen', sec_chats: 'Chats', chat_general: 'Allgemein', sec_contacts: 'Kontakte', sec_calls: 'Anrufe', status_online: 'Online', btn_block: 'Blockieren', btn_unblock: 'Entblocken', err_blocked: 'Du hast diesen Kontakt blockiert.', err_channel: 'Nur Administratoren können hier schreiben.', placeholder_msg: 'Nachricht schreiben...', placeholder_search: 'Benutzer suchen (@name)...', ttl_off: '🕒 Aus', btn_cancel: 'Abbrechen', btn_save: 'Speichern', btn_stop_send: '⏹ Senden', modal_new_room: 'Neuer Raum', lbl_room_name: 'Name der Gruppe / des Kanals', opt_group: 'Gruppe (Jeder kann schreiben)', opt_channel: 'Kanal (Nur Admins)', btn_create: 'Erstellen', modal_settings: 'Einstellungen', tab_profile: 'Profil', tab_privacy: 'Privatsphäre', tab_chats: 'Chats', btn_change_pic: 'Bild ändern', lbl_language: 'Sprache / Language', lbl_last_seen: '"Zuletzt online" anzeigen', lbl_read_receipts: 'Lesebestätigungen', lbl_searchable: 'In der Suche auffindbar sein', lbl_avatar_visibility: 'Profilbild sichtbar für', opt_vis_all: 'Alle', opt_vis_contacts: 'Nur Kontakte', opt_vis_none: 'Niemand', lbl_sound: 'Benachrichtigungstöne', lbl_storage_used: 'Lokaler Speicher genutzt:', btn_clear_cache: 'Cache leeren', btn_logout: 'Ausloggen', lbl_call_privacy: 'Wer darf mich anrufen?', err_calls_blocked: 'Dieser Benutzer hat Anrufe blockiert.', err_calls_contacts: 'Dieser Benutzer erlaubt Anrufe nur von Kontakten.', ctx_reply: 'Antworten', ctx_copy: 'Kopieren', ctx_edit: 'Bearbeiten', ctx_select: 'Auswählen', ctx_forward: 'Weiterleiten', ctx_pin: 'Anheften', ctx_unpin: 'Loslösen', ctx_share: 'Teilen', ctx_delete: 'Löschen', ctx_delete_for_me: 'Für mich löschen', ctx_msg_info: 'Nachrichten-Info', msg_read_at: 'Gelesen am: ', msg_unread: 'Noch nicht gelesen', msg_read_unknown: 'Gelesen (kein genauer Zeitpunkt verfügbar)', dlg_delete_title: 'Nachricht löschen?', dlg_delete_for_all: 'Für alle löschen', dlg_cancel: 'Abbrechen', lbl_theme_mode: 'App Design', opt_theme_dark: 'Immer Dunkel', opt_theme_light: 'Immer Hell', opt_theme_auto: 'Automatisch (Sonnenauf-/Untergang)', err_too_many_avatars: 'Du kannst maximal 5 Profilbilder haben.', err_file_too_large: 'Jedes GIF darf maximal 192 KB und 10 Sekunden lang sein.', err_too_many_gifs: 'Jeder Benutzer darf maximal 10 GIFs hinzufügen.', btn_add_pic: 'Bild hinzufügen' },
        en: { login_title: 'Doori Messenger', login_subtitle: 'Please choose a username.', login_btn: 'Continue', sec_personal: 'Personal', chat_saved: 'Saved Messages', sec_rooms: 'Groups', sec_chats: 'Chats', chat_general: 'General', sec_contacts: 'Contacts', sec_calls: 'Calls', status_online: 'Online', btn_block: 'Block', btn_unblock: 'Unblock', err_blocked: 'You blocked this contact.', err_channel: 'Only administrators can post here.', placeholder_msg: 'Write a message...', placeholder_search: 'Search user (@name)...', ttl_off: '🕒 Off', btn_cancel: 'Cancel', btn_save: 'Save', btn_stop_send: '⏹ Send', modal_new_room: 'New Room', lbl_room_name: 'Group / Channel Name', opt_group: 'Group (Anyone can write)', opt_channel: 'Channel (Admins only)', btn_create: 'Create', modal_settings: 'Settings', tab_profile: 'Profile', tab_privacy: 'Privacy', tab_chats: 'Chats', btn_change_pic: 'Change Picture', lbl_language: 'Language', lbl_last_seen: 'Show "Last seen"', lbl_read_receipts: 'Read Receipts', lbl_searchable: 'Discoverable in search', lbl_avatar_visibility: 'Profile picture visible for', opt_vis_all: 'Everyone', opt_vis_contacts: 'Contacts Only', opt_vis_none: 'Nobody', lbl_sound: 'Notification Sounds', lbl_storage_used: 'Local Storage used:', btn_clear_cache: 'Clear Cache', btn_logout: 'Logout', lbl_call_privacy: 'Who can call me?', err_calls_blocked: 'This user has blocked calls.', err_calls_contacts: 'This user only allows calls from contacts.', ctx_reply: 'Reply', ctx_copy: 'Copy', ctx_edit: 'Edit', ctx_select: 'Select', ctx_forward: 'Forward', ctx_pin: 'Pin', ctx_unpin: 'Unpin', ctx_share: 'Share', ctx_delete: 'Delete', ctx_delete_for_me: 'Delete for me', ctx_msg_info: 'Message Info', msg_read_at: 'Read at: ', msg_unread: 'Not read yet', msg_read_unknown: 'Read (no exact time available)', dlg_delete_title: 'Delete message?', dlg_delete_for_all: 'Delete for everyone', dlg_cancel: 'Cancel', lbl_theme_mode: 'App Theme', opt_theme_dark: 'Always Dark', opt_theme_light: 'Always Light', opt_theme_auto: 'Automatic (Sunrise/Sunset)', err_too_many_avatars: 'You can have a maximum of 5 profile pictures.', err_file_too_large: 'Each GIF must be max 192 KB and 10 seconds long.', err_too_many_gifs: 'Each user can add a maximum of 10 GIFs.', btn_add_pic: 'Add Picture' },
        fa: { login_title: 'دوری مسنجر', login_subtitle: 'لطفاً یک نام کاربری انتخاب کنید.', login_btn: 'ادامه', sec_personal: 'شخصی', chat_saved: 'پیام‌های ذخیره‌شده', sec_rooms: 'گروه‌ها', sec_chats: 'گفتگوها', chat_general: 'عمومی', sec_contacts: 'مخاطبین', sec_calls: 'تماس‌ها', status_online: 'آنلاین', btn_block: 'مسدود کردن', btn_unblock: 'رفع مسدودیت', err_blocked: 'شما این مخاطب را مسدود کرده‌اید.', err_channel: 'فقط مدیران می‌توانند اینجا پیام بفرستند.', placeholder_msg: 'پیام بنویسید...', placeholder_search: 'جستجوی کاربر (نام@)...', ttl_off: '🕒 خاموش', btn_cancel: 'لغو', btn_save: 'ذخیره', btn_stop_send: '⏹ ارسال', modal_new_room: 'اتاق جدید', lbl_room_name: 'نام گروه / کانال', opt_group: 'گروه (همه می‌توانند بنویسند)', opt_channel: 'کانال (فقط مدیران)', btn_create: 'ایجاد', modal_settings: 'تنظیمات', tab_profile: 'نمایه', tab_privacy: 'حریم خصوصی', tab_chats: 'گفتگوها', btn_change_pic: 'تغییر تصویر', lbl_language: 'زبان', lbl_last_seen: 'نمایش "آخرین بازدید"', lbl_read_receipts: 'رسید خوانده‌شدن', lbl_searchable: 'قابل جستجو بودن', lbl_avatar_visibility: 'نمایش عکس پروفایل برای', opt_vis_all: 'همه', opt_vis_contacts: 'فقط مخاطبین', opt_vis_none: 'هیچ‌کس', lbl_sound: 'صداهای اعلان', lbl_storage_used: 'فضای ذخیره‌سازی استفاده‌شده:', btn_clear_cache: 'پاک کردن حافظه پنهان', btn_logout: 'خروج', lbl_call_privacy: 'چه کسی می‌تواند با من تماس بگیرد؟', err_calls_blocked: 'این کاربر تماس‌ها را مسدود کرده است.', err_calls_contacts: 'این کاربر فقط اجازه تماس از طرف مخاطبین را می‌دهد.', ctx_reply: 'پاسخ دادن', ctx_copy: 'کپی کردن', ctx_edit: 'ویرایش', ctx_select: 'انتخاب', ctx_forward: 'ارسال مجدد', ctx_pin: 'سنجاق کردن', ctx_unpin: 'برداشتن سنجاق', ctx_share: 'اشتراک گذاری', ctx_delete: 'حذف', ctx_delete_for_me: 'حذف برای من', ctx_msg_info: 'اطلاعات پیام', msg_read_at: 'خوانده شده در: ', msg_unread: 'هنوز خوانده نشده', msg_read_unknown: 'خوانده شده (زمان دقیق در دسترس نیست)', dlg_delete_title: 'حذف پیام؟', dlg_delete_for_all: 'حذف برای همه', dlg_cancel: 'لغو', lbl_theme_mode: 'ظاهر برنامه', opt_theme_dark: 'همیشه تاریک', opt_theme_light: 'همیشه روشن', opt_theme_auto: 'خودکار (طلوع/غروب خورشید)', err_too_many_avatars: 'شما می‌توانید حداکثر 5 عکس پروفایل داشته باشید.', err_file_too_large: 'هر گیف باید حداکثر 1 مگابایت و 10 ثانیه طول داشته باشد.', err_too_many_gifs: 'هر کاربر می‌تواند حداکثر 10 گیف اضافه کند.', btn_add_pic: 'افزودن تصویر' },
        ar: { login_title: 'دوري ماسنجر', login_subtitle: 'الرجاء اختيار اسم مستخدم.', login_btn: 'متابعة', sec_personal: 'شخصی', chat_saved: 'الرسائل المحفوظة', sec_rooms: 'المجموعات', sec_chats: 'الدردشات', chat_general: 'عام', sec_contacts: 'جهات الاتصال', sec_calls: 'المكالمات', status_online: 'متصل', btn_block: 'حظر', btn_unblock: 'إلغاء الحظر', err_blocked: 'لقد قمت بحظر جهة الاتصال هذه.', err_channel: 'فقط المسؤولون يمكنهم النشر هنا.', placeholder_msg: 'اكتب رسالة...', placeholder_search: 'ابحث عن مستخدم (اسم@)...', ttl_off: '🕒 إيقاف', btn_cancel: 'إلغاء', btn_save: 'حفظ', btn_stop_send: '⏹ إرسال', modal_new_room: 'غرفة جديدة', lbl_room_name: 'اسم المجموعة / القناة', opt_group: 'مجموعة (يمكن للجميع الكتابة)', opt_channel: 'قناة (للمسؤولين فقط)', btn_create: 'إنشاء', modal_settings: 'الإعدادات', tab_profile: 'الملف الشخصي', tab_privacy: 'الخصوصية', tab_chats: 'الدردشات', btn_change_pic: 'تغيير الصورة', lbl_language: 'اللغة', lbl_last_seen: 'إظهار "آخر ظهور"', lbl_read_receipts: 'مؤشرات قراءة الرسائل', lbl_searchable: 'قابل للبحث', lbl_avatar_visibility: 'صورة الملف الشخصي مرئية لـ', opt_vis_all: 'الجميع', opt_vis_contacts: 'جهات الاتصال فقط', opt_vis_none: 'لا أحد', lbl_sound: 'أصوات الإشعارات', lbl_storage_used: 'مساحة التخزين المستخدمة:', btn_clear_cache: 'مسح ذاكرة التخزين المؤقت', btn_logout: 'تسجيل خروج', lbl_call_privacy: 'من يمكنه الاتصال بي؟', err_calls_blocked: 'قام هذا المستخدم بحظر المكالمات.', err_calls_contacts: 'يسمح هذا المستخدم بالمكالمات من جهات الاتصال فقط.', ctx_reply: 'رد', ctx_copy: 'نسخ', ctx_edit: 'تعديل', ctx_select: 'تحديد', ctx_forward: 'تحويل', ctx_pin: 'تثبيت', ctx_unpin: 'إلغاء التثبيت', ctx_share: 'مشاركة', ctx_delete: 'حذف', ctx_delete_for_me: 'حذف بالنسبة لي', ctx_msg_info: 'معلومات الرسالة', msg_read_at: 'قرأ في: ', msg_unread: 'لم تقرأ بعد', msg_read_unknown: 'قرأ (لا يوجد وقت دقيق)', dlg_delete_title: 'حذف الرسالة؟', dlg_delete_for_all: 'حذف للجميع', dlg_cancel: 'إلغاء', lbl_theme_mode: 'مظهر التطبيق', opt_theme_dark: 'دائماً داكن', opt_theme_light: 'دائماً فاتح', opt_theme_auto: 'تلقائي (شروق/غروب الشمس)', err_too_many_avatars: 'يمكنك الحصول على 5 صور للملف الشخصي كحد أقصى.', err_file_too_large: 'يجب أن يكون كل ملف GIF بحد أقصى 1 ميغابايت وطوله 10 ثوانٍ.', err_too_many_gifs: 'يمكن لكل مستخدم إضافة 10 ملفات GIF كحد أقصى.', btn_add_pic: 'إضافة صورة' },
        tr: { login_title: 'Doori Messenger', login_subtitle: 'Lütfen bir kullanıcı adı seçin.', login_btn: 'Devam et', sec_personal: 'Kişisel', chat_saved: 'Kaydedilen Mesajlar', sec_rooms: 'Gruplar', sec_chats: 'Sohbetler', chat_general: 'Genel', sec_contacts: 'Kişiler', sec_calls: 'Aramalar', status_online: 'Çevrimiçi', btn_block: 'Engelle', btn_unblock: 'Engeli Kaldır', err_blocked: 'Bu kişiyi engellediniz.', err_channel: 'Buraya yalnızca yöneticiler yazabilir.', placeholder_msg: 'Bir mesaj yazın...', placeholder_search: 'Kullanıcı ara (@isim)...', ttl_off: '🕒 Kapalı', btn_cancel: 'İptal', btn_save: 'Kaydet', btn_stop_send: '⏹ Gönder', modal_new_room: 'Yeni Oda', lbl_room_name: 'Grup / Kanal Adı', opt_group: 'Grup (Herkes yazabilir)', opt_channel: 'Kanal (Sadece yöneticiler)', btn_create: 'Oluştur', modal_settings: 'Ayarlar', tab_profile: 'Profil', tab_privacy: 'Gizlilik', tab_chats: 'Sohbetler', btn_change_pic: 'Resmi Değiştir', lbl_language: 'Dil', lbl_last_seen: '"Son görülme" durumunu göster', lbl_read_receipts: 'Okundu Bilgisi', lbl_searchable: 'Aramada bulunabilir ol', lbl_avatar_visibility: 'Profil resmini görebilecekler', opt_vis_all: 'Herkes', opt_vis_contacts: 'Sadece Kişiler', opt_vis_none: 'Hiç kimse', lbl_sound: 'Bildirim Sesleri', lbl_storage_used: 'Kullanılan Yerel Depolama:', btn_clear_cache: 'Önbelleği Temizle', btn_logout: 'Çıkış Yap', lbl_call_privacy: 'Beni kimler arayabilir?', err_calls_blocked: 'Bu kullanıcı aramaları engelledi.', err_calls_contacts: 'Bu kullanıcı yalnızca kişilerden gelen aramalara izin veriyor.', ctx_reply: 'Cevapla', ctx_copy: 'Kopyala', ctx_edit: 'Düzenle', ctx_select: 'Seç', ctx_forward: 'İlet', ctx_pin: 'Sabitle', ctx_unpin: 'Sabitlemeyi Kaldır', ctx_share: 'Paylaş', ctx_delete: 'Sil', ctx_delete_for_me: 'Benim için sil', ctx_msg_info: 'Mesaj Bilgisi', msg_read_at: 'Okunma zamanı: ', msg_unread: 'Henüz okunmadı', msg_read_unknown: 'Okundu (kesin zaman yok)', dlg_delete_title: 'Mesaj silinsin mi?', dlg_delete_for_all: 'Herkes için sil', dlg_cancel: 'İptal', lbl_theme_mode: 'Uygulama Teması', opt_theme_dark: 'Her Zaman Koyu', opt_theme_light: 'Her Zaman Açık', opt_theme_auto: 'Otomatik (Gündoğumu/Günbatımı)', err_too_many_avatars: 'En fazla 5 profil resmine sahip olabilirsiniz.', err_file_too_large: 'Her bir GIF en fazla 1 MB ve 10 saniye uzunluğunda olmalıdır.', err_too_many_gifs: 'Her kullanıcı en fazla 10 GIF ekleyebilir.', btn_add_pic: 'Resim Ekle' }
    };
    window.TRANSLATIONS = TRANSLATIONS;

    Object.assign(TRANSLATIONS.de, { lbl_font_group: 'Schrift (Eigener Text)', ph_bio_placeholder: 'Ich bin neu hier...', lbl_font_preview: 'Vorschau', ph_preview_text: 'Hey, ich nutze Doori!', lbl_bio: 'Info / Über mich', lbl_font_color: 'Farbe', lbl_font_size: 'Größe', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Schreibmaschine', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Locker (Comic)', btn_custom_wallpaper: 'Eigene...', opt_color_pink: 'Hellrosa', opt_color_green: 'Hellgrün', opt_color_blue: 'Hellblau', opt_color_default: 'Standard (Weiß)', lbl_font_family: 'Schriftart', lbl_wallpaper: 'Chat-Hintergrundbild', btn_change_wallpaper: 'Bild auswählen', btn_remove_wallpaper: 'Entfernen', opt_font_small: 'Klein', opt_font_normal: 'Normal', opt_font_large: 'Groß',  tab_design: "Design", lbl_font_size: "Schriftgröße", lbl_emoji: "Smilies", lbl_gif: "GIF", lbl_doodle: "Doodle zeichnen", lbl_file: "Datei senden", lbl_location: "Standort teilen", msg_location: "Standort ansehen",  ph_search_content: "Inhalte durchsuchen...", ph_id: "ID", ph_search: "Suchen...", ph_search_user: "Benutzer suchen (@name)...",  lbl_remember_me: "Angemeldet bleiben",  err_select_chat: "Bitte wähle zuerst einen Chat aus.", err_group_not_found: "Diese Gruppe existiert nicht oder wurde gelöscht.", err_join_group: "Fehler beim Beitreten der Gruppe.", msg_copied_clipboard: "Text in die Zwischenablage kopiert! (Teilen wird auf diesem Gerät nicht nativ unterstützt)", err_send_msg: "Nachricht konnte nicht gesendet werden (Offline?).", err_feature_update: "Diese Funktion steht im nächsten Update zur Verfügung.", err_group_username_req: "Bitte gib einen Benutzernamen für die Gruppe ein (z.B. @meinegruppe).", err_username_invalid: "Der Benutzername darf keine Leerzeichen enthalten und muss mindestens 2 Zeichen lang sein.", err_username_taken: "Dieser Benutzername ist bereits von einem anderen Benutzer belegt.", err_group_username_taken: "Dieser Gruppen-Benutzername ist bereits vergeben. Bitte wähle einen anderen.", err_create_group: "Fehler beim Erstellen der Gruppe.", err_search_self: "Das bist du selbst!", err_user_not_found_privacy: "Benutzername nicht gefunden (Privatsphäre).", msg_added_contact: " wurde zu den Kontakten hinzugefügt!", err_already_contact: " ist bereits ein Kontakt.", err_user_not_found2: "Benutzername nicht gefunden.", err_search: "Fehler bei der Suche.", msg_group_deleted: "Die Gruppe existiert nicht mehr.", prompt_new_group_name: "Neuer Gruppenname:", prompt_new_desc: "Neue Beschreibung:",  lbl_group_call: 'Gruppenanruf', lbl_incoming_invite: 'Neue Gruppeneinladung...', lbl_add_members: 'Mitglieder hinzufügen', sec_group_info: 'Gruppeninfo', sec_members: 'Mitglieder', btn_add_member: 'Mitglied hinzufügen', lbl_group_name: 'Name der Gruppe', msg_invited_you: 'hat dich in die Gruppe eingeladen:', btn_accept: 'Annehmen', btn_decline: 'Ablehnen', msg_invite_accepted: 'Einladung angenommen', msg_invite_declined: 'Einladung abgelehnt', sys_user_joined: 'ist der Gruppe beigetreten', sys_user_left: 'hat die Gruppe verlassen', sys_user_removed: 'wurde aus der Gruppe entfernt', btn_leave_group: 'Gruppe verlassen', lbl_admin_options: 'Admin Optionen', btn_copy_invite_link: '🔗 Einladungslink kopieren', lbl_admins_only: 'Nur Admins dürfen schreiben', msg_admin_kicked: 'Der Admin hat dich aus der Gruppe entfernt.', msg_link_copied: 'Einladungslink kopiert!', msg_muted_in_group: 'Du wurdest in dieser Gruppe stummgeschaltet.', msg_readonly_group: 'Nur Admins dürfen in dieser Gruppe schreiben.', ctx_select: 'Auswählen', ctx_forward: 'Weiterleiten', ctx_pin: 'Anheften', ctx_unpin: 'Loslösen', msg_forwarded: 'Weitergeleitet', msg_pinned: 'Angeheftete Nachricht', modal_forward: 'Weiterleiten an...', btn_send_doodle: 'Als Bild senden', lbl_doodle_invite: 'Doodle Einladung', msg_clear_doodle: 'Wirklich alles löschen?', err_doodle_private_only: 'Doodle ist derzeit nur in privaten Chats verfügbar.', msg_doodle_rejected: 'Einladung abgelehnt.', doodle_title: 'Doodle Einladung', doodle_btn_accept: 'Mitzeichnen', doodle_btn_reject: 'Ablehnen', doodle_msg_accepted: 'Doodle Einladung angenommen', doodle_msg_closed: 'Doodle beendet', doodle_msg_rejected: 'Doodle Einladung abgelehnt', doodle_waiting: 'Wartet...', doodle_connecting: 'Verbunden...', doodle_rejected: 'Abgelehnt', title_minimize: 'Minimieren', title_maximize: 'Maximieren', title_close: 'Schließen', title_color: 'Farbe wählen', title_size: 'Stiftdicke', title_eraser: 'Radiergummi', title_clear: 'Alles löschen', doodle_session_with: 'Doodle Sitzung mit', doodle_connected: 'Verbunden', doodle_wants_to_draw: ' möchte mit dir zeichnen!' });
    Object.assign(TRANSLATIONS.en, { lbl_font_group: 'Font (Own Text)', ph_bio_placeholder: 'I am new here...', lbl_font_preview: 'Preview', ph_preview_text: 'Hey, I am using Doori!', lbl_bio: 'About / Info', lbl_font_color: 'Color', lbl_font_size: 'Size', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Typewriter', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Casual (Comic)', btn_custom_wallpaper: 'Custom...', opt_color_pink: 'Light Pink', opt_color_green: 'Light Green', opt_color_blue: 'Light Blue', opt_color_default: 'Default (White)', lbl_font_family: 'Font Family', lbl_wallpaper: 'Chat Wallpaper', btn_change_wallpaper: 'Select Image', btn_remove_wallpaper: 'Remove', opt_font_small: 'Small', opt_font_normal: 'Normal', opt_font_large: 'Large',  tab_design: "Design", lbl_font_size: "Font Size", lbl_emoji: "Emojis", lbl_gif: "GIF", lbl_doodle: "Draw Doodle", lbl_file: "Send File", lbl_location: "Share Location", msg_location: "View Location",  ph_search_content: "Search content...", ph_id: "ID", ph_search: "Search...", ph_search_user: "Search user (@name)...",  lbl_remember_me: "Remember me",  err_select_chat: "Please select a chat first.", err_group_not_found: "This group does not exist or was deleted.", err_join_group: "Error joining the group.", msg_copied_clipboard: "Text copied to clipboard!", err_send_msg: "Message could not be sent (Offline?).", err_feature_update: "This feature will be available in the next update.", err_group_username_req: "Please enter a username for the group (e.g. @mygroup).", err_username_invalid: "The username cannot contain spaces and must be at least 2 chars long.", err_username_taken: "This username is already taken by another user.", err_group_username_taken: "This group username is already taken. Please choose another one.", err_create_group: "Error creating the group.", err_search_self: "That is you!", err_user_not_found_privacy: "Username not found (Privacy).", msg_added_contact: " was added to your contacts!", err_already_contact: " is already a contact.", err_user_not_found2: "Username not found.", err_search: "Search failed.", msg_group_deleted: "The group no longer exists.", prompt_new_group_name: "New group name:", prompt_new_desc: "New description:",  lbl_group_call: 'Group Call', lbl_incoming_invite: 'New Group Invite...', lbl_add_members: 'Add members', sec_group_info: 'Group Info', sec_members: 'Members', btn_add_member: 'Add member', lbl_group_name: 'Group name', msg_invited_you: 'invited you to the group:', btn_accept: 'Accept', btn_decline: 'Decline', msg_invite_accepted: 'Invite accepted', msg_invite_declined: 'Invite declined', sys_user_joined: 'joined the group', sys_user_left: 'left the group', sys_user_removed: 'was removed from the group', btn_leave_group: 'Leave Group', lbl_admin_options: 'Admin Options', btn_copy_invite_link: '🔗 Copy Invite Link', lbl_admins_only: 'Only Admins can send messages', msg_admin_kicked: 'The Admin has removed you from the group.', msg_link_copied: 'Invite link copied!', msg_muted_in_group: 'You have been muted in this group.', msg_readonly_group: 'Only Admins can send messages in this group.', ctx_select: 'Select', ctx_forward: 'Forward', ctx_pin: 'Pin', ctx_unpin: 'Unpin', msg_forwarded: 'Forwarded', msg_pinned: 'Pinned Message', modal_forward: 'Forward to...', btn_send_doodle: 'Send as Image', lbl_doodle_invite: 'Doodle Invite', msg_clear_doodle: 'Clear everything?', err_doodle_private_only: 'Doodle is only available in private chats.', msg_doodle_rejected: 'Invite rejected.', doodle_title: 'Doodle Invite', doodle_btn_accept: 'Join', doodle_btn_reject: 'Decline', doodle_msg_accepted: 'Doodle Invite accepted', doodle_msg_closed: 'Doodle closed', doodle_msg_rejected: 'Doodle Invite rejected', doodle_waiting: 'Waiting...', doodle_connecting: 'Connecting...', doodle_rejected: 'Rejected', title_minimize: 'Minimize', title_maximize: 'Maximize', title_close: 'Close', title_color: 'Choose Color', title_size: 'Pen Size', title_eraser: 'Eraser', title_clear: 'Clear All', doodle_session_with: 'Doodle Session with', doodle_connected: 'Connected', doodle_wants_to_draw: ' wants to draw with you!' });
    Object.assign(TRANSLATIONS.fa, { lbl_font_group: 'فونت (متن خود)', ph_bio_placeholder: 'من اینجا جدید هستم...', lbl_font_preview: 'پیش‌نمایش', ph_preview_text: 'سلام، من از دوری استفاده می‌کنم!', lbl_bio: 'درباره من', lbl_font_color: 'رنگ', lbl_font_size: 'اندازه', opt_font_inter: 'استاندارد (Inter)', opt_font_courier: 'ماشین تحریر', opt_font_georgia: 'ظریف (Serif)', opt_font_comic: 'غیررسمی (Comic)', btn_custom_wallpaper: 'سفارشی...', opt_color_pink: 'صورتی روشن', opt_color_green: 'سبز روشن', opt_color_blue: 'آبی روشن', opt_color_default: 'پیش‌فرض (سفید)', lbl_font_family: 'نوع فونت', lbl_wallpaper: 'تصویر زمینه چت', btn_change_wallpaper: 'انتخاب تصویر', btn_remove_wallpaper: 'حذف', opt_font_small: 'کوچک', opt_font_normal: 'معمولی', opt_font_large: 'بزرگ',  tab_design: "طراحی", lbl_font_size: "اندازه فونت", lbl_emoji: "شکلک ها", lbl_gif: "گیف", lbl_doodle: "نقاشی کشیدن", lbl_file: "ارسال فایل", lbl_location: "اشتراک مکان", msg_location: "مشاهده مکان",  ph_search_content: "جستجوی محتوا...", ph_id: "شناسه", ph_search: "جستجو...", ph_search_user: "جستجوی کاربر (@name)...",  lbl_remember_me: "مرا به خاطر بسپار",  err_select_chat: "لطفاً ابتدا یک چت انتخاب کنید.", err_group_not_found: "این گروه وجود ندارد یا حذف شده است.", err_join_group: "خطا در پیوستن به گروه.", msg_copied_clipboard: "متن در کلیپ بورد کپی شد!", err_send_msg: "پیام ارسال نشد (آفلاین؟).", err_feature_update: "این قابلیت در بروزرسانی بعدی در دسترس خواهد بود.", err_group_username_req: "لطفا یک نام کاربری برای گروه وارد کنید (مثلا @mygroup).", err_username_invalid: "نام کاربری نمی‌تواند شامل فاصله باشد و باید حداقل 2 حرف داشته باشد.", err_username_taken: "این نام کاربری قبلاً توسط کاربر دیگری گرفته شده است.", err_group_username_taken: "این نام کاربری گروه قبلاً گرفته شده است. لطفاً یکی دیگر انتخاب کنید.", err_create_group: "خطا در ایجاد گروه.", err_search_self: "این خود شما هستید!", err_user_not_found_privacy: "نام کاربری یافت نشد (حریم خصوصی).", msg_added_contact: " به مخاطبین شما اضافه شد!", err_already_contact: " قبلاً در مخاطبین شما بوده است.", err_user_not_found2: "نام کاربری یافت نشد.", err_search: "جستجو ناموفق بود.", msg_group_deleted: "گروه دیگر وجود ندارد.", prompt_new_group_name: "نام گروه جدید:", prompt_new_desc: "توضیحات جدید:",  lbl_group_call: 'تماس گروهی', lbl_incoming_invite: 'دعوت به گروه جدید...', lbl_add_members: 'افزودن اعضا', sec_group_info: 'اطلاعات گروه', sec_members: 'اعضا', btn_add_member: 'افزودن عضو', lbl_group_name: 'نام گروه', msg_invited_you: 'شما را به گروه دعوت کرد:', btn_accept: 'پذیرفتن', btn_decline: 'رد کردن', msg_invite_accepted: 'دعوت پذیرفته شد', msg_invite_declined: 'دعوت رد شد', sys_user_joined: 'به گروه پیوست', sys_user_left: 'گروه را ترک کرد', sys_user_removed: 'از گروه حذف شد', btn_leave_group: 'ترک گروه', lbl_admin_options: 'گزینه‌های مدیر', btn_copy_invite_link: '🔗 کپی لینک دعوت', lbl_admins_only: 'فقط مدیران می‌توانند پیام ارسال کنند', msg_admin_kicked: 'مدیر شما را از گروه حذف کرده است.', msg_link_copied: 'لینک دعوت کپی شد!', msg_muted_in_group: 'شما در این گروه بی‌صدا شده‌اید.', msg_readonly_group: 'فقط مدیران می‌توانند در این گروه پیام ارسال کنند.', ctx_select: 'انتخاب', ctx_forward: 'ارسال', ctx_pin: 'سنجاق کردن', ctx_unpin: 'برداشتن سنجاق', msg_forwarded: 'ارسال شده', msg_pinned: 'پیام سنجاق شده', modal_forward: 'ارسال به...', btn_send_doodle: 'ارسال به عنوان تصویر', lbl_doodle_invite: 'دعوت به دودل', msg_clear_doodle: 'آیا مطمئن هستید که می‌خواهید همه چیز را پاک کنید؟', err_doodle_private_only: 'دودل در حال حاضر فقط در چت‌های خصوصی در دسترس است.', msg_doodle_rejected: 'دعوت رد شد.', doodle_title: 'دعوت به دودل', doodle_btn_accept: 'پیوستن', doodle_btn_reject: 'رد کردن', doodle_msg_accepted: 'دعوت پذیرفته شد', doodle_msg_closed: 'دودل بسته شد', doodle_msg_rejected: 'دعوت رد شد', doodle_waiting: 'در حال انتظار...', doodle_connecting: 'در حال اتصال...', doodle_rejected: 'رد شد', title_minimize: 'کوچک کردن', title_maximize: 'بزرگ کردن', title_close: 'بستن', title_color: 'انتخاب رنگ', title_size: 'اندازه قلم', title_eraser: 'پاک‌کن', title_clear: 'پاک کردن همه', doodle_session_with: 'جلسه دودل با', doodle_connected: 'متصل شد', doodle_wants_to_draw: ' می‌خواهد با شما نقاشی کند!' });
    Object.assign(TRANSLATIONS.ar, { lbl_font_group: 'الخط (نصك الخاص)', ph_bio_placeholder: 'أنا جديد هنا...', lbl_font_preview: 'معاينة', ph_preview_text: 'مرحبًا، أنا أستخدم دوري!', lbl_bio: 'حول / معلومات', lbl_font_color: 'اللون', lbl_font_size: 'الحجم', opt_font_inter: 'قياسي (Inter)', opt_font_courier: 'آلة كاتبة', opt_font_georgia: 'أنيق (Serif)', opt_font_comic: 'غير رسمي (Comic)', btn_custom_wallpaper: 'مخصص...', opt_color_pink: 'وردي فاتح', opt_color_green: 'أخضر فاتح', opt_color_blue: 'أزرق فاتح', opt_color_default: 'افتراضي (أبيض)', lbl_font_family: 'نوع الخط', lbl_wallpaper: 'خلفية الدردشة', btn_change_wallpaper: 'اختر صورة', btn_remove_wallpaper: 'إزالة', opt_font_small: 'صغير', opt_font_normal: 'عادي', opt_font_large: 'كبير',  tab_design: "التصميم", lbl_font_size: "حجم الخط", lbl_emoji: "الرموز التعبيرية", lbl_gif: "ملف GIF", lbl_doodle: "رسم خربشة", lbl_file: "إرسال ملف", lbl_location: "مشاركة الموقع", msg_location: "عرض الموقع",  ph_search_content: "البحث في المحتوى...", ph_id: "المعرف", ph_search: "بحث...", ph_search_user: "بحث عن مستخدم (@name)...",  lbl_remember_me: "تذكرني",  err_select_chat: "يرجى اختيار دردشة أولاً.", err_group_not_found: "هذه المجموعة غير موجودة أو تم حذفها.", err_join_group: "خطأ في الانضمام إلى المجموعة.", msg_copied_clipboard: "تم نسخ النص إلى الحافظة!", err_send_msg: "تعذر إرسال الرسالة (غير متصل؟).", err_feature_update: "ستكون هذه الميزة متاحة في التحديث القادم.", err_group_username_req: "يرجى إدخال اسم مستخدم للمجموعة (مثل @mygroup).", err_username_invalid: "لا يمكن أن يحتوي اسم المستخدم على مسافات ويجب أن يكون طوله حرفين على الأقل.", err_username_taken: "اسم المستخدم هذا مستخدم بالفعل من قبل مستخدم آخر.", err_group_username_taken: "اسم مستخدم المجموعة هذا مأخوذ. يرجى اختيار اسم آخر.", err_create_group: "خطأ في إنشاء المجموعة.", err_search_self: "هذا أنت!", err_user_not_found_privacy: "اسم المستخدم غير موجود (الخصوصية).", msg_added_contact: " تمت إضافته إلى جهات الاتصال الخاصة بك!", err_already_contact: " هو بالفعل جهة اتصال.", err_user_not_found2: "اسم المستخدم غير موجود.", err_search: "فشل البحث.", msg_group_deleted: "المجموعة لم تعد موجودة.", prompt_new_group_name: "اسم المجموعة الجديد:", prompt_new_desc: "وصف جديد:",  lbl_group_call: 'مكالمة جماعية', lbl_incoming_invite: 'دعوة مجموعة جديدة...', lbl_add_members: 'إضافة أعضاء', sec_group_info: 'معلومات المجموعة', sec_members: 'الأعضاء', btn_add_member: 'إضافة عضو', lbl_group_name: 'اسم المجموعة', msg_invited_you: 'دعاك إلى المجموعة:', btn_accept: 'قبول', btn_decline: 'رفض', msg_invite_accepted: 'تم قبول الدعوة', msg_invite_declined: 'تم رفض الدعوة', sys_user_joined: 'انضم إلى المجموعة', sys_user_left: 'غادر المجموعة', sys_user_removed: 'تمت إزالته من المجموعة', btn_leave_group: 'مغادرة المجموعة', lbl_admin_options: 'خيارات المشرف', btn_copy_invite_link: '🔗 نسخ رابط الدعوة', lbl_admins_only: 'المشرفون فقط يمكنهم إرسال رسائل', msg_admin_kicked: 'قام المشرف بإزالتك من المجموعة.', msg_link_copied: 'تم نسخ رابط الدعوة!', msg_muted_in_group: 'لقد تم كتم صوتك في هذه المجموعة.', msg_readonly_group: 'المشرفون فقط يمكنهم إرسال رسائل في هذه المجموعة.', ctx_select: 'تحديد', ctx_forward: 'تحويل', ctx_pin: 'تثبيت', ctx_unpin: 'إلغاء التثبيت', msg_forwarded: 'محولة', msg_pinned: 'رسالة مثبتة', modal_forward: 'تحويل إلى...', btn_send_doodle: 'إرسال كصورة', lbl_doodle_invite: 'دعوة دودل', msg_clear_doodle: 'هل تريد مسح كل شيء؟', err_doodle_private_only: 'دودل متاح حاليا فقط في الدردشات الخاصة.', msg_doodle_rejected: 'تم رفض الدعوة.', doodle_title: 'دعوة دودل', doodle_btn_accept: 'انضمام', doodle_btn_reject: 'رفض', doodle_msg_accepted: 'تم قبول الدعوة', doodle_msg_closed: 'تم إغلاق دودل', doodle_msg_rejected: 'تم رفض الدعوة', doodle_waiting: 'قيد الانتظار...', doodle_connecting: 'جاري الاتصال...', doodle_rejected: 'مرفوض', title_minimize: 'تصغير', title_maximize: 'تكبير', title_close: 'إغلاق', title_color: 'اختر اللون', title_size: 'حجم القلم', title_eraser: 'ممحاة', title_clear: 'مسح الكل', doodle_session_with: 'جلسة دودل مع', doodle_connected: 'متصل', doodle_wants_to_draw: ' يريد أن يرسم معك!' });
    Object.assign(TRANSLATIONS.tr, { lbl_font_group: 'Yazı (Kendi Metniniz)', ph_bio_placeholder: 'Ben burada yeniyim...', lbl_font_preview: 'Önizleme', ph_preview_text: 'Merhaba, Doori kullanıyorum!', lbl_bio: 'Hakkımda / Bilgi', lbl_font_color: 'Renk', lbl_font_size: 'Boyut', opt_font_inter: 'Standart (Inter)', opt_font_courier: 'Daktilo', opt_font_georgia: 'Zarif (Serif)', opt_font_comic: 'Gündelik (Comic)', btn_custom_wallpaper: 'Özel...', opt_color_pink: 'Açık Pembe', opt_color_green: 'Açık Yeşil', opt_color_blue: 'Açık Mavi', opt_color_default: 'Varsayılan (Beyaz)', lbl_font_family: 'Yazı Tipi', lbl_wallpaper: 'Sohbet Duvar Kağıdı', btn_change_wallpaper: 'Resim Seç', btn_remove_wallpaper: 'Kaldır', opt_font_small: 'Küçük', opt_font_normal: 'Normal', opt_font_large: 'Büyük',  tab_design: "Tasarım", lbl_font_size: "Yazı Tipi Boyutu", lbl_emoji: "Emojiler", lbl_gif: "GIF", lbl_doodle: "Doodle Çiz", lbl_file: "Dosya Gönder", lbl_location: "Konum Paylaş", msg_location: "Konumu Görüntüle",  ph_search_content: "İçerik ara...", ph_id: "ID", ph_search: "Ara...", ph_search_user: "Kullanıcı ara (@name)...",  lbl_remember_me: "Beni hatırla",  err_select_chat: "Lütfen önce bir sohbet seçin.", err_group_not_found: "Bu grup mevcut değil veya silinmiş.", err_join_group: "Gruba katılırken hata oluştu.", msg_copied_clipboard: "Metin panoya kopyalandı!", err_send_msg: "Mesaj gönderilemedi (Çevrimdışı?).", err_feature_update: "Bu özellik bir sonraki güncellemede kullanıma sunulacak.", err_group_username_req: "Lütfen grup için bir kullanıcı adı girin (örn. @mygroup).", err_username_invalid: "Kullanıcı adı boşluk içeremez ve en az 2 karakter uzunluğunda olmalıdır.", err_username_taken: "Bu kullanıcı adı zaten başka bir kullanıcı tarafından alınmış.", err_group_username_taken: "Bu grup kullanıcı adı zaten alınmış. Lütfen başka bir tane seçin.", err_create_group: "Grup oluşturulurken hata oluştu.", err_search_self: "Bu sensin!", err_user_not_found_privacy: "Kullanıcı adı bulunamadı (Gizlilik).", msg_added_contact: " kişilerinize eklendi!", err_already_contact: " zaten bir kişi.", err_user_not_found2: "Kullanıcı adı bulunamadı.", err_search: "Arama başarısız.", msg_group_deleted: "Grup artık mevcut değil.", prompt_new_group_name: "Yeni grup adı:", prompt_new_desc: "Yeni açıklama:",  lbl_group_call: 'Grup Araması', lbl_incoming_invite: 'Yeni Grup Daveti...', lbl_add_members: 'Üye Ekle', sec_group_info: 'Grup Bilgisi', sec_members: 'Üyeler', btn_add_member: 'Üye ekle', lbl_group_name: 'Grup adı', msg_invited_you: 'seni gruba davet etti:', btn_accept: 'Kabul Et', btn_decline: 'Reddet', msg_invite_accepted: 'Davet kabul edildi', msg_invite_declined: 'Davet reddedildi', sys_user_joined: 'gruba katıldı', sys_user_left: 'gruptan ayrıldı', sys_user_removed: 'gruptan çıkarıldı', btn_leave_group: 'Gruptan Ayrıl', lbl_admin_options: 'Yönetici Seçenekleri', btn_copy_invite_link: '🔗 Davet Bağlantısını Kopyala', lbl_admins_only: 'Sadece Yöneticiler mesaj gönderebilir', msg_admin_kicked: 'Yönetici sizi gruptan çıkardı.', msg_link_copied: 'Davet bağlantısı kopyalandı!', msg_muted_in_group: 'Bu grupta sessize alındınız.', msg_readonly_group: 'Bu grupta sadece yöneticiler mesaj gönderebilir.', ctx_select: 'Seç', ctx_forward: 'İlet', ctx_pin: 'Sabitle', ctx_unpin: 'Sabitlemeyi Kaldır', msg_forwarded: 'İletildi', msg_pinned: 'Sabitlenmiş Mesaj', modal_forward: 'Şuna ilet...', btn_send_doodle: 'Resim olarak gönder', lbl_doodle_invite: 'Doodle Daveti', msg_clear_doodle: 'Her şeyi silmek istediğinize emin misiniz?', err_doodle_private_only: 'Doodle şu anda sadece özel sohbetlerde kullanılabilir.', msg_doodle_rejected: 'Davet reddedildi.', doodle_title: 'Doodle Daveti', doodle_btn_accept: 'Katıl', doodle_btn_reject: 'Reddet', doodle_msg_accepted: 'Doodle Daveti kabul edildi', doodle_msg_closed: 'Doodle kapatıldı', doodle_msg_rejected: 'Doodle Daveti reddedildi', doodle_waiting: 'Bekleniyor...', doodle_connecting: 'Bağlanıyor...', doodle_rejected: 'Reddedildi', title_minimize: 'Küçült', title_maximize: 'Büyüt', title_close: 'Kapat', title_color: 'Renk Seç', title_size: 'Kalem Boyutu', title_eraser: 'Silgi', title_clear: 'Tümünü Sil', doodle_session_with: 'Doodle Oturumu:', doodle_connected: 'Bağlandı', doodle_wants_to_draw: ' seninle çizim yapmak istiyor!' });

    
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

    Object.assign(TRANSLATIONS.de, { btn_new_group: '➕ Neue Gruppe erstellen', lbl_group_desc: 'Beschreibung der Gruppe (optional)', lbl_privacy_public: 'Öffentlich', lbl_privacy_public_desc: 'Jeder kann diese Gruppe suchen und beitreten.', lbl_privacy_private: 'Privat', lbl_privacy_private_desc: 'Nur über Einladung zugänglich. Unsichtbar in der Suche.', err_no_public_groups: 'Keine öffentlichen Gruppen gefunden.', err_search_failed: 'Suche fehlgeschlagen.', lbl_public_group: 'Öffentliche Gruppe', btn_join: 'Beitreten', btn_open: 'Öffnen', call_missed: 'Verpasst', call_incoming: 'Eingehend', call_outgoing: 'Ausgehend', lbl_min: 'Min', lbl_just_now: 'Gerade eben', btn_add_user: 'Hinzufügen',
        tab_account: 'Konto', lbl_account_email: 'Registrierte E-Mail-Adresse', lbl_change_password: 'Passwort ändern', lbl_current_password: 'Aktuelles Passwort', lbl_new_password: 'Neues Passwort', lbl_confirm_password: 'Neues Passwort bestätigen', btn_update_password: 'Passwort aktualisieren', msg_password_updated: 'Passwort erfolgreich geändert!', err_password_mismatch: 'Die neuen Passwörter stimmen nicht überein.', err_wrong_current_password: 'Das aktuelle Passwort ist nicht korrekt.',
        lbl_app_lock: 'App-Sperre (PIN-Code)', lbl_app_lock_desc: 'Sperrt die App nach Verlassen mit einer 4-stelligen PIN.', lbl_set_pin: '4-stellige PIN festlegen', btn_enable_pin: 'PIN aktivieren', btn_disable_pin: 'PIN deaktivieren', msg_pin_enabled: 'PIN-Sperre aktiviert!', msg_pin_disabled: 'PIN-Sperre deaktiviert!', err_pin_invalid: 'Die PIN muss genau 4 Ziffern lang sein.', pin_enter_title: 'App gesperrt', pin_enter_prompt: 'Bitte gib deine 4-stellige PIN ein:', pin_unlock_btn: 'Entsperren', err_pin_wrong: 'Falsche PIN. Bitte erneut versuchen.',
        lbl_danger_zone: 'Gefahrenzone', btn_delete_account: 'Konto endgültig löschen', msg_confirm_delete_account: 'Möchtest du dein Konto wirklich unwiderruflich löschen? Alle Nachrichten und Daten gehen verloren!', prompt_delete_password: 'Bitte gib dein Passwort ein, um die Löschung zu bestätigen:', msg_account_deleted: 'Dein Konto wurde erfolgreich gelöscht.', msg_deletion_email_sent: 'Eine Bestätigungs-E-Mail wurde gesendet. Bitte klicke auf den roten Bestätigungslink in der E-Mail, um dein Konto endgültig zu löschen.',
        lbl_notification_sound: 'Benachrichtigungston', opt_sound_chime: 'Modern Chime', opt_sound_soft: 'Sanft & Diskret', opt_sound_bell: 'Kristall-Glocke', opt_sound_classic: 'Klassischer Ton', btn_test_sound: 'Ton testen 🔊',
        lbl_hide_preview: 'Nachrichtenvorschau verbergen', lbl_hide_preview_desc: 'Verbirgt Nachrichtentext in Benachrichtigungen zum Schutz der Privatsphäre.',
        lbl_vibrate: 'Haptisches Feedback / Vibration', lbl_vibrate_desc: 'Vibriert bei neuen Nachrichten und Aktionen auf Mobilgeräten.',
        lbl_auto_media: 'Automatischer Medien-Download', opt_media_always: 'Immer automatisch laden', opt_media_wifi: 'Nur bei WLAN / Manuell', opt_media_manual: 'Nie (Datensparmodus)',
        btn_export_chat: 'Chatverlauf exportieren (.txt)', msg_export_success: 'Chatverlauf wurde erfolgreich exportiert!', err_no_chat_to_export: 'Bitte öffne zuerst einen Chat, um ihn zu exportieren.'
    });
    Object.assign(TRANSLATIONS.en, { btn_new_group: '➕ Create New Group', lbl_group_desc: 'Group Description (optional)', lbl_privacy_public: 'Public', lbl_privacy_public_desc: 'Anyone can search and join this group.', lbl_privacy_private: 'Private', lbl_privacy_private_desc: 'Accessible via invite only. Hidden from search.', err_no_public_groups: 'No public groups found.', err_search_failed: 'Search failed.', lbl_public_group: 'Public Group', btn_join: 'Join', btn_open: 'Open', call_missed: 'Missed', call_incoming: 'Incoming', call_outgoing: 'Outgoing', lbl_min: 'Min', lbl_just_now: 'Just now', btn_add_user: 'Add',
        tab_account: 'Account', lbl_account_email: 'Registered Email Address', lbl_change_password: 'Change Password', lbl_current_password: 'Current Password', lbl_new_password: 'New Password', lbl_confirm_password: 'Confirm New Password', btn_update_password: 'Update Password', msg_password_updated: 'Password successfully changed!', err_password_mismatch: 'New passwords do not match.', err_wrong_current_password: 'Current password is incorrect.',
        lbl_app_lock: 'App Lock (PIN Code)', lbl_app_lock_desc: 'Locks the app with a 4-digit PIN when inactive.', lbl_set_pin: 'Set 4-digit PIN', btn_enable_pin: 'Enable PIN', btn_disable_pin: 'Disable PIN', msg_pin_enabled: 'PIN lock enabled!', msg_pin_disabled: 'PIN lock disabled!', err_pin_invalid: 'PIN must be exactly 4 digits.', pin_enter_title: 'App Locked', pin_enter_prompt: 'Please enter your 4-digit PIN:', pin_unlock_btn: 'Unlock', err_pin_wrong: 'Incorrect PIN. Please try again.',
        lbl_danger_zone: 'Danger Zone', btn_delete_account: 'Permanently Delete Account', msg_confirm_delete_account: 'Are you sure you want to permanently delete your account? All messages and data will be lost!', prompt_delete_password: 'Enter your password to confirm deletion:', msg_account_deleted: 'Your account has been deleted.', msg_deletion_email_sent: 'A confirmation email has been sent. Please click the red confirmation link in the email to permanently delete your account.',
        lbl_notification_sound: 'Notification Sound', opt_sound_chime: 'Modern Chime', opt_sound_soft: 'Soft & Discreet', opt_sound_bell: 'Crystal Bell', opt_sound_classic: 'Classic Tone', btn_test_sound: 'Test Sound 🔊',
        lbl_hide_preview: 'Hide Message Preview', lbl_hide_preview_desc: 'Hides message content in notifications for privacy.',
        lbl_vibrate: 'Haptic Feedback / Vibration', lbl_vibrate_desc: 'Vibrates on new messages and actions on mobile devices.',
        lbl_auto_media: 'Automatic Media Download', opt_media_always: 'Always download automatically', opt_media_wifi: 'Wi-Fi only / Manual', opt_media_manual: 'Never (Data saver mode)',
        btn_export_chat: 'Export Chat History (.txt)', msg_export_success: 'Chat history exported successfully!', err_no_chat_to_export: 'Please select a chat first to export.'
    });
    Object.assign(TRANSLATIONS.fa, { btn_new_group: '➕ ایجاد گروه جدید', lbl_group_desc: 'توضیحات گروه (اختیاری)', lbl_privacy_public: 'عمومی', lbl_privacy_public_desc: 'همه می‌توانند این گروه را جستجو کرده و به آن بپیوندند.', lbl_privacy_private: 'خصوصی', lbl_privacy_private_desc: 'فقط با دعوتنامه قابل دسترسی است. پنهان از جستجو.', err_no_public_groups: 'هیچ گروه عمومی یافت نشد.', err_search_failed: 'جستجو ناموفق بود.', lbl_public_group: 'گروه عمومی', btn_join: 'پیوستن', btn_open: 'باز کردن', call_missed: 'از دست رفته', call_incoming: 'ورودی', call_outgoing: 'خروجی', lbl_min: 'دقیقه', lbl_just_now: 'همین الان', btn_add_user: 'افزودن',
        tab_account: 'حساب کاربری', lbl_account_email: 'آدرس ایمیل ثبت‌شده', lbl_change_password: 'تغییر گذرواژه', lbl_current_password: 'گذرواژه فعلی', lbl_new_password: 'گذرواژه جدید', lbl_confirm_password: 'تأیید گذرواژه جدید', btn_update_password: 'بروزرسانی گذرواژه', msg_password_updated: 'گذرواژه با موفقیت تغییر کرد!', err_password_mismatch: 'گذرواژه‌های جدید مطابقت ندارند.', err_wrong_current_password: 'گذرواژه فعلی نادرست است.',
        lbl_app_lock: 'قفل برنامه (کد PIN)', lbl_app_lock_desc: 'برنامه را با پین ۴ رقمی هنگام خروج قفل می‌کند.', lbl_set_pin: 'تعیین پین ۴ رقمی', btn_enable_pin: 'فعال‌سازی پین', btn_disable_pin: 'غیرفعال‌سازی پین', msg_pin_enabled: 'قفل پین فعال شد!', msg_pin_disabled: 'قفل پین غیرفعال شد!', err_pin_invalid: 'پین باید دقیقاً ۴ رقم باشد.', pin_enter_title: 'برنامه قفل است', pin_enter_prompt: 'لطفاً پین ۴ رقمی خود را وارد کنید:', pin_unlock_btn: 'باز کردن قفل', err_pin_wrong: 'پین نادرست است. لطفاً دوباره امتحان کنید.',
        lbl_danger_zone: 'بخش حساس', btn_delete_account: 'حذف دائمی حساب کاربری', msg_confirm_delete_account: 'آیا مطمئن هستید که می‌خواهید حساب خود را برای همیشه حذف کنید؟ تمام پیام‌ها و اطلاعات از بین خواهند رفت!', prompt_delete_password: 'برای تأیید حذف، گذرواژه خود را وارد کنید:', msg_account_deleted: 'حساب شما با موفقیت حذف شد.', msg_deletion_email_sent: 'یک ایمیل تأیید برای شما ارسال شد. لطفاً روی پیوند قرمز رنگ در ایمیل کلیک کنید تا حساب کاربری شما برای همیشه حذف شود.',
        lbl_notification_sound: 'صدای اعلان', opt_sound_chime: 'زنگ مدرن (Chime)', opt_sound_soft: 'ملایم و آرام', opt_sound_bell: 'زنگ کریستالی', opt_sound_classic: 'صدای کلاسیک', btn_test_sound: 'آزمایش صدا 🔊',
        lbl_hide_preview: 'پنهان کردن پیش‌نمایش پیام', lbl_hide_preview_desc: 'متن پیام را در اعلان‌ها برای حفظ حریم خصوصی پنهان می‌کند.',
        lbl_vibrate: 'بازخورد لمسی / لرزش', lbl_vibrate_desc: 'لرزش در پیام‌های جدید و عملکردها در تلفن همراه.',
        lbl_auto_media: 'دانلود خودکار رسانه‌ها', opt_media_always: 'همیشه خودکار دانلود شود', opt_media_wifi: 'فقط با وای‌فای / دستی', opt_media_manual: 'هرگز (حالت صرفه‌جویی داده)',
        btn_export_chat: 'خروجی گرفتن از تاریخچه گفتگو (.txt)', msg_export_success: 'تاریخچه گفتگو با موفقیت ذخیره شد!', err_no_chat_to_export: 'لطفاً ابتدا یک گفتگو را برای خروجی گرفتن باز کنید.'
    });
    Object.assign(TRANSLATIONS.ar, { btn_new_group: '➕ إنشاء مجموعة جديدة', lbl_group_desc: 'وصف المجموعة (اختياري)', lbl_privacy_public: 'عام', lbl_privacy_public_desc: 'يمكن لأي شخص البحث والانضمام إلى هذه المجموعة.', lbl_privacy_private: 'خاص', lbl_privacy_private_desc: 'يمكن الوصول إليه عبر الدعوة فقط. مخفي من البحث.', err_no_public_groups: 'لم يتم العثور على مجموعات عامة.', err_search_failed: 'فشل البحث.', lbl_public_group: 'مجموعة عامة', btn_join: 'انضمام', btn_open: 'فتح', call_missed: 'فائتة', call_incoming: 'واردة', call_outgoing: 'صادرة', lbl_min: 'دقيقة', lbl_just_now: 'الآن', btn_add_user: 'إضافة',
        tab_account: 'الحساب', lbl_account_email: 'عنوان البريد الإلكتروني المسجل', lbl_change_password: 'تغيير كلمة المرور', lbl_current_password: 'كلمة المرور الحالية', lbl_new_password: 'كلمة المرور الجديدة', lbl_confirm_password: 'تأكيد كلمة المرور الجديدة', btn_update_password: 'تحديث كلمة المرور', msg_password_updated: 'تم تغيير كلمة المرور بنجاح!', err_password_mismatch: 'كلمتا المرور غير متطابقتين.', err_wrong_current_password: 'كلمة المرور الحالية غير صحيحة.',
        lbl_app_lock: 'قفل التطبيق (رمز PIN)', lbl_app_lock_desc: 'يقفل التطبيق برمز PIN مكوّن من 4 أرقام عند عدم النشاط.', lbl_set_pin: 'تعيين رمز PIN من 4 أرقام', btn_enable_pin: 'تفعيل الرمز', btn_disable_pin: 'تعطيل الرمز', msg_pin_enabled: 'تم تفعيل قفل الرمز!', msg_pin_disabled: 'تم تعطيل قفل الرمز!', err_pin_invalid: 'يجب أن يتكون رمز PIN من 4 أرقام بالضبط.', pin_enter_title: 'التطبيق مقفل', pin_enter_prompt: 'يرجى إدخال رمز PIN المكون من 4 أرقام:', pin_unlock_btn: 'فتح القفل', err_pin_wrong: 'رمز PIN غير صحيح. يرجى المحاولة مرة أخرى.',
        lbl_danger_zone: 'منطقة الخطر', btn_delete_account: 'حذف الحساب نهائياً', msg_confirm_delete_account: 'هل أنت متأكد من رغبتك في حذف حسابك نهائياً؟ سيتم فقدان جميع الرسائل والبيانات!', prompt_delete_password: 'أدخل كلمة المرور لتأكيد الحذف:', msg_account_deleted: 'تم حذف حسابك بنجاح.', msg_deletion_email_sent: 'تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. يرجى فتح الرسالة والنقر على الرابط الأحمر لتأكيد حذف حسابك نهائياً.',
        lbl_notification_sound: 'نغمة الإشعار', opt_sound_chime: 'نغمة حديثة (Chime)', opt_sound_soft: 'هادئة ولطيفة', opt_sound_bell: 'جرس بلوري', opt_sound_classic: 'نغمة كلاسيكية', btn_test_sound: 'تجربة الصوت 🔊',
        lbl_hide_preview: 'إخفاء معاينة الرسائل', lbl_hide_preview_desc: 'يخفي نص الرسالة في الإشعارات لحماية الخصوصية.',
        lbl_vibrate: 'الاهتزاز والتفاعل اللمسي', lbl_vibrate_desc: 'اهتزاز عند استلام رسائل أو إجراءات على الهاتف.',
        lbl_auto_media: 'تنزيل الوسائط تلقائياً', opt_media_always: 'تنزيل تلقائي دائماً', opt_media_wifi: 'عبر Wi-Fi فقط / يدوياً', opt_media_manual: 'أبداً (توفير البيانات)',
        btn_export_chat: 'تصدير سجل المحادثة (.txt)', msg_export_success: 'تم تصدير سجل المحادثة بنجاح!', err_no_chat_to_export: 'يرجى اختيار محادثة أولاً لتصديرها.'
    });
    Object.assign(TRANSLATIONS.tr, { btn_new_group: '➕ Yeni Grup Oluştur', lbl_group_desc: 'Grup Açıklaması (isteğe bağlı)', lbl_privacy_public: 'Herkese Açık', lbl_privacy_public_desc: 'Herkes bu grubu arayabilir ve katılabilir.', lbl_privacy_private: 'Gizli', lbl_privacy_private_desc: 'Yalnızca davetle erişilebilir. Aramalarda gizlidir.', err_no_public_groups: 'Herkese açık grup bulunamadı.', err_search_failed: 'Arama başarısız.', lbl_public_group: 'Herkese Açık Grup', btn_join: 'Katıl', btn_open: 'Aç', call_missed: 'Cevapsız', call_incoming: 'Gelen', call_outgoing: 'Giden', lbl_min: 'Dk', lbl_just_now: 'Az önce', btn_add_user: 'Ekle',
        tab_account: 'Hesap', lbl_account_email: 'Kayıtlı E-posta Adresi', lbl_change_password: 'Şifreyi Değiştir', lbl_current_password: 'Mevcut Şifre', lbl_new_password: 'Yeni Şifre', lbl_confirm_password: 'Yeni Şifreyi Onayla', btn_update_password: 'Şifreyi Güncelle', msg_password_updated: 'Şifre başarıyla değiştirildi!', err_password_mismatch: 'Yeni şifreler eşleşmiyor.', err_wrong_current_password: 'Mevcut şifre yanlış.',
        lbl_app_lock: 'Uygulama Kilidi (PIN)', lbl_app_lock_desc: 'Uygulamayı 4 haneli bir PIN ile kilitler.', lbl_set_pin: '4 haneli PIN belirle', btn_enable_pin: 'PIN’i Etkinleştir', btn_disable_pin: 'PIN’i Devre Dışı Bırak', msg_pin_enabled: 'PIN kilidi etkinleştirildi!', msg_pin_disabled: 'PIN kilidi devre dışı bırakıldı!', err_pin_invalid: 'PIN tam olarak 4 haneli olmalıdır.', pin_enter_title: 'Uygulama Kilitli', pin_enter_prompt: 'Lütfen 4 haneli PIN kodunuzu girin:', pin_unlock_btn: 'Kilidi Aç', err_pin_wrong: 'Hatalı PIN. Lütfen tekrar deneyin.',
        lbl_danger_zone: 'Tehlikeli Bölge', btn_delete_account: 'Hesabı Kalıcı Olarak Sil', msg_confirm_delete_account: 'Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz? Tüm mesajlar ve veriler kaybolacaktır!', prompt_delete_password: 'Silme işlemini onaylamak için şifrenizi girin:', msg_account_deleted: 'Hesabınız başarıyla silindi.', msg_deletion_email_sent: 'Bir onay e-postası gönderildi. Hesabınızı kalıcı olarak silmek için lütfen e-postadaki kırmızı onay bağlantısına tıklayın.',
        lbl_notification_sound: 'Bildirim Sesi', opt_sound_chime: 'Modern Melodi', opt_sound_soft: 'Hafif & Kibar', opt_sound_bell: 'Kristal Çan', opt_sound_classic: 'Klasik Ses', btn_test_sound: 'Sesi Test Et 🔊',
        lbl_hide_preview: 'Mesaj Önizlemesini Gizle', lbl_hide_preview_desc: 'Gizlilik için bildirimlerde mesaj içeriğini gizler.',
        lbl_vibrate: 'Dokunsal Geri Bildirim / Titreşim', lbl_vibrate_desc: 'Mobil cihazlarda yeni mesajlarda ve işlemlerde titrer.',
        lbl_auto_media: 'Otomatik Medya İndirme', opt_media_always: 'Her zaman otomatik indir', opt_media_wifi: 'Yalnızca Wi-Fi / Manuel', opt_media_manual: 'Asla (Veri tasarrufu modu)',
        btn_export_chat: 'Sohbet Geçmişini Dışa Aktar (.txt)', msg_export_success: 'Sohbet geçmişi başarıyla dışa aktarıldı!', err_no_chat_to_export: 'Dışa aktarmak için lütfen önce bir sohbet açın.'
    });
    Object.assign(TRANSLATIONS.de, {
        tab_filter_all: 'Alle', tab_filter_direct: 'Direkt', tab_filter_groups: 'Gruppen', tab_filter_unread: 'Ungelesen',
        ctx_star: '⭐ Nachricht markieren', ctx_unstar: '⭐ Markierung entfernen', btn_starred_messages: 'Markierte Nachrichten',
        modal_starred_title: 'Wichtige & markierte Nachrichten', msg_starred_empty: 'Keine markierten Nachrichten vorhanden.',
        btn_unstar: 'Entfernen', btn_jump_to_chat: 'Zum Chat springen',
        btn_shared_media: 'Geteilte Medien', modal_shared_media_title: 'Geteilte Medien in diesem Chat',
        tab_media_photos: 'Fotos & Videos', tab_media_audio: 'Sprachnachrichten', tab_media_files: 'Dateien', msg_no_media_found: 'Keine Medien in dieser Kategorie vorhanden.',
        lbl_profile_status: 'Status & Emoji', lbl_profile_status_desc: 'Wähle deinen aktuellen Status für deine Kontakte.', ph_custom_status: 'Eigener Status...',
        opt_status_available: '🟢 Verfügbar', opt_status_busy: '☕ Beschäftigt', opt_status_work: '🚀 Bei der Arbeit',
        opt_status_travel: '🚗 Unterwegs', opt_status_vacation: '🏖️ Im Urlaub', opt_status_sleep: '💤 Schlafen',
        btn_save_status: 'Status speichern', msg_status_updated: 'Status wurde erfolgreich aktualisiert!',
        lbl_logged_in_as: 'Angemeldet als:'
    });
    Object.assign(TRANSLATIONS.en, {
        tab_filter_all: 'All', tab_filter_direct: 'Direct', tab_filter_groups: 'Groups', tab_filter_unread: 'Unread',
        ctx_star: '⭐ Star message', ctx_unstar: '⭐ Unstar message', btn_starred_messages: 'Starred Messages',
        modal_starred_title: 'Important & Starred Messages', msg_starred_empty: 'No starred messages found.',
        btn_unstar: 'Remove', btn_jump_to_chat: 'Jump to chat',
        btn_shared_media: 'Shared Media', modal_shared_media_title: 'Shared Media in this chat',
        tab_media_photos: 'Photos & Videos', tab_media_audio: 'Voice Notes', tab_media_files: 'Files', msg_no_media_found: 'No media found in this category.',
        lbl_profile_status: 'Status & Emoji', lbl_profile_status_desc: 'Choose your status for contacts to see.', ph_custom_status: 'Custom status...',
        opt_status_available: '🟢 Available', opt_status_busy: '☕ Busy', opt_status_work: '🚀 At work',
        opt_status_travel: '🚗 On the road', opt_status_vacation: '🏖️ On vacation', opt_status_sleep: '💤 Sleeping',
        btn_save_status: 'Save Status', msg_status_updated: 'Status updated successfully!',
        lbl_logged_in_as: 'Logged in as:'
    });
    Object.assign(TRANSLATIONS.fa, {
        tab_filter_all: 'همه', tab_filter_direct: 'مستقیم', tab_filter_groups: 'گروه‌ها', tab_filter_unread: 'خوانده‌نشده',
        ctx_star: '⭐ نشان کردن پیام', ctx_unstar: '⭐ برداشتن نشان', btn_starred_messages: 'پیام‌های نشان‌شده',
        modal_starred_title: 'پیام‌های مهم و نشان‌شده', msg_starred_empty: 'هیچ پیام نشان‌شده‌ای وجود ندارد.',
        btn_unstar: 'حذف', btn_jump_to_chat: 'رفتن به گفتگو',
        btn_shared_media: 'رسانه‌های مشترک', modal_shared_media_title: 'رسانه‌های مشترک در این گفتگو',
        tab_media_photos: 'عکس‌ها و ویدیوها', tab_media_audio: 'پیام‌های صوتی', tab_media_files: 'فایل‌ها', msg_no_media_found: 'هیچ رسانه‌ای در این بخش یافت نشد.',
        lbl_profile_status: 'وضعیت و ایموجی', lbl_profile_status_desc: 'یک وضعیت برای نمایش به مخاطبین انتخاب کنید.', ph_custom_status: 'وضعیت دلخواه...',
        opt_status_available: '🟢 در دسترس', opt_status_busy: '☕ مشغول', opt_status_work: '🚀 در حال کار',
        opt_status_travel: '🚗 در سفر', opt_status_vacation: '🏖️ در تعطیلات', opt_status_sleep: '💤 در خواب',
        btn_save_status: 'ذخیره وضعیت', msg_status_updated: 'وضعیت با موفقیت به‌روزرسانی شد!',
        lbl_logged_in_as: 'وارد شده به عنوان:'
    });
    Object.assign(TRANSLATIONS.ar, {
        tab_filter_all: 'الكل', tab_filter_direct: 'مباشر', tab_filter_groups: 'المجموعات', tab_filter_unread: 'غير مقروءة',
        ctx_star: '⭐ تمييز بنجمة', ctx_unstar: '⭐ إزالة النجمة', btn_starred_messages: 'الرسائل المميزة بنجمة',
        modal_starred_title: 'الرسائل المهمة والمميزة', msg_starred_empty: 'لا توجد رسائل مميزة بنجمة.',
        btn_unstar: 'إزالة', btn_jump_to_chat: 'الانتقال إلى المحادثة',
        btn_shared_media: 'الوسائط المشتركة', modal_shared_media_title: 'الوسائط المشتركة في هذه المحادثة',
        tab_media_photos: 'الصور ومقاطع الفيديو', tab_media_audio: 'الرسائل الصوتية', tab_media_files: 'الملفات', msg_no_media_found: 'لم يتم العثور على وسائط في هذا القسم.',
        lbl_profile_status: 'الحالة والرمز التعبيري', lbl_profile_status_desc: 'اختر حالتك الحالية لتظهر لجهات اتصالك.', ph_custom_status: 'حالة مخصصة...',
        opt_status_available: '🟢 متاح', opt_status_busy: '☕ مشغول', opt_status_work: '🚀 في العمل',
        opt_status_travel: '🚗 في الطريق', opt_status_vacation: '🏖️ في عطلة', opt_status_sleep: '💤 نائم',
        btn_save_status: 'حفظ الحالة', msg_status_updated: 'تم تحديث الحالة بنجاح!',
        lbl_logged_in_as: 'تم تسجيل الدخول كـ:'
    });
    Object.assign(TRANSLATIONS.tr, {
        tab_filter_all: 'Tümü', tab_filter_direct: 'Direkt', tab_filter_groups: 'Gruplar', tab_filter_unread: 'Okunmamış',
        ctx_star: '⭐ Mesajı yıldızla', ctx_unstar: '⭐ Yıldızı kaldır', btn_starred_messages: 'Yıldızlı Mesajlar',
        modal_starred_title: 'Önemli ve Yıldızlı Mesajlar', msg_starred_empty: 'Yıldızlı mesaj bulunamadı.',
        btn_unstar: 'Kaldır', btn_jump_to_chat: 'Sohbete git',
        btn_shared_media: 'Paylaşılan Medya', modal_shared_media_title: 'Bu sohbette paylaşılan medya',
        tab_media_photos: 'Fotoğraflar ve Videolar', tab_media_audio: 'Sesli Mesajlar', tab_media_files: 'Dosyalar', msg_no_media_found: 'Bu kategoride medya bulunamadı.',
        lbl_profile_status: 'Durum ve Emoji', lbl_profile_status_desc: 'Kişilerinizin görmesi için bir durum seçin.', ph_custom_status: 'Özel durum...',
        opt_status_available: '🟢 Uygun', opt_status_busy: '☕ Meşgul', opt_status_work: '🚀 İşte',
        opt_status_travel: '🚗 Yolda', opt_status_vacation: '🏖️ Tatilde', opt_status_sleep: '💤 Uyuyor',
        btn_save_status: 'Durumu Kaydet', msg_status_updated: 'Durum başarıyla güncellendi!',
        lbl_logged_in_as: 'Olarak giriş yapıldı:'
    });
    function getTranslatedChatName(chat) {
        if (!chat) return '';
        if (chat.type === 'assistant' || window.DooriAssistant?.isAssistant(chat.id)) return window.DooriAssistant.getName();
        if (chat.id === 'saved') return (TRANSLATIONS[currentLang] || TRANSLATIONS['en'])['chat_saved'];
        const cname = (chat.name || '').toLowerCase().trim();
        if (chat.id === 'general' || cname === 'allgemein' || cname === 'general') return (TRANSLATIONS[currentLang] || TRANSLATIONS['en'])['chat_general'];
        return chat.name;
    }

    const STATUS_PRESET_KEYS = [
        'opt_status_available',
        'opt_status_busy',
        'opt_status_work',
        'opt_status_travel',
        'opt_status_vacation',
        'opt_status_sleep'
    ];

    function getPresetKeyFromStatus(statusStr) {
        if (!statusStr || typeof statusStr !== 'string') return null;
        const clean = statusStr.trim();
        if (!clean) return null;
        const stripEmoji = s => s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim().toLowerCase();
        const cleanNoEmoji = stripEmoji(clean);
        for (const key of STATUS_PRESET_KEYS) {
            for (const l of ['de', 'en', 'fa', 'ar', 'tr']) {
                const val = (TRANSLATIONS[l] && TRANSLATIONS[l][key]) || '';
                if (!val) continue;
                if (val.trim() === clean) return key;
                if (cleanNoEmoji && stripEmoji(val) === cleanNoEmoji) return key;
            }
        }
        return null;
    }

    function syncSettingsStatusUI() {
        const customStatusInput = document.getElementById('setting-custom-status');
        if (!customStatusInput) return;
        const p = users.get(currentUser);
        const currentStatus = (p && (p.bio || p.status)) ? (p.bio || p.status) : '';
        const presetKey = customStatusInput.dataset.presetKey || getPresetKeyFromStatus(customStatusInput.value) || getPresetKeyFromStatus(currentStatus);
        const activeLang = window.currentLang || currentLang || 'en';
        const t = TRANSLATIONS[activeLang] || TRANSLATIONS['en'] || {};
        if (presetKey && t[presetKey]) {
            customStatusInput.value = t[presetKey];
            customStatusInput.dataset.presetKey = presetKey;
        } else if (!customStatusInput.dataset.presetKey && currentStatus) {
            customStatusInput.value = currentStatus;
        }
        document.querySelectorAll('.status-preset-btn').forEach(b => {
            const bKey = b.getAttribute('data-status-key') || b.getAttribute('data-i18n');
            if (bKey === presetKey) {
                b.classList.add('active');
                b.style.background = 'var(--accent)';
                b.style.color = '#000';
                b.style.fontWeight = 'bold';
            } else {
                b.classList.remove('active');
                b.style.background = 'rgba(255,255,255,0.06)';
                b.style.color = 'white';
                b.style.fontWeight = 'normal';
            }
        });
    }
    window.getPresetKeyFromStatus = getPresetKeyFromStatus;
    window.syncSettingsStatusUI = syncSettingsStatusUI;

    function getUserProfile(username) {
        if (!username || typeof username !== 'string') return null;
        const clean = username.trim();
        const cleanNoAt = clean.replace(/^@/, '');
        const cleanWithAt = '@' + cleanNoAt;
        const map = (typeof users !== 'undefined' && users) ? users : (window.users || null);
        if (!map) return null;
        return map.get(clean) || map.get(clean.toLowerCase()) ||
               map.get(cleanNoAt) || map.get(cleanNoAt.toLowerCase()) ||
               map.get(cleanWithAt) || map.get(cleanWithAt.toLowerCase()) || null;
    }
    window.getUserProfile = getUserProfile;

    function updateCurrentUserDisplay() {
        if (typeof currentUserDisplay !== 'undefined' && currentUserDisplay && currentUser) {
            currentUserDisplay.textContent = currentUser;
        }
        const statusEl = document.getElementById('current-user-status-display');
        if (statusEl && currentUser) {
            const p = getUserProfile(currentUser);
            const rawStatus = p && (p.bio || p.status) ? (p.bio || p.status) : '';
            if (rawStatus && rawStatus.toLowerCase() !== 'online') {
                const pKey = typeof getPresetKeyFromStatus === 'function' ? getPresetKeyFromStatus(rawStatus) : null;
                const activeLang = window.currentLang || currentLang || 'en';
                const t = TRANSLATIONS[activeLang] || TRANSLATIONS['en'] || {};
                const displayStatus = (pKey && t[pKey]) ? t[pKey] : rawStatus;
                statusEl.textContent = ` (${displayStatus})`;
                statusEl.style.display = 'inline';
            } else {
                statusEl.textContent = '';
                statusEl.style.display = 'none';
            }
        }
    }
    window.updateCurrentUserDisplay = updateCurrentUserDisplay;

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
        syncSettingsStatusUI();
        updateCurrentUserDisplay();
        renderChatList();
        if (currentChat) {
            currentChatName.textContent = getTranslatedChatName(currentChat);
            if (currentChat.type === 'assistant') window.DooriAssistant?.activate();
        }
        window.dispatchEvent(new CustomEvent('doori-language-change', { detail: { lang } }));
    }

    function renderCustomGifs() {
        const grid = document.getElementById('custom-gif-grid');
        if(!grid) return;
        grid.innerHTML = safeHTML('');
        let customGifs = [];
        try {
            customGifs = JSON.parse(localStorage.getItem('doori_custom_gifs_' + currentUser) || '[]');
        } catch(e) { customGifs = []; }
        customGifs.forEach((dataUrl, idx) => {
            const wrap = document.createElement('div');
            wrap.style.position = 'relative';
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.cursor = 'pointer';
            img.onclick = () => { sendMessage('', 'gif', dataUrl); gifPicker.classList.add('hidden'); };
            
            const delBtn = document.createElement('button');
            delBtn.innerHTML = safeHTML('✖');
            delBtn.style.position = 'absolute';
            delBtn.style.top = '2px';
            delBtn.style.right = '2px';
            delBtn.style.background = 'rgba(255,0,0,0.7)';
            delBtn.style.color = '#fff';
            delBtn.style.border = 'none';
            delBtn.style.borderRadius = '50%';
            delBtn.style.width = '20px';
            delBtn.style.height = '20px';
            delBtn.style.fontSize = '10px';
            delBtn.style.cursor = 'pointer';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                customGifs.splice(idx, 1);
                localStorage.setItem('doori_custom_gifs_' + currentUser, JSON.stringify(customGifs));
                renderCustomGifs();
            };
            
            wrap.appendChild(img);
            wrap.appendChild(delBtn);
            grid.appendChild(wrap);
        });
    }

    function initPickers() {
        EMOJIS.forEach(e => { const s = document.createElement('span'); s.textContent = e; s.onclick = () => { messageInput.value += e; emojiPicker.classList.add('hidden'); }; emojiPicker.appendChild(s); });
        GIFS.forEach(url => { const img = document.createElement('img'); img.src = url; img.onclick = () => { sendMessage('', 'gif', url); gifPicker.classList.add('hidden'); }; document.getElementById('gif-grid').appendChild(img); });
        
        const tabStandard = document.getElementById('gif-tab-standard');
        const tabCustom = document.getElementById('gif-tab-custom');
        const gridStandard = document.getElementById('gif-grid');
        const containerCustom = document.getElementById('custom-gif-container');
        const customGifUpload = document.getElementById('custom-gif-upload');
        const addCustomGifBtn = document.getElementById('add-custom-gif-btn');
        
        if (tabStandard && tabCustom) {
            tabStandard.onclick = (e) => {
                e.stopPropagation();
                tabStandard.classList.add('active'); tabCustom.classList.remove('active');
                gridStandard.classList.remove('hidden'); containerCustom.classList.add('hidden');
            };
            tabCustom.onclick = (e) => {
                e.stopPropagation();
                tabCustom.classList.add('active'); tabStandard.classList.remove('active');
                containerCustom.classList.remove('hidden'); gridStandard.classList.add('hidden');
                renderCustomGifs();
            };
        }
        
        if (addCustomGifBtn && customGifUpload) {
            addCustomGifBtn.onclick = (e) => {
                e.stopPropagation();
                customGifUpload.click();
            };
        }
        
        if (customGifUpload) {
            customGifUpload.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 192 * 1024) {
                    alert(authText('security_media_limit'));
                    customGifUpload.value = '';
                    return;
                }
                
                if (addCustomGifBtn) {
                    addCustomGifBtn.textContent = authText('security_loading');
                    addCustomGifBtn.disabled = true;
                }
                
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    const dataUrl = evt.target.result;
                    try {
                        let customGifs = [];
                        try {
                            customGifs = JSON.parse(localStorage.getItem('doori_custom_gifs_' + currentUser) || '[]');
                        } catch(err) { customGifs = []; }
                        if (customGifs.length >= 10) {
                            alert((window.TRANSLATIONS[window.currentLang] || {}).err_too_many_gifs || 'Jeder Benutzer darf maximal 10 GIFs hinzufügen.');
                            if (addCustomGifBtn) { addCustomGifBtn.textContent = authText('security_gif_button'); addCustomGifBtn.disabled = false; }
                            return;
                        }
                        
                        if (dataUrl.length > 262144) throw new Error(authText('security_media_limit'));
                        const downloadUrl = dataUrl;

                        customGifs.push(downloadUrl);
                        localStorage.setItem('doori_custom_gifs_' + currentUser, JSON.stringify(customGifs));
                        renderCustomGifs();
                    } catch (err) {
                        console.error('GIF upload error:', err);
                        alert(authText('security_media_limit'));
                    }
                    if (addCustomGifBtn) { addCustomGifBtn.textContent = authText('security_gif_button'); addCustomGifBtn.disabled = false; }
                };
                reader.readAsDataURL(file);
                customGifUpload.value = '';
            };
        }
    }
    initPickers();
    applyTranslation(currentLang);
    emojiBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        emojiPicker.classList.toggle('hidden'); 
        gifPicker.classList.add('hidden'); 
        const plusMenuDropdown = document.getElementById('plus-menu-dropdown');
        if (plusMenuDropdown) plusMenuDropdown.classList.add('hidden');
    });
    gifBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        gifPicker.classList.toggle('hidden'); 
        emojiPicker.classList.add('hidden'); 
        const plusMenuDropdown = document.getElementById('plus-menu-dropdown');
        if (plusMenuDropdown) plusMenuDropdown.classList.add('hidden');
        if(!gifPicker.classList.contains('hidden') && document.getElementById('gif-tab-custom').classList.contains('active')) {
            renderCustomGifs();
        }
    });

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
            if (typeof window.handleUserOnline === 'function') window.handleUserOnline(data.username);
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
                
                let isOnlineState = document.visibilityState === 'visible';
                if (e && (e.type === 'pagehide' || e.type === 'beforeunload' || e.type === 'unload')) {
                    isOnlineState = false;
                }
                
                if (force || isOnlineState || e) {
                    window.db.collection('presence').doc(currentUser.toLowerCase()).set({
                        lastSeen: fb.firestore.FieldValue.serverTimestamp(),
                        isOnline: isOnlineState
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
            
            const isTrulyOnline = isOnline && !forceOffline && diffMs <= 75000;
            if (isTrulyOnline) return t.ls_online || 'Online';
            
            if (diffMs < 0) return t.ls_recently || 'gerade eben erst gesehen'; // Clock skew protection
            if (diffMs < 120000) return t.ls_recently || 'gerade eben erst gesehen';
            
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
            } else if (diffDays >= 3 && diffDays < 7) {
                return t.ls_week || 'zuletzt online vor 1 Woche';
            } else if (diffDays >= 7 && diffDays < 30) {
                return t.ls_month || 'zuletzt online vor 1 Monat';
            } else {
                return t.ls_long_time || 'zuletzt online vor langer Zeit';
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
        messages.clear(); // Preserve the shared store used by listeners and window.messages.
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
                if (data.starredMessages) window.starredMessages = data.starredMessages;
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
                        if (parsed.starredMessages) window.starredMessages = parsed.starredMessages;
                        // Push old data to cloud
                        saveUserData();
                        migrateOldMessages();
                    } catch(e) { console.error("Migration error", e); }
                }
            }
            
            // Also fetch own profile from users collection
            const userSnap = await window.db.collection('profiles').doc(currentUser.toLowerCase()).get();
            if (userSnap.exists) {
                const uData = userSnap.data();
                const selfProfile = { 
                    avatarUrl: uData.avatarUrl || null, 
                    profilePics: uData.profilePics || [], 
                    status: uData.bio || uData.status || 'Online', 
                    bio: uData.bio || uData.status || '', 
                    searchable: uData.searchable !== false, 
                    avatarVisibility: uData.avatarVisibility || 'all', 
                    callPrivacy: uData.callPrivacy || 'all', 
                    lastSeenPrivacy: uData.lastSeenPrivacy || 'all' 
                };
                users.set(currentUser, selfProfile);
                users.set(currentUser.toLowerCase(), selfProfile);
                users.set(currentUser.replace(/^@/,'').toLowerCase(), selfProfile);
                
                const searchableToggle = document.getElementById('setting-searchable');
                if (searchableToggle) searchableToggle.checked = uData.searchable !== false;
                
                const avatarVisSelect = document.getElementById('setting-avatar-visibility');
                if (avatarVisSelect) avatarVisSelect.value = uData.avatarVisibility || 'all';
                const callPrivSelect = document.getElementById('setting-call-privacy');
                if (callPrivSelect) callPrivSelect.value = uData.callPrivacy || 'all';

                const lastSeenToggle = document.getElementById('setting-last-seen');
                if (lastSeenToggle) lastSeenToggle.checked = (uData.lastSeenPrivacy !== 'none');
            } else {
                if (!users.has(currentUser)) users.set(currentUser, { avatarUrl: null, profilePics: [], status: 'Online', bio: '' });
            }
            
            migrateOldMessages();
        } catch(e) {
            console.error("Load UserData error", e);
            if (!users.has(currentUser)) users.set(currentUser, { avatarUrl: null, profilePics: [], status: 'Online', bio: '' });
        }
        
        const assistantId = window.DooriAssistant?.CHAT_ID;
        if (assistantId && !chatData.contacts.some(contact => contact.id === assistantId)) {
            chatData.contacts.unshift({ id: assistantId, name: assistantId, type: 'assistant', isSecret: false });
        }
        if (assistantId && !chatData.active_chats.some(chat => chat.id === assistantId)) {
            chatData.active_chats.unshift({ id: assistantId, name: assistantId, type: 'assistant', isSecret: false });
        }
        applyTranslation(currentLang);
        setupFirestoreListeners();
        startOnlineTracking();
        renderChatList();
        updateCurrentUserDisplay();
        if (typeof checkAppLock === 'function') checkAppLock();
        // selectChat('general', 'room');
        publishEvent({ type: 'user_login', username: currentUser });
    }

    window.renderPinnedMessage = function() {
        const banner = document.getElementById('pinned-message-banner');
        const textEl = document.getElementById('pinned-message-text');
        const unpinBtn = document.getElementById('unpin-message-btn');
        if (!currentChat || currentChat.type !== 'room' || !currentChat.pinnedMessage) {
            if(banner) banner.classList.add('hidden');
            return;
        }
        textEl.textContent = currentChat.pinnedMessage.text || '...';
        banner.classList.remove('hidden');
        banner.onclick = (e) => {
            if (e.target.id === 'unpin-message-btn') return;
            const msgEl = document.querySelector(`[data-id="${currentChat.pinnedMessage.id}"]`);
            if (msgEl) msgEl.scrollIntoView({behavior: 'smooth', block: 'center'});
        };
        const isAdmin = currentChat.admins && currentChat.admins.includes(currentUser);
        unpinBtn.style.display = isAdmin ? 'block' : 'none';
    };

    if (document.getElementById('unpin-message-btn')) {
        document.getElementById('unpin-message-btn').onclick = async () => {
            if (!currentChat || currentChat.type !== 'room') return;
            await window.db.collection('groups').doc(currentChat.id).update({ pinnedMessage: window.firebase.firestore.FieldValue.delete() });
        };
    }

    async function handleSecureJoinLink(joinParam) {
        try {
            const separator = joinParam.lastIndexOf('_');
            if (separator < 1) return;
            const groupId = joinParam.slice(0, separator);
            const token = joinParam.slice(separator + 1);
            
            const groupData = await authCall('groupInviteInfo', { groupId, token });
            if (groupData.members && groupData.members.includes(currentUser)) {
                window.history.replaceState({}, document.title, window.location.pathname);
                selectChat(groupId, 'room');
                return;
            }
            
            const modal = document.getElementById('join-link-confirm-modal');
            const avatar = document.getElementById('join-link-avatar');
            const name = document.getElementById('join-link-group-name');
            const cancelBtn = document.getElementById('cancel-join-link-btn');
            const confirmBtn = document.getElementById('confirm-join-link-btn');
            
            if (groupData.avatar) {
                avatar.innerHTML = safeHTML(`<img src="${groupData.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`);
            } else {
                avatar.innerHTML = safeHTML(groupData.name.charAt(0).toUpperCase());
            }
            name.textContent = groupData.name;
            
            modal.classList.remove('hidden');
            
            const closeIt = () => {
                modal.classList.add('hidden');
                window.history.replaceState({}, document.title, window.location.pathname);
            };
            cancelBtn.onclick = closeIt;
            
            confirmBtn.onclick = async () => {
                confirmBtn.disabled = true;
                try {
                    await authCall('acceptGroupInvitation', { groupId, token });
                    const joined = (await window.db.collection('groups').doc(groupId).get()).data();
                    if (!chatData.rooms.find(r => r.id === groupId)) chatData.rooms.push({ ...joined, type: 'room' });
                    saveUserData();
                    renderChatList();
                    closeIt();
                    selectChat(groupId, 'room');
                } catch (error) {
                    alert(authText('security_invite_error'));
                } finally { confirmBtn.disabled = false; }
            };
        } catch(err) { alert(authText('security_invite_error')); }
    }

    function setupFirestoreListeners() {
        unsubListeners.forEach(u => u());
        unsubListeners = [];
        
        // Listener 1: Private Messages (DMs & Saved)
        let initialDMLoad = true;
        let dmOldest = null;
        const roomOldest = new Map();
        let olderMessagesLoading = false;
        const mergeHistoricalDMs = snapshot => {
            snapshot.docs.forEach(doc => {
                const msg = { ...doc.data(), id: doc.id };
                const chatId = msg.chat_id === 'saved' ? 'saved' : normalizeUsername(normalizeUsername(msg.sender_username) === normalizeUsername(currentUser) ? msg.recipient_username : msg.sender_username);
                if (!messages.has(chatId)) messages.set(chatId, []);
                const list = messages.get(chatId);
                if (!list.some(item => item.id === msg.id)) list.push(msg);
                list.sort((a,b) => a.timestamp - b.timestamp);
            });
            saveUserData(); renderMessages();
        };
        const dmQuery = () => window.db.collection('messages')
            .where('participants', 'array-contains', normalizeUsername(currentUser))
            .where('isPublic', '==', false)
            .orderBy('timestamp', 'desc');
        const dmListener = dmQuery().limit(200).onSnapshot(snapshot => {
                if (snapshot.docs.length) dmOldest = snapshot.docs.at(-1);
                let changed = false;
                snapshot.docChanges().forEach(change => {
                    const msg = change.doc.data();
                    msg.id = change.doc.id;
                    const chatId = (msg.isPublic || msg.chat_id === 'saved') ? msg.chat_id : normalizeUsername(normalizeUsername(msg.sender_username) === normalizeUsername(currentUser) ? msg.recipient_username : msg.sender_username);
                    
                    // A limited live query also emits "removed" when an older item
                    // falls outside the window. Keep paged history in memory.
                    if (change.type === 'added' || change.type === 'modified') {
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
                            if (!initialDMLoad && change.type === 'added' && msg.mediaType === 'game_invite' && msg.sender_username !== currentUser) {
                                if (window.showDooriGameInvitePopup) window.showDooriGameInvitePopup(msg);
                            }
                        }
                        if (window.MessageCache && window.MessageCache.saveMessages) {
                            window.MessageCache.saveMessages(chatId, [msg]);
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
        const loadedRooms = new Set();
        const handleRoomSnapshot = (snapshot, roomId, historical = false) => {
                if (snapshot.docs.length) roomOldest.set(roomId, snapshot.docs.at(-1));
                const initialRoomLoad = !loadedRooms.has(roomId);
                let changed = false;
                snapshot.docChanges().forEach(change => {
                    const msg = change.doc.data();
                    msg.id = change.doc.id;
                    const chatId = msg.chat_id;
                    
                    if (change.type === 'added' || change.type === 'modified') {
                        if (!messages.has(chatId)) messages.set(chatId, []);
                        const chatMsgs = messages.get(chatId);
                        const existingIdx = chatMsgs.findIndex(m => m.id === msg.id);
                        if (existingIdx >= 0) chatMsgs[existingIdx] = msg;
                        else {
                            chatMsgs.push(msg);
                            if (!historical && change.type === 'added' && msg.sender_username !== currentUser && chatId !== currentChat?.id) {
                                unreadChats.add(chatId);
                            }
                        }
                        if (window.MessageCache && window.MessageCache.saveMessages) {
                            window.MessageCache.saveMessages(chatId, [msg]);
                        }
                        
                        if (!historical && !initialRoomLoad && change.type === 'added' && !msg.silent && msg.sender_username !== currentUser && !blockedContacts.has(msg.sender_username)) {
                            const isMention = msg.mentions && msg.mentions.includes(currentUser.toLowerCase());
                            if (isMention && (!currentChat || chatId !== currentChat.id)) {
                                mentionedChats.add(chatId);
                            }
                            if (!mutedChats.has(chatId) || isMention) {
                                if (msg.mediaType === 'buzz') {
                                    if (typeof triggerBuzzShake === 'function') triggerBuzzShake();
                                } else {
                                    playSound(isMention);
                                    if (isMention && document.hidden && window.Notification && Notification.permission === "granted") {
                                        const hidePreview = document.getElementById('setting-hide-preview') ? document.getElementById('setting-hide-preview').checked : false;
                                        const notifBody = hidePreview ? (msg.sender_username + ": " + (window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS.en).sec_chats) : (msg.sender_username + ": " + msg.text);
                                        new Notification("Erwähnung in " + chatId, { body: notifBody });
                                    }
                                }
                            }
                        }
                        changed = true;
                    }
                });
                loadedRooms.add(roomId);
                if (changed) {
                    messages.forEach((msgs, id) => msgs.sort((a,b) => a.timestamp - b.timestamp));
                    saveUserData();
                    renderChatList();
                    renderMessages();
                }
                    };
        const roomListener = window.db.collection('messages').where('isPublic', '==', true)
            .where('chat_id', '==', 'general').orderBy('timestamp', 'desc').limit(50)
            .onSnapshot(snapshot => handleRoomSnapshot(snapshot, 'general'));
        const groupMessageListeners = new Map();
        unsubListeners.push(() => groupMessageListeners.forEach(unsubscribe => unsubscribe()));

        // Listener 3: Groups
        const groupsListener = window.db.collection('groups')
            .where('members', 'array-contains', currentUser)
            .onSnapshot(snapshot => {
                let changed = false;
                snapshot.docChanges().forEach(change => {
                    const group = change.doc.data();
                    if (change.type === 'removed') {
                        groupMessageListeners.get(group.id)?.();
                        groupMessageListeners.delete(group.id);
                        messages.delete(group.id);
                    } else if (!groupMessageListeners.has(group.id)) {
                        groupMessageListeners.set(group.id, window.db.collection('messages')
                            .where('isPublic', '==', true).where('chat_id', '==', group.id)
                            .orderBy('timestamp', 'desc').limit(50)
                            .onSnapshot(snapshot => handleRoomSnapshot(snapshot, group.id)));
                    }
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

        messagesContainer.onscroll = async () => {
            if (messagesContainer.scrollTop > 50 || olderMessagesLoading || !currentChat) return;
            olderMessagesLoading = true;
            const chatId = currentChat.id;
            const currentLimit = visibleMessageLimits.get(chatId) || PAGE_SIZE;
            const allMsgs = messages.get(chatId) || [];
            const oldScrollHeight = messagesContainer.scrollHeight;
            const oldScrollTop = messagesContainer.scrollTop;

            try {
                // 1. If we already have older messages in memory that are currently hidden by limit
                if (allMsgs.length > currentLimit) {
                    visibleMessageLimits.set(chatId, currentLimit + PAGE_SIZE);
                    renderMessages();
                    messagesContainer.scrollTop = oldScrollTop + (messagesContainer.scrollHeight - oldScrollHeight);
                    olderMessagesLoading = false;
                    return;
                }

                // 2. Check local MessageCache before querying Firestore
                const oldestMsg = allMsgs[0];
                const oldestTimestamp = oldestMsg ? oldestMsg.timestamp : Date.now();
                if (window.MessageCache && window.MessageCache.getOlderMessages) {
                    const cachedOlder = await window.MessageCache.getOlderMessages(chatId, oldestTimestamp, PAGE_SIZE);
                    if (cachedOlder && cachedOlder.length > 0) {
                        const newAll = [...cachedOlder, ...allMsgs];
                        const seen = new Set();
                        const deduped = [];
                        newAll.forEach(m => {
                            if (!seen.has(m.id)) { seen.add(m.id); deduped.push(m); }
                        });
                        deduped.sort((a,b) => a.timestamp - b.timestamp);
                        messages.set(chatId, deduped);
                        visibleMessageLimits.set(chatId, currentLimit + cachedOlder.length);
                        renderMessages();
                        messagesContainer.scrollTop = oldScrollTop + (messagesContainer.scrollHeight - oldScrollHeight);
                        olderMessagesLoading = false;
                        return;
                    }
                }

                // 3. Query Firestore for older messages
                if (currentChat.type === 'room') {
                    const cursor = roomOldest.get(currentChat.id); if (!cursor) return;
                    const page = await window.db.collection('messages').where('isPublic', '==', true)
                        .where('chat_id', '==', currentChat.id).orderBy('timestamp', 'desc')
                        .startAfter(cursor).limit(PAGE_SIZE).get();
                    if (!page.empty) {
                        handleRoomSnapshot(page, currentChat.id, true);
                        if (window.MessageCache && window.MessageCache.saveMessages) {
                            window.MessageCache.saveMessages(chatId, page.docs.map(d => ({ ...d.data(), id: d.id })));
                        }
                        visibleMessageLimits.set(chatId, currentLimit + page.docs.length);
                        renderMessages();
                        messagesContainer.scrollTop = oldScrollTop + (messagesContainer.scrollHeight - oldScrollHeight);
                    } else {
                        roomOldest.delete(currentChat.id);
                    }
                } else {
                    if (!dmOldest) return;
                    const page = await dmQuery().startAfter(dmOldest).limit(50).get();
                    if (!page.empty) {
                        dmOldest = page.docs.at(-1);
                        mergeHistoricalDMs(page);
                        if (window.MessageCache && window.MessageCache.saveMessages) {
                            const dmMsgs = page.docs.map(d => {
                                const m = { ...d.data(), id: d.id };
                                const cId = m.chat_id === 'saved' ? 'saved' : (m.sender_username === currentUser ? m.recipient_username : m.sender_username);
                                return { ...m, chatId: cId };
                            });
                            const byChat = new Map();
                            dmMsgs.forEach(m => {
                                if (!byChat.has(m.chatId)) byChat.set(m.chatId, []);
                                byChat.get(m.chatId).push(m);
                            });
                            byChat.forEach((mList, cId) => window.MessageCache.saveMessages(cId, mList));
                        }
                        visibleMessageLimits.set(chatId, currentLimit + 50);
                        renderMessages();
                        messagesContainer.scrollTop = oldScrollTop + (messagesContainer.scrollHeight - oldScrollHeight);
                    } else {
                        dmOldest = null;
                    }
                }
            } catch (error) { console.error('Older messages could not be loaded', error); }
            finally { olderMessagesLoading = false; }
        };
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
            dmPins: dmPins,
            starredMessages: window.starredMessages || []
        };
        
        window.db.collection('userData').doc(currentUser.toLowerCase()).set(dataToSave, { merge: true })
            .catch(e => console.error("Save UserData Error", e));
            
        const p = users.get(currentUser);
        if (p) {
            const isSearchable = document.getElementById('setting-searchable') ? document.getElementById('setting-searchable').checked : true;

            const avatarVis = document.getElementById('setting-avatar-visibility') ? document.getElementById('setting-avatar-visibility').value : 'all';
            const callPriv = document.getElementById('setting-call-privacy') ? document.getElementById('setting-call-privacy').value : 'all';
            const lsVal = document.getElementById('setting-last-seen') ? (document.getElementById('setting-last-seen').checked ? 'all' : 'none') : 'all';
            window.db.collection('profiles').doc(currentUser.toLowerCase()).set({ avatarUrl: p.avatarUrl || null, profilePics: p.profilePics || [], searchable: isSearchable, avatarVisibility: avatarVis, callPrivacy: callPriv, lastSeenPrivacy: lsVal }, { merge: true })
                .catch(e => console.error("Save User Profile Error", e));
            
            // Also update the local Map so that reopening settings gets the new values without reload
            p.searchable = isSearchable;
            p.avatarVisibility = avatarVis;
            p.callPrivacy = callPriv;
            p.lastSeenPrivacy = lsVal;
        }
    }

    const missingUsersToFetch = new Set();
    window.fetchMissingProfile = function(username) {
        if (!username || typeof username !== 'string') return;
        const clean = username.trim();
        const cleanNoAt = clean.replace(/^@/, '').toLowerCase();
        if (missingUsersToFetch.has(cleanNoAt)) return;
        missingUsersToFetch.add(cleanNoAt);
        window.db.collection('profiles').doc(cleanNoAt).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                users.set(cleanNoAt, data);
                users.set('@' + cleanNoAt, data);
                users.set(clean, data);
                users.set(username, data);
                renderChatList();
                renderMessages();
                if (typeof updateText === 'function') updateText();
            }
        }).catch(e => console.error(e));
    };

    function renderMessages() {
        if (!currentChat && window.currentChat) currentChat = window.currentChat;
        if (!currentChat) return;
        const msgMap = window.messages || messages;
        const wantedChatKey = currentChat.type === 'dm' ? normalizeUsername(currentChat.id) : currentChat.id;
        const mergedMessages = new Map();
        msgMap.forEach((list, key) => {
            const normalizedKey = currentChat.type === 'dm' ? normalizeUsername(key) : key;
            if (normalizedKey === wantedChatKey && Array.isArray(list)) {
                list.forEach(message => { if (message?.id) mergedMessages.set(message.id, message); });
            }
        });
        const allMsgs = [...mergedMessages.values()].sort((a, b) => a.timestamp - b.timestamp);
        const limitMap = window.visibleMessageLimits || visibleMessageLimits;
        const limit = limitMap.get(currentChat.id) || PAGE_SIZE;
        const msgs = allMsgs.length > limit ? allMsgs.slice(-limit) : allMsgs;
        const now = Date.now();
        const activeLang = window.currentLang || currentLang || 'en';
        const t = TRANSLATIONS[activeLang] || TRANSLATIONS['en'];
        
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
            msg.sender_username = String(msg.sender_username || '');
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
                contentHtml += `<div class="reply-preview"><span class="reply-preview-sender">${escapeHTML(msg.replyTo.sender)}</span>${escapeHTML(msg.replyTo.text)}</div>`;
            }
            
            if (msg.mediaType === 'image') { contentHtml += `<img src="${msg.mediaUrl}" loading="lazy" decoding="async" style="max-width:100%; border-radius:8px; margin-bottom:5px;"><br>${escapeHTML(msg.text)}`; }
            else if (msg.mediaType === 'video') { contentHtml += renderCustomPlayer(getCachedBlobUrl(msg), 'video') + (msg.text ? `<br>${escapeHTML(msg.text)}`:''); }
            else if (msg.mediaType === 'audio') { contentHtml += renderCustomPlayer(getCachedBlobUrl(msg), 'audio') + (msg.text ? `<br>${escapeHTML(msg.text)}`:''); }
            else if (msg.mediaType === 'gif') { contentHtml += `<img src="${msg.mediaUrl}" loading="lazy" decoding="async" class="gif-msg"><br>${escapeHTML(msg.text)}`; }
            else if (msg.mediaType === 'buzz') { contentHtml += `<div class="buzz-message">⚡ BUZZ! ⚡</div>`; }
            else if (msg.mediaType === 'game_invite' && window.renderDooriGameInvite) { contentHtml += window.renderDooriGameInvite(msg); }
            else if (msg.mediaType === 'game_status' && window.renderDooriGameStatus) { contentHtml += window.renderDooriGameStatus(msg); }
            else if (msg.mediaType === 'doodle_invite') {
                contentHtml += `<div class="doodle-invite-msg" style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; text-align: center; margin-top: 5px;">🎨 <b>${t.doodle_title || 'Doodle Einladung'}</b><br><br><button class="submit-btn" style="padding: 8px 15px; font-size: 14px;" ${actionAttrs("acceptDoodleInvite", msg.sender_username)}>${t.doodle_btn_accept || 'Mitzeichnen'}</button>
                    <button class="submit-btn" style="padding: 8px 15px; font-size: 14px; background: var(--bg-red); color: white; margin-left: 5px;" ${actionAttrs("rejectDoodleInvite", msg.sender_username)}>${t.doodle_btn_reject || 'Ablehnen'}</button></div>`;
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
                let processedText = escapeHTML(msg.text || '');
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
            const isStarred = window.isMessageStarred ? window.isMessageStarred(msg.id) : false;
            const starHtml = isStarred ? '<span class="msg-star-badge" title="Markiert">⭐</span>' : '';
            
            const hash = (msg.text || '') + (msg.edited ? '1':'0') + (isStarred ? 's1':'s0') + msg.mediaType + timeStr + JSON.stringify(msg.reactions||{}) + (msg.replyTo?'1':'0') + msg.type + msg.invite_status + msg.game_status + (msg.read ? '1':'0') + (msg.deletedFor ? JSON.stringify(msg.deletedFor) : '');
            
            let expectedInner = '';
            let className = '';

            if (msg.type === 'group_invite') {
                className = msg.sender_username === currentUser ? 'message sent' : 'message received';
                let inviteText = `💌 Einladung zur Gruppe: <b>${escapeHTML(msg.invite_group_name)}</b>`;
                let btnHtml = '';
                if (msg.invite_status === 'pending') {
                    if (msg.sender_username !== currentUser) {
                        btnHtml = `<div style="margin-top:10px; display:flex; gap:10px; justify-content:center;">
                            <button class="submit-btn" style="padding:5px 10px; font-size:12px;" ${actionAttrs("acceptGroupInvite", msg.invite_group_id, msg.id, msg.sender_username, msg.invite_group_name)}>${t.btn_accept || 'Annehmen'}</button>
                            <button class="danger-btn" style="padding:5px 10px; font-size:12px;" ${actionAttrs("declineGroupInvite", msg.invite_group_id, msg.id, msg.sender_username, msg.invite_group_name)}>${t.btn_decline || 'Ablehnen'}</button>
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
                        <div class="sender">${escapeHTML(msg.sender_username)}</div>
                        <div class="text" style="text-align:center;">
                            ${inviteText}
                            ${btnHtml}
                        </div>
                        <div class="time">${timeStr}${starHtml}</div>
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
                expectedInner = `<div class="system-message-text">${escapeHTML(msg.system_target)} ${actionText}</div>`;

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
                let p = users.get(msg.sender_username);
                if (!p) {
                    p = {};
                    if(window.fetchMissingProfile) window.fetchMissingProfile(msg.sender_username);
                }
                const aUrl = window.getAllowedProfilePics ? (window.getAllowedProfilePics(msg.sender_username, p)[0] || null) : p.avatarUrl;
                let msgAvatar = aUrl ? `<img src="${aUrl}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:5px;cursor:pointer;" ${actionAttrs("showUserProfileModal", msg.sender_username)}>` : `<div style="width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.1);display:inline-flex;align-items:center;justify-content:center;font-size:10px;vertical-align:middle;margin-right:5px;cursor:pointer;" ${actionAttrs("showUserProfileModal", msg.sender_username)}>${msg.sender_username.charAt(0).toUpperCase()}</div>`;
                expectedInner = `<div class="message-sender" style="display:flex;align-items:center;">${msgAvatar}<span style="cursor:pointer;" ${actionAttrs("showUserProfileModal", msg.sender_username)}>${isSentByMe ? 'Du' : msg.sender_username}</span></div><div class="message-bubble"${styleAttr}><div>${contentHtml}</div></div>${reactionsHtml}<div class="message-time">${ttlHtml} ${statusHtml} ${timeStr}${ticks}${starHtml}</div>`;
    
                className = `message ${isSentByMe ? 'sent' : 'received'}`;
            }
            
            let div = domNodes.get(msg.id);
            if (div) {
                if (div.dataset.hash !== hash) {
                    div.className = className;
                    div.innerHTML = safeHTML(expectedInner);
                    div.dataset.hash = hash;
                }
            } else {
                div = document.createElement('div');
                div.className = className;
                div.dataset.id = msg.id;
                div.dataset.hash = hash;
                div.innerHTML = safeHTML(expectedInner);
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
    window.renderMessages = renderMessages;

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

                const isMsgStarred = window.isMessageStarred ? window.isMessageStarred(msg.id) : false;
                addOpt(isMsgStarred ? (t['ctx_unstar'] || '⭐ Markierung entfernen') : (t['ctx_star'] || '⭐ Nachricht markieren'), false, () => {
                    if (window.toggleStarMessage) window.toggleStarMessage(msg);
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
        forwardContactsList.innerHTML = safeHTML('');
        const allChats = [
            ...Array.from(users.keys()).filter(u => u !== currentUser).map(c => ({ id: c, name: '@'+c, type: 'dm', isContact: true })),
            ...Array.from(rooms.values()).map(r => ({ id: r.id, name: r.name, type: r.type, isContact: false }))
        ];
        
        allChats.forEach(chat => {
            if (filter && !chat.name.toLowerCase().includes(filter)) return;
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = safeHTML(`
                <div class="avatar">${chat.isContact ? chat.name.charAt(1).toUpperCase() : chat.name.charAt(0).toUpperCase()}</div>
                <div style="flex:1;">
                    <div class="chat-item-name">${escapeHTML(chat.name)}</div>
                </div>
            `);
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
                            Object.assign(payload, messageDestination(chat, currentUser));
                            payload.timestamp = Date.now();
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
        if (!currentChat || scheduleTime) return false;
        const targetChat = { ...currentChat, members: [...(currentChat.members || [])] };
        const destination = messageDestination(targetChat, currentUser);
        const sender = currentUser;
        if (targetChat.type === 'channel' && !targetChat.isAdmin) return false;
        if (blockedContacts.has(targetChat.id)) return false;
        if (editingMessageId && !mediaType) { 
            try {
                await window.db.collection('messages').doc(editingMessageId).update({ text: text, edited: true });
            } catch(e) { console.error("Edit failed", e); }
            editingMessageId = null; 
            return true;
        }

        let ttl = parseInt(ttlSelect.value) || 0; let expiresAt = null; if (ttl > 0 && targetChat.type === 'dm') expiresAt = null; else if(ttl > 0) expiresAt = Date.now() + (ttl * 1000);
        let processedText = text; if(targetChat.isSecret && !mediaType && text) processedText = await encryptMessage(text);

        const mentions = targetChat.type === 'room' ? collectMentions(processedText, targetChat.members) : [];

        const msgObj = {
            id: Date.now().toString() + Math.random().toString(36).substr(2,9),
            sender_username: sender,
            ...destination,
            text: processedText, mediaType, mediaUrl, ttl, expires_at: expiresAt, silent, isSecret: !!targetChat.isSecret, edited: false,
            timestamp: scheduleTime || Date.now(),
            read: false,
            reactions: {},
            mentions: mentions,
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
            const existingMsgs = messages.get(targetChat.id) || [];
            existingMsgs.forEach(m => {
                if (doodleTypes.includes(m.mediaType) || (m.text && m.text.includes('Doodle Einladung abgelehnt'))) {
                    if (window.db) window.db.collection('messages').doc(m.id).delete().catch(()=>{});
                }
            });
        }

        return await executeSendMessage(msgObj);
    }

    async function executeSendMessage(msgObj) {
        if (new TextEncoder().encode(JSON.stringify(msgObj)).length > 700 * 1024) {
            alert(authText('security_media_limit'));
            return false;
        }
        const docData = { ...msgObj };
        try {
            await window.db.collection('messages').doc(msgObj.id).set(docData);
            if (!msgObj.silent) playSound();
            return true;
        } catch (e) {
            console.error("Error saving to Firestore", e);
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_send_msg || 'Nachricht konnte nicht gesendet werden (Offline?).');
            return false;
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

    function playSound(isMention = false) { 
        const soundEnabled = document.getElementById('setting-sound') ? document.getElementById('setting-sound').checked : true;
        if(!soundEnabled && !isMention) return; 

        // Haptic feedback / vibration if enabled
        const vibrateEnabled = document.getElementById('setting-vibrate') ? document.getElementById('setting-vibrate').checked : true;
        if (vibrateEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(isMention ? [100, 50, 100] : 60); } catch(e) {}
        }

        try {
            let ctx = globalAudioCtx; 
            if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); globalAudioCtx = ctx; } 
            if (ctx.state === 'suspended') ctx.resume(); 

            const soundType = (document.getElementById('setting-sound-type') ? document.getElementById('setting-sound-type').value : (localStorage.getItem('doori_sound_type') || 'chime'));

            if (isMention) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 1200;
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                osc.start(); osc.stop(ctx.currentTime + 0.15);
                setTimeout(() => {
                    if (ctx.state === 'suspended') ctx.resume();
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.frequency.value = 1400;
                    gain2.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                    osc2.start(); osc2.stop(ctx.currentTime + 0.2);
                }, 120);
                return;
            }

            if (soundType === 'soft') {
                // Gentle bell sine wave
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(); osc.stop(ctx.currentTime + 0.4);
            } else if (soundType === 'bell') {
                // Crystal bell chord (two harmonic sines)
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.type = 'sine';
                osc2.type = 'sine';
                osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
                osc2.frequency.setValueAtTime(1320, ctx.currentTime); // E6
                gain.gain.setValueAtTime(0.25, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc1.connect(gain); osc2.connect(gain);
                gain.connect(ctx.destination);
                osc1.start(); osc2.start();
                osc1.stop(ctx.currentTime + 0.5); osc2.stop(ctx.currentTime + 0.5);
            } else if (soundType === 'classic') {
                // Classic standard beep
                const osc = ctx.createOscillator();
                osc.connect(ctx.destination);
                osc.frequency.value = 800;
                osc.start(); osc.stop(ctx.currentTime + 0.1);
            } else {
                // Modern Chime (dual tone cheerful ascending chime)
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'triangle';
                osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
                gain1.gain.setValueAtTime(0.3, ctx.currentTime);
                gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
                osc1.connect(gain1); gain1.connect(ctx.destination);
                osc1.start(); osc1.stop(ctx.currentTime + 0.18);

                setTimeout(() => {
                    if (ctx.state === 'suspended') ctx.resume();
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'triangle';
                    osc2.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
                    gain2.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.28);
                    osc2.connect(gain2); gain2.connect(ctx.destination);
                    osc2.start(); osc2.stop(ctx.currentTime + 0.28);
                }, 90);
            }
        } catch(e) {
            console.warn("Audio play error", e);
        }
    }

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const text = messageInput.value.trim();
        if (!text) return;
        messageInput.value = '';
        if (currentChat?.type === 'assistant') await window.DooriAssistant?.send(text);
        else sendMessage(text);
    });
    window.DooriAssistant?.initialize();

    // Recording
    let isRecordingCancelled = false;
    function getRecordingOptions(type) {
        const candidates = type === 'video'
            ? ['video/mp4;codecs=h264,aac', 'video/webm;codecs=vp8,opus', 'video/webm']
            : ['audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'];
        const mimeType = candidates.find(candidate => MediaRecorder.isTypeSupported?.(candidate));
        const options = mimeType ? { mimeType } : {};
        if (type === 'video') options.videoBitsPerSecond = 100000;
        return options;
    }

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
            
            const options = getRecordingOptions(type);
            mediaRecorder = Object.keys(options).length ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
            
            let chunks = [];
            mediaRecorder.ondataavailable = e => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };
            mediaRecorder.onstop = async () => {
                const recordedMimeType = mediaRecorder.mimeType || options.mimeType || (type === 'video' ? 'video/webm' : 'audio/webm');
                const blob = new Blob(chunks, { type: recordedMimeType });
                stream.getTracks().forEach(track => track.stop());

                if (!blob.size) {
                    alert((TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_empty_recording);
                    return;
                }
                
                // Show uploading indicator
                const uploadIndicator = document.createElement('div');
                uploadIndicator.id = 'upload-indicator';
                uploadIndicator.style.cssText = 'position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--accent); color: #000; padding: 10px 20px; border-radius: 20px; font-weight: bold; z-index: 1000; box-shadow: 0 4px 15px rgba(0,0,0,0.3);';
                uploadIndicator.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).recording_processing;
                document.body.appendChild(uploadIndicator);

                const reader = new FileReader();
                reader.onloadend = () => { 
                    if(document.getElementById('upload-indicator')) document.getElementById('upload-indicator').remove();
                    sendMessage('', type, reader.result); 
                };
                reader.readAsDataURL(blob);
            };
            // Periodic chunks avoid empty recordings on Safari/iOS and Chromium.
            mediaRecorder.start(250);
            if (type === 'video') { liveVideoPreview.srcObject = stream; liveVideoPreview.classList.remove('hidden'); liveVideoPreview.play().catch(e => console.error(e)); }
            recordingPreview.classList.remove('hidden'); messageForm.style.opacity = '0';
            recordingStartTime = Date.now();
            recordingInterval = setInterval(() => { const sec = Math.floor((Date.now() - recordingStartTime)/1000); recordingTimeEl.textContent = `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`; }, 1000);
        } catch(e) { 
            console.error("Recording error:", e);
            alert((TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_recording_failed);
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

    async function loadSelectedDMHistory(id) {
        const canonical = value => '@' + String(value || '').replace(/^@/, '').toLowerCase();
        const wanted = canonical(id);
        let cursor = null;
        let pages = 0;
        const found = [];
        try {
            while (pages < 5 && found.length < PAGE_SIZE) {
                let query = window.db.collection('messages')
                    .where('participants', 'array-contains', normalizeUsername(currentUser))
                    .where('isPublic', '==', false)
                    .orderBy('timestamp', 'desc');
                if (cursor) query = query.startAfter(cursor);
                const page = await query.limit(200).get();
                if (page.empty) break;
                cursor = page.docs.at(-1);
                page.docs.forEach(doc => {
                    const msg = { ...doc.data(), id: doc.id };
                    const counterpart = msg.chat_id === 'saved' ? 'saved' :
                        (canonical(msg.sender_username) === canonical(currentUser) ? msg.recipient_username : msg.sender_username);
                    if (canonical(counterpart) === wanted) found.push(msg);
                });
                pages++;
                if (page.docs.length < 200) break;
            }
            if (!found.length) return;
            const existing = messages.get(id) || [];
            const merged = new Map(existing.map(message => [message.id, message]));
            found.forEach(message => merged.set(message.id, message));
            const list = [...merged.values()].sort((a, b) => a.timestamp - b.timestamp);
            messages.set(id, list);
            if (window.MessageCache?.saveMessages) await window.MessageCache.saveMessages(id, list);
            if (currentChat?.id === id) renderMessages();
        } catch (error) {
            console.error('Selected chat history could not be loaded', error);
        }
    }

    function selectChat(id, type) {
        // Switch to chat view
        if (prefersSplitMessenger()) document.getElementById('start-page').classList.add('active');
        else document.getElementById('start-page').classList.remove('active');
        document.getElementById('chat-page').classList.add('active');
        chatLayout?.classList.toggle('split-view', prefersSplitMessenger());
        chatLayout?.classList.remove('awaiting-chat');
        // Fullscreen behavior removed per user request

        let chat = chatData.personal.find(c=>c.id===id) || chatData.rooms.find(c=>c.id===id) || chatData.contacts.find(c=>c.id===id) || chatData.active_chats.find(c=>c.id===id);
        if (!chat && type === 'dm') { chat = { id, name: id, type: 'dm', isSecret: false }; chatData.active_chats.push(chat); }
        if (!chat) return;
        currentChat = chat;
        window.currentChat = chat;
        document.body.classList.toggle('assistant-chat-open', type === 'assistant');
        if (type !== 'assistant') document.body.classList.remove('assistant-thinking');
        document.querySelector('.composer-tools-row')?.classList.toggle('assistant-mode-hidden', type === 'assistant');
        
        currentChatName.textContent = getTranslatedChatName(chat);
        const detailsName = document.getElementById('details-chat-name');
        const detailsStatus = document.getElementById('details-chat-status');
        const detailsAvatar = document.getElementById('details-chat-avatar');
        if (detailsName) detailsName.textContent = getTranslatedChatName(chat);
        if (detailsStatus) detailsStatus.textContent = currentChatStatus.textContent || '';
        if (type === 'assistant') currentChatAvatar.textContent = window.DooriAssistant?.getAvatar?.() || '👩‍💻';
        else if (type === 'saved') currentChatAvatar.textContent = '💾';
        else if (type === 'room' || type === 'channel') {
            currentChatAvatar.textContent = '#';
        }
        else {
            const profile = users.get(chat.name);
            const aUrl = getAllowedAvatarUrl(chat.name, profile);
            if (aUrl) { currentChatAvatar.innerHTML = safeHTML(`<img src="${aUrl}" class="avatar-img">`); }
            else { currentChatAvatar.textContent = chat.name.replace('@','').charAt(0).toUpperCase(); }
        }
        if (detailsAvatar) detailsAvatar.innerHTML = currentChatAvatar.innerHTML;

        const statusBadge = document.getElementById('current-chat-status-badge');
        if (statusBadge) {
            if (type === 'dm') {
                const profile = getUserProfile(chat.name || chat.id);
                const sText = profile && (profile.bio || profile.status) ? (profile.bio || profile.status) : '';
                if (sText && sText.toLowerCase() !== 'online') {
                    const pKey = typeof getPresetKeyFromStatus === 'function' ? getPresetKeyFromStatus(sText) : null;
                    const activeLang = window.currentLang || currentLang || 'en';
                    const t = TRANSLATIONS[activeLang] || TRANSLATIONS['en'] || {};
                    statusBadge.textContent = `(${pKey && t[pKey] ? t[pKey] : sText})`;
                    statusBadge.classList.remove('hidden');
                } else {
                    statusBadge.classList.add('hidden');
                }
            } else {
                statusBadge.classList.add('hidden');
            }
        }

        const bBtn = document.getElementById('buzz-btn');
        const iBtn = document.getElementById('group-info-btn');
        if (type === 'room' || type === 'channel' || type === 'assistant') {
            if (bBtn) bBtn.style.display = 'none';
            if (iBtn) iBtn.style.display = type === 'assistant' ? 'none' : 'flex';
        } else {
            if (bBtn) bBtn.style.display = 'flex';
            if (iBtn) iBtn.style.display = 'none';
        }
        if (type === 'assistant') window.DooriAssistant?.activate();
        else window.DooriAssistant?.updateControls();

        if (window.currentGroupListener) { window.currentGroupListener(); window.currentGroupListener = null; }
        if (window.currentChatStatusListener) { window.currentChatStatusListener(); window.currentChatStatusListener = null; }
        if (window.currentChatStatusUpdateInterval) { clearInterval(window.currentChatStatusUpdateInterval); window.currentChatStatusUpdateInterval = null; }
        if (type === 'room') {
            window.currentGroupListener = window.db.collection('groups').doc(id).onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    currentChat.pinnedMessage = data.pinnedMessage;
                    currentChat.inviteToken = data.inviteToken;
                    currentChat.isReadOnly = data.isReadOnly;
                    window.renderPinnedMessage();
                }
            });
        } else {
            const banner = document.getElementById('pinned-message-banner');
            if(banner) banner.classList.add('hidden');
        }

        const videoBtn = document.getElementById('video-call-btn');
        const callContainer = document.getElementById('call-buttons-container');
        if (type === 'dm') {
            const sidebar = document.getElementById('group-info-sidebar');
            if (sidebar) sidebar.classList.add('hidden');
            currentChatStatus.style.display = 'inline-block'; if (callBtn) callBtn.style.display = 'flex';
            if (videoBtn) videoBtn.style.display = 'flex';
            if (callContainer) callContainer.style.display = 'flex';
            currentChatStatus.textContent = '...';
            
            // Realtime listener for online status
            if (window.currentChatStatusListener) {
                window.currentChatStatusListener(); // Unsubscribe previous listener
            }
            
            if (window.currentChatStatusUpdateInterval) {
                clearInterval(window.currentChatStatusUpdateInterval);
            }
            if (window.currentChatStatusUserListener) {
                window.currentChatStatusUserListener();
                window.currentChatStatusUserListener = null;
            }

            const updateText = () => {
                if (!window.currentChatLastSeenData) return;
                const data = window.currentChatLastSeenData;
                const otherProfile = getUserProfile(id);
                const privacy = (otherProfile && otherProfile.lastSeenPrivacy) ? otherProfile.lastSeenPrivacy : 'all';
                const amIContact = (data.chatData && data.chatData.contacts && data.chatData.contacts.some(c => c.id === currentUser));

                if (privacy === 'none') {
                    currentChatStatus.textContent = (window.TRANSLATIONS[window.currentLang] && window.TRANSLATIONS[window.currentLang].msg_not_visible) ? window.TRANSLATIONS[window.currentLang].msg_not_visible : 'Nicht sichtbar';
                } else if (privacy === 'contacts' && !amIContact) {
                    currentChatStatus.textContent = (window.TRANSLATIONS[window.currentLang] && window.TRANSLATIONS[window.currentLang].msg_not_visible) ? window.TRANSLATIONS[window.currentLang].msg_not_visible : 'Nicht sichtbar';
                } else {
                    const lastSeenMs = window.currentChatLastSeenData.lastSeen ? (typeof window.currentChatLastSeenData.lastSeen.toMillis === 'function' ? window.currentChatLastSeenData.lastSeen.toMillis() : (window.currentChatLastSeenData.lastSeen.seconds ? window.currentChatLastSeenData.lastSeen.seconds * 1000 : 0)) : 0;
                    const diffMs = Date.now() - lastSeenMs;
                    const forceOffline = diffMs > 75000; // 75 seconds threshold
                    currentChatStatus.textContent = window.formatLastSeenTime(window.currentChatLastSeenData.lastSeen, window.currentChatLastSeenData.isOnline, forceOffline);
                }
            };

            window.currentChatStatusUserListener = window.db.collection('profiles').doc(id.toLowerCase()).onSnapshot(uDoc => {
                if (uDoc.exists) {
                    const uData = uDoc.data();
                    users.set(id, uData);
                    users.set(id.toLowerCase(), uData);
                    updateText();
                    const statusBadge = document.getElementById('current-chat-status-badge');
                    if (statusBadge && currentChat && currentChat.id === id) {
                        const sText = (uData && (uData.bio || uData.status)) ? (uData.bio || uData.status) : '';
                        if (sText && sText.toLowerCase() !== 'online') {
                            const pKey = typeof getPresetKeyFromStatus === 'function' ? getPresetKeyFromStatus(sText) : null;
                            const activeLang = window.currentLang || currentLang || 'en';
                            const t = TRANSLATIONS[activeLang] || TRANSLATIONS['en'] || {};
                            statusBadge.textContent = `(${pKey && t[pKey] ? t[pKey] : sText})`;
                            statusBadge.classList.remove('hidden');
                        } else {
                            statusBadge.classList.add('hidden');
                        }
                    }
                }
            });

            window.currentChatStatusListener = window.db.collection('presence').doc(id.toLowerCase()).onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    window.currentChatLastSeenData = data;
                    
                    updateText();
                    
                    if (window.currentChatStatusUpdateInterval) {
                        clearInterval(window.currentChatStatusUpdateInterval);
                    }
                    window.currentChatStatusUpdateInterval = setInterval(updateText, 5000); // Update text every 5s
                } else {
                    currentChatStatus.textContent = '';
                }
            }, err => {
                console.error("Status Listener Error:", err);
                currentChatStatus.textContent = '';
            });
        } else {
            if (callBtn) callBtn.style.display = 'none';
            if (videoBtn) videoBtn.style.display = 'none';
            if (callContainer) callContainer.style.display = 'none';
        }
        if (!visibleMessageLimits.has(id)) {
            visibleMessageLimits.set(id, PAGE_SIZE);
        }
        if ((!messages.has(id) || messages.get(id).length === 0) && window.MessageCache && window.MessageCache.getLatestMessages) {
            window.MessageCache.getLatestMessages(id, PAGE_SIZE).then(cached => {
                if (cached && cached.length > 0 && currentChat && currentChat.id === id) {
                    const existing = messages.get(id) || [];
                    if (existing.length === 0) {
                        messages.set(id, cached);
                        renderMessages();
                    }
                }
            }).catch(()=>{});
        }
        renderMessages();
        if (type === 'dm') loadSelectedDMHistory(id);
        markMessagesAsRead(id);
    };

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
    const toggleChatHeaderMenu = () => {
        if (!currentChat || !chatHeaderDropdown) return;
        const isBlocked = blockedContacts.has(currentChat.id);
        const isMuted = mutedChats.has(currentChat.id);
        const isContact = chatData.contacts.some(c => c.id === currentChat.id);
        const t = typeof TRANSLATIONS !== 'undefined' ? (TRANSLATIONS[currentLang] || TRANSLATIONS.en) : {};
        dropdownAddContact.innerHTML = safeHTML('👤 ' + (t.ctx_add_contact || 'Zu Kontakten hinzufügen'));
        dropdownClearChat.innerHTML = safeHTML('🗑️ ' + (t.ctx_clear_chat || 'Chat leeren'));
        dropdownMuteUser.innerHTML = safeHTML(isMuted ? '🔔 ' + (t.ctx_unmute_user || 'Stummschaltung aufheben') : '🔕 ' + (t.ctx_mute_user || 'Stummschalten'));
        dropdownBlockUser.innerHTML = safeHTML(isBlocked ? '✅ ' + (t.ctx_unblock_user || 'Entblocken') : '🚫 ' + (t.ctx_block_user || 'Blockieren'));
        dropdownAddContact.style.display = currentChat.type === 'dm' && !isContact ? 'flex' : 'none';
        dropdownBlockUser.style.display = currentChat.type === 'dm' ? 'flex' : 'none';
        chatHeaderDropdown.classList.toggle('hidden');
    };

    if (chatMoreBtn) {
        chatMoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleChatHeaderMenu();
        });
    }

    if (chatHeaderProfileBtn) {
        chatHeaderProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentChat) {
                const isBlocked = blockedContacts.has(currentChat.id);
                const isMuted = mutedChats.has(currentChat.id);
                const isContact = chatData.contacts.some(c => c.id === currentChat.id);

                if (currentChat.type === 'dm') {
                    if (window.showUserProfileModal) {
                        window.showUserProfileModal(currentChat.id, { isBlocked, isMuted, isContact });
                    }
                } else {
                    chatHeaderDropdown.classList.toggle('hidden');
                    const t = typeof TRANSLATIONS !== 'undefined' ? (TRANSLATIONS[currentLang] || TRANSLATIONS['de']) : {};
                    dropdownAddContact.innerHTML = safeHTML('👤 ' + (t.ctx_add_contact || 'Zu Kontakten hinzufügen'));
                    dropdownClearChat.innerHTML = safeHTML('🗑️ ' + (t.ctx_clear_chat || 'Chat leeren'));
                    dropdownMuteUser.innerHTML = safeHTML(isMuted ? '🔔 ' + (t.ctx_unmute_user || 'Stummschaltung aufheben') : '🔕 ' + (t.ctx_mute_user || 'Stummschalten'));
                    dropdownBlockUser.innerHTML = safeHTML(isBlocked ? '✅ ' + (t.ctx_unblock_user || 'Entblocken') : '🚫 ' + (t.ctx_block_user || 'Blockieren'));
                    dropdownAddContact.style.display = isContact ? 'none' : 'flex';
                    
                    if (currentChat.type === 'saved') {
                        dropdownBlockUser.style.display = 'flex';
                    } else {
                        dropdownBlockUser.style.display = 'none';
                    }
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
                if(p && p.avatarUrl) settingsAvatar.innerHTML = safeHTML(`<img src="${p.avatarUrl}" class="avatar-img">`);
                else settingsAvatar.textContent = currentUser.replace('@','').charAt(0).toUpperCase();
                
                if (p) {
                    if(document.getElementById('setting-searchable')) document.getElementById('setting-searchable').checked = p.searchable !== false;
                    if(document.getElementById('setting-avatar-visibility')) document.getElementById('setting-avatar-visibility').value = p.avatarVisibility || 'all';
                    if(document.getElementById('setting-call-privacy')) document.getElementById('setting-call-privacy').value = p.callPrivacy || 'all';
                if(document.getElementById('setting-last-seen')) document.getElementById('setting-last-seen').checked = p.lastSeenPrivacy !== 'none';
                }
                syncSettingsStatusUI();
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
                    window.db.collection('users').doc(currentUser.toLowerCase()).collection('callHistory')
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
    
    function renderChatList() {
        const cData = window.chatData || chatData || {};
        if (lists && lists.personal) lists.personal.innerHTML = safeHTML('');
        if (lists && lists.rooms) lists.rooms.innerHTML = safeHTML('');
        if (lists && lists.contacts) lists.contacts.innerHTML = safeHTML('');
        const createItem = (chat) => {
            const div = document.createElement('div'); 
            let classNames = 'chat-item';
            if (currentChat && currentChat.id === chat.id) classNames += ' active';
            else if (unreadChats.has(chat.id)) classNames += ' unread';
            div.className = classNames;
            div.dataset.id = chat.id; div.dataset.type = chat.type;
            let avatarHtml = '';
            if (chat.type === 'assistant') avatarHtml = window.DooriAssistant?.getAvatar?.() || '👩‍💻'; else if (chat.type === 'saved') avatarHtml = '💾'; else if (chat.type === 'room' || chat.type === 'channel') avatarHtml = '#';
            else {
                let p = getUserProfile(chat.name || chat.id);
                if (!p) {
                    p = {};
                    if(window.fetchMissingProfile) window.fetchMissingProfile(chat.name || chat.id);
                }
                const aUrl = window.getAllowedProfilePics ? (window.getAllowedProfilePics(chat.name, p)[0] || null) : getAllowedAvatarUrl(chat.name, p);
                if(aUrl) avatarHtml = `<img src="${aUrl}" class="avatar-img">`; else avatarHtml = chat.name.replace('@','').charAt(0).toUpperCase();
            }
            const mentionBadgeHtml = mentionedChats.has(chat.id) ? '<div class="mention-badge" style="position:absolute; top:-5px; right:-5px; background:var(--accent); color:#000; border-radius:50%; width:16px; height:16px; font-size:10px; font-weight:bold; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 5px rgba(0,0,0,0.5);">@</div>' : '';
            let statusBadgeHtml = '';
            if (chat.type !== 'room' && chat.type !== 'channel' && chat.type !== 'saved' && chat.type !== 'assistant') {
                let p = getUserProfile(chat.name || chat.id);
                const rawStatus = p && (p.bio || p.status) ? (p.bio || p.status) : '';
                if (rawStatus && rawStatus.toLowerCase() !== 'online') {
                    const pKey = typeof getPresetKeyFromStatus === 'function' ? getPresetKeyFromStatus(rawStatus) : null;
                    const activeLang = window.currentLang || currentLang || 'en';
                    const t = TRANSLATIONS[activeLang] || TRANSLATIONS['en'] || {};
                    const displayStatus = (pKey && t[pKey]) ? t[pKey] : rawStatus;
                    statusBadgeHtml = ` <span class="user-status-badge" style="font-size: 11px; opacity: 0.85; margin-left: 4px; color: var(--accent); font-weight: normal;">(${escapeHTML(displayStatus)})</span>`;
                }
            }
            div.innerHTML = safeHTML(`<div class="avatar ${chat.type === 'room' || chat.type === 'channel' ? 'room-avatar' : ''}" style="position:relative;">${avatarHtml}${mentionBadgeHtml}</div><div class="chat-item-info"><span class="chat-item-name">${escapeHTML(getTranslatedChatName(chat))}${statusBadgeHtml}</span></div>`);
            div.addEventListener('click', () => {
                if (mentionedChats.has(chat.id)) {
                    mentionedChats.delete(chat.id);
                    renderChatList();
                }
                selectChat(chat.id, chat.type);
            });
            return div;
        };
        if (lists && lists.personal && cData.personal) cData.personal.forEach(c => lists.personal.appendChild(createItem(c)));
        if (lists && lists.rooms && cData.rooms) cData.rooms.forEach(c => lists.rooms.appendChild(createItem(c)));
        if (lists && lists.contacts && cData.contacts) cData.contacts.forEach(c => lists.contacts.appendChild(createItem(c)));

        const chatsItemsContainer = document.getElementById('list-chats-items');
        if (chatsItemsContainer) {
            chatsItemsContainer.innerHTML = safeHTML('');
            const allMap = new Map();
            (cData.personal || []).forEach(c => allMap.set(c.id, c));
            (cData.rooms || []).forEach(c => allMap.set(c.id, c));
            (cData.contacts || []).forEach(c => allMap.set(c.id, c));
            (cData.active_chats || []).forEach(c => allMap.set(c.id, c));

            let filtered = Array.from(allMap.values());
            if (activeChatFilter === 'direct') {
                filtered = filtered.filter(c => c.type === 'dm' || c.type === 'assistant' || (!c.type && c.id !== 'saved'));
            } else if (activeChatFilter === 'groups') {
                filtered = filtered.filter(c => c.type === 'room' || c.type === 'channel' || c.type === 'group');
            } else if (activeChatFilter === 'unread') {
                filtered = filtered.filter(c => unreadChats.has(c.id));
            }
            filtered.forEach(c => chatsItemsContainer.appendChild(createItem(c)));
        }
    }
    window.renderChatList = renderChatList;

    document.querySelectorAll('#chat-filter-bar .filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#chat-filter-bar .filter-pill').forEach(p => {
                p.classList.remove('active');
                p.style.background = 'rgba(255,255,255,0.06)';
                p.style.color = 'white';
                p.style.fontWeight = 'normal';
            });
            pill.classList.add('active');
            pill.style.background = 'var(--accent)';
            pill.style.color = '#000';
            pill.style.fontWeight = 'bold';
            activeChatFilter = pill.getAttribute('data-filter') || 'all';
            renderChatList();
        });
    });

    // --- Starred Messages Modal Logic ---
    function openStarredMessagesModal(chatIdFilter = null) {
        const modal = document.getElementById('starred-messages-modal');
        const listContainer = document.getElementById('starred-messages-list');
        if (!modal || !listContainer) return;
        
        const t = window.TRANSLATIONS[currentLang] || window.TRANSLATIONS['en'] || {};
        listContainer.innerHTML = safeHTML('');
        
        let items = window.starredMessages || [];
        if (chatIdFilter) {
            items = items.filter(m => m.chatId === chatIdFilter);
        }
        
        if (items.length === 0) {
            listContainer.innerHTML = safeHTML(`<div style="text-align: center; color: var(--text-secondary); padding: 40px 10px;">${t.msg_starred_empty || 'Keine markierten Nachrichten vorhanden.'}</div>`);
        } else {
            items.forEach(item => {
                const el = document.createElement('div');
                el.className = 'starred-item';
                const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
                const senderName = escapeHTML(item.sender || 'Unbekannt');
                const chatName = escapeHTML(item.chatName || item.chatId || '');
                let body = escapeHTML(item.text || '');
                if (item.mediaType) {
                    body = `[${item.mediaType}] ` + body;
                }
                
                el.innerHTML = safeHTML(`
                    <div class="starred-item-header">
                        <span style="font-weight: 600; color: var(--accent);">${senderName} <span style="font-size: 11px; opacity: 0.7; color: white;">(${chatName})</span></span>
                        <span style="font-size: 11px; color: var(--text-secondary);">${dateStr}</span>
                    </div>
                    <div style="font-size: 14px; word-break: break-word; line-height: 1.4; color: #fff;">${body}</div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px;">
                        <button type="button" class="btn-jump-chat submit-btn" style="padding: 4px 10px; font-size: 11px;">${t.btn_jump_to_chat || 'Zum Chat springen'}</button>
                        <button type="button" class="btn-remove-star danger-btn" style="padding: 4px 10px; font-size: 11px;">${t.btn_unstar || 'Entfernen'}</button>
                    </div>
                `);
                
                el.querySelector('.btn-jump-chat').addEventListener('click', () => {
                    modal.classList.add('hidden');
                    if (item.chatId) {
                        selectChat(item.chatId, item.chatType || 'dm');
                        setTimeout(() => {
                            const targetEl = document.querySelector(`.message[data-id="${item.id}"]`);
                            if (targetEl) {
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                targetEl.style.transition = 'box-shadow 0.5s';
                                targetEl.style.boxShadow = '0 0 15px var(--accent)';
                                setTimeout(() => { targetEl.style.boxShadow = ''; }, 2000);
                            }
                        }, 500);
                    }
                });
                
                el.querySelector('.btn-remove-star').addEventListener('click', () => {
                    window.toggleStarMessage({ id: item.id });
                    openStarredMessagesModal(chatIdFilter);
                });
                
                listContainer.appendChild(el);
            });
        }
        modal.classList.remove('hidden');
    }

    const starredBtn = document.getElementById('chat-starred-btn');
    if (starredBtn) starredBtn.addEventListener('click', () => openStarredMessagesModal(currentChat ? currentChat.id : null));

    const dropdownStarredBtn = document.getElementById('dropdown-starred-messages');
    if (dropdownStarredBtn) dropdownStarredBtn.addEventListener('click', () => {
        if (chatHeaderDropdown) chatHeaderDropdown.classList.add('hidden');
        openStarredMessagesModal(currentChat ? currentChat.id : null);
    });

    const closeStarredBtn = document.getElementById('close-starred-modal-btn');
    if (closeStarredBtn) closeStarredBtn.addEventListener('click', () => {
        const modal = document.getElementById('starred-messages-modal');
        if (modal) modal.classList.add('hidden');
    });

    // --- Shared Media Modal Logic ---
    let currentMediaTab = 'photos';

    function renderSharedMediaContent() {
        const container = document.getElementById('shared-media-content');
        if (!container) return;
        container.innerHTML = safeHTML('');
        
        if (!currentChat) return;
        const msgs = messages.get(currentChat.id) || [];
        const t = window.TRANSLATIONS[currentLang] || window.TRANSLATIONS['en'] || {};
        
        if (currentMediaTab === 'photos') {
            const photoMsgs = msgs.filter(m => m.mediaType === 'image' || m.mediaType === 'video' || m.mediaType === 'gif');
            if (photoMsgs.length === 0) {
                container.innerHTML = safeHTML(`<div style="text-align: center; color: var(--text-secondary); padding: 40px 10px;">${t.msg_no_media_found || 'Keine Medien in dieser Kategorie vorhanden.'}</div>`);
                return;
            }
            const grid = document.createElement('div');
            grid.className = 'shared-media-grid';
            photoMsgs.forEach(m => {
                const item = document.createElement('div');
                item.className = 'shared-media-item';
                if (m.mediaType === 'image' || m.mediaType === 'gif') {
                    item.innerHTML = safeHTML(`<img src="${m.mediaUrl}" alt="Media" loading="lazy">`);
                    item.addEventListener('click', () => {
                        window.open(m.mediaUrl, '_blank');
                    });
                } else if (m.mediaType === 'video') {
                    const vidSrc = getCachedBlobUrl(m) || m.mediaUrl;
                    item.innerHTML = safeHTML(`<video src="${vidSrc}" muted playsinline></video><div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); font-size: 24px; color: #fff;">▶</div>`);
                    item.addEventListener('click', () => {
                        window.open(m.mediaUrl || vidSrc, '_blank');
                    });
                }
                grid.appendChild(item);
            });
            container.appendChild(grid);
        } else if (currentMediaTab === 'audio') {
            const audioMsgs = msgs.filter(m => m.mediaType === 'audio');
            if (audioMsgs.length === 0) {
                container.innerHTML = safeHTML(`<div style="text-align: center; color: var(--text-secondary); padding: 40px 10px;">${t.msg_no_media_found || 'Keine Medien in dieser Kategorie vorhanden.'}</div>`);
                return;
            }
            audioMsgs.forEach(m => {
                const item = document.createElement('div');
                item.className = 'shared-audio-item';
                const timeStr = new Date(m.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                const sender = escapeHTML(m.sender_username || '');
                item.innerHTML = safeHTML(`
                    <div style="flex: 1; margin-right: 10px;">
                        <div style="font-size: 12px; color: var(--accent); font-weight: 600; margin-bottom: 4px;">${sender} <span style="font-size: 11px; color: var(--text-secondary); font-weight: normal;">• ${timeStr}</span></div>
                        ${renderCustomPlayer(getCachedBlobUrl(m), 'audio')}
                    </div>
                `);
                container.appendChild(item);
            });
            initCustomPlayers();
        } else if (currentMediaTab === 'files') {
            const fileMsgs = msgs.filter(m => m.mediaType === 'file' || m.mediaType === 'location');
            if (fileMsgs.length === 0) {
                container.innerHTML = safeHTML(`<div style="text-align: center; color: var(--text-secondary); padding: 40px 10px;">${t.msg_no_media_found || 'Keine Medien in dieser Kategorie vorhanden.'}</div>`);
                return;
            }
            fileMsgs.forEach(m => {
                const item = document.createElement('div');
                item.className = 'shared-file-item';
                const timeStr = new Date(m.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                const sender = escapeHTML(m.sender_username || '');
                if (m.mediaType === 'location') {
                    item.innerHTML = safeHTML(`
                        <div>
                            <div style="font-weight: 600; color: #fff;">📍 Standort</div>
                            <div style="font-size: 11px; color: var(--text-secondary);">${sender} • ${timeStr}</div>
                        </div>
                        <a href="https://maps.google.com/?q=${m.mediaUrl}" target="_blank" class="submit-btn" style="padding: 5px 12px; font-size: 12px; text-decoration: none;">Öffnen</a>
                    `);
                } else {
                    const fileName = escapeHTML(m.fileName || m.text || 'Datei');
                    item.innerHTML = safeHTML(`
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;">
                            <div style="font-weight: 600; color: #fff;">📄 ${fileName}</div>
                            <div style="font-size: 11px; color: var(--text-secondary);">${sender} • ${timeStr}</div>
                        </div>
                        <a href="${m.mediaUrl}" target="_blank" download class="submit-btn" style="padding: 5px 12px; font-size: 12px; text-decoration: none;">Download</a>
                    `);
                }
                container.appendChild(item);
            });
        }
    }

    function openSharedMediaModal() {
        const modal = document.getElementById('shared-media-modal');
        if (!modal) return;
        currentMediaTab = 'photos';
        document.querySelectorAll('.shared-media-tab').forEach(b => {
            if (b.dataset.tab === 'photos') {
                b.classList.add('active');
                b.style.background = 'var(--accent)';
                b.style.color = '#000';
                b.style.fontWeight = 'bold';
            } else {
                b.classList.remove('active');
                b.style.background = 'rgba(255,255,255,0.05)';
                b.style.color = 'white';
                b.style.fontWeight = 'normal';
            }
        });
        renderSharedMediaContent();
        modal.classList.remove('hidden');
    }

    document.querySelectorAll('.shared-media-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.shared-media-tab').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'rgba(255,255,255,0.05)';
                b.style.color = 'white';
                b.style.fontWeight = 'normal';
            });
            btn.classList.add('active');
            btn.style.background = 'var(--accent)';
            btn.style.color = '#000';
            btn.style.fontWeight = 'bold';
            currentMediaTab = btn.dataset.tab || 'photos';
            renderSharedMediaContent();
        });
    });

    const mediaBtn = document.getElementById('chat-media-btn');
    if (mediaBtn) mediaBtn.addEventListener('click', openSharedMediaModal);

    const dropdownMediaBtn = document.getElementById('dropdown-shared-media');
    if (dropdownMediaBtn) dropdownMediaBtn.addEventListener('click', () => {
        if (chatHeaderDropdown) chatHeaderDropdown.classList.add('hidden');
        openSharedMediaModal();
    });

    const closeMediaBtn = document.getElementById('close-shared-media-btn');
    if (closeMediaBtn) closeMediaBtn.addEventListener('click', () => {
        const modal = document.getElementById('shared-media-modal');
        if (modal) modal.classList.add('hidden');
    });



    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        if (typeof langSelect !== 'undefined' && langSelect) langSelect.value = currentLang;
        renderSettingsProfileGallery();

        let p = users.get(currentUser);
        if (p) {
            if(document.getElementById('setting-searchable')) document.getElementById('setting-searchable').checked = p.searchable !== false;
            if(document.getElementById('setting-avatar-visibility')) document.getElementById('setting-avatar-visibility').value = p.avatarVisibility || 'all';
            if(document.getElementById('setting-call-privacy')) document.getElementById('setting-call-privacy').value = p.callPrivacy || 'all';
            if(document.getElementById('setting-last-seen')) document.getElementById('setting-last-seen').checked = p.lastSeenPrivacy !== 'none';
        }

        syncSettingsStatusUI();

        // Account tab values
        if (document.getElementById('setting-account-email')) {
            document.getElementById('setting-account-email').value = (window.auth && window.auth.currentUser && window.auth.currentUser.email) || '';
        }

        // Notification & Chats options
        if (document.getElementById('setting-sound-type')) {
            document.getElementById('setting-sound-type').value = localStorage.getItem('doori_sound_type') || 'chime';
        }
        if (document.getElementById('setting-hide-preview')) {
            document.getElementById('setting-hide-preview').checked = localStorage.getItem('doori_hide_preview') === 'true';
        }
        if (document.getElementById('setting-vibrate')) {
            document.getElementById('setting-vibrate').checked = localStorage.getItem('doori_vibrate') !== 'false';
        }
        if (document.getElementById('setting-auto-media')) {
            document.getElementById('setting-auto-media').value = localStorage.getItem('doori_auto_media') || 'always';
        }

        // PIN button state
        const hasPin = !!localStorage.getItem('doori_app_pin');
        const pinToggleBtn = document.getElementById('btn-toggle-pin');
        if (pinToggleBtn) {
            const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS.en;
            pinToggleBtn.textContent = hasPin ? (t.btn_disable_pin || 'PIN deaktivieren') : (t.btn_enable_pin || 'PIN aktivieren');
            pinToggleBtn.className = hasPin ? 'danger-btn' : 'submit-btn';
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
            // Persist modern options
            if (document.getElementById('setting-sound-type')) {
                localStorage.setItem('doori_sound_type', document.getElementById('setting-sound-type').value);
            }
            if (document.getElementById('setting-hide-preview')) {
                localStorage.setItem('doori_hide_preview', document.getElementById('setting-hide-preview').checked);
            }
            if (document.getElementById('setting-vibrate')) {
                localStorage.setItem('doori_vibrate', document.getElementById('setting-vibrate').checked);
            }
            if (document.getElementById('setting-auto-media')) {
                localStorage.setItem('doori_auto_media', document.getElementById('setting-auto-media').value);
            }

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

    // --- Modern Settings Features ---
    // 1. Test Notification Sound Button
    const btnTestSound = document.getElementById('btn-test-sound');
    if (btnTestSound) {
        btnTestSound.addEventListener('click', () => {
            playSound(false);
        });
    }

    // 2. Export Chat History (.txt)
    const btnExportChat = document.getElementById('btn-export-chat');
    if (btnExportChat) {
        btnExportChat.addEventListener('click', () => {
            const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS.en;
            if (!currentChat) {
                alert(t.err_no_chat_to_export || 'Bitte öffne zuerst einen Chat, um ihn zu exportieren.');
                return;
            }
            const chatMsgs = messages.get(currentChat.id) || [];
            let exportText = `Doori Messenger - Chat Export\n`;
            exportText += `Chat: ${currentChat.name || currentChat.id}\n`;
            exportText += `Datum: ${new Date().toLocaleString()}\n`;
            exportText += `----------------------------------------\n\n`;

            chatMsgs.forEach(m => {
                const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleString() : '';
                const sender = m.sender_username || 'Unbekannt';
                const text = m.text || (m.mediaType ? `[${m.mediaType}]` : '');
                exportText += `[${timeStr}] ${sender}: ${text}\n`;
            });

            const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(exportText);
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `chat_export_${(currentChat.name || currentChat.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            alert(t.msg_export_success || 'Chatverlauf wurde erfolgreich exportiert!');
        });
    }

    // 3. Change Password in Settings
    const btnSubmitChangePwd = document.getElementById('btn-submit-change-password');
    if (btnSubmitChangePwd) {
        btnSubmitChangePwd.addEventListener('click', async () => {
            const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS.en;
            const curPwd = document.getElementById('setting-current-pwd').value;
            const newPwd = document.getElementById('setting-new-pwd').value;
            const confirmPwd = document.getElementById('setting-confirm-pwd').value;

            if (!curPwd || !newPwd || !confirmPwd) {
                alert(t.sec_error || 'Bitte fülle alle Passwort-Felder aus.');
                return;
            }
            if (newPwd !== confirmPwd) {
                alert(t.err_password_mismatch || 'Die neuen Passwörter stimmen nicht überein.');
                return;
            }
            if (newPwd.length < 6) {
                alert(t.msg_weak_pwd || 'Das Passwort muss mindestens 6 Zeichen lang sein.');
                return;
            }

            btnSubmitChangePwd.disabled = true;
            try {
                const user = window.auth.currentUser;
                if (!user || !user.email) throw new Error("No active authenticated user");

                // Re-authenticate user before changing sensitive password
                const credential = window.firebase.auth.EmailAuthProvider.credential(user.email, curPwd);
                await user.reauthenticateWithCredential(credential);
                await user.updatePassword(newPwd);

                alert(t.msg_password_updated || 'Passwort erfolgreich geändert!');
                document.getElementById('setting-current-pwd').value = '';
                document.getElementById('setting-new-pwd').value = '';
                document.getElementById('setting-confirm-pwd').value = '';
            } catch(err) {
                console.error("Password update error", err);
                if (err.code === 'auth/wrong-password') {
                    alert(t.err_wrong_current_password || 'Das aktuelle Passwort ist nicht korrekt.');
                } else {
                    alert(t.err_login_failed || 'Fehler beim Ändern des Passworts: ' + (err.message || ''));
                }
            } finally {
                btnSubmitChangePwd.disabled = false;
            }
        });
    }

    // 4. PIN App Lock Logic
    const btnTogglePin = document.getElementById('btn-toggle-pin');
    const pinInput = document.getElementById('setting-pin-input');
    const appLockOverlay = document.getElementById('app-lock-overlay');
    const appLockInput = document.getElementById('app-lock-pin-input');
    const appLockError = document.getElementById('app-lock-error');
    const btnUnlockApp = document.getElementById('btn-unlock-app');

    function checkAppLock() {
        const storedPin = localStorage.getItem('doori_app_pin');
        if (storedPin && appLockOverlay) {
            appLockOverlay.classList.remove('hidden');
            if (appLockInput) { appLockInput.value = ''; appLockInput.focus(); }
            if (appLockError) appLockError.classList.add('hidden');
        }
    }

    if (btnTogglePin && pinInput) {
        btnTogglePin.addEventListener('click', () => {
            const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS.en;
            const currentPin = localStorage.getItem('doori_app_pin');
            if (currentPin) {
                // Disable PIN
                localStorage.removeItem('doori_app_pin');
                pinInput.value = '';
                btnTogglePin.textContent = t.btn_enable_pin || 'PIN aktivieren';
                btnTogglePin.className = 'submit-btn';
                alert(t.msg_pin_disabled || 'PIN-Sperre deaktiviert!');
            } else {
                // Enable PIN
                const val = pinInput.value.trim();
                if (!/^\d{4}$/.test(val)) {
                    alert(t.err_pin_invalid || 'Die PIN muss genau 4 Ziffern lang sein.');
                    return;
                }
                localStorage.setItem('doori_app_pin', val);
                btnTogglePin.textContent = t.btn_disable_pin || 'PIN deaktivieren';
                btnTogglePin.className = 'danger-btn';
                alert(t.msg_pin_enabled || 'PIN-Sperre aktiviert!');
            }
        });
    }

    if (btnUnlockApp && appLockInput) {
        const tryUnlock = () => {
            const storedPin = localStorage.getItem('doori_app_pin');
            if (appLockInput.value === storedPin) {
                appLockOverlay.classList.add('hidden');
                appLockInput.value = '';
                if (appLockError) appLockError.classList.add('hidden');
            } else {
                if (appLockError) appLockError.classList.remove('hidden');
                appLockInput.value = '';
                appLockInput.focus();
            }
        };
        btnUnlockApp.addEventListener('click', tryUnlock);
        appLockInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') tryUnlock();
        });
    }

    // Auto-lock when tab becomes visible again if PIN is set
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && localStorage.getItem('doori_app_pin')) {
            checkAppLock();
        }
    });

    // 5. Delete Account Handler
    const btnDeleteAccount = document.getElementById('btn-delete-account');
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', async () => {
            const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS.en;
            if (!confirm(t.msg_confirm_delete_account || 'Möchtest du dein Konto wirklich unwiderruflich löschen?')) {
                return;
            }

            btnDeleteAccount.disabled = true;
            try {
                const user = window.auth.currentUser;
                if (!user || !user.email) throw new Error("Kein Benutzer angemeldet");

                const reqAccountDeletion = window.accountFunctions.httpsCallable('requestAccountDeletion');
                await reqAccountDeletion({ language: window.currentLang });

                alert(t.msg_deletion_email_sent || 'Eine Bestätigungs-E-Mail wurde gesendet. Bitte klicke auf den roten Bestätigungslink in der E-Mail, um dein Konto endgültig zu löschen.');
            } catch(e) {
                console.error("Delete account error", e);
                alert(t.err_login_failed || 'Fehler: ' + (e.message || ''));
            } finally {
                btnDeleteAccount.disabled = false;
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
    window.renderSettingsProfileGallery = function() {
        const p = users.get(currentUser);
        const galleryContainer = document.getElementById('profile-gallery-container');
        const addBtn = document.getElementById('add-profile-pic-btn');
        const removeBtn = document.getElementById('remove-profile-pic-btn');
        const primaryBtn = document.getElementById('set-primary-pic-btn');
        
        let profilePics = [];
        if (p && p.profilePics && p.profilePics.length > 0) profilePics = p.profilePics;
        else if (p && p.avatarUrl) profilePics = [p.avatarUrl]; // Migration

        if (galleryContainer) {
            galleryContainer.innerHTML = safeHTML('');
            window.selectedProfilePicIndex = null;
            
            if (profilePics.length === 0) {
                const initial = currentUser.replace('@','').charAt(0).toUpperCase();
                galleryContainer.innerHTML = safeHTML(`<div class="avatar-large gallery-item" style="scroll-snap-align: center; flex-shrink: 0; position: relative;">${initial}</div>`);
                if(removeBtn) removeBtn.classList.add('hidden');
                if(primaryBtn) primaryBtn.classList.add('hidden');
            } else {
                profilePics.forEach((url, index) => {
                    const isPrimary = (p.avatarUrl === url) || (index === 0 && !p.avatarUrl);
                    const div = document.createElement('div');
                    div.className = 'avatar-large gallery-item' + (isPrimary ? ' primary' : '');
                    div.style = 'scroll-snap-align: center; flex-shrink: 0; position: relative; cursor: pointer; border: 2px solid ' + (isPrimary ? 'var(--accent)' : 'transparent') + '; padding: 2px;';
                    div.innerHTML = safeHTML(`<img src="${url}" class="avatar-img" style="border-radius: 50%; width: 100%; height: 100%; object-fit: cover;">
                                     ${isPrimary ? '<div style="position: absolute; bottom: 0; right: 0; background: var(--accent); color: #000; border-radius: 50%; font-size: 10px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">★</div>' : ''}`);
                    div.onclick = () => {
                        document.querySelectorAll('.gallery-item').forEach(el => el.style.border = '2px solid transparent');
                        div.style.border = '2px solid rgba(255,255,255,0.5)';
                        if (isPrimary) div.style.border = '2px solid var(--accent)';
                        window.selectedProfilePicIndex = index;
                        if(removeBtn) removeBtn.classList.remove('hidden');
                        if(primaryBtn) primaryBtn.classList.remove('hidden');
                    };
                    galleryContainer.appendChild(div);
                });
            }
            if(addBtn) {
                addBtn.textContent = ((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).btn_add_pic || 'Bild hinzufügen') + ` (${profilePics.length}/5)`;
                addBtn.disabled = profilePics.length >= 5;
            }
        }
    };

    const removeBtn = document.getElementById('remove-profile-pic-btn');
    const primaryBtn = document.getElementById('set-primary-pic-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            if (window.selectedProfilePicIndex === null) return;
            const p = users.get(currentUser);
            if (!p || !p.profilePics) return;
            
            const removedUrl = p.profilePics.splice(window.selectedProfilePicIndex, 1)[0];
            if (p.avatarUrl === removedUrl) {
                p.avatarUrl = p.profilePics.length > 0 ? p.profilePics[0] : null;
            }
            saveUserData();
            renderSettingsProfileGallery();
            renderChatList();
            publishEvent({type: 'user_update', username: currentUser, profile: users.get(currentUser)});
            removeBtn.classList.add('hidden');
            if(primaryBtn) primaryBtn.classList.add('hidden');
        });
    }
    if (primaryBtn) {
        primaryBtn.addEventListener('click', () => {
            if (window.selectedProfilePicIndex === null) return;
            const p = users.get(currentUser);
            if (!p || !p.profilePics) return;
            
            p.avatarUrl = p.profilePics[window.selectedProfilePicIndex];
            saveUserData();
            renderSettingsProfileGallery();
            renderChatList();
            publishEvent({type: 'user_update', username: currentUser, profile: users.get(currentUser)});
            if(removeBtn) removeBtn.classList.add('hidden');
            primaryBtn.classList.add('hidden');
        });
    }

    // langSelect.addEventListener('change', (e) => applyTranslation(e.target.value));
    if (loginLangSelect) loginLangSelect.addEventListener('change', (e) => applyTranslation(e.target.value));
    let cropperInstance = null;
    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0]; 
        if(!file) return; 
        
        if(!users.has(currentUser)) users.set(currentUser, {});
        let p = users.get(currentUser);
        let profilePics = p.profilePics || [];
        if (p.avatarUrl && profilePics.length === 0) profilePics = [p.avatarUrl];
        
        if (profilePics.length >= 5) {
            alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS.en).err_too_many_avatars || "Du kannst maximal 5 Profilbilder haben.");
            e.target.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert(`Bild ${file.name} ist zu groß! Max. 10MB erlaubt.`);
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const cropImage = document.getElementById('crop-image');
            cropImage.src = event.target.result;
            document.getElementById('crop-modal').classList.remove('hidden');
            
            if (cropperInstance) cropperInstance.destroy();
            cropperInstance = new Cropper(cropImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('cancel-crop-btn').addEventListener('click', () => {
        document.getElementById('crop-modal').classList.add('hidden');
        if (cropperInstance) cropperInstance.destroy();
        cropperInstance = null;
        avatarUpload.value = '';
    });

    document.getElementById('save-crop-btn').addEventListener('click', async () => {
        if (!cropperInstance) return;
        const btn = document.getElementById('save-crop-btn');
        const origText = btn.textContent;
        btn.textContent = '...';
        btn.disabled = true;

        try {
            const canvas = cropperInstance.getCroppedCanvas({ width: 256, height: 256 });
            if (!canvas) throw new Error("Canvas rendering failed");
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            if(!users.has(currentUser)) users.set(currentUser, {});
            let p = users.get(currentUser);
            let profilePics = p.profilePics || [];
            if (p.avatarUrl && profilePics.length === 0) profilePics = [p.avatarUrl];

            if (dataUrl.length > 65536) throw new Error(authText('security_media_limit'));
            profilePics = profilePics.slice(-4);
            profilePics.push(dataUrl);

            p.profilePics = profilePics;
            if (profilePics.length > 0) {
                p.avatarUrl = profilePics[profilePics.length - 1]; // Make the newest upload the main avatar
            }

            window.renderSettingsProfileGallery();
            saveUserData(); 
            renderChatList(); 
            publishEvent({type: 'user_update', username: currentUser, profile: users.get(currentUser)});

            document.getElementById('crop-modal').classList.add('hidden');
            cropperInstance.destroy();
            cropperInstance = null;
            avatarUpload.value = '';
        } catch (globalErr) {
            console.error("Global Crop/Save Error:", globalErr);
            alert("Ein Fehler ist aufgetreten: " + globalErr.message);
        } finally {
            btn.textContent = origText;
            btn.disabled = false;
        }
    });
    document.getElementById('clear-cache-btn').addEventListener('click', () => { 
        if(confirm("Gesamten Chatverlauf löschen?")) { 
            messages.clear(); 
            if (window.MessageCache && window.MessageCache.clearCache) window.MessageCache.clearCache();
            saveUserData(); 
            renderMessages(); 
        } 
    });
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
                    if (evt.target.result.length > 65536) return alert(authText('security_media_limit'));
                    newGroupAvatarUrl = evt.target.result;
                    if(newGroupAvatarPreview) newGroupAvatarPreview.innerHTML = safeHTML(`<img src="${newGroupAvatarUrl}" style="width: 100%; height: 100%; object-fit: cover;">`);
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
                if (file.size > 48 * 1024) return alert(authText('security_media_limit'));
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target.result.length > 65536) return alert(authText('security_media_limit'));
                    editGroupAvatarUrl = e.target.result;
                    if(editGroupAvatarPreview) editGroupAvatarPreview.innerHTML = safeHTML(`<img src="${editGroupAvatarUrl}" style="width: 100%; height: 100%; object-fit: cover;">`);
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
                if (currentChat.avatar && currentChatAvatar) currentChatAvatar.innerHTML = safeHTML(`<img src="${currentChat.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`);
                
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
            const userRef = await window.db.collection('profiles').doc(username).get();
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
                if (newGroupAvatarUrl && newGroupAvatarUrl.length > 65536) throw new Error(authText('security_media_limit'));

                const newGroup = {
                    id: id,
                    name: n,
                    creator: currentUser,
                    admins: [currentUser],
                    members: [currentUser], // Only creator initially
                    type: 'room',
                    description: desc,
                    privacy: privacy,
                    groupId: groupUid,
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
                if(newGroupAvatarPreview) newGroupAvatarPreview.innerHTML = safeHTML('📷');
                if(newGroupAvatarInput) newGroupAvatarInput.value = '';
                document.getElementById('selected-members-container').innerHTML = safeHTML('');
                
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
            globalSearchResults.innerHTML = safeHTML('');
            return;
        }

        const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];

        globalSearchBtn.textContent = '...';
        globalSearchBtn.disabled = true;
        globalSearchResults.innerHTML = safeHTML('');
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
                    avContainer.innerHTML = safeHTML(grp.avatarUrl ? `<img src="${grp.avatarUrl}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">` : `<div style="width:30px;height:30px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#000;font-size:14px;font-weight:bold;">${grp.name.charAt(0).toUpperCase()}</div>`);
                    
                    const info = document.createElement('div');
                    info.style.flex = '1';
                    let displayId = grp.id.startsWith('@') ? grp.id : '';
                    info.innerHTML = safeHTML(`<div style="font-size: 13px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; max-width: 150px; white-space: nowrap;">${escapeHTML(grp.name)}</div><div style="font-size: 11px; color: #aaa;">${displayId ? displayId + ' • ' : ''}${t.lbl_public_group || 'Öffentliche Gruppe'}</div>`);
                    
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
                globalSearchResults.innerHTML = safeHTML(`<div style="font-size: 12px; color: #aaa; text-align: center;">${t.err_no_public_groups || 'Keine öffentlichen Gruppen gefunden.'}</div>`);
            }

        } catch (e) {
            console.error('Search error', e);
            globalSearchResults.innerHTML = safeHTML(`<div style="font-size: 12px; color: var(--error); text-align: center;">${t.err_search_failed || 'Suche fehlgeschlagen.'}</div>`);
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
            resultContainer.innerHTML = safeHTML('');
        }

        if (lowerQ === currentUser.toLowerCase()) {
            if (resultContainer) {
                resultContainer.style.display = 'flex';
                resultContainer.innerHTML = safeHTML(`<span style="color: var(--error);">Das bist du selbst!</span>`);
            } else alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_search_self || 'Das bist du selbst!');
            return;
        }

        const btnOriginalText = userSearchBtn.textContent;
        userSearchBtn.textContent = '...';
        userSearchBtn.disabled = true;

        try {
            const docRef = window.db.collection('profiles').doc(lowerQ);
            const docSnap = await docRef.get();
            if (docSnap.exists && docSnap.data().id_number === idVal) {
                if (docSnap.data().searchable === false) {
                    if (resultContainer) {
                        resultContainer.style.display = 'flex';
                        resultContainer.innerHTML = safeHTML(`<span style="color: var(--error);">Benutzername nicht gefunden (Privatsphäre).</span>`);
                    } else alert((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).err_user_not_found_privacy || 'Benutzername nicht gefunden (Privatsphäre).');
                    return;
                }
                
                const uData = docSnap.data();
                if (resultContainer) {
                    const aUrl = getAllowedAvatarUrl(q, uData);
                    const avatarImg = aUrl 
                        ? `<img src="${aUrl}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">`
                        : `<div style="width: 50px; height: 50px; border-radius: 50%; background: var(--panel-bg); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: var(--text-primary);">${q.replace('@','').charAt(0).toUpperCase()}</div>`;
                    
                    resultContainer.innerHTML = safeHTML(`
                        ${avatarImg}
                        <span style="font-weight: bold;">${q}</span>
                        <button id="start-search-chat-btn" style="background: var(--accent); color: #000; border: none; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; margin-top: 5px;">Als Kontakt hinzufügen</button>
                    `);
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
                    resultContainer.innerHTML = safeHTML(`<span style="color: var(--error);">Dieser Benutzername existiert nicht.</span>`);
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
    sendScheduleBtn.hidden = true;
    sendScheduleBtn.style.display = 'none';
    sendScheduleBtn.disabled = true;
    closeScheduleModalBtn.addEventListener('click', () => scheduleModal.classList.add('hidden'));
    scheduleSubmitBtn.disabled = true;

    // Firebase Auth verifies passwords; Firestore rules enforce account ownership.
    for (const lang of Object.keys(window.AUTH_TRANSLATIONS)) {
        Object.assign(TRANSLATIONS[lang], window.AUTH_TRANSLATIONS[lang]);
    }
    const authText = key => (window.AUTH_TRANSLATIONS[currentLang] || window.AUTH_TRANSLATIONS.en)[key];
    const gifAddButton = document.getElementById('add-custom-gif-btn');
    if (gifAddButton) {
        gifAddButton.dataset.i18n = 'security_gif_button';
        gifAddButton.textContent = authText('security_gif_button');
    }
    const serverAuthCalls = new Set(['registerAccount', 'ensureAccount', 'loginWithUsername', 'recoverAccountDetails', 'sendVerificationEmail', 'requestAccountDeletion', 'confirmAccountDeletion']);
    const authCall = (name, data = {}) => serverAuthCalls.has(name)
        ? window.accountFunctions.httpsCallable(name)(data).then(result => result.data)
        : window.accountClient[name](data);
    function savedAlias() {
        try {
            const key = 'doori_alias:' + normalizeUsername(usernameInput.value);
            const alias = JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key) || 'null');
            return alias?.id === idInput.value.trim() ? alias : null;
        } catch { return null; }
    }
    function rememberAlias(username, id, email, persistent) {
        const key = 'doori_alias:' + normalizeUsername(username);
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        (persistent ? localStorage : sessionStorage).setItem(key, JSON.stringify({ id, email }));
    }
    function authNotice(key, replacements = {}) {
        let text = authText(key);
        for (const [name, value] of Object.entries(replacements)) text = text.replace('{' + name + '}', value);
        verificationInfo.textContent = text;
        verificationInfo.classList.remove('hidden');
    }
    function syncAuthForm() {
        const emailLogin = !isRegisterMode && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(usernameInput.value.trim());
        const loginSubtitle = document.getElementById('login-subtitle');
        const usernameLabel = document.getElementById('username-label');
        const emailLabel = document.getElementById('email-label');
        const passwordLabel = document.getElementById('password-label');
        const idLabel = document.getElementById('id-label');
        const registrationEmailHint = document.getElementById('registration-email-hint');
        const forgotLinks = document.getElementById('forgot-links');
        loginSubtitle.dataset.i18n = isRecoveryMode ? 'security_recovery_title' : isRegisterMode ? 'security_register_title' : 'security_login_title';
        usernameLabel.dataset.i18n = isRecoveryMode ? 'security_field_email' : isRegisterMode ? 'security_register_username_label' : 'security_field_username_email';
        emailLabel.dataset.i18n = isRegisterMode ? 'security_register_email_label' : 'security_field_email';
        passwordLabel.dataset.i18n = isRegisterMode ? 'security_register_password_label' : 'security_field_password';
        idLabel.dataset.i18n = 'security_field_contact_id';
        registrationEmailHint.dataset.i18n = 'security_register_email_hint';
        loginSubtitle.textContent = authText(isRecoveryMode ? 'security_recovery_title' : isRegisterMode ? 'security_register_title' : 'security_login_title');
        usernameLabel.textContent = authText(usernameLabel.dataset.i18n);
        emailLabel.textContent = authText(emailLabel.dataset.i18n);
        passwordLabel.textContent = authText(passwordLabel.dataset.i18n);
        idLabel.textContent = authText('security_field_contact_id');
        registrationEmailHint.textContent = authText('security_register_email_hint');
        usernameInput.dataset.i18n = isRecoveryMode ? 'security_email_prompt' : isRegisterMode ? 'security_register_hint' : 'security_login_hint';
        usernameInput.placeholder = authText(usernameInput.dataset.i18n);
        document.getElementById('username-hint')?.classList.add('hidden');
        idHint.dataset.i18n = 'security_id_hint';
        idHint.textContent = authText('security_id_hint');
        emailInput.classList.toggle('hidden', !isRegisterMode);
        emailLabel.classList.toggle('hidden', !isRegisterMode);
        registrationEmailHint.classList.toggle('hidden', !isRegisterMode);
        emailInput.required = isRegisterMode;
        const aliasHint = document.getElementById('alias-email-hint');
        aliasHint.textContent = authText('security_alias_hint');
        aliasHint.classList.add('hidden');
        idInput.classList.toggle('hidden', isRegisterMode || isRecoveryMode);
        idLabel.classList.toggle('hidden', isRegisterMode || isRecoveryMode);
        idInput.required = !isRegisterMode && !isRecoveryMode;
        passwordInput.classList.toggle('hidden', isRecoveryMode);
        passwordLabel.classList.toggle('hidden', isRecoveryMode);
        passwordInput.required = !isRecoveryMode;
        idHint.classList.toggle('hidden', !isRegisterMode);
        if (rememberMeContainer) rememberMeContainer.style.display = (isRegisterMode || isRecoveryMode) ? 'none' : 'flex';
        if (forgotLinks) forgotLinks.style.display = (!isRegisterMode && !isRecoveryMode) ? 'flex' : 'none';
        usernameInput.type = isRecoveryMode ? 'email' : 'text';
        loginSubmitBtn.textContent = isRecoveryMode ? authText('security_recover_button') : (TRANSLATIONS[currentLang] || TRANSLATIONS.en)[isRegisterMode ? 'tab_register' : 'tab_login'];
        loginSubmitBtn.dataset.i18n = isRecoveryMode ? 'security_recover_button' : isRegisterMode ? 'tab_register' : 'tab_login';
        tabLogin.classList.toggle('active', !isRegisterMode && !isRecoveryMode);
        tabRegister.classList.toggle('active', isRegisterMode);
        tabLogin.setAttribute('aria-selected', String(!isRegisterMode && !isRecoveryMode));
        tabRegister.setAttribute('aria-selected', String(isRegisterMode));
    }
    usernameInput.addEventListener('input', syncAuthForm);
    for (const input of [usernameInput, idInput]) input.addEventListener('input', () => {
        if (!isRegisterMode && savedAlias()) emailInput.value = savedAlias().email;
    });
    tabLogin.addEventListener('click', () => { isRegisterMode = false; isRecoveryMode = false; syncAuthForm(); });
    tabRegister.addEventListener('click', () => { isRegisterMode = true; isRecoveryMode = false; syncAuthForm(); });
    syncAuthForm();
    forgotUsernameIdLink?.addEventListener('click', event => {
        event.preventDefault();
        isRegisterMode = false;
        isRecoveryMode = true;
        syncAuthForm();
        authNotice('security_recovery_instructions');
        usernameInput.focus();
    });
    async function authenticateForm() {
        const identifier = usernameInput.value.trim();
        const password = passwordInput.value; // Spaces are valid password characters.
        if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier)) {
            return window.accountClient.signIn({ email: identifier, password, id: idInput.value.trim() });
        }
        const result = await authCall('loginWithUsername', { username: normalizeUsername(identifier), id: idInput.value.trim(), password });
        return (await window.auth.signInWithCustomToken(result.token)).user;
    }
    resendVerificationLink?.addEventListener('click', async event => {
        event.preventDefault();
        if (window.authFlowBusy) return;
        window.authFlowBusy = true;
        try {
            const user = await authenticateForm();
            window.auth.languageCode = currentLang;
            await authCall('sendVerificationEmail', { language: currentLang });
            authNotice('security_sent');
        } catch (error) {
            authNotice(error.code?.includes('too-many') || error.code?.includes('resource-exhausted') ? 'security_slow' : 'security_error');
        } finally {
            await window.auth.signOut();
            window.authFlowBusy = false;
        }
    });
    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (window.authFlowBusy) return;
        window.authFlowBusy = true;
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = authText('security_loading');
        loginError.classList.add('hidden');
        verificationInfo.classList.add('hidden');
        if (resendVerificationContainer) resendVerificationContainer.style.display = 'none';
        let createdUser = null;
        let accountCreated = false;
        try {
            window.auth.languageCode = currentLang;
            await window.auth.setPersistence(rememberMeCheckbox?.checked && !isRegisterMode
                ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
            if (isRecoveryMode) {
                await authCall('recoverAccountDetails', { email: usernameInput.value.trim(), language: currentLang });
                isRecoveryMode = false;
                authNotice('security_recovery_sent');
            } else if (isRegisterMode) {
                const credential = await window.auth.createUserWithEmailAndPassword(emailInput.value.trim(), passwordInput.value);
                createdUser = credential.user;
                const result = await authCall('registerAccount', { username: usernameInput.value.trim() });
                accountCreated = true;
                isRegisterMode = false;
                usernameInput.value = result.username;
                idInput.value = result.id;
                rememberAlias(result.username, result.id, createdUser.email, false);
                await authCall('sendVerificationEmail', { language: currentLang });
                authNotice('security_created', { name: result.username, id: result.id });
                await window.auth.signOut();
                syncAuthForm();
            } else {
                const user = await authenticateForm();
                await user.reload();
                if (!user.emailVerified) {
                    authNotice('security_verify');
                    if (resendVerificationContainer) resendVerificationContainer.style.display = 'block';
                    await window.auth.signOut();
                    return;
                }
                await user.getIdToken(true);
                const account = await authCall('ensureAccount');
                const privateAccount = (await window.db.collection('users').doc(account.key).get()).data();
                rememberAlias(account.username, String(privateAccount.id_number), user.email, !!rememberMeCheckbox?.checked);
                if (rememberMeCheckbox?.checked) localStorage.setItem('doori_saved_username', usernameInput.value.trim());
                else localStorage.removeItem('doori_saved_username');
                localStorage.removeItem('doori_saved_id');
                performLogin(account.username);
            }
        } catch (error) {
            // Keep an already registered account recoverable if email delivery fails.
            if (createdUser && !accountCreated) await createdUser.delete().catch(() => {});
            await window.auth.signOut().catch(() => {});
            const key = accountCreated ? 'security_created_email_error' : error.code?.includes('resource-exhausted') || error.code === 'auth/too-many-requests'
                ? 'security_slow' : isRecoveryMode && error.code?.includes('unavailable') ? 'security_recovery_error' : error.code === 'unavailable' ? 'security_unavailable'
                : isRegisterMode ? 'security_register_error' : 'security_error';
            loginError.textContent = authText(key);
            loginError.classList.remove('hidden');
            if (accountCreated) {
                syncAuthForm();
                if (resendVerificationContainer) resendVerificationContainer.style.display = 'block';
            }
            if (accountCreated && resendVerificationContainer) resendVerificationContainer.style.display = 'block';
        } finally {
            window.authFlowBusy = false;
            loginSubmitBtn.disabled = false;
            syncAuthForm();
        }
    });


    function performLogin(username) {
        currentUser = username; window.currentUser = username;
        if(window.initWebRTC) window.initWebRTC(username);
        if(typeof updateCurrentUserDisplay === 'function') updateCurrentUserDisplay();
        else if(currentUserDisplay) currentUserDisplay.textContent = currentUser;
        screens.login.classList.remove('active');
        screens.chat.classList.add('active');
        loadUserData();
        loadCallHistory(username);
    }
    
    let callHistoryUnsubscribe = null;
    function loadCallHistory(username) {
        if (callHistoryUnsubscribe) callHistoryUnsubscribe();
        callHistoryUnsubscribe = window.db.collection('users').doc(username.toLowerCase()).collection('callHistory')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(snapshot => {
                const listEl = document.getElementById('list-calls');
                if (!listEl) return;
                
                listEl.innerHTML = safeHTML('');
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
                    
                    el.innerHTML = safeHTML(`
                        <div class="avatar" style="color:${color}; border-color:${color};">${avatarHtml}</div>
                        <div class="chat-item-info">
                            <span class="chat-item-name" style="color:${color};">${data.peer}</span>
                            <span class="chat-item-last-message" style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">${iconStr} - ${timeStr} ${durStr ? '('+durStr+' '+(t.lbl_min || 'Min')+')' : ''}</span>
                        </div>
                    `);
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
        let b64 = msg.mediaUrl || msg.fileData;
        if (!b64 || !b64.startsWith('data:')) return b64;
        // DOMPurify intentionally removes blob: URLs. Keep the stored media data
        // URL so the sanitized audio/video element retains a playable source.
        return b64.replace(/(data:(audio|video)\/[a-zA-Z0-9.+-]+);.*?base64,/, '$1;base64,');
    }

    function renderCustomPlayer(url, type) {
        let safeUrl = url || '';
        if(safeUrl.startsWith('data:')) {
            safeUrl = safeUrl.replace(/(data:(audio|video)\/[a-zA-Z0-9]+);.*?base64,/, '$1;base64,');
        }
        const id = 'player_' + Math.random().toString(36).substr(2,9);
        const savedSpeed = localStorage.getItem('doori_audio_speed') || '1';
        const speedText = (savedSpeed === '1' ? '1' : savedSpeed) + 'x';
        let html = `<div class="custom-player" id="${id}" style="${playerGlass ? '' : 'backdrop-filter:none; background:rgba(16,30,38,0.9);'} border-color:${playerColor};">`;
        if(type === 'video') html += `<div class="custom-player-video-container"><video src="${safeUrl}" playsinline preload="none"></video></div>`;
        else html += `<audio src="${safeUrl}" playsinline preload="none"></audio>`;
        html += `<div class="custom-player-controls"><button class="player-btn play-btn" style="background:${playerColor};">▶</button><div class="player-progress-container"><div class="player-progress-bar" style="background:${playerColor};"></div></div><span class="player-time">0:00 / 0:00</span><button class="player-speed-btn" type="button" title="Wiedergabegeschwindigkeit">${speedText}</button></div></div>`;
        return html;
    }
    window.renderCustomPlayer = renderCustomPlayer;
    function initCustomPlayers() {
        document.querySelectorAll('.custom-player').forEach(playerEl => {
            if(playerEl.dataset.initialized) return; playerEl.dataset.initialized = 'true';
            const media = playerEl.querySelector('video, audio'); const playBtn = playerEl.querySelector('.play-btn'); const progBar = playerEl.querySelector('.player-progress-bar'); const progCont = playerEl.querySelector('.player-progress-container'); const timeEl = playerEl.querySelector('.player-time');
            if(!media) return;
            const fmt = (s) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
            const speedBtn = playerEl.querySelector('.player-speed-btn');
            const savedSpeed = parseFloat(localStorage.getItem('doori_audio_speed') || '1');
            media.playbackRate = savedSpeed;
            if (speedBtn) {
                speedBtn.onclick = (e) => {
                    e.stopPropagation();
                    let currentRate = media.playbackRate || 1;
                    let nextRate = 1;
                    if (currentRate === 1) nextRate = 1.5;
                    else if (currentRate === 1.5) nextRate = 2;
                    else nextRate = 1;
                    localStorage.setItem('doori_audio_speed', nextRate.toString());
                    document.querySelectorAll('.custom-player').forEach(p => {
                        const m = p.querySelector('video, audio');
                        const sBtn = p.querySelector('.player-speed-btn');
                        if (m) m.playbackRate = nextRate;
                        if (sBtn) sBtn.textContent = nextRate + 'x';
                    });
                };
            }
            playBtn.onclick = () => {
                if (media.paused) {
                    media.dataset.playPending = 'true';
                    const p = media.play();
                    if (p !== undefined) {
                        p.then(() => {
                            delete media.dataset.playPending;
                            playBtn.textContent = '\u23F8';
                        }).catch(error => {
                            delete media.dataset.playPending;
                            playBtn.textContent = '\u25B6';
                            const interrupted = error?.name === 'AbortError' || /interrupted by a call to pause/i.test(error?.message || '');
                            if (!interrupted) {
                                console.error('Media playback failed', error);
                                alert((TRANSLATIONS[currentLang] || TRANSLATIONS.en).err_media_playback);
                            }
                        });
                    } else {
                        delete media.dataset.playPending;
                        playBtn.textContent = '\u23F8';
                    }
                } else {
                    media.pause();
                    playBtn.textContent = '\u25B6';
                }
            };
            media.ontimeupdate = () => { if(media.duration) { progBar.style.width = (media.currentTime/media.duration*100)+'%'; timeEl.textContent = `${fmt(media.currentTime)} / ${fmt(media.duration)}`; } };
            media.onloadedmetadata = () => { timeEl.textContent = `0:00 / ${fmt(media.duration)}`; };
            media.onended = () => { playBtn.textContent = '\u25B6'; progBar.style.width = '0%'; };
            media.onpause = () => { if (!media.ended) playBtn.textContent = '\u25B6'; };
            progCont.onclick = (e) => { const r = progCont.getBoundingClientRect(); const pct = (e.clientX - r.left)/r.width; media.currentTime = pct * media.duration; };
        });
    }

    // Firestore snapshots already update changed messages. Re-rendering every
    // second resets media loading on slower devices and produces 0:00 players.

    // Auto-login only after server-confirmed Firebase email verification.
    window.auth.onAuthStateChanged(async user => {
        if (!user || currentUser || window.authFlowBusy) return;
        try {
            await user.reload();
            if (!user.emailVerified) { await window.auth.signOut(); return; }
            await user.getIdToken(true);
            const result = await authCall('ensureAccount');
            if (!currentUser) performLogin(result.username);
        } catch (error) { console.error('Auto-login failed', error); }
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
        if (selectedMembersContainer) selectedMembersContainer.innerHTML = safeHTML('');
        renderGroupContacts();
    };

    window.renderGroupContacts = function() {
        if (!groupContactsList) return;
        groupContactsList.innerHTML = safeHTML('');
        chatData.contacts.forEach(c => {
            if (selectedMembers.has(c.id)) return;
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = safeHTML(`
                <div class="avatar">${c.id.charAt(0).toUpperCase()}</div>
                <div class="chat-item-info"><span class="chat-item-name">${c.id}</span></div>
                <button class="icon-btn text-btn" style="color:var(--accent); font-size:1rem;">+</button>
            `);
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
        badge.innerHTML = safeHTML(`<span>${username}</span><span class="remove-member">✖</span>`);
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
                const docRef = window.db.collection('profiles').doc(q);
                const docSnap = await docRef.get();
                if (docSnap.exists && docSnap.data().id_number === idVal) {
                    groupMemberSearchResult.style.display = 'flex';
                    groupMemberSearchResult.innerHTML = safeHTML(`
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div class="avatar">${q.charAt(0).toUpperCase()}</div>
                            <span>${q}</span>
                        </div>
                        <button class="submit-btn" id="add-searched-member" style="padding: 5px 15px; font-size: 14px; min-width: auto; height: auto; border-radius: 20px;">${(window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).btn_add_user || 'Hinzufügen'}</button>
                    `);
                    document.getElementById('add-searched-member').addEventListener('click', () => {
                        addSelectedMember(q);
                        groupMemberSearchResult.style.display = 'none';
                        groupMemberSearchInput.value = '';
                        renderGroupContacts();
                    });
                } else {
                    groupMemberSearchResult.style.display = 'flex';
                    groupMemberSearchResult.innerHTML = safeHTML(`<span style="color:var(--danger);" data-i18n="err_user_not_found">Dieser Benutzer existiert nicht.</span>`);
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
                editGroupAvatarPreview.innerHTML = safeHTML(`<img src="${currentChat.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`);
                editGroupAvatarUrl = currentChat.avatar;
            } else {
                editGroupAvatarPreview.innerHTML = safeHTML('📷');
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
        
        groupMembersList.innerHTML = safeHTML('');
        
        const isMeOwner = currentChat.creator === currentUser;
        const isAdmin = isMeOwner || (currentChat.admins && currentChat.admins.includes(currentUser));
        
        groupInfoActions.style.display = isAdmin ? 'flex' : 'none';
        if (leaveGroupBtn) leaveGroupBtn.style.display = 'block';
        
        const deleteGroupBtn = document.getElementById('delete-group-btn');
        if (deleteGroupBtn) {
            deleteGroupBtn.style.display = isMeOwner ? 'block' : 'none';
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
            const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en'];
            
            // Sort so owner is first, then admins, then members
            const sortedMembers = [...currentChat.members].sort((a, b) => {
                if (a === currentChat.creator) return -1;
                if (b === currentChat.creator) return 1;
                const aIsAdmin = currentChat.admins && currentChat.admins.includes(a);
                const bIsAdmin = currentChat.admins && currentChat.admins.includes(b);
                if (aIsAdmin && !bIsAdmin) return -1;
                if (!aIsAdmin && bIsAdmin) return 1;
                return a.localeCompare(b);
            });

            sortedMembers.forEach(member => {
                const isMemberAdmin = currentChat.admins && currentChat.admins.includes(member);
                const isCreator = currentChat.creator === member;
                
                const div = document.createElement('div');
                div.className = 'member-item';
                
                let badges = '';
                if (isCreator) badges += '<span class="admin-badge" data-i18n="lbl_owner">' + (t.lbl_owner || '[Besitzer]') + '</span>';
                else if (isMemberAdmin) badges += '<span class="admin-badge" data-i18n="lbl_admin">' + (t.lbl_admin || '[Admin]') + '</span>';
                
                let actions = '';
                if ((isAdmin || isMeOwner) && member !== currentUser) {
                    const isMuted = currentChat.mutedMembers && currentChat.mutedMembers.includes(member);
                    const canPromote = isMeOwner;
                    const canMuteOrKick = isMeOwner || (!isCreator && !isMemberAdmin);
                    
                    if (canPromote && !isCreator) {
                        const adminBtnText = isMemberAdmin ? '👑-' : '👑+';
                        const adminTitle = isMemberAdmin ? (t.btn_demote || 'Demote') : (t.btn_promote || 'Promote');
                        actions += `<button class="icon-btn" style="background: rgba(255,255,255,0.1); color: gold; border-radius: 5px; padding: 5px 8px; font-size: 14px; margin-right: 5px;" ${actionAttrs("toggleGroupAdmin", member, !isMemberAdmin)} title="${adminTitle}">${adminBtnText}</button>`;
                    }
                    if (canMuteOrKick) {
                        actions += `<button class="icon-btn" style="background: ${isMuted ? '#ff4757' : 'rgba(255,255,255,0.1)'}; color: #fff; border-radius: 5px; padding: 5px 8px; font-size: 14px; margin-right: 5px;" ${actionAttrs("toggleMuteMember", member, !isMuted)} title="${isMuted ? (t.btn_unmute_member || 'Unmute') : (t.btn_mute_member || 'Mute')}">${isMuted ? '🔊' : '🔇'}</button>`;
                        actions += `<button class="icon-btn danger" style="padding: 5px 8px; font-size: 14px;" ${actionAttrs("removeGroupMember", member)} title="${t.btn_kick_member || 'Remove'}">✖</button>`;
                    }
                }
                
                div.innerHTML = safeHTML(`
                    <div class="member-item-info">
                        <div class="avatar">${member.charAt(0).toUpperCase()}</div>
                        <span>${member} ${badges}</span>
                    </div>
                    <div style="display:flex;">${actions}</div>
                `);
                groupMembersList.appendChild(div);
            });
        }
        applyTranslation(currentLang);
    };

    window.toggleGroupAdmin = async function(username, makeAdmin) {
        if (!currentChat || currentChat.type !== 'room' || currentChat.creator !== currentUser) return;
        const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en'];
        try {
            let admins = currentChat.admins || [];
            if (makeAdmin) {
                if (!admins.includes(username)) admins.push(username);
            } else {
                admins = admins.filter(m => m !== username);
            }
            await window.db.collection('groups').doc(currentChat.id).update({ admins });
            alert(makeAdmin ? (t.msg_promoted || 'Promoted') : (t.msg_demoted || 'Demoted'));
        } catch(e) { console.error(e); }
    };

    window.toggleMuteMember = async function(username, mute) {
        if (!currentChat || currentChat.type !== 'room') return;
        const isMeOwner = currentChat.creator === currentUser;
        const isMeAdmin = isMeOwner || (currentChat.admins && currentChat.admins.includes(currentUser));
        const isTargetAdmin = currentChat.creator === username || (currentChat.admins && currentChat.admins.includes(username));
        if (!isMeOwner && isTargetAdmin) {
            const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en'];
            alert(t.err_cannot_kick_admin || 'Cannot mute an Admin or Owner.');
            return;
        }
        if (!isMeAdmin) return;

        try {
            let mutedMembers = currentChat.mutedMembers || [];
            if (mute) {
                if (!mutedMembers.includes(username)) mutedMembers.push(username);
            } else {
                mutedMembers = mutedMembers.filter(m => m !== username);
            }
            await window.db.collection('groups').doc(currentChat.id).update({ mutedMembers });
        } catch(e) { console.error(e); }
    };

    window.removeGroupMember = async function(username) {
        if (!currentChat || currentChat.type !== 'room') return;
        const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en'];
        const isMeOwner = currentChat.creator === currentUser;
        const isMeAdmin = isMeOwner || (currentChat.admins && currentChat.admins.includes(currentUser));
        const isTargetAdmin = currentChat.creator === username || (currentChat.admins && currentChat.admins.includes(username));
        
        if (!isMeOwner && isTargetAdmin) {
            alert(t.err_cannot_kick_admin || 'Cannot remove an Admin or Owner.');
            return;
        }
        if (!isMeAdmin) {
            alert(t.err_no_permission || 'No permission.');
            return;
        }
        try {
            const newMembers = currentChat.members.filter(m => m !== username);
            const newAdmins = (currentChat.admins || []).filter(m => m !== username);
            const newMuted = (currentChat.mutedMembers || []).filter(m => m !== username);
            await window.db.collection('groups').doc(currentChat.id).update({
                members: newMembers,
                admins: newAdmins,
                mutedMembers: newMuted
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
                        const snapshot = await window.db.collection('profiles').where('idNumber', '==', query).get();
                        if (!snapshot.empty) userDoc = snapshot.docs[0];
                    } else {
                        userDoc = await window.db.collection('profiles').doc(u).get();
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
    window.acceptGroupInvite = async function(groupId, msgId) {
        try {
            await authCall('acceptGroupInvitation', { groupId, messageId: msgId });
            window.closeInviteModal?.();
        } catch (error) { alert(authText('security_invite_error')); }
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
                .where('participants', 'array-contains', currentUser.toLowerCase()).where('isPublic', '==', false)
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
        textEl.innerHTML = safeHTML(((window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en']).msg_invited_by || 'Du wurdest von <b>{sender}</b> in die Gruppe <b>{group}</b> eingeladen.').replace('{sender}', escapeHTML(msg.sender_username)).replace('{group}', escapeHTML(msg.invite_group_name)));
        
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
            sender_username: currentUser,
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

    

    const lsFixes = {
        de: { ls_online: 'Online', ls_recently: 'gerade eben erst gesehen', ls_minutes: 'zuletzt gesehen vor {m} Minuten', ls_today: 'zuletzt gesehen heute um {t}', ls_yesterday: 'zuletzt gesehen gestern um {t}', ls_days: 'zuletzt gesehen am {d} um {t}', ls_week: 'zuletzt gesehen vor 1 Woche', ls_month: 'zuletzt gesehen vor 1 Monat', ls_long_time: 'zuletzt gesehen vor langer Zeit' },
        en: { ls_online: 'Online', ls_recently: 'seen just now', ls_minutes: 'last seen {m} minutes ago', ls_today: 'last seen today at {t}', ls_yesterday: 'last seen yesterday at {t}', ls_days: 'last seen on {d} at {t}', ls_week: 'last seen 1 week ago', ls_month: 'last seen 1 month ago', ls_long_time: 'last seen a long time ago' },
        tr: { ls_online: 'Çevrimiçi', ls_recently: 'az önce görüldü', ls_minutes: 'son görülme {m} dakika önce', ls_today: 'son görülme bugün {t}', ls_yesterday: 'son görülme dün {t}', ls_days: 'son görülme {d} {t}', ls_week: 'son görülme 1 hafta önce', ls_month: 'son görülme 1 ay önce', ls_long_time: 'uzun zaman önce görüldü' },
        es: { ls_online: 'En línea', ls_recently: 'visto hace un momento', ls_minutes: 'visto por última vez hace {m} minutos', ls_today: 'visto por última vez hoy a las {t}', ls_yesterday: 'visto por última vez ayer a las {t}', ls_days: 'visto por última vez el {d} a las {t}', ls_week: 'visto por última vez hace 1 semana', ls_month: 'visto por última vez hace 1 mes', ls_long_time: 'visto por última vez hace mucho tiempo' },
        fr: { ls_online: 'En ligne', ls_recently: 'vu à l\'instant', ls_minutes: 'vu pour la dernière fois il y a {m} minutes', ls_today: 'vu pour la dernière fois aujourd\'hui à {t}', ls_yesterday: 'vu pour la dernière fois hier à {t}', ls_days: 'vu pour la dernière fois le {d} à {t}', ls_week: 'vu pour la dernière fois il y a 1 semaine', ls_month: 'vu pour la dernière fois il y a 1 mois', ls_long_time: 'vu pour la dernière fois il y a longtemps' },
        ar: { ls_online: 'متصل', ls_recently: 'شوهد للتو', ls_minutes: 'آخر ظهور قبل {m} دقيقة', ls_today: 'آخر ظهور اليوم عند {t}', ls_yesterday: 'آخر ظهور أمس عند {t}', ls_days: 'آخر ظهور في {d} عند {t}', ls_week: 'آخر ظهور قبل أسبوع واحد', ls_month: 'آخر ظهور قبل شهر واحد', ls_long_time: 'آخر ظهور منذ فترة طويلة' },
        fa: { ls_online: 'آنلاین', ls_recently: 'همین الان دیده شد', ls_minutes: 'آخرین بازدید {m} دقیقه پیش', ls_today: 'آخرین بازدید امروز ساعت {t}', ls_yesterday: 'آخرین بازدید دیروز ساعت {t}', ls_days: 'آخرین بازدید در {d} ساعت {t}', ls_week: 'آخرین بازدید 1 هفته پیش', ls_month: 'آخرین بازدید 1 ماه پیش', ls_long_time: 'آخرین بازدید خیلی وقت پیش' }
    };
    for(let lang in lsFixes) {
        if(TRANSLATIONS[lang]) {
            Object.assign(TRANSLATIONS[lang], lsFixes[lang]);
        }
    }

    // Blocked Contacts
    window.renderBlockedContacts = function() {
        const list = document.getElementById('blocked-contacts-list');
        if(!list) return;
        list.innerHTML = safeHTML('');
        const t = TRANSLATIONS[currentLang] || TRANSLATIONS['de'];
        if(blockedContacts.size === 0) {
            list.innerHTML = safeHTML(`<span style="color: var(--text-secondary);">${t.msg_no_blocked || 'Keine blockierten Kontakte.'}</span>`);
            return;
        }
        blockedContacts.forEach(username => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '5px 0';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.innerHTML = safeHTML(`
                <span>${username}</span>
                <button class="text-btn" style="color: var(--bg-red); font-size: 12px; padding: 5px;" ${actionAttrs("unblockUser", username)}>${t.btn_unblock || 'Entblocken'}</button>
            `);
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
        const mentionDropdown = document.getElementById('mention-dropdown');
        let mentionSearchTerm = '';
        let mentionActiveIndex = 0;
        let filteredMembers = [];

        function renderMentionDropdown() {
            if(!mentionDropdown) return;
            mentionDropdown.innerHTML = safeHTML('');
            filteredMembers.forEach((member, idx) => {
                const item = document.createElement('div');
                item.className = 'mention-item' + (idx === mentionActiveIndex ? ' active' : '');
                item.innerHTML = safeHTML(`<div class="mention-avatar">${member.charAt(0).toUpperCase()}</div><div>${member}</div>`);
                item.onclick = () => insertMention(member);
                mentionDropdown.appendChild(item);
            });
            mentionDropdown.classList.remove('hidden');
            const activeEl = mentionDropdown.querySelector('.active');
            if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
        }

        function insertMention(username) {
            const val = messageInput.value;
            const cursorPos = messageInput.selectionStart;
            const textBeforeCursor = val.substring(0, cursorPos);
            const textAfterCursor = val.substring(cursorPos);
            const newTextBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_.-]*)$/, '@' + username + ' ');
            messageInput.value = newTextBefore + textAfterCursor;
            messageInput.selectionStart = messageInput.selectionEnd = newTextBefore.length;
            messageInput.focus();
            if(mentionDropdown) mentionDropdown.classList.add('hidden');
        }

        messageInput.addEventListener('input', (e) => {
            if (!mentionDropdown || !window.currentChat || window.currentChat.type !== 'room' || !window.currentChat.members) {
                if(mentionDropdown) mentionDropdown.classList.add('hidden');
                return;
            }
            const val = messageInput.value;
            const cursorPos = messageInput.selectionStart;
            const textBeforeCursor = val.substring(0, cursorPos);
            const match = textBeforeCursor.match(/@([a-zA-Z0-9_.-]*)$/);
            
            if (match) {
                mentionSearchTerm = match[1].toLowerCase();
                filteredMembers = window.currentChat.members.filter(m => m.toLowerCase().includes(mentionSearchTerm));
                if (filteredMembers.length > 0) {
                    mentionActiveIndex = 0;
                    renderMentionDropdown();
                } else {
                    mentionDropdown.classList.add('hidden');
                }
            } else {
                mentionDropdown.classList.add('hidden');
            }
        });

        messageInput.addEventListener('keydown', (e) => {
            if (mentionDropdown && !mentionDropdown.classList.contains('hidden')) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    mentionActiveIndex = (mentionActiveIndex + 1) % filteredMembers.length;
                    renderMentionDropdown();
                    return;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    mentionActiveIndex = (mentionActiveIndex - 1 + filteredMembers.length) % filteredMembers.length;
                    renderMentionDropdown();
                    return;
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    insertMention(filteredMembers[mentionActiveIndex]);
                    return;
                } else if (e.key === 'Escape') {
                    mentionDropdown.classList.add('hidden');
                    return;
                }
            }

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

const detailsSharedMedia = document.getElementById('details-shared-media');
const detailsStarredMessages = document.getElementById('details-starred-messages');
const detailsGames = document.getElementById('details-games');
if (detailsSharedMedia) detailsSharedMedia.addEventListener('click', () => document.getElementById('chat-media-btn')?.click());
if (detailsStarredMessages) detailsStarredMessages.addEventListener('click', () => document.getElementById('chat-starred-btn')?.click());
if (detailsGames) detailsGames.addEventListener('click', () => document.getElementById('games-btn')?.click());

// Location Sharing Logic
const menuLocationBtn = document.getElementById('menu-location-btn');
if (menuLocationBtn) {
    menuLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("Dein Browser unterstützt diese Funktion leider nicht.");
            return;
        }
        
        const originalHtml = menuLocationBtn.innerHTML;
        menuLocationBtn.innerHTML = safeHTML('⏳ <span data-i18n="lbl_location">Standort wird abgerufen...</span>');
        
        navigator.geolocation.getCurrentPosition((position) => {
            menuLocationBtn.innerHTML = safeHTML(originalHtml);
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            sendMessage('', 'location', lat + ',' + lng);
            if (plusMenuDropdown) plusMenuDropdown.classList.add('hidden');
        }, (error) => {
            menuLocationBtn.innerHTML = safeHTML(originalHtml);
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
    styleEl.textContent = `.msg-sent .msg-bubble, .message.sent .message-bubble, #message-input { font-size: ${px} !important; }`;
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
                window.db.collection('profiles').doc(window.currentUser).set({ bio: newBio }, { merge: true }).catch(console.error);
                if(window.users && window.users.has(window.currentUser)) {
                    let uData = window.users.get(window.currentUser);
                    uData.bio = newBio;
                    window.users.set(window.currentUser, uData);
                }
            }
        }, 1000);
    });
}

// --- Status Presets Logic ---
const statusPresetBtns = document.querySelectorAll('.status-preset-btn');
const customStatusInput = document.getElementById('setting-custom-status');
const saveStatusBtn = document.getElementById('btn-save-status');

if (statusPresetBtns.length > 0 && customStatusInput) {
    statusPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            statusPresetBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'rgba(255,255,255,0.06)';
                b.style.color = 'white';
                b.style.fontWeight = 'normal';
            });
            btn.classList.add('active');
            btn.style.background = 'var(--accent)';
            btn.style.color = '#000';
            btn.style.fontWeight = 'bold';
            const presetKey = btn.getAttribute('data-status-key') || btn.getAttribute('data-i18n');
            const t = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[window.currentLang]) ? TRANSLATIONS[window.currentLang] : (window.TRANSLATIONS?.en || {});
            const localized = (presetKey && t[presetKey]) ? t[presetKey] : btn.textContent.trim();
            customStatusInput.value = localized;
            customStatusInput.dataset.presetKey = presetKey || '';
        });
    });

    customStatusInput.addEventListener('input', () => {
        delete customStatusInput.dataset.presetKey;
        statusPresetBtns.forEach(b => {
            b.classList.remove('active');
            b.style.background = 'rgba(255,255,255,0.06)';
            b.style.color = 'white';
            b.style.fontWeight = 'normal';
        });
    });
}

if (saveStatusBtn && customStatusInput) {
    saveStatusBtn.addEventListener('click', async () => {
        const statusVal = customStatusInput.value.trim();
        const userKey = (window.currentUser || '').replace('@','').toLowerCase();
        if (!userKey) return;
        
        try {
            if (window.db) {
                await window.db.collection('profiles').doc(userKey).set({ bio: statusVal }, { merge: true });
                await window.db.collection('userData').doc(userKey).set({ status: statusVal }, { merge: true });
            }
            if (bioInput) bioInput.value = statusVal;
            const profileObj = (typeof getUserProfile === 'function' ? getUserProfile(window.currentUser) : null) || (window.users ? window.users.get(window.currentUser) : null) || {};
            profileObj.bio = statusVal;
            profileObj.status = statusVal;
            if (window.users) {
                window.users.set(window.currentUser, profileObj);
                window.users.set(userKey, profileObj);
                window.users.set('@' + userKey, profileObj);
            }
            if (typeof updateCurrentUserDisplay === 'function') updateCurrentUserDisplay();
            const t = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[window.currentLang]) ? TRANSLATIONS[window.currentLang] : (window.TRANSLATIONS?.en || {});
            alert(t.msg_status_updated || 'Status wurde erfolgreich aktualisiert!');
            if (typeof renderChatList === 'function') renderChatList();
        } catch(err) {
            console.error('Failed to update status', err);
        }
    });
}

// Subscribe to auth state or listen for currentUser changes to populate bio
if(window.firebase) {
    firebase.auth().onAuthStateChanged(user => {
        if(user && user.displayName) {
            window.db.collection('profiles').doc(user.displayName).get().then(doc => {
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
                        const pKey = typeof window.getPresetKeyFromStatus === 'function' ? window.getPresetKeyFromStatus(uData.bio) : null;
                        const t = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[window.currentLang]) ? TRANSLATIONS[window.currentLang] : (window.TRANSLATIONS?.en || {});
                        const displayBio = (pKey && t[pKey]) ? t[pKey] : uData.bio;
                        bioEl.textContent = '"' + displayBio + '"';
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
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.TRANSLATIONS) {
            const extraTrans = {
                de: { lbl_font_family: 'Schriftart', lbl_font_color: 'Schriftfarbe (Eigener Text)', opt_color_default: 'Standard (Weiß)', opt_color_blue: 'Hellblau', opt_color_green: 'Hellgrün', opt_color_pink: 'Hellrosa', btn_custom_wallpaper: 'Eigene...', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Schreibmaschine', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Locker (Comic)' },
                en: { lbl_font_family: 'Font Family', lbl_font_color: 'Font Color (Own Text)', opt_color_default: 'Default (White)', opt_color_blue: 'Light Blue', opt_color_green: 'Light Green', opt_color_pink: 'Light Pink', btn_custom_wallpaper: 'Custom...', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Typewriter', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Casual (Comic)' },
                fa: { lbl_font_family: 'نوع فونت', lbl_font_color: 'رنگ فونت (متن خود)', opt_color_default: 'پیش‌فرض (سفید)', opt_color_blue: 'آبی روشن', opt_color_green: 'سبز روشن', opt_color_pink: 'صورتی روشن', btn_custom_wallpaper: 'سفارشی...', opt_font_inter: 'استاندارد (Inter)', opt_font_courier: 'ماشین تحریر', opt_font_georgia: 'ظریف (Serif)', opt_font_comic: 'غیررسمی (Comic)' },
                ar: { lbl_font_family: 'نوع الخط', lbl_font_color: 'لون الخط (نصك الخاص)', opt_color_default: 'افتراضي (أبيض)', opt_color_blue: 'أزرق فاتح', opt_color_green: 'أخضر فاتح', opt_color_pink: 'وردي فاتح', btn_custom_wallpaper: 'مخصص...', opt_font_inter: 'قياسي (Inter)', opt_font_courier: 'آلة كاتبة', opt_font_georgia: 'أنيق (Serif)', opt_font_comic: 'غير رسمي (Comic)' },
                tr: { lbl_font_family: 'Yazı Tipi', lbl_font_color: 'Yazı Rengi (Kendi Metniniz)', opt_color_default: 'Varsayılan (Beyaz)', opt_color_blue: 'Açık Mavi', opt_color_green: 'Açık Yeşil', opt_color_pink: 'Açık Pembe', btn_custom_wallpaper: 'Özel...', opt_font_inter: 'Standart (Inter)', opt_font_courier: 'Daktilo', opt_font_georgia: 'Zarif (Serif)', opt_font_comic: 'Gündelik (Comic)' }
            };
            
            const prevTrans = {
                de: { tab_design: 'Design', lbl_bio: 'Info / Über mich', lbl_wallpaper: 'Chat-Hintergrundbild', btn_change_wallpaper: 'Bild auswählen', btn_remove_wallpaper: 'Entfernen', lbl_font_size: 'Schriftgröße', opt_font_small: 'Klein', opt_font_normal: 'Normal', opt_font_large: 'Groß', ctx_delete_for_me: 'Für mich löschen', ctx_msg_info: 'Nachrichten-Info', msg_read_at: 'Gelesen am: ', msg_unread: 'Noch nicht gelesen', msg_read_unknown: 'Gelesen (kein genauer Zeitpunkt verfügbar)', dlg_delete_title: 'Nachricht löschen?', dlg_delete_for_all: 'Für alle löschen', dlg_cancel: 'Abbrechen', btn_invite_link: 'Einladungslink', lbl_invite_link_desc: 'Teile diesen Link, um andere einzuladen.', btn_copy_link: 'Link kopieren', btn_reset_link: 'Zurücksetzen', msg_link_copied: 'Link in die Zwischenablage kopiert!', msg_join_confirm: 'Möchtest du dieser Gruppe beitreten?', err_invalid_token: 'Ungültiger oder abgelaufener Einladungslink!', ctx_pin_msg: 'Nachricht anpinnen', ctx_unpin_msg: 'Nachricht loslösen', lbl_pinned: 'Angepinnt', msg_not_visible: 'Nicht sichtbar' },
                en: { tab_design: 'Design', lbl_bio: 'About / Info', lbl_wallpaper: 'Chat Wallpaper', btn_change_wallpaper: 'Select Image', btn_remove_wallpaper: 'Remove', lbl_font_size: 'Font Size', opt_font_small: 'Small', opt_font_normal: 'Normal', opt_font_large: 'Large', ctx_delete_for_me: 'Delete for me', ctx_msg_info: 'Message Info', msg_read_at: 'Read at: ', msg_unread: 'Not read yet', msg_read_unknown: 'Read (no exact time available)', dlg_delete_title: 'Delete message?', dlg_delete_for_all: 'Delete for everyone', dlg_cancel: 'Cancel', btn_invite_link: 'Invite Link', lbl_invite_link_desc: 'Share this link to invite others.', btn_copy_link: 'Copy Link', btn_reset_link: 'Reset', msg_link_copied: 'Link copied to clipboard!', msg_join_confirm: 'Do you want to join this group?', err_invalid_token: 'Invalid or expired invite link!', ctx_pin_msg: 'Pin Message', ctx_unpin_msg: 'Unpin Message', lbl_pinned: 'Pinned', msg_not_visible: 'Not visible' },
                fa: { tab_design: 'طراحی', lbl_bio: 'درباره من', lbl_wallpaper: 'تصویر زمینه چت', btn_change_wallpaper: 'انتخاب تصویر', btn_remove_wallpaper: 'حذف', lbl_font_size: 'اندازه فونت', opt_font_small: 'کوچک', opt_font_normal: 'معمولی', opt_font_large: 'بزرگ', ctx_delete_for_me: 'حذف برای من', ctx_msg_info: 'اطلاعات پیام', msg_read_at: 'خوانده شده در: ', msg_unread: 'هنوز خوانده نشده', msg_read_unknown: 'خوانده شده (زمان دقیق در دسترس نیست)', dlg_delete_title: 'حذف پیام؟', dlg_delete_for_all: 'حذف برای همه', dlg_cancel: 'لغو', btn_invite_link: 'لینک دعوت', lbl_invite_link_desc: 'این لینک را برای دعوت دیگران به اشتراک بگذارید.', btn_copy_link: 'کپی لینک', btn_reset_link: 'بازنشانی', msg_link_copied: 'لینک در کلیپ بورد کپی شد!', msg_join_confirm: 'آیا می‌خواهید به این گروه بپیوندید؟', err_invalid_token: 'لینک دعوت نامعتبر یا منقضی شده است!', ctx_pin_msg: 'پین کردن پیام', ctx_unpin_msg: 'برداشتن پین پیام', lbl_pinned: 'پین شده', msg_not_visible: 'قابل مشاهده نیست' },
                ar: { tab_design: 'التصميم', lbl_bio: 'حول / معلومات', lbl_wallpaper: 'خلفية الدردشة', btn_change_wallpaper: 'اختر صورة', btn_remove_wallpaper: 'إزالة', lbl_font_size: 'حجم الخط', opt_font_small: 'صغير', opt_font_normal: 'عادي', opt_font_large: 'كبير', ctx_delete_for_me: 'حذف بالنسبة لي', ctx_msg_info: 'معلومات الرسالة', msg_read_at: 'قرأ في: ', msg_unread: 'لم تقرأ بعد', msg_read_unknown: 'قرأ (لا يوجد وقت دقيق)', dlg_delete_title: 'حذف الرسالة؟', dlg_delete_for_all: 'حذف للجميع', dlg_cancel: 'إلغاء', btn_invite_link: 'رابط الدعوة', lbl_invite_link_desc: 'شارك هذا الرابط لدعوة الآخرين.', btn_copy_link: 'نسخ الرابط', btn_reset_link: 'إعادة تعيين', msg_link_copied: 'تم نسخ الرابط إلى الحافظة!', msg_join_confirm: 'هل تريد الانضمام إلى هذه المجموعة؟', err_invalid_token: 'رابط دعوة غير صالح أو منتهي الصلاحية!', ctx_pin_msg: 'تثبيت الرسالة', ctx_unpin_msg: 'إلغاء تثبيت الرسالة', lbl_pinned: 'مثبتة', msg_not_visible: 'غير مرئي' },
                tr: { tab_design: 'Tasarım', lbl_bio: 'Hakkımda / Bilgi', lbl_wallpaper: 'Sohbet Duvar Kağıdı', btn_change_wallpaper: 'Resim Seç', btn_remove_wallpaper: 'Kaldır', lbl_font_size: 'Yazı Tipi Boyutu', opt_font_small: 'Küçük', opt_font_normal: 'Normal', opt_font_large: 'Büyük', ctx_delete_for_me: 'Benim için sil', ctx_msg_info: 'Mesaj Bilgisi', msg_read_at: 'Okunma zamanı: ', msg_unread: 'Henüz okunmadı', msg_read_unknown: 'Okundu (kesin zaman yok)', dlg_delete_title: 'Mesaj silinsin mi?', dlg_delete_for_all: 'Herkes için sil', dlg_cancel: 'İptal', btn_invite_link: 'Davet Bağlantısı', lbl_invite_link_desc: 'Başkalarını davet etmek için bu bağlantıyı paylaşın.', btn_copy_link: 'Bağlantıyı Kopyala', btn_reset_link: 'Sıfırla', msg_link_copied: 'Bağlantı panoya kopyalandı!', msg_join_confirm: 'Bu gruba katılmak istiyor musunuz?', err_invalid_token: 'Geçersiz veya süresi dolmuş davet bağlantısı!', ctx_pin_msg: 'Mesajı Sabitle', ctx_unpin_msg: 'Mesajı Sabitlemekten Çıkar', lbl_pinned: 'Sabitlenmiş', msg_not_visible: 'Görünmez' }
            };

            const extraOptions = {
                de: { ctx_add_contact: 'Zu Kontakten hinzufügen', ctx_mute_user: 'Stummschalten', ctx_unmute_user: 'Stummschaltung aufheben', ctx_clear_chat: 'Chat leeren', ctx_block_user: 'Blockieren', ctx_unblock_user: 'Entblocken', msg_confirm_clear: 'Diesen Chat wirklich für alle leeren?', msg_confirm_block: 'Sind Sie sich sicher, dass Sie den Benutzer blockieren möchten? (Ja / Nein)' },
                en: { ctx_add_contact: 'Add to contacts', ctx_mute_user: 'Mute', ctx_unmute_user: 'Unmute', ctx_clear_chat: 'Clear chat', ctx_block_user: 'Block', ctx_unblock_user: 'Unblock', msg_confirm_clear: 'Really clear this chat for everyone?', msg_confirm_block: 'Are you sure you want to block this user? (Yes / No)' },
                fa: { ctx_add_contact: 'افزودن به مخاطبین', ctx_mute_user: 'بی‌صدا کردن', ctx_unmute_user: 'باصدا کردن', ctx_clear_chat: 'پاک کردن چت', ctx_block_user: 'مسدود کردن', ctx_unblock_user: 'رفع مسدودیت', msg_confirm_clear: 'آیا واقعاً می‌خواهید این چت را برای همه پاک کنید؟', msg_confirm_block: 'آیا مطمئن هستید که می‌خواهید این کاربر را مسدود کنید؟ (بله / خیر)' },
                ar: { ctx_add_contact: 'أضف إلى جهات الاتصال', ctx_mute_user: 'كتم الصوت', ctx_unmute_user: 'إلغاء كتم الصوت', ctx_clear_chat: 'مسح الدردشة', ctx_block_user: 'حظر', ctx_unblock_user: 'إلغاء الحظر', msg_confirm_clear: 'هل تريد حقًا مسح هذه الدردشة للجميع؟', msg_confirm_block: 'هل أنت متأكد أنك تريد حظر هذا المستخدم؟ (نعم / لا)' },
                tr: { ctx_add_contact: 'Kişilere ekle', ctx_mute_user: 'Sessize al', ctx_unmute_user: 'Sesi aç', ctx_clear_chat: 'Sohbeti temizle', ctx_block_user: 'Engelle', ctx_unblock_user: 'Engeli kaldır', msg_confirm_clear: 'Bu sohbeti herkes için gerçekten temizlemek istiyor musunuz?', msg_confirm_block: 'Bu kullanıcıyı engellemek istediğinizden emin misiniz? (Evet / Hayır)' }
            };

            const adminOptions = {
                de: { lbl_owner: '[Besitzer]', lbl_admin: '[Admin]', btn_promote: 'Zum Admin befördern', btn_demote: 'Admin-Rechte entziehen', btn_mute_member: 'Stummschalten', btn_unmute_member: 'Stummschaltung aufheben', btn_kick_member: 'Aus Gruppe entfernen', err_no_permission: 'Du hast keine Berechtigung für diese Aktion.', err_cannot_kick_admin: 'Du kannst keinen anderen Admin oder Besitzer entfernen.', msg_promoted: 'Erfolgreich zum Admin befördert.', msg_demoted: 'Admin-Rechte erfolgreich entzogen.' },
                en: { lbl_owner: '[Owner]', lbl_admin: '[Admin]', btn_promote: 'Promote to Admin', btn_demote: 'Demote Admin', btn_mute_member: 'Mute', btn_unmute_member: 'Unmute', btn_kick_member: 'Remove from Group', err_no_permission: 'You do not have permission for this action.', err_cannot_kick_admin: 'You cannot remove another Admin or the Owner.', msg_promoted: 'Successfully promoted to Admin.', msg_demoted: 'Successfully demoted from Admin.' },
                fa: { lbl_owner: '[مالک]', lbl_admin: '[مدیر]', btn_promote: 'ارتقا به مدیر', btn_demote: 'حذف دسترسی مدیر', btn_mute_member: 'بی‌صدا کردن', btn_unmute_member: 'صدادار کردن', btn_kick_member: 'حذف از گروه', err_no_permission: 'شما مجوز این کار را ندارید.', err_cannot_kick_admin: 'شما نمی‌توانید مدیر دیگری یا مالک را حذف کنید.', msg_promoted: 'با موفقیت به مدیر ارتقا یافت.', msg_demoted: 'با موفقیت از مدیریت خلع شد.' },
                ar: { lbl_owner: '[المالك]', lbl_admin: '[مشرف]', btn_promote: 'ترقية إلى مشرف', btn_demote: 'سحب صلاحيات المشرف', btn_mute_member: 'كتم', btn_unmute_member: 'إلغاء الكتم', btn_kick_member: 'إزالة من المجموعة', err_no_permission: 'ليس لديك إذن لهذا الإجراء.', err_cannot_kick_admin: 'لا يمكنك إزالة مشرف آخر أو المالك.', msg_promoted: 'تمت الترقية إلى مشرف بنجاح.', msg_demoted: 'تم سحب صلاحيات المشرف بنجاح.' },
                tr: { lbl_owner: '[Sahibi]', lbl_admin: '[Yönetici]', btn_promote: 'Yönetici Yap', btn_demote: 'Yöneticiliği Al', btn_mute_member: 'Sessize Al', btn_unmute_member: 'Sesi Aç', btn_kick_member: 'Gruptan Çıkar', err_no_permission: 'Bu işlem için izniniz yok.', err_cannot_kick_admin: 'Başka bir yöneticiyi veya sahibini çıkaramazsınız.', msg_promoted: 'Başarıyla yönetici yapıldı.', msg_demoted: 'Yöneticilik başarıyla alındı.' }
            };

            ['de', 'en', 'fa', 'ar', 'tr'].forEach(lang => {
                if(window.TRANSLATIONS[lang]) {
                    Object.assign(window.TRANSLATIONS[lang], prevTrans[lang], extraTrans[lang], extraOptions[lang], adminOptions[lang]);
                }
            });
        }
        
        // Ensure translations are applied dynamically
        if(typeof applyTranslation === 'function') applyTranslation(window.currentLang || 'de');
        
        // Trigger a fake status update if we're in a chat, so the header re-renders the text
        if (window.currentChat && document.getElementById('current-chat-status')) {
            const currentChatStatus = document.getElementById('current-chat-status');
            if (currentChatStatus.textContent === 'Nicht sichtbar' && window.currentLang !== 'de') {
                const privacy = window.currentChatLastSeenData ? 'none' : 'none'; // Simplification to force re-evaluation if it's currently showing 'Nicht sichtbar' and not german
                currentChatStatus.textContent = (window.TRANSLATIONS[window.currentLang] && window.TRANSLATIONS[window.currentLang].msg_not_visible) ? window.TRANSLATIONS[window.currentLang].msg_not_visible : 'Nicht sichtbar';
            }
        }
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
document.querySelectorAll('.settings-section input, .settings-section select').forEach(el => {
    if (el) el.addEventListener('change', saveSettingsListener);
});

document.getElementById('close-user-profile-btn')?.addEventListener('click', () => {
    document.getElementById('user-profile-modal').classList.add('hidden');
});

function applyFontFamily(family) {
    let styleEl = document.getElementById('custom-font-family-style');
    if(!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-font-family-style';
        document.head.appendChild(styleEl);
    }
    if (family === 'Inter') {
        styleEl.textContent = '';
    } else {
        styleEl.textContent = `.msg-sent .msg-bubble, .message.sent .message-bubble, #message-input { font-family: ${family} !important; }`;
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
        styleEl.textContent = '';
    } else {
        styleEl.textContent = `.msg-sent .msg-bubble, .message.sent .message-bubble, #message-input { color: ${color} !important; }`;
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
        de: { lbl_font_group: 'Schrift (Eigener Text)', lbl_bio: 'Info / Über mich', lbl_font_color: 'Farbe', lbl_font_size: 'Größe', modal_add_contact: 'Kontakt hinzufügen', title_send_message: 'Nachricht senden', title_more_options: 'Weitere Optionen', err_media_playback: 'Die Sprachnachricht konnte nicht wiedergegeben werden.', recording_processing: 'Sprachnachricht wird verarbeitet …', err_empty_recording: 'Die Aufnahme enthält keine Audiodaten. Bitte nimm die Sprachnachricht erneut auf.', err_recording_failed: 'Die Aufnahme konnte nicht gestartet werden.' },
        en: { lbl_font_group: 'Font (Own Text)', lbl_bio: 'About / Info', lbl_font_color: 'Color', lbl_font_size: 'Size', modal_add_contact: 'Add contact', title_send_message: 'Send message', title_more_options: 'More options', err_media_playback: 'The voice message could not be played.', recording_processing: 'Processing voice message …', err_empty_recording: 'The recording contains no audio. Please record the voice message again.', err_recording_failed: 'The recording could not be started.' },
        fa: { lbl_font_group: 'فونت (متن خود)', lbl_bio: 'درباره من', lbl_font_color: 'رنگ', lbl_font_size: 'اندازه', modal_add_contact: 'افزودن مخاطب', title_send_message: 'ارسال پیام', title_more_options: 'گزینه‌های بیشتر', err_media_playback: 'پیام صوتی پخش نشد.', recording_processing: 'در حال پردازش پیام صوتی …', err_empty_recording: 'این ضبط هیچ صدایی ندارد. لطفاً پیام صوتی را دوباره ضبط کنید.', err_recording_failed: 'شروع ضبط امکان‌پذیر نبود.' },
        ar: { lbl_font_group: 'الخط (نصك الخاص)', lbl_bio: 'حول / معلومات', lbl_font_color: 'اللون', lbl_font_size: 'الحجم', modal_add_contact: 'إضافة جهة اتصال', title_send_message: 'إرسال الرسالة', title_more_options: 'خيارات إضافية', err_media_playback: 'تعذّر تشغيل الرسالة الصوتية.', recording_processing: 'جارٍ تجهيز الرسالة الصوتية …', err_empty_recording: 'لا يحتوي التسجيل على صوت. يُرجى تسجيل الرسالة الصوتية مرة أخرى.', err_recording_failed: 'تعذّر بدء التسجيل.' },
        tr: { lbl_font_group: 'Yazı (Kendi Metniniz)', lbl_bio: 'Hakkımda / Bilgi', lbl_font_color: 'Renk', lbl_font_size: 'Boyut', modal_add_contact: 'Kişi ekle', title_send_message: 'Mesaj gönder', title_more_options: 'Diğer seçenekler', err_media_playback: 'Sesli mesaj oynatılamadı.', recording_processing: 'Sesli mesaj işleniyor …', err_empty_recording: 'Kayıtta ses verisi yok. Lütfen sesli mesajı yeniden kaydedin.', err_recording_failed: 'Kayıt başlatılamadı.' }
    };
    ['de', 'en', 'fa', 'ar', 'tr'].forEach(lang => {
        if(window.TRANSLATIONS[lang]) {
            Object.assign(TRANSLATIONS[lang], tAdd[lang]);
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    // Every visit starts in dark mode. Users can still switch themes for the
    // current session from Settings > Design.
    localStorage.setItem('doori_theme_mode', 'dark');
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



    
// --- Group Invite Link Generation Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('copy-group-link-btn');
    const modal = document.getElementById('group-invite-modal');
    if(!btn || !modal) return;
    
    let qr = null;
    
    btn.addEventListener('click', async () => {
        if (!currentChat || currentChat.type !== 'room') return;
        const isAdmin = currentChat.admins && currentChat.admins.includes(currentUser);
        if (!isAdmin) return;
        
        modal.classList.remove('hidden');
        const token = await window.accountClient.publishGroupLink(currentChat);
        currentChat.inviteToken = token;
        const link = window.location.origin + window.location.pathname + '?join=' + currentChat.id + '_' + token;
        document.getElementById('invite-link-input').value = link;
        
        document.getElementById('qrcode-container').innerHTML = safeHTML('');
        if (typeof QRCode !== 'undefined') {
            qr = new QRCode(document.getElementById('qrcode-container'), { text: link, width: 150, height: 150, colorDark:"#000", colorLight:"#fff" });
        }
    });
    
    const closeBtn = document.getElementById('close-invite-modal-btn');
    if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    
    const copyBtn = document.getElementById('copy-invite-link-btn');
    if(copyBtn) copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('invite-link-input').value).then(() => {
            const t = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en'];
            alert(t.msg_link_copied || 'Link kopiert!');
        });
    });
    
    const resetBtn = document.getElementById('reset-invite-link-btn');
    if(resetBtn) resetBtn.addEventListener('click', async () => {
        if (!currentChat || currentChat.type !== 'room') return;
        const token = await window.accountClient.publishGroupLink(currentChat, true);
        currentChat.inviteToken = token;
        const link = window.location.origin + window.location.pathname + '?join=' + currentChat.id + '_' + token;
        document.getElementById('invite-link-input').value = link;
        
        document.getElementById('qrcode-container').innerHTML = safeHTML('');
        if (typeof QRCode !== 'undefined') {
            qr = new QRCode(document.getElementById('qrcode-container'), { text: link, width: 150, height: 150, colorDark:"#000", colorLight:"#fff" });
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const saveSettingsListener = () => { if(typeof saveUserData === 'function') saveUserData(); };
    
    const settingsIds = ['setting-last-seen', 'setting-searchable', 'setting-avatar-visibility', 'setting-call-privacy'];
    settingsIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', saveSettingsListener);
    });
});








// Phase 3 Additions - Missing Group Info Translations (Fixed Scope)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.TRANSLATIONS) {
            Object.assign(window.TRANSLATIONS.en, { btn_clear_chat: 'Clear Chat', ctx_clear_chat: 'Clear Chat', btn_edit_group: 'Edit Group', btn_leave_group: 'Leave Group', btn_delete_group: 'Delete Group', lbl_admin_options: 'Admin Options', lbl_admins_only: 'Only Admins can send messages', lbl_creator: 'Creator', btn_invite_link: 'Invite Link & QR-Code', tab_gif_standard: 'Standard', tab_gif_custom: 'Custom', btn_add_gif: '+ Add GIF (max. 192 KB)', btn_send_message: 'Send Message', modal_crop: 'Crop Image', btn_crop_save: 'Crop & Save' });
            Object.assign(window.TRANSLATIONS.de, { btn_clear_chat: 'Chat leeren', ctx_clear_chat: 'Chat leeren', btn_edit_group: 'Gruppe bearbeiten', btn_leave_group: 'Gruppe verlassen', btn_delete_group: 'Gruppe löschen', lbl_admin_options: 'Admin Optionen', lbl_admins_only: 'Nur Admins dürfen schreiben', lbl_creator: 'Ersteller', btn_invite_link: 'Einladungs-Link & QR-Code', tab_gif_standard: 'Standard', tab_gif_custom: 'Eigene', btn_add_gif: '+ GIF hinzufügen (max. 192 KB)', btn_send_message: 'Nachricht senden', modal_crop: 'Bild zuschneiden', btn_crop_save: 'Schneiden & Speichern' });
            Object.assign(window.TRANSLATIONS.fa, { btn_clear_chat: 'پاک کردن چت', ctx_clear_chat: 'پاک کردن چت', btn_edit_group: 'ویرایش گروه', btn_leave_group: 'ترک گروه', btn_delete_group: 'حذف گروه', lbl_admin_options: 'گزینه‌های مدیر', lbl_admins_only: 'فقط مدیران می‌توانند پیام ارسال کنند', lbl_creator: 'سازنده', btn_invite_link: 'لینک دعوت و کد QR', tab_gif_standard: 'استاندارد', tab_gif_custom: 'شخصی', btn_add_gif: '+ افزودن گیف (حداکثر ۱ مگابایت)', btn_send_message: 'ارسال پیام', modal_crop: 'برش تصویر', btn_crop_save: 'برش و ذخیره' });
            Object.assign(window.TRANSLATIONS.ar, { btn_clear_chat: 'مسح الدردشة', ctx_clear_chat: 'مسح الدردشة', btn_edit_group: 'تعديل المجموعة', btn_leave_group: 'مغادرة المجموعة', btn_delete_group: 'حذف المجموعة', lbl_admin_options: 'خيارات المشرف', lbl_admins_only: 'المشرفون فقط يمكنهم إرسال رسائل', lbl_creator: 'المنشئ', btn_invite_link: 'رابط الدعوة ورمز الاستجابة السريعة', tab_gif_standard: 'قياسي', tab_gif_custom: 'مخصص', btn_add_gif: '+ إضافة GIF (الحد الأقصى 1 ميجابايت)', btn_send_message: 'إرسال رسالة', modal_crop: 'قص الصورة', btn_crop_save: 'قص وحفظ' });
            Object.assign(window.TRANSLATIONS.tr, { btn_clear_chat: 'Sohbeti Temizle', ctx_clear_chat: 'Sohbeti Temizle', btn_edit_group: 'Grubu Düzenle', btn_leave_group: 'Gruptan Ayrıl', btn_delete_group: 'Grubu Sil', lbl_admin_options: 'Yönetici Seçenekleri', lbl_admins_only: 'Sadece yöneticiler mesaj gönderebilir', lbl_creator: 'Oluşturan', btn_invite_link: 'Davet Bağlantısı ve QR Kodu', tab_gif_standard: 'Standart', tab_gif_custom: 'Özel', btn_add_gif: '+ GIF Ekle (Maks 1MB)', btn_send_message: 'Mesaj Gönder', modal_crop: 'Resmi Kırp', btn_crop_save: 'Kırp & Kaydet' });
            if (typeof applyTranslation === 'function') applyTranslation(window.currentLang || 'de');
        }
    }, 100);
});

window.showUserProfileModal = async function(username, options = null) {
    const modal = document.getElementById('user-profile-modal');
    if (!modal) return;
    document.getElementById('user-profile-name').textContent = username;
    const gallery = document.getElementById('user-profile-gallery');
    const dots = document.getElementById('user-profile-dots');
    gallery.innerHTML = safeHTML('<div style="width:250px;height:250px;display:flex;align-items:center;justify-content:center;">Lade...</div>');
    dots.innerHTML = safeHTML('');
    
    const actionsContainer = document.getElementById('user-profile-actions');
    const msgBtn = document.getElementById('user-profile-msg-btn');
    if (actionsContainer) {
        if (options) {
            actionsContainer.style.display = 'flex';
            msgBtn.style.display = 'none';
            const t = typeof TRANSLATIONS !== 'undefined' ? (TRANSLATIONS[window.currentLang] || TRANSLATIONS['de']) : {};
            
            const btnAdd = document.getElementById('modal-add-contact-btn');
            const btnMute = document.getElementById('modal-mute-btn');
            const btnClear = document.getElementById('modal-clear-btn');
            const btnBlock = document.getElementById('modal-block-btn');
            
            btnAdd.innerHTML = safeHTML('👤 ' + (t.ctx_add_contact || 'Zu Kontakten hinzufügen'));
            btnClear.innerHTML = safeHTML('🗑️ ' + (t.ctx_clear_chat || 'Chat leeren'));
            btnMute.innerHTML = safeHTML(options.isMuted ? '🔔 ' + (t.ctx_unmute_user || 'Stummschaltung aufheben') : '🔕 ' + (t.ctx_mute_user || 'Stummschalten'));
            btnBlock.innerHTML = safeHTML(options.isBlocked ? '✅ ' + (t.ctx_unblock_user || 'Entblocken') : '🚫 ' + (t.ctx_block_user || 'Blockieren'));
            
            btnAdd.style.display = options.isContact ? 'none' : 'block';
            
            // Wire clicks to existing hidden dropdown buttons
            btnAdd.onclick = () => { modal.classList.add('hidden'); document.getElementById('dropdown-add-contact')?.click(); };
            btnMute.onclick = () => { modal.classList.add('hidden'); document.getElementById('dropdown-mute-user')?.click(); };
            btnClear.onclick = () => { modal.classList.add('hidden'); document.getElementById('dropdown-clear-chat')?.click(); };
            btnBlock.onclick = () => { modal.classList.add('hidden'); document.getElementById('dropdown-block-user')?.click(); };
        } else {
            actionsContainer.style.display = 'none';
            msgBtn.style.display = 'block';
        }
    }
    modal.classList.remove('hidden');

    let p = window.users && window.users.get(username) ? window.users.get(username) : null;
    
    if (!p) {
        try {
            const doc = await window.db.collection('profiles').doc(username.toLowerCase()).get();
            if (doc.exists) {
                p = doc.data();
                if (window.users) window.users.set(username, p);
            }
        } catch (e) {
            console.error("Fehler beim Laden des Profils:", e);
        }
    }

    const profileBioEl = document.getElementById('user-profile-bio');
    if (profileBioEl) {
        const b = p && (p.bio || p.status) ? (p.bio || p.status) : '';
        const pKey = typeof window.getPresetKeyFromStatus === 'function' ? window.getPresetKeyFromStatus(b) : null;
        const t = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[window.currentLang]) ? TRANSLATIONS[window.currentLang] : (window.TRANSLATIONS?.en || {});
        const displayBio = (pKey && t[pKey]) ? t[pKey] : b;
        profileBioEl.textContent = displayBio;
        profileBioEl.style.display = displayBio ? 'block' : 'none';
    }

    let pics = window.getAllowedProfilePics ? window.getAllowedProfilePics(username, p) : [];
    
    if (pics.length === 0) {
        gallery.innerHTML = safeHTML(`<div style="width:250px;height:250px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;font-size:100px;flex-shrink:0;">${username.charAt(0).toUpperCase()}</div>`);
    } else {
        gallery.innerHTML = safeHTML('');
        gallery.style.display = 'flex';
        gallery.style.justifyContent = 'center';
        gallery.style.alignItems = 'center';
        gallery.style.gap = '10px';
        gallery.style.width = '100%';
        gallery.style.margin = '0 auto';
        
        const imgContainer = document.createElement('div');
        imgContainer.style = 'position:relative; width:250px; height:250px; flex-shrink:0;';
        
        const img = document.createElement('img');
        img.src = pics[0];
        img.draggable = false;
        img.style = "width:100%;height:100%;border-radius:10px;object-fit:cover;transition: opacity 0.2s; touch-action: pan-y; user-select: none; -webkit-user-drag: none;";
        imgContainer.appendChild(img);

        let currentIndex = 0;

        const updateView = () => {
            img.style.opacity = '0';
            setTimeout(() => {
                img.src = pics[currentIndex];
                img.style.opacity = '1';
                Array.from(dots.children).forEach((dot, idx) => {
                    dot.style.background = idx === currentIndex ? 'var(--accent)' : 'rgba(255,255,255,0.3)';
                });
            }, 100);
        };

        if(pics.length > 1) {
            let touchStartX = 0;
            let touchEndX = 0;
            img.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].clientX;
            }, {passive: true});
            img.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].clientX;
                if (touchStartX - touchEndX > 30) {
                    currentIndex = (currentIndex + 1) % pics.length; updateView();
                } else if (touchEndX - touchStartX > 30) {
                    currentIndex = (currentIndex - 1 + pics.length) % pics.length; updateView();
                }
            }, {passive: true});

            pics.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.style = `width:8px;height:8px;border-radius:50%;background:${idx===0?'var(--accent)':'rgba(255,255,255,0.3)'};cursor:pointer;`;
                dot.onclick = () => { currentIndex = idx; updateView(); };
                dots.appendChild(dot);
            });

            const leftBtn = document.createElement('button');
            leftBtn.innerHTML = safeHTML('&#10094;');
            leftBtn.style = "background:#ff4444;color:white;border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 8px rgba(0,0,0,0.3);flex-shrink:0;";
            leftBtn.onclick = (e) => { e.stopPropagation(); currentIndex = (currentIndex - 1 + pics.length) % pics.length; updateView(); };
            gallery.appendChild(leftBtn);
            
            gallery.appendChild(imgContainer);

            const rightBtn = document.createElement('button');
            rightBtn.innerHTML = safeHTML('&#10095;');
            rightBtn.style = "background:#ff4444;color:white;border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 8px rgba(0,0,0,0.3);flex-shrink:0;";
            rightBtn.onclick = (e) => { e.stopPropagation(); currentIndex = (currentIndex + 1) % pics.length; updateView(); };
            gallery.appendChild(rightBtn);
        } else {
            gallery.appendChild(imgContainer);
        }
    }
    
    document.getElementById('user-profile-msg-btn').onclick = () => {
        modal.classList.add('hidden');
        if(window.openDirectMessage) window.openDirectMessage(username);
    };
};
