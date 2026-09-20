document.addEventListener('DOMContentLoaded', () => {
    // --- State & DOM Elements ---
    let currentUser = null;
    let users = new Map(); // username -> profile { avatarUrl, status, lastSeen }
    let chatData = {
        personal: [{ id: 'saved', name: 'Gespeichertes', type: 'saved' }],
        rooms: [{ id: 'general', name: 'Allgemein', type: 'room' }],
        contacts: []
    };
    let messages = new Map(); // chatId -> [msgObj]
    let currentChat = null;
    let blockedContacts = new Set();
    let currentLang = localStorage.getItem('doori_lang') || 'de';
    let mediaRecorder; let audioChunks = []; let videoChunks = []; let recordingInterval; let recordingStartTime;
    let playerColor = localStorage.getItem('doori_player_color') || '#00d2d3';
    let playerGlass = localStorage.getItem('doori_player_glass') !== 'false';
    let editingMessageId = null;
    let unsubListeners = [];
    let unreadChats = new Set();

    const screens = { login: document.getElementById('login-screen'), chat: document.getElementById('chat-screen') };
    const loginForm = document.getElementById('login-form'); const usernameInput = document.getElementById('username-input'); const emailInput = document.getElementById('email-input'); const passwordInput = document.getElementById('password-input'); const loginSubmitBtn = document.getElementById('login-submit-btn'); const loginError = document.getElementById('login-error');
    const tabLogin = document.getElementById('tab-login'); const tabRegister = document.getElementById('tab-register'); const verificationInfo = document.getElementById('verification-info');
    let isRegisterMode = false;
    
    const sidebar = document.getElementById('sidebar'); const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const currentUserDisplay = document.getElementById('current-user-display');
    const lists = { personal: document.getElementById('list-personal'), rooms: document.getElementById('list-rooms'), contacts: document.getElementById('list-contacts') };
    
    const settingsBtn = document.getElementById('settings-btn'); const settingsModal = document.getElementById('settings-modal'); const closeSettingsBtn = document.getElementById('close-settings-btn');
    const avatarUpload = document.getElementById('avatar-upload'); const settingsAvatar = document.getElementById('settings-avatar');
    const newGroupBtn = document.getElementById('new-group-btn'); const createGroupModal = document.getElementById('create-group-modal'); const closeGroupModalBtn = document.getElementById('close-group-modal-btn'); const createGroupSubmitBtn = document.getElementById('create-group-submit-btn'); const newGroupName = document.getElementById('new-group-name'); const newGroupType = document.getElementById('new-group-type');
    const langSelect = document.getElementById('lang-select');
    const userSearchInput = document.getElementById('user-search-input'); const userSearchBtn = document.getElementById('user-search-btn');
    
    const chatHeaderInfo = document.querySelector('.chat-header-info'); const currentChatAvatar = document.getElementById('current-chat-avatar'); const currentChatName = document.getElementById('current-chat-name'); const currentChatStatus = document.getElementById('current-chat-status');
    const chatActions = document.getElementById('chat-actions'); const blockChatBtn = document.getElementById('block-chat-btn'); const secretChatBtn = document.getElementById('secret-chat-btn'); const secretLock = document.getElementById('secret-lock');
    const blockedNotice = document.getElementById('blocked-notice'); const channelNotice = document.getElementById('channel-notice');
    const messagesContainer = document.getElementById('messages-container'); const messageForm = document.getElementById('message-form'); const messageInput = document.getElementById('message-input'); const ttlSelect = document.getElementById('ttl-select'); const chatInputArea = document.querySelector('.chat-input-area');
    
    const emojiBtn = document.getElementById('emoji-btn'); const gifBtn = document.getElementById('gif-btn'); const emojiPicker = document.getElementById('emoji-picker'); const gifPicker = document.getElementById('gif-picker');
    const recordAudioBtn = document.getElementById('record-audio-btn'); const recordVideoBtn = document.getElementById('record-video-btn'); const recordingPreview = document.getElementById('recording-preview'); const stopRecordingBtn = document.getElementById('stop-recording-btn'); const cancelRecordingBtn = document.getElementById('cancel-recording-btn'); const recordingTimeEl = document.getElementById('recording-time');
    const sendBtn = document.getElementById('send-btn'); const sendOptionsPopup = document.getElementById('send-options-popup'); const sendSilentBtn = document.getElementById('send-silent-btn'); const sendScheduleBtn = document.getElementById('send-schedule-btn');
    const scheduleModal = document.getElementById('schedule-modal'); const scheduleDatetime = document.getElementById('schedule-datetime'); const scheduleSubmitBtn = document.getElementById('schedule-submit-btn'); const closeScheduleModalBtn = document.getElementById('close-schedule-modal-btn');
    const pollBtn = document.getElementById('poll-btn'); const pollModal = document.getElementById('poll-modal'); const closePollModalBtn = document.getElementById('close-poll-modal-btn'); const createPollSubmitBtn = document.getElementById('create-poll-submit-btn'); const addPollOptionBtn = document.getElementById('add-poll-option-btn'); const pollOptionsContainer = document.getElementById('poll-options-container'); const pollQuestion = document.getElementById('poll-question'); const pollQuizMode = document.getElementById('poll-quiz-mode'); const pollCorrectOption = document.getElementById('poll-correct-option');
    const playerColorPicker = document.getElementById('player-color-picker'); const playerGlassToggle = document.getElementById('player-glass-toggle');
    
    // Context Menu
    const ctxOverlay = document.getElementById('message-context-overlay'); const ctxMenu = document.getElementById('message-context-menu');
    const ctxReply = document.getElementById('ctx-reply'); const ctxCopy = document.getElementById('ctx-copy'); const ctxEdit = document.getElementById('ctx-edit');
    const ctxPin = document.getElementById('ctx-pin'); const ctxForward = document.getElementById('ctx-forward'); const ctxDelete = document.getElementById('ctx-delete');
    const ctxSelect = document.getElementById('ctx-select'); const emojiReactionBar = document.getElementById('emoji-reaction-bar');
    let contextMessageId = null; let contextMessageText = ''; let longPressTimerMsg = null;
    let contextMessageSender = ''; let contextMessageMedia = null;
    
    // Reply & Forward
    const replyBanner = document.getElementById('reply-banner'); const replyBannerTitle = document.getElementById('reply-banner-title'); const replyBannerText = document.getElementById('reply-banner-text'); const cancelReplyBtn = document.getElementById('cancel-reply-btn');
    const forwardModal = document.getElementById('forward-modal'); const closeForwardModalBtn = document.getElementById('close-forward-modal-btn'); const forwardChatList = document.getElementById('forward-chat-list');
    const forwardSearchInput = document.getElementById('forward-search-input'); const forwardSearchBtn = document.getElementById('forward-search-btn');
    let replyingToMessage = null; // { id, sender, text }

    // Removed Select Mode and Pinned Banner per user request
    
    const EMOJIS = ['😀','😂','🥰','😎','🤔','👍','👎','❤️','🔥','🎉','✨','👀','🙌','👏','🙏'];
    const GIFS = ['https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif', 'https://media.g        de: { login_title: "Doori Messenger", login_subtitle: "Bitte wähle einen Benutzernamen.", login_btn: "Weiter", sec_personal: "Persönlich", chat_saved: "Gespeichertes", sec_rooms: "Gruppen & Kanäle", chat_general: "Allgemein", sec_contacts: "Kontakte", status_online: "Online", btn_block: "Blockieren", btn_unblock: "Entblocken", err_blocked: "Du hast diesen Kontakt blockiert.", err_channel: "Nur Administratoren können hier schreiben.", placeholder_msg: "Nachricht schreiben...", placeholder_search: "Benutzer suchen (@name)...", ttl_off: "⏳ Aus", btn_cancel: "✖", btn_stop_send: "■ Senden", modal_new_room: "Neuer Raum", lbl_room_name: "Name der Gruppe / des Kanals", opt_group: "Gruppe (Jeder kann schreiben)", opt_channel: "Kanal (Nur Admins)", btn_create: "Erstellen", modal_settings: "Einstellungen", tab_profile: "Profil", tab_privacy: "Privatsphäre", tab_chats: "Chats", btn_change_pic: "Bild ändern", lbl_language: "Sprache / Language", lbl_last_seen: "\"Zuletzt online\" anzeigen", lbl_read_receipts: "Lesebestätigungen", lbl_sound: "Benachrichtigungstöne", lbl_storage_used: "Lokaler Speicher genutzt:", btn_clear_cache: "Cache leeren" },
        en: { login_title: "Doori Messenger", login_subtitle: "Please choose a username.", login_btn: "Continue", sec_personal: "Personal", chat_saved: "Saved Messages", sec_rooms: "Groups & Channels", chat_general: "General", sec_contacts: "Contacts", status_online: "Online", btn_block: "Block", btn_unblock: "Unblock", err_blocked: "You blocked this contact.", err_channel: "Only admins can post here.", placeholder_msg: "Write a message...", placeholder_search: "Search user (@name)...", ttl_off: "⏳ Off", btn_cancel: "✖", btn_stop_send: "■ Send", modal_new_room: "New Room", lbl_room_name: "Group / Channel Name", opt_group: "Group (Anyone can write)", opt_channel: "Channel (Admins only)", btn_create: "Create", modal_settings: "Settings", tab_profile: "Profile", tab_privacy: "Privacy", tab_chats: "Chats", btn_change_pic: "Change Picture", lbl_language: "Language", lbl_last_seen: "Show \"Last Seen\"", lbl_read_receipts: "Read Receipts", lbl_sound: "Notification Sounds", lbl_storage_used: "Local Storage Used:", btn_clear_cache: "Clear Cache" },
        fa: { login_title: "پیام‌رسان دوری", login_subtitle: "لطفاً یک نام کاربری انتخاب کنید.", login_btn: "ادامه", sec_personal: "شخصی", chat_saved: "پیام‌های ذخیره‌شده", sec_rooms: "گروه‌ها و کانال‌ها", chat_general: "عمومی", sec_contacts: "مخاطبین", status_online: "آنلاین", btn_block: "مسدود کردن", btn_unblock: "رفع مسدودی", err_blocked: "شما این مخاطب را مسدود کرده‌اید.", err_channel: "فقط مدیران می‌توانند اینجا پیام بفرستند.", placeholder_msg: "نوشتن پیام...", placeholder_search: "جستجوی کاربر (@نام)...", ttl_off: "⏳ خاموش", btn_cancel: "✖", btn_stop_send: "■ ارسال", modal_new_room: "اتاق جدید", lbl_room_name: "نام گروه / کانال", opt_group: "گروه (همه می‌توانند بنویسند)", opt_channel: "کانال (فقط مدیران)", btn_create: "ایجاد", modal_settings: "تنظیمات", tab_profile: "نمایه", tab_privacy: "حریم خصوصی", tab_chats: "چت‌ها", btn_change_pic: "تغییر عکس", lbl_language: "زبان", lbl_last_seen: "نمایش \"آخرین بازدید\"", lbl_read_receipts: "رسید خوانده شدن", lbl_sound: "صداهای اعلان", lbl_storage_used: "فضای ذخیره‌سازی استفاده شده:", btn_clear_cache: "پاک کردن حافظه پنهان" },
        ar: { login_title: "رسول دوري", login_subtitle: "الرجاء اختيار اسم مستخدم.", login_btn: "متابعة", sec_personal: "شخصي", chat_saved: "الرسائل المحفوظة", sec_rooms: "المجموعات والقنوات", chat_general: "عام", sec_contacts: "جهات الاتصال", status_online: "متصل", btn_block: "حظر", btn_unblock: "إلغاء الحظر", err_blocked: "لقد قمت بحظر جهة الاتصال هذه.", err_channel: "يمكن للمشرفين فقط النشر هنا.", placeholder_msg: "اكتب رسالة...", placeholder_search: "ابحث عن مستخدم (@اسم)...", ttl_off: "⏳ إيقاف", btn_cancel: "✖", btn_stop_send: "■ إرسال", modal_new_room: "غرفة جديدة", lbl_room_name: "اسم المجموعة / القناة", opt_group: "مجموعة (يمكن للجميع الكتابة)", opt_channel: "قناة (للمشرفين فقط)", btn_create: "إنشاء", modal_settings: "الإعدادات", tab_profile: "الملف الشخصي", tab_privacy: "الخصوصية", tab_chats: "الدردشات", btn_change_pic: "تغيير الصورة", lbl_language: "اللغة", lbl_last_seen: "إظهار \"آخر ظهور\"", lbl_read_receipts: "مؤشرات قراءة الرسائل", lbl_sound: "أصوات الإشعارات", lbl_storage_used: "مساحة التخزين المستخدمة:", btn_clear_cache: "مسح ذاكرة التخزين المؤقت" },
        fr: { login_title: "Doori Messenger", login_subtitle: "Veuillez choisir un nom d'utilisateur.", login_btn: "Continuer", sec_personal: "Personnel", chat_saved: "Messages enregistrés", sec_rooms: "Groupes & Canaux", chat_general: "Général", sec_contacts: "Contacts", status_online: "En ligne", btn_block: "Bloquer", btn_unblock: "Débloquer", err_blocked: "Vous avez bloqué ce contact.", err_channel: "Seuls les administrateurs peuvent publier ici.", placeholder_msg: "Écrire un message...", placeholder_search: "Rechercher un utilisateur (@nom)...", ttl_off: "⏳ Désactivé", btn_cancel: "✖", btn_stop_send: "■ Envoyer", modal_new_room: "Nouvelle salle", lbl_room_name: "Nom du groupe / canal", opt_group: "Groupe (Tout le monde peut écrire)", opt_channel: "Canal (Admins seulement)", btn_create: "Créer", modal_settings: "Paramètres", tab_profile: "Profil", tab_privacy: "Confidentialité", tab_chats: "Discussions", btn_change_pic: "Changer la photo", lbl_language: "Langue", lbl_last_seen: "Afficher \"Vu pour la dernière fois\"", lbl_read_receipts: "Confirmations de lecture", lbl_sound: "Sons de notification", lbl_storage_used: "Stockage local utilisé :", btn_clear_cache: "Vider le cache" },
        es: { login_title: "Doori Messenger", login_subtitle: "Por favor, elige un nombre de usuario.", login_btn: "Continuar", sec_personal: "Personal", chat_saved: "Mensajes guardados", sec_rooms: "Grupos y Canales", chat_general: "General", sec_contacts: "Contactos", status_online: "En línea", btn_block: "Bloquear", btn_unblock: "Desbloquear", err_blocked: "Has bloqueado a este contacto.", err_channel: "Solo los administradores pueden publicar aquí.", placeholder_msg: "Escribe un mensaje...", placeholder_search: "Buscar usuario (@nombre)...", ttl_off: "⏳ Apagado", btn_cancel: "✖", btn_stop_send: "■ Enviar", modal_new_room: "Nueva sala", lbl_room_name: "Nombre del grupo / canal", opt_group: "Grupo (Cualquiera puede escribir)", opt_channel: "Canal (Solo administradores)", btn_create: "Crear", modal_settings: "Ajustes", tab_profile: "Perfil", tab_privacy: "Privacidad", tab_chats: "Chats", btn_change_pic: "Cambiar imagen", lbl_language: "Idioma", lbl_last_seen: "Mostrar \"Última vez en línea\"", lbl_read_receipts: "Confirmaciones de lectura", lbl_sound: "Sonidos de notificación", lbl_storage_used: "Almacenamiento local utilizado:", btn_clear_cache: "Borrar caché" },
        pt: { login_title: "Doori Messenger", login_subtitle: "Por favor, escolha um nome de usuário.", login_btn: "Continuar", sec_personal: "Pessoal", chat_saved: "Mensagens Salvas", sec_rooms: "Grupos e Canais", chat_general: "Geral", sec_contacts: "Contatos", status_online: "Online", btn_block: "Bloquear", btn_unblock: "Desbloquear", err_blocked: "Você bloqueou este contato.", err_channel: "Apenas administradores podem postar aqui.", placeholder_msg: "Escreva uma mensagem...", placeholder_search: "Buscar usuário (@nome)...", ttl_off: "⏳ Desligado", btn_cancel: "✖", btn_stop_send: "■ Enviar", modal_new_room: "Nova sala", lbl_room_name: "Nome do grupo / canal", opt_group: "Grupo (Qualquer um pode escrever)", opt_channel: "Canal (Apenas administradores)", btn_create: "Criar", modal_settings: "Configurações", tab_profile: "Perfil", tab_privacy: "Privacidade", tab_chats: "Chats", btn_change_pic: "Mudar foto", lbl_language: "Idioma", lbl_last_seen: "Mostrar \"Visto por último\"", lbl_read_receipts: "Recibos de leitura", lbl_sound: "Sons de notificação", lbl_storage_used: "Armazenamento local usado:", btn_clear_cache: "Limpar Cache" },
        zh: { login_title: "Doori Messenger", login_subtitle: "请选择一个用户名。", login_btn: "继续", sec_personal: "个人", chat_saved: "已保存的消息", sec_rooms: "群组和频道", chat_general: "常规", sec_contacts: "联系人", status_online: "在线", btn_block: "屏蔽", btn_unblock: "取消屏蔽", err_blocked: "您已屏蔽此联系人。", err_channel: "只有管理员可以在这里发布。", placeholder_msg: "写消息...", placeholder_search: "搜索用户 (@姓名)...", ttl_off: "⏳ 关闭", btn_cancel: "✖", btn_stop_send: "■ 发送", modal_new_room: "新房间", lbl_room_name: "群组 / 频道名称", opt_group: "群组（任何人都可以写）", opt_channel: "频道（仅限管理员）", btn_create: "创建", modal_settings: "设置", tab_profile: "个人资料", tab_privacy: "隐私", tab_chats: "聊天", btn_change_pic: "更改图片", lbl_language: "语言", lbl_last_seen: "显示“最后上线”", lbl_read_receipts: "已读回执", lbl_sound: "通知声音", lbl_storage_used: "已用本地存储：", btn_clear_cache: "清除缓存" },
        ja: { login_title: "Doori Messenger", login_subtitle: "ユーザー名を選択してください。", login_btn: "続行", sec_personal: "個人", chat_saved: "保存されたメッセージ", sec_rooms: "グループとチャンネル", chat_general: "一般", sec_contacts: "連絡先", status_online: "オンライン", btn_block: "ブロック", btn_unblock: "ブロック解除", err_blocked: "この連絡先をブロックしました。", err_channel: "管理人のみがここに投稿できます。", placeholder_msg: "メッセージを書く...", placeholder_search: "ユーザーを検索 (@名前)...", ttl_off: "⏳ オフ", btn_cancel: "✖", btn_stop_send: "■ 送信", modal_new_room: "新しい部屋", lbl_room_name: "グループ / チャンネル名", opt_group: "グループ (誰でも書ける)", opt_channel: "チャンネル (管理人のみ)", btn_create: "作成", modal_settings: "設定", tab_profile: "プロフィール", tab_privacy: "プライバシー", tab_chats: "チャット", btn_change_pic: "画像を変更", lbl_language: "言語", lbl_last_seen: "「最終オンライン」を表示", lbl_read_receipts: "開封通知", lbl_sound: "通知音", lbl_storage_used: "使用済みローカルストレージ:", btn_clear_cache: "キャッシュを消去" },
        ru: { login_title: "Doori Messenger", login_subtitle: "Пожалуйста, выберите имя пользователя.", login_btn: "Продолжить", sec_personal: "Личное", chat_saved: "Сохраненные сообщения", sec_rooms: "Группы и каналы", chat_general: "Общее", sec_contacts: "Контакты", status_online: "В сети", btn_block: "Заблокировать", btn_unblock: "Разблокировать", err_blocked: "Вы заблокировали этот контакт.", err_channel: "Здесь могут писать только администраторы.", placeholder_msg: "Написать сообщение...", placeholder_search: "Поиск пользователя (@имя)...", ttl_off: "⏳ Выкл", btn_cancel: "✖", btn_stop_send: "■ Отправить", modal_new_room: "Новая комната", lbl_room_name: "Название группы / канала", opt_group: "Группа (могут писать все)", opt_channel: "Канал (только администраторы)", btn_create: "Создать", modal_settings: "Настройки", tab_profile: "Профиль", tab_privacy: "Конфиденциальность", tab_chats: "Чаты", btn_change_pic: "Изменить фото", lbl_language: "Язык", lbl_last_seen: "Показывать «Был(а) в сети»", lbl_read_receipts: "Отчеты о прочтении", lbl_sound: "Звуки уведомлений", lbl_storage_used: "Использовано локального хранилища:", btn_clear_cache: "Очистить кэш" },
        tr: { login_title: "Doori Messenger", login_subtitle: "Lütfen bir kullanıcı adı seçin.", login_btn: "Devam et", sec_personal: "Kişisel", chat_saved: "Kaydedilen Mesajlar", sec_rooms: "Gruplar ve Kanallar", chat_general: "Genel", sec_contacts: "Kişiler", status_online: "Çevrimiçi", btn_block: "Engelle", btn_unblock: "Engeli Kaldır", err_blocked: "Bu kişiyi engellediniz.", err_channel: "Buraya yalnızca yöneticiler yazabilir.", placeholder_msg: "Bir mesaj yazın...", placeholder_search: "Kullanıcı ara (@isim)...", ttl_off: "⏳ Kapalı", btn_cancel: "✖", btn_stop_send: "■ Gönder", modal_new_room: "Yeni Oda", lbl_room_name: "Grup / Kanal Adı", opt_group: "Grup (Herkes yazabilir)", opt_channel: "Kanal (Sadece yöneticiler)", btn_create: "Oluştur", modal_settings: "Ayarlar", tab_profile: "Profil", tab_privacy: "Gizlilik", tab_chats: "Sohbetler", btn_change_pic: "Resmi Değiştir", lbl_language: "Dil", lbl_last_seen: "\"Son görülme\" durumunu göster", lbl_read_receipts: "Okundu Bilgisi", lbl_sound: "Bildirim Sesleri", lbl_storage_used: "Kullanılan Yerel Depolama:", btn_clear_cache: "Önbelleği Temizle" }�аписать сообщение...", placeholder_search: "Поиск пользователя (@имя)...", ttl_off: "⏳ Выкл", btn_cancel: "✖", btn_stop_send: "■ Отправить", modal_new_room: "Новая комната", lbl_room_name: "Название группы / канала", opt_group: "Группа (могут писать все)", opt_channel: "Канал (только администраторы)", btn_create: "Создать", modal_settings: "Настройки", tab_profile: "Профиль", tab_privacy: "Конфиденциальность", tab_chats: "Чаты", btn_change_pic: "Изменить фото", lbl_language: "Язык", lbl_last_seen: "Показывать «Был(а) в сети»", lbl_read_receipts: "Отчеты о прочтении", lbl_sound: "Звуки уведомлений", lbl_storage_used: "Использовано локального хранилища:", btn_clear_cache: "Очистить кэш", lbl_player_color: "Цвет медиаплеера", lbl_player_glass: "Эффект стекла медиаплеера" },
        tr: { login_title: "Doori Messenger", login_subtitle: "Lütfen bir kullanıcı adı seçin.", login_btn: "Devam et", sec_personal: "Kişisel", chat_saved: "Kaydedilen Mesajlar", sec_rooms: "Gruplar ve Kanallar", chat_general: "Genel", sec_contacts: "Kişiler", status_online: "Çevrimiçi", btn_block: "Engelle", btn_unblock: "Engeli Kaldır", err_blocked: "Bu kişiyi engellediniz.", err_channel: "Buraya yalnızca yöneticiler yazabilir.", placeholder_msg: "Bir mesaj yazın...", placeholder_search: "Kullanıcı ara (@isim)...", ttl_off: "⏳ Kapalı", btn_cancel: "✖", btn_stop_send: "■ Gönder", modal_new_room: "Yeni Oda", lbl_room_name: "Grup / Kanal Adı", opt_group: "Grup (Herkes yazabilir)", opt_channel: "Kanal (Sadece yöneticiler)", btn_create: "Oluştur", modal_settings: "Ayarlar", tab_profile: "Profil", tab_privacy: "Gizlilik", tab_chats: "Sohbetler", btn_change_pic: "Resmi Değiştir", lbl_language: "Dil", lbl_last_seen: "\"Son görülme\" durumunu göster", lbl_read_receipts: "Okundu Bilgisi", lbl_sound: "Bildirim Sesleri", lbl_storage_used: "Kullanılan Yerel Depolama:", btn_clear_cache: "Önbelleği Temizle", lbl_player_color: "Medya Oynatıcı Rengi", lbl_player_glass: "Medya Oynatıcı Cam Efekti" }�аписать сообщение...", placeholder_search: "Поиск пользователя (@имя)...", ttl_off: "⏳ Выкл", btn_cancel: "✖", btn_stop_send: "■ Отправить", modal_new_room: "Новая комната", lbl_room_name: "Название группы / канала", opt_group: "Группа (могут писать все)", opt_channel: "Канал (только администраторы)", btn_create: "Создать", modal_settings: "Настройки", tab_profile: "Профиль", tab_privacy: "Конфиденциальность", tab_chats: "Чаты", btn_change_pic: "Изменить фото", lbl_language: "Язык", lbl_last_seen: "Показывать «Был(а) в сети»", lbl_read_receipts: "Отчеты о прочтении", lbl_sound: "Звуки уведомлений", lbl_storage_used: "Использовано локального хранилища:", btn_clear_cache: "Очистить кэш", lbl_player_color: "Цвет медиаплеера", lbl_player_glass: "Эффект стекла медиаплеера" },
        tr: { login_title: "Doori Messenger", login_subtitle: "Lütfen bir kullanıcı adı seçin.", login_btn: "Devam et", sec_personal: "Kişisel", chat_saved: "Kaydedilen Mesajlar", sec_rooms: "Gruplar ve Kanallar", chat_general: "Genel", sec_contacts: "Kişiler", status_online: "Çevrimiçi", btn_block: "Engelle", btn_unblock: "Engeli Kaldır", err_blocked: "Bu kişiyi engellediniz.", err_channel: "Buraya yalnızca yöneticiler yazabilir.", placeholder_msg: "Bir mesaj yazın...", placeholder_search: "Kullanıcı ara (@isim)...", ttl_off: "⏳ Kapalı", btn_cancel: "✖", btn_stop_send: "■ Gönder", modal_new_room: "Yeni Oda", lbl_room_name: "Grup / Kanal Adı", opt_group: "Grup (Herkes yazabilir)", opt_channel: "Kanal (Sadece yöneticiler)", btn_create: "Oluştur", modal_settings: "Ayarlar", tab_profile: "Profil", tab_privacy: "Gizlilik", tab_chats: "Sohbetler", btn_change_pic: "Resmi Değiştir", lbl_language: "Dil", lbl_last_seen: "\"Son görülme\" durumunu göster", lbl_read_receipts: "Okundu Bilgisi", lbl_sound: "Bildirim Sesleri", lbl_storage_used: "Kullanılan Yerel Depolama:", btn_clear_cache: "Önbelleği Temizle", lbl_player_color: "Medya Oynatıcı Rengi", lbl_player_glass: "Medya Oynatıcı Cam Efekti" }, placeholder_msg: "Написать сообщение...", placeholder_search: "Поиск пользователя (@имя)...", ttl_off: "⏳ Выкл", btn_cancel: "✖", btn_stop_send: "■ Отправить", modal_new_room: "Новая комната", lbl_room_name: "Название группы / канала", opt_group: "Группа (могут писать все)", opt_channel: "Канал (только администраторы)", btn_create: "Создать", modal_settings: "Настройки", tab_profile: "Профиль", tab_privacy: "Конфиденциальность", tab_chats: "Чаты", btn_change_pic: "Изменить фото", lbl_language: "Язык", lbl_last_seen: "Показывать «Был(а) в сети»", lbl_read_receipts: "Отчеты о прочтении", lbl_sound: "Звуки уведомлений", lbl_storage_used: "Использовано локального хранилища:", btn_clear_cache: "Очистить кэш" },
        tr: { login_title: "Doori Messenger", login_subtitle: "Lütfen bir kullanıcı adı seçin.", login_btn: "Devam et", sec_personal: "Kişisel", chat_saved: "Kaydedilen Mesajlar", sec_rooms: "Gruplar ve Kanallar", chat_general: "Genel", sec_contacts: "Kişiler", status_online: "Çevrimiçi", btn_block: "Engelle", btn_unblock: "Engeli Kaldır", err_blocked: "Bu kişiyi engellediniz.", err_channel: "Buraya yalnızca yöneticiler yazabilir.", placeholder_msg: "Bir mesaj yazın...", placeholder_search: "Kullanıcı ara (@isim)...", ttl_off: "⏳ Kapalı", btn_cancel: "✖", btn_stop_send: "■ Gönder", modal_new_room: "Yeni Oda", lbl_room_name: "Grup / Kanal Adı", opt_group: "Grup (Herkes yazabilir)", opt_channel: "Kanal (Sadece yöneticiler)", btn_create: "Oluştur", modal_settings: "Ayarlar", tab_profile: "Profil", tab_privacy: "Gizlilik", tab_chats: "Sohbetler", btn_change_pic: "Resmi Değiştir", lbl_language: "Dil", lbl_last_seen: "\"Son görülme\" durumunu göster", lbl_read_receipts: "Okundu Bilgisi", lbl_sound: "Bildirim Sesleri", lbl_storage_used: "Kullanılan Yerel Depolama:", btn_clear_cache: "Önbelleği Temizle" }
    };

    function applyTranslation(lang) {
        currentLang = lang; localStorage.setItem('doori_lang', lang);
        if (['fa', 'ar'].includes(lang)) document.body.classList.add('rtl-mode'); else document.body.classList.remove('rtl-mode');
        const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                if (el.tagName === 'INPUT' && el.type === 'text') el.placeholder = t[key];
                else el.textContent = t[key];
            }
        });
        if (langSelect.value !== lang) langSelect.value = lang;
    }

    function initPickers() {
        EMOJIS.forEach(e => { const s = document.createElement('span'); s.textContent = e; s.onclick = () => { messageInput.value += e; emojiPicker.classList.add('hidden'); }; emojiPicker.appendChild(s); });
        GIFS.forEach(url => { const img = document.createElement('img'); img.src = url; img.onclick = () => { sendMessage('', 'gif', url); gifPicker.classList.add('hidden'); }; document.getElementById('gif-grid').appendChild(img); });
    }
    initPickers();
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
        } else if (data.type === 'poll_vote') {
            handlePollVote(data.chatId, data.messageId, data.optionIndex);
        }
    };

    function publishEvent(data) { bc.postMessage(data); }

    // --- Core Functions ---
    async function loadUserData() {
        messages = new Map(); // Force fresh start for Firestore
        try {
            const docSnap = await window.db.collection('userData').doc(currentUser.toLowerCase()).get();
            if (docSnap.exists) {
                const data = docSnap.data();
                if (data.chatData) chatData = data.chatData;
                if (data.blockedContacts) blockedContacts = new Set(data.blockedContacts);
            } else {
                // Fallback / Auto-Migration from old localStorage
                const saved = localStorage.getItem(`doori_${currentUser}`);
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (parsed.chatData) chatData = parsed.chatData;
                        if (parsed.blockedContacts) blockedContacts = new Set(parsed.blockedContacts);
                        // Push old data to cloud
                        saveUserData();
                    } catch(e) { console.error("Migration error", e); }
                }
            }
            
            // Also fetch own profile from users collection
            const userSnap = await window.db.collection('users').doc(currentUser.toLowerCase()).get();
            if (userSnap.exists) {
                const uData = userSnap.data();
                users.set(currentUser, { avatarUrl: uData.avatarUrl || null, status: 'Online' });
            } else {
                if (!users.has(currentUser)) users.set(currentUser, { avatarUrl: null, status: 'Online' });
            }
        } catch(e) {
            console.error("Load UserData error", e);
            if (!users.has(currentUser)) users.set(currentUser, { avatarUrl: null, status: 'Online' });
        }
        
        applyTranslation(currentLang);
        setupFirestoreListeners();
        renderChatList();
        selectChat('general', 'room');
        publishEvent({ type: 'user_login', username: currentUser });
    }

    function setupFirestoreListeners() {
        unsubListeners.forEach(u => u());
        unsubListeners = [];
        
        // Listener 1: Private Messages (DMs & Saved)
        const dmListener = window.db.collection('messages')
            .where('participants', 'array-contains', currentUser.toLowerCase())
            .onSnapshot(snapshot => {
                let changed = false;
                snapshot.docChanges().forEach(change => {
                    const msg = change.doc.data();
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
                        if (chatId !== 'saved' && msg.sender_username !== currentUser) {
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
                            if (change.type === 'added' && msg.sender_username !== currentUser && chatId !== currentChat?.id) {
                                unreadChats.add(chatId);
                            }
                        }
                        
                        if (change.type === 'added' && !msg.silent && msg.sender_username !== currentUser && !blockedContacts.has(msg.sender_username)) playSound();
                        changed = true;
                    }
                });
                if (changed) {
                    messages.forEach((msgs, id) => msgs.sort((a,b) => a.timestamp - b.timestamp));
                    saveUserData();
                    renderChatList();
                    renderMessages();
                }
            });
            
        // Listener 2: Public Rooms
        const roomListener = window.db.collection('messages')
            .where('isPublic', '==', true)
            .onSnapshot(snapshot => {
                let changed = false;
                snapshot.docChanges().forEach(change => {
                    const msg = change.doc.data();
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
                        
                        if (change.type === 'added' && !msg.silent && msg.sender_username !== currentUser && !blockedContacts.has(msg.sender_username)) playSound();
                        changed = true;
                    }
                });
                if (changed) {
                    messages.forEach((msgs, id) => msgs.sort((a,b) => a.timestamp - b.timestamp));
                    saveUserData();
                    renderChatList();
                    renderMessages();
                }
            });
            
        unsubListeners.push(dmListener, roomListener);
    }

    function saveUserData() {
        if (!currentUser) return;
        
        const dataToSave = {
            chatData: chatData,
            blockedContacts: Array.from(blockedContacts)
        };
        
        window.db.collection('userData').doc(currentUser.toLowerCase()).set(dataToSave, { merge: true })
            .catch(e => console.error("Save UserData Error", e));
            
        const p = users.get(currentUser);
        if (p) {
            window.db.collection('users').doc(currentUser.toLowerCase()).set({ avatarUrl: p.avatarUrl || null }, { merge: true })
                .catch(e => console.error("Save User Profile Error", e));
        }
        
        updateStorageUsage();
    }

    function renderMessages() {
        if (!currentChat) return;
        const msgs = messages.get(currentChat.id) || [];
        const now = Date.now();
        
        let shouldScroll = false;
        const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 50;
        
        const currentIds = new Set();
        let lastPinnedMsg = null;
        
        msgs.forEach(msg => {
            if (msg.expires_at && now > msg.expires_at) return;
            if (msg.isPinned) lastPinnedMsg = msg;
            currentIds.add(msg.id);
            
            const isSentByMe = msg.sender_username === currentUser;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            let ticks = ''; if(isSentByMe && currentChat.type !== 'saved') ticks = ' ✓✓';
            
            let contentHtml = '';
            
            if (msg.isForwarded) {
                contentHtml += `<div class="forwarded-tag">↪ Weitergeleitet</div>`;
            }
            if (msg.replyTo) {
                contentHtml += `<div class="reply-preview"><span class="reply-preview-sender">${msg.replyTo.sender}</span>${msg.replyTo.text}</div>`;
            }
            
            if (msg.mediaType === 'image') { contentHtml += `<img src="${msg.mediaUrl}" style="max-width:100%; border-radius:8px; margin-bottom:5px;"><br>${msg.text}`; }
            else if (msg.mediaType === 'video') { contentHtml += renderCustomPlayer(msg.mediaUrl, 'video') + (msg.text ? `<br>${msg.text}`:''); }
            else if (msg.mediaType === 'audio') { contentHtml += renderCustomPlayer(msg.mediaUrl, 'audio') + (msg.text ? `<br>${msg.text}`:''); }
            else if (msg.mediaType === 'gif') { contentHtml += `<img src="${msg.mediaUrl}" class="gif-msg"><br>${msg.text}`; }
            else if (msg.mediaType === 'poll') { contentHtml += renderPoll(msg); }
            else { contentHtml += msg.text; if(msg.edited) contentHtml += `<span class="edited-tag">(bearbeitet)</span>`; }
            
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
            
            let expectedInner = `<div class="message-sender">${isSentByMe ? 'Du' : msg.sender_username}</div><div class="message-bubble"><div>${contentHtml}</div></div>${reactionsHtml}<div class="message-time">${ttlHtml} ${statusHtml} ${timeStr}${ticks}</div>`;
            let className = `message ${isSentByMe ? 'sent' : 'received'}`;
            
            const hash = (msg.text || '') + (msg.edited ? '1':'0') + msg.mediaType + timeStr + JSON.stringify(msg.reactions||{}) + (msg.replyTo?'1':'0');
            
            let div = messagesContainer.querySelector(`div[data-id="${msg.id}"]`);
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
        initCustomPlayers();
    }

    // --- Context Menu Logic ---
    function openContextMenu(e, msg) {
        e.preventDefault();
        contextMessageId = msg.id;
        contextMessageText = msg.text || '';
        contextMessageSender = msg.sender_username;
        contextMessageMedia = msg.mediaType;
        
        ctxOverlay.classList.remove('hidden');
        
        const isSentByMe = msg.sender_username === currentUser;
        ctxEdit.style.display = isSentByMe ? 'block' : 'none';
        ctxDelete.style.display = isSentByMe ? 'block' : 'none';
        
        // Position menu
        const x = e.clientX || (e.touches && e.touches[0].clientX);
        const y = e.clientY || (e.touches && e.touches[0].clientY);
        
        ctxMenu.style.left = x + 'px';
        ctxMenu.style.top = y + 'px';
        
        // Adjust if off-screen
        const rect = ctxMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) ctxMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
        if (rect.bottom > window.innerHeight) ctxMenu.style.top = (window.innerHeight - rect.height - 10) + 'px';
    }

    messagesContainer.addEventListener('contextmenu', (e) => {
        const msgEl = e.target.closest('.message');
        if (msgEl && currentChat) {
            const chatMsgs = messages.get(currentChat.id) || [];
            const msg = chatMsgs.find(m => m.id === msgEl.dataset.id);
            if (msg) openContextMenu(e, msg);
        }
    });

    messagesContainer.addEventListener('touchstart', (e) => {
        const msgEl = e.target.closest('.message');
        if (msgEl && currentChat) {
            longPressTimerMsg = setTimeout(() => {
                const chatMsgs = messages.get(currentChat.id) || [];
                const msg = chatMsgs.find(m => m.id === msgEl.dataset.id);
                if (msg) openContextMenu(e, msg);
            }, 500);
        }
    });
    messagesContainer.addEventListener('touchend', () => clearTimeout(longPressTimerMsg));
    messagesContainer.addEventListener('touchmove', () => clearTimeout(longPressTimerMsg));

    ctxOverlay.addEventListener('click', (e) => {
        if (e.target === ctxOverlay) ctxOverlay.classList.add('hidden');
    });

    ctxCopy.addEventListener('click', () => {
        if(contextMessageText) navigator.clipboard.writeText(contextMessageText);
        ctxOverlay.classList.add('hidden');
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

    // Removed Pin, Select, and Forward features

    // --- Forward ---
    // Forward feature removed

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
            reactions: {}
        };
        
        if (replyingToMessage) {
            msgObj.replyTo = replyingToMessage;
            replyingToMessage = null;
            replyBanner.classList.add('hidden');
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
            alert("Nachricht konnte nicht gesendet werden (Offline?).");
        }
    }

    function handleEditMessage(msgId, chatId, newText) {
        const chatMsgs = messages.get(chatId);
        if (chatMsgs) {
            const msg = chatMsgs.find(m => m.id === msgId);
            if (msg) { msg.text = newText; msg.edited = true; if (currentChat?.id === chatId) renderMessages(); }
        }
    }

    function playSound() { if(document.getElementById('setting-sound').checked) { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.connect(ctx.destination); osc.frequency.value = 800; osc.start(); osc.stop(ctx.currentTime + 0.1); } }

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault(); const text = messageInput.value.trim();
        if (text) { sendMessage(text); messageInput.value = ''; }
    });

    // Recording
    async function startRecording(type) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
            mediaRecorder = new MediaRecorder(stream);
            let chunks = [];
            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: type === 'video' ? 'video/webm' : 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => { sendMessage('', type, reader.result); };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start();
            recordingPreview.classList.remove('hidden'); messageForm.style.display = 'none';
            recordingStartTime = Date.now();
            recordingInterval = setInterval(() => { const sec = Math.floor((Date.now() - recordingStartTime)/1000); recordingTimeEl.textContent = `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`; }, 1000);
        } catch(e) { alert("Mikrofon/Kamera Zugriff verweigert."); }
    }
    recordAudioBtn.addEventListener('click', () => startRecording('audio')); recordVideoBtn.addEventListener('click', () => startRecording('video'));
    stopRecordingBtn.addEventListener('click', () => { if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); cleanupRecording(); });
    cancelRecordingBtn.addEventListener('click', () => { if(mediaRecorder && mediaRecorder.state !== 'inactive') { mediaRecorder.onstop = null; mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(t=>t.stop()); } cleanupRecording(); });
    function cleanupRecording() { clearInterval(recordingInterval); recordingPreview.classList.add('hidden'); messageForm.style.display = 'block'; recordingTimeEl.textContent = '00:00'; }

    // Media Upload
    document.getElementById('media-upload').addEventListener('change', (e) => {
        const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
        reader.onloadend = () => { const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image'; sendMessage('', type, reader.result); };
        reader.readAsDataURL(file); e.target.value = '';
    });

    // Polls
    pollBtn.addEventListener('click', () => pollModal.classList.remove('hidden')); closePollModalBtn.addEventListener('click', () => pollModal.classList.add('hidden'));
    addPollOptionBtn.addEventListener('click', () => { const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'poll-option-input'; inp.placeholder = `Option ${pollOptionsContainer.children.length + 1}`; pollOptionsContainer.appendChild(inp); });
    pollQuizMode.addEventListener('change', () => document.getElementById('poll-correct-option-container').classList.toggle('hidden', !pollQuizMode.checked));
    createPollSubmitBtn.addEventListener('click', () => {
        const q = pollQuestion.value.trim(); const opts = Array.from(pollOptionsContainer.querySelectorAll('input')).map(i=>i.value.trim()).filter(v=>v);
        if(q && opts.length >= 2) { const pollObj = { question: q, options: opts, isQuiz: pollQuizMode.checked, correctOption: parseInt(pollCorrectOption.value)||0, votes: {} }; sendMessage('', 'poll', JSON.stringify(pollObj)); pollModal.classList.add('hidden'); pollQuestion.value = ''; Array.from(pollOptionsContainer.querySelectorAll('input')).forEach((i, idx) => { if(idx>=2) i.remove(); else i.value=''; }); pollQuizMode.checked = false; document.getElementById('poll-correct-option-container').classList.add('hidden'); }
    });

    function renderPoll(msg) {
        try { const p = JSON.parse(msg.text); let html = `<div class="poll-container" data-msgid="${msg.id}"><div class="poll-question">📊 ${p.question}</div>`;
        const totalVotes = Object.values(p.votes).length; const myVote = p.votes[currentUser];
        p.options.forEach((opt, idx) => { const count = Object.values(p.votes).filter(v=>v===idx).length; const pct = totalVotes ? Math.round((count/totalVotes)*100) : 0; let extraClass = ''; if(myVote !== undefined) { extraClass = 'poll-voted'; if(p.isQuiz) extraClass += (idx === p.correctOption ? ' correct' : (myVote===idx ? ' wrong' : '')); }
        html += `<div class="poll-option ${extraClass}" onclick="votePoll('${msg.id}', ${idx})"><div class="poll-option-bg" style="width:${pct}%"></div><span class="poll-option-text">${opt}</span><span class="poll-option-votes">${pct}%</span></div>`; });
        return html + '</div>'; } catch(e){return "Umfrage fehlerhaft";}
    }
    window.votePoll = (msgId, optIdx) => { if(!currentChat) return; const msgs = messages.get(currentChat.id); const msg = msgs.find(m=>m.id===msgId); if(msg) { try{const p = JSON.parse(msg.text); if(p.votes[currentUser]===undefined){p.votes[currentUser]=optIdx; msg.text = JSON.stringify(p); saveUserData(); renderMessages(); publishEvent({type:'poll_vote', chatId:currentChat.id, messageId:msgId, optionIndex:optIdx});}}catch(e){} } };
    function handlePollVote(chatId, msgId, optIdx) { if(messages.has(chatId)) { const msgs = messages.get(chatId); const msg = msgs.find(m=>m.id===msgId); if(msg) { try{const p = JSON.parse(msg.text); p.votes['vote_'+Math.random()]=optIdx; msg.text = JSON.stringify(p); if(currentChat && currentChat.id === chatId) renderMessages(); saveUserData();}catch(e){} } } }

    // --- Chat Selection ---
    function selectChat(id, type) {
        let chat = chatData.personal.find(c=>c.id===id) || chatData.rooms.find(c=>c.id===id) || chatData.contacts.find(c=>c.id===id);
        if (!chat && type === 'dm') { chat = { id, name: id, type: 'dm', isSecret: false }; chatData.contacts.push(chat); }
        if (!chat) return;
        currentChat = chat;
        
        currentChatName.textContent = chat.name;
        if (type === 'saved') currentChatAvatar.textContent = '💾';
        else if (type === 'room' || type === 'channel') currentChatAvatar.textContent = '#';
        else {
            const profile = users.get(chat.name);
            if (profile && profile.avatarUrl) { currentChatAvatar.innerHTML = `<img src="${profile.avatarUrl}" class="avatar-img">`; }
            else { currentChatAvatar.textContent = chat.name.replace('@','').charAt(0).toUpperCase(); }
        }

        if (type === 'dm') {
            currentChatStatus.style.display = 'inline-block'; blockChatBtn.style.display = 'inline-block'; secretChatBtn.style.display = 'inline-block';
            blockChatBtn.textContent = blockedContacts.has(id) ? TRANSLATIONS[currentLang]?.btn_unblock || 'Entblocken' : TRANSLATIONS[currentLang]?.btn_block || 'Blockieren';
        } else {
            currentChatStatus.style.display = 'none'; blockChatBtn.style.display = 'none'; secretChatBtn.style.display = 'none';
        }
        
        secretLock.style.display = currentChat.isSecret ? 'inline-block' : 'none';
        ttlSelect.style.display = (type === 'dm' && currentChat.isSecret) || type === 'room' || type === 'channel' ? 'inline-block' : 'none';

        document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        unreadChats.delete(id);
        const activeEl = document.querySelector(`.chat-item[data-id="${id}"]`); if (activeEl) { activeEl.classList.add('active'); activeEl.classList.remove('unread'); }
        if (window.innerWidth <= 768) sidebar.classList.remove('active');
        
        blockedNotice.classList.toggle('hidden', !blockedContacts.has(id));
        channelNotice.classList.toggle('hidden', !(type === 'channel' && !chat.isAdmin));
        chatInputArea.style.display = (blockedContacts.has(id) || (type === 'channel' && !chat.isAdmin)) ? 'none' : 'flex';
        
        renderMessages();
    }

    function renderChatList() {
        lists.personal.innerHTML = ''; lists.rooms.innerHTML = ''; lists.contacts.innerHTML = '';
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
                if(p && p.avatarUrl) avatarHtml = `<img src="${p.avatarUrl}" class="avatar-img">`; else avatarHtml = chat.name.replace('@','').charAt(0).toUpperCase();
            }
            div.innerHTML = `<div class="avatar ${chat.type === 'room' || chat.type === 'channel' ? 'room-avatar' : ''}">${avatarHtml}</div><div class="chat-item-info"><span class="chat-item-name">${chat.name}</span></div>`;
            div.addEventListener('click', () => selectChat(chat.id, chat.type));
            return div;
        };
        chatData.personal.forEach(c => lists.personal.appendChild(createItem(c)));
        chatData.rooms.forEach(c => lists.rooms.appendChild(createItem(c)));
        chatData.contacts.forEach(c => lists.contacts.appendChild(createItem(c)));
    }

    // --- Actions & Settings ---
    blockChatBtn.addEventListener('click', () => { if(!currentChat || currentChat.type !== 'dm') return; if(blockedContacts.has(currentChat.id)) blockedContacts.delete(currentChat.id); else blockedContacts.add(currentChat.id); saveUserData(); selectChat(currentChat.id, currentChat.type); });
    document.getElementById('unblock-btn').addEventListener('click', () => { if(currentChat) { blockedContacts.delete(currentChat.id); saveUserData(); selectChat(currentChat.id, currentChat.type); } });
    secretChatBtn.addEventListener('click', () => { if(currentChat && currentChat.type === 'dm') { currentChat.isSecret = !currentChat.isSecret; saveUserData(); selectChat(currentChat.id, currentChat.type); } });
    
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        langSelect.value = currentLang;
        const p = users.get(currentUser);
        if(p && p.avatarUrl) settingsAvatar.innerHTML = `<img src="${p.avatarUrl}" class="avatar-img">`;
        else settingsAvatar.textContent = currentUser.replace('@','').charAt(0).toUpperCase();
        updateStorageUsage();
    });
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active');
            document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(e.target.dataset.tab).classList.add('active');
        });
    });
    langSelect.addEventListener('change', (e) => applyTranslation(e.target.value));
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
    playerColorPicker.addEventListener('input', (e) => { playerColor = e.target.value; localStorage.setItem('doori_player_color', playerColor); document.documentElement.style.setProperty('--player-color', playerColor); initCustomPlayers(); });
    playerGlassToggle.addEventListener('change', (e) => { playerGlass = e.target.checked; localStorage.setItem('doori_player_glass', playerGlass); initCustomPlayers(); });
    document.getElementById('clear-cache-btn').addEventListener('click', () => { if(confirm("Gesamten Chatverlauf löschen?")) { messages.clear(); saveUserData(); renderMessages(); } });
    function updateStorageUsage() { let total = 0; for(let i in localStorage) { if(localStorage.hasOwnProperty(i)) { total += ((localStorage[i].length + i.length) * 2); } } document.getElementById('storage-usage').textContent = (total / (1024*1024)).toFixed(2) + " MB"; }

    newGroupBtn.addEventListener('click', () => createGroupModal.classList.remove('hidden'));
    closeGroupModalBtn.addEventListener('click', () => createGroupModal.classList.add('hidden'));
    createGroupSubmitBtn.addEventListener('click', () => {
        const n = newGroupName.value.trim(); const t = newGroupType.value;
        if(n) { const id = 'room_'+Date.now(); chatData.rooms.push({ id, name: n, type: t, isAdmin: true }); saveUserData(); renderChatList(); selectChat(id, t); createGroupModal.classList.add('hidden'); newGroupName.value = ''; }
    });

    mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('active'));

    // --- Search Users ---
    async function handleUserSearch() {
        let q = userSearchInput.value.trim();
        if (!q) return;
        if (!q.startsWith('@')) q = '@' + q;
        const lowerQ = q.toLowerCase();
        
        if (lowerQ === currentUser.toLowerCase()) {
            alert("Das bist du selbst!");
            return;
        }

        const btnOriginalText = userSearchBtn.textContent;
        userSearchBtn.textContent = '...';
        userSearchBtn.disabled = true;

        try {
            const docRef = window.db.collection('users').doc(lowerQ);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                // User found!
                selectChat(q, 'dm');
                userSearchInput.value = '';
                saveUserData();
                renderChatList();
            } else {
                alert("Benutzername nicht gefunden.");
            }
        } catch (error) {
            console.error("Search Error:", error);
            alert("Fehler bei der Suche.");
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
        verificationInfo.classList.add('hidden');
        loginSubmitBtn.textContent = 'Einloggen'; loginSubmitBtn.style.display = 'block';
        loginError.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
        isRegisterMode = true;
        tabRegister.style.fontWeight = 'bold'; tabRegister.style.color = 'var(--accent)'; tabRegister.style.borderBottom = '2px solid var(--accent)';
        tabLogin.style.fontWeight = 'normal'; tabLogin.style.color = 'var(--text-secondary)'; tabLogin.style.borderBottom = 'none';
        emailInput.classList.remove('hidden'); emailInput.setAttribute('required', 'true');
        verificationInfo.classList.add('hidden');
        loginSubmitBtn.textContent = 'Registrieren'; loginSubmitBtn.style.display = 'block';
        loginError.classList.add('hidden');
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        loginError.classList.add('hidden');
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = 'Lädt...';
        
        let username = usernameInput.value.trim(); 
        let password = passwordInput.value.trim();
        
        if (!username || !password) {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = isRegisterMode ? 'Registrieren' : 'Einloggen';
            return;
        }
        
        if (!username.startsWith('@')) username = '@' + username;
        const usernameLower = username.toLowerCase();

        try {
            if (isRegisterMode) {
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
                    
                    // Claim the username in Firestore
                    await userDocRef.set({
                        uid: user.uid,
                        username: username,
                        email: email,
                        createdAt: new Date().toISOString()
                    }, { merge: true });
                    
                    // Send Verification Email (Optional)
                    try { await user.sendEmailVerification(); } catch(e) {}
                    
                    // Allow login immediately
                    performLogin(username);
                    loginSubmitBtn.style.display = 'none';
                    loginError.classList.add('hidden');
                    
                } catch (error) {
                    if (error.message === 'username-taken') {
                        loginError.textContent = 'Dieser Benutzername ist bereits vergeben.';
                    } else if (error.code === 'auth/email-already-in-use') {
                        loginError.textContent = 'Diese E-Mail-Adresse ist bereits registriert.';
                    } else if (error.code === 'auth/weak-password') {
                        loginError.textContent = 'Das Passwort ist zu schwach (mindestens 6 Zeichen).';
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
                    if (!userEmail) {
                        throw new Error('legacy-account');
                    }
                    
                    // Login via Firebase Auth
                    const userCredential = await window.auth.signInWithEmailAndPassword(userEmail, password);
                    const user = userCredential.user;
                    
                    performLogin(username);
                } catch (error) {
                    console.error("Login Flow Error:", error);
                    if (error.message === 'user-not-found') {
                        loginError.textContent = 'Benutzername nicht gefunden.';
                    } else if (error.message === 'legacy-account') {
                        loginError.innerHTML = 'Dein Account nutzt noch das alte System. Bitte wechsle auf <b>Registrieren</b> und erstelle ihn mit E-Mail und Passwort neu (deine Chats bleiben erhalten!).';
                    } else if (error.message === 'email-not-verified') {
                        loginError.textContent = 'Bitte bestätige zuerst deine E-Mail-Adresse über den Link, den wir dir gesendet haben.';
                    } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                        loginError.textContent = 'Falsches Passwort oder E-Mail.';
                    } else {
                        loginError.textContent = 'Fehler beim Login: ' + (error.message || JSON.stringify(error));
                    }
                    loginError.classList.remove('hidden');
                }
            }
        } catch (criticalError) {
            console.error("Critical Login Error:", criticalError);
            alert("Ein unerwarteter Fehler ist aufgetreten: " + criticalError.message);
        } finally {
            if(loginSubmitBtn.style.display !== 'none') {
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.textContent = isRegisterMode ? 'Registrieren' : 'Einloggen';
            }
        }
    });

    function performLogin(username) {
        currentUser = username;
        if(currentUserDisplay) currentUserDisplay.textContent = currentUser;
        screens.login.classList.remove('active');
        screens.chat.classList.add('active');
        loadUserData();
    }

    // Custom Player
    function renderCustomPlayer(url, type) {
        const id = 'player_' + Math.random().toString(36).substr(2,9);
        let html = `<div class="custom-player" id="${id}" style="${playerGlass ? '' : 'backdrop-filter:none; background:rgba(16,30,38,0.9);'} border-color:${playerColor};">`;
        if(type === 'video') html += `<div class="custom-player-video-container"><video src="${url}"></video></div>`;
        else html += `<audio src="${url}" style="display:none;"></audio>`;
        html += `<div class="custom-player-controls"><button class="player-btn play-btn" style="background:${playerColor};">▶</button><div class="player-progress-container"><div class="player-progress-bar" style="background:${playerColor};"></div></div><span class="player-time">0:00 / 0:00</span></div></div>`;
        return html;
    }
    function initCustomPlayers() {
        document.querySelectorAll('.custom-player').forEach(playerEl => {
            if(playerEl.dataset.initialized) return; playerEl.dataset.initialized = 'true';
            const media = playerEl.querySelector('video, audio'); const playBtn = playerEl.querySelector('.play-btn'); const progBar = playerEl.querySelector('.player-progress-bar'); const progCont = playerEl.querySelector('.player-progress-container'); const timeEl = playerEl.querySelector('.player-time');
            if(!media) return;
            const fmt = (s) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
            playBtn.onclick = () => { if(media.paused) { media.play(); playBtn.textContent = '⏸'; } else { media.pause(); playBtn.textContent = '▶'; } };
            media.ontimeupdate = () => { if(media.duration) { progBar.style.width = (media.currentTime/media.duration*100)+'%'; timeEl.textContent = `${fmt(media.currentTime)} / ${fmt(media.duration)}`; } };
            media.onloadedmetadata = () => { timeEl.textContent = `0:00 / ${fmt(media.duration)}`; };
            media.onended = () => { playBtn.textContent = '▶'; progBar.style.width = '0%'; };
            progCont.onclick = (e) => { const r = progCont.getBoundingClientRect(); const pct = (e.clientX - r.left)/r.width; media.currentTime = pct * media.duration; };
        });
    }

    setInterval(() => {
        if(currentChat) renderMessages();
    }, 1000);

    // Auto-Login
    window.auth.onAuthStateChanged(async (user) => {
        if (user && !currentUser) {
            try {
                const q = await window.db.collection('users').where('uid', '==', user.uid).get();
                if (!q.empty) {
                    const doc = q.docs[0];
                    performLogin(doc.data().username);
                }
            } catch (err) { console.error("Auto-login error", err); }
        }
    });
});

