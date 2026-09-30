(function () {
  'use strict';

  const SESSION_MS = 24 * 60 * 60 * 1000;
  const I18N = {
    de: {media_lounge_menu:'Media Lounge',media_lounge_title:'Media Lounge',media_lounge_subtitle:'Gemeinsam hören, ansehen und erleben',media_lounge_live:'LIVE',media_lounge_empty_title:'Noch keine Medien',media_lounge_empty_text:'Füge Musik, Bilder oder Videos für eure gemeinsame Sitzung hinzu.',media_lounge_empty_category:'In diesem Bereich gibt es noch keine Medien.',media_lounge_sections:'Medienbereiche',media_lounge_photos:'Fotos',media_lounge_videos:'Videos',media_lounge_music:'Musik',media_lounge_music_player:'Gemeinsamer Musikplayer',media_lounge_now:'Jetzt gemeinsam',media_lounge_add:'Medien hinzufügen',media_lounge_end:'Sitzung beenden',media_lounge_retention:'Nur vorübergehend für Live-Zwecke. Alle Bilder, Videos und Musikdateien werden spätestens nach 24 Stunden automatisch gelöscht.',media_lounge_waiting_title:'Einladung gesendet',media_lounge_waiting_text:'Die gemeinsame Sitzung startet, sobald die Einladung angenommen wurde.',media_lounge_invite_title:'Einladung zur Media Lounge',media_lounge_invite_text:'möchte Medien live mit dir teilen.',media_lounge_accept:'Annehmen',media_lounge_reject:'Ablehnen',media_lounge_accepted:'Einladung angenommen',media_lounge_rejected:'Einladung abgelehnt',media_lounge_ended:'Die Live-Sitzung wurde beendet.',media_lounge_expired:'Diese Live-Sitzung ist abgelaufen.',media_lounge_dm_only:'Die Media Lounge ist nur in privaten Chats verfügbar.',media_lounge_pending_exists:'Für diesen Chat wartet bereits eine Einladung.',media_lounge_start_error:'Die Media Lounge konnte nicht gestartet werden. Bitte versuche es erneut.',media_lounge_uploading:'Medien werden sicher für die Live-Sitzung hochgeladen …',media_lounge_upload_error:'Die Medien konnten nicht hochgeladen werden.',media_lounge_type_error:'Bitte wähle nur Bilder, Videos oder Musikdateien aus.'},
    en: {media_lounge_menu:'Media Lounge',media_lounge_title:'Media Lounge',media_lounge_subtitle:'Listen, watch and experience together',media_lounge_live:'LIVE',media_lounge_empty_title:'No media yet',media_lounge_empty_text:'Add music, photos or videos to your shared session.',media_lounge_empty_category:'No media in this section yet.',media_lounge_sections:'Media sections',media_lounge_photos:'Photos',media_lounge_videos:'Videos',media_lounge_music:'Music',media_lounge_music_player:'Shared music player',media_lounge_now:'Together now',media_lounge_add:'Add media',media_lounge_end:'End session',media_lounge_retention:'Temporary and for live use only. All photos, videos and music files are automatically deleted within 24 hours.',media_lounge_waiting_title:'Invitation sent',media_lounge_waiting_text:'The shared session starts as soon as the invitation is accepted.',media_lounge_invite_title:'Media Lounge invitation',media_lounge_invite_text:'wants to share media live with you.',media_lounge_accept:'Accept',media_lounge_reject:'Decline',media_lounge_accepted:'Invitation accepted',media_lounge_rejected:'Invitation declined',media_lounge_ended:'The live session has ended.',media_lounge_expired:'This live session has expired.',media_lounge_dm_only:'Media Lounge is only available in private chats.',media_lounge_pending_exists:'An invitation is already waiting in this chat.',media_lounge_start_error:'The Media Lounge could not be started. Please try again.',media_lounge_uploading:'Securely uploading media for the live session …',media_lounge_upload_error:'The media could not be uploaded.',media_lounge_type_error:'Please select photos, videos or music files only.'},
    ar: {media_lounge_menu:'صالة الوسائط',media_lounge_title:'صالة الوسائط',media_lounge_subtitle:'استمعوا وشاهدوا واستمتعوا معًا',media_lounge_live:'مباشر',media_lounge_empty_title:'لا توجد وسائط بعد',media_lounge_empty_text:'أضف موسيقى أو صورًا أو فيديوهات إلى جلستكما المشتركة.',media_lounge_empty_category:'لا توجد وسائط في هذا القسم بعد.',media_lounge_sections:'أقسام الوسائط',media_lounge_photos:'الصور',media_lounge_videos:'الفيديوهات',media_lounge_music:'الموسيقى',media_lounge_music_player:'مشغل الموسيقى المشترك',media_lounge_now:'معًا الآن',media_lounge_add:'إضافة وسائط',media_lounge_end:'إنهاء الجلسة',media_lounge_retention:'مؤقت وللاستخدام المباشر فقط. تُحذف جميع الصور والفيديوهات وملفات الموسيقى تلقائيًا خلال 24 ساعة كحد أقصى.',media_lounge_waiting_title:'تم إرسال الدعوة',media_lounge_waiting_text:'تبدأ الجلسة المشتركة بمجرد قبول الدعوة.',media_lounge_invite_title:'دعوة إلى صالة الوسائط',media_lounge_invite_text:'يريد مشاركة الوسائط معك مباشرة.',media_lounge_accept:'قبول',media_lounge_reject:'رفض',media_lounge_accepted:'تم قبول الدعوة',media_lounge_rejected:'تم رفض الدعوة',media_lounge_ended:'انتهت الجلسة المباشرة.',media_lounge_expired:'انتهت صلاحية هذه الجلسة المباشرة.',media_lounge_dm_only:'صالة الوسائط متاحة فقط في المحادثات الخاصة.',media_lounge_pending_exists:'توجد دعوة معلقة بالفعل في هذه المحادثة.',media_lounge_start_error:'تعذّر بدء صالة الوسائط. يرجى المحاولة مرة أخرى.',media_lounge_uploading:'جارٍ رفع الوسائط بأمان للجلسة المباشرة …',media_lounge_upload_error:'تعذّر رفع الوسائط.',media_lounge_type_error:'يرجى اختيار صور أو فيديوهات أو ملفات موسيقى فقط.'},
    fa: {media_lounge_menu:'سالن رسانه',media_lounge_title:'سالن رسانه',media_lounge_subtitle:'با هم گوش دهید، تماشا کنید و لذت ببرید',media_lounge_live:'زنده',media_lounge_empty_title:'هنوز رسانه‌ای نیست',media_lounge_empty_text:'برای جلسه مشترک موسیقی، تصویر یا ویدیو اضافه کنید.',media_lounge_empty_category:'هنوز رسانه‌ای در این بخش نیست.',media_lounge_sections:'بخش‌های رسانه',media_lounge_photos:'عکس‌ها',media_lounge_videos:'ویدیوها',media_lounge_music:'موسیقی',media_lounge_music_player:'پخش‌کنندهٔ مشترک موسیقی',media_lounge_now:'اکنون با هم',media_lounge_add:'افزودن رسانه',media_lounge_end:'پایان جلسه',media_lounge_retention:'فقط موقت و برای استفاده زنده است. همه تصاویر، ویدیوها و فایل‌های موسیقی حداکثر ظرف ۲۴ ساعت به‌صورت خودکار حذف می‌شوند.',media_lounge_waiting_title:'دعوت ارسال شد',media_lounge_waiting_text:'به‌محض پذیرفتن دعوت، جلسه مشترک آغاز می‌شود.',media_lounge_invite_title:'دعوت به سالن رسانه',media_lounge_invite_text:'می‌خواهد رسانه را به‌صورت زنده با شما به اشتراک بگذارد.',media_lounge_accept:'پذیرفتن',media_lounge_reject:'رد کردن',media_lounge_accepted:'دعوت پذیرفته شد',media_lounge_rejected:'دعوت رد شد',media_lounge_ended:'جلسه زنده پایان یافت.',media_lounge_expired:'مهلت این جلسه زنده تمام شده است.',media_lounge_dm_only:'سالن رسانه فقط در گفت‌وگوهای خصوصی در دسترس است.',media_lounge_pending_exists:'در این گفت‌وگو یک دعوت در انتظار وجود دارد.',media_lounge_start_error:'سالن رسانه شروع نشد. لطفاً دوباره تلاش کنید.',media_lounge_uploading:'رسانه‌ها به‌صورت امن برای جلسه زنده بارگذاری می‌شوند …',media_lounge_upload_error:'بارگذاری رسانه‌ها انجام نشد.',media_lounge_type_error:'لطفاً فقط تصویر، ویدیو یا فایل موسیقی انتخاب کنید.'},
    tr: {media_lounge_menu:'Medya Salonu',media_lounge_title:'Medya Salonu',media_lounge_subtitle:'Birlikte dinleyin, izleyin ve yaşayın',media_lounge_live:'CANLI',media_lounge_empty_title:'Henüz medya yok',media_lounge_empty_text:'Ortak oturumunuza müzik, resim veya video ekleyin.',media_lounge_empty_category:'Bu bölümde henüz medya yok.',media_lounge_sections:'Medya bölümleri',media_lounge_photos:'Fotoğraflar',media_lounge_videos:'Videolar',media_lounge_music:'Müzik',media_lounge_music_player:'Ortak müzik çalar',media_lounge_now:'Şimdi birlikte',media_lounge_add:'Medya ekle',media_lounge_end:'Oturumu bitir',media_lounge_retention:'Yalnızca geçici ve canlı kullanım içindir. Tüm resimler, videolar ve müzik dosyaları en geç 24 saat içinde otomatik olarak silinir.',media_lounge_waiting_title:'Davet gönderildi',media_lounge_waiting_text:'Davet kabul edilir edilmez ortak oturum başlar.',media_lounge_invite_title:'Medya Salonu daveti',media_lounge_invite_text:'seninle canlı medya paylaşmak istiyor.',media_lounge_accept:'Kabul et',media_lounge_reject:'Reddet',media_lounge_accepted:'Davet kabul edildi',media_lounge_rejected:'Davet reddedildi',media_lounge_ended:'Canlı oturum sona erdi.',media_lounge_expired:'Bu canlı oturumun süresi doldu.',media_lounge_dm_only:'Medya Salonu yalnızca özel sohbetlerde kullanılabilir.',media_lounge_pending_exists:'Bu sohbette zaten bekleyen bir davet var.',media_lounge_start_error:'Medya Salonu başlatılamadı. Lütfen tekrar deneyin.',media_lounge_uploading:'Medya canlı oturum için güvenle yükleniyor …',media_lounge_upload_error:'Medya yüklenemedi.',media_lounge_type_error:'Lütfen yalnızca resim, video veya müzik dosyaları seçin.'}
  };
  Object.assign(I18N.de,{shared_activities:'Gemeinsame Aktivitäten',activity_invite_superseded:'Durch eine neuere Anfrage ersetzt.',activity_already_active:'Hier läuft bereits eine gemeinsame Aktivität.',media_lounge_active_exists:'Für diesen Chat läuft bereits eine Media Lounge.'});
  Object.assign(I18N.en,{shared_activities:'Shared activities',activity_invite_superseded:'Replaced by a newer invitation.',activity_already_active:'A shared activity is already active here.',media_lounge_active_exists:'A Media Lounge is already active in this chat.'});
  Object.assign(I18N.ar,{shared_activities:'أنشطة مشتركة',activity_invite_superseded:'استُبدلت بدعوة أحدث.',activity_already_active:'يوجد نشاط مشترك نشط هنا بالفعل.',media_lounge_active_exists:'توجد صالة وسائط نشطة بالفعل في هذه الدردشة.'});
  Object.assign(I18N.fa,{shared_activities:'فعالیت‌های مشترک',activity_invite_superseded:'با دعوت جدیدتری جایگزین شد.',activity_already_active:'در اینجا یک فعالیت مشترک فعال است.',media_lounge_active_exists:'در این گفت‌وگو یک سالن رسانه فعال وجود دارد.'});
  Object.assign(I18N.tr,{shared_activities:'Ortak etkinlikler',activity_invite_superseded:'Daha yeni bir davetle değiştirildi.',activity_already_active:'Burada zaten etkin bir ortak etkinlik var.',media_lounge_active_exists:'Bu sohbette zaten etkin bir Medya Salonu var.'});
  const PLAYER_TEXT = {
    de: {left:'Die andere Person hat die Lounge verlassen.',continue:'Allein weiterschauen',close:'Lounge schließen',play:'Abspielen',pause:'Pause',seek:'Wiedergabeposition',fullscreen:'Vollbild',mute:'Ton aus',unmute:'Ton an',loading:'Medium wird geladen …',blocked:'Tippe auf Play, um die gemeinsame Wiedergabe zu starten.',failed:'Dieses Medium kann hier nicht abgespielt werden.',syncError:'Die gemeinsame Steuerung konnte nicht gespeichert werden.',synced:'Live synchronisiert',skip_back:'10 Sek. zurück',skip_forward:'10 Sek. vor',speed:'Geschwindigkeit',pip:'Bild-in-Bild',zoom_in:'Vergrößern',zoom_out:'Verkleinern',rotate:'Drehen',reset:'Zurücksetzen'},
    en: {left:'The other person left the lounge.',continue:'Continue alone',close:'Close lounge',play:'Play',pause:'Pause',seek:'Playback position',fullscreen:'Fullscreen',mute:'Mute',unmute:'Unmute',loading:'Loading media …',blocked:'Tap Play to start shared playback.',failed:'This media cannot be played here.',syncError:'Could not save shared playback.',synced:'Live synced',skip_back:'10s back',skip_forward:'10s forward',speed:'Speed',pip:'Picture-in-Picture',zoom_in:'Zoom in',zoom_out:'Zoom out',rotate:'Rotate',reset:'Reset'},
    ar: {left:'غادر الشخص الآخر صالة الوسائط.',continue:'المتابعة بمفردي',close:'إغلاق الصالة',play:'تشغيل',pause:'إيقاف مؤقت',seek:'موضع التشغيل',fullscreen:'ملء الشاشة',mute:'كتم الصوت',unmute:'تشغيل الصوت',loading:'جارٍ تحميل الوسائط …',blocked:'اضغط تشغيل لبدء التشغيل المشترك.',failed:'لا يمكن تشغيل هذا الملف هنا.',syncError:'تعذّر حفظ التحكم المشترك.',synced:'متزامن مباشر',skip_back:'10 ثوانٍ للخلف',skip_forward:'10 ثوانٍ للأمام',speed:'السرعة',pip:'صورة داخل صورة',zoom_in:'تكبير',zoom_out:'تصغير',rotate:'تدوير',reset:'إعادة ضبط'},
    fa: {left:'طرف مقابل سالن رسانه را ترک کرد.',continue:'ادامه به‌تنهایی',close:'بستن سالن',play:'پخش',pause:'مکث',seek:'موقعیت پخش',fullscreen:'تمام‌صفحه',mute:'بی‌صدا',unmute:'با صدا',loading:'در حال بارگذاری رسانه …',blocked:'برای آغاز پخش مشترک روی پخش بزنید.',failed:'این رسانه در اینجا پخش نمی‌شود.',syncError:'کنترل پخش مشترک ذخیره نشد.',synced:'همگام‌سازی زنده',skip_back:'۱۰ ثانیه به عقب',skip_forward:'۱۰ ثانیه به جلو',speed:'سرعت',pip:'تصویر در تصویر',zoom_in:'بزرگ‌نمایی',zoom_out:'کوچک‌نمایی',rotate:'چرخش',reset:'بازنشانی'},
    tr: {left:'Diğer kişi medya salonundan ayrıldı.',continue:'Tek başıma devam et',close:'Salonu kapat',play:'Oynat',pause:'Duraklat',seek:'Oynatma konumu',fullscreen:'Tam ekran',mute:'Sesi kapat',unmute:'Sesi aç',loading:'Medya yükleniyor …',blocked:'Ortak oynatmayı başlatmak için Oynat’a dokun.',failed:'Bu medya burada oynatılamıyor.',syncError:'Ortak oynatma kaydedilemedi.',synced:'Canlı senkronize',skip_back:'10 sn geri',skip_forward:'10 sn ileri',speed:'Hız',pip:'Resim içinde resim',zoom_in:'Yakınlaştır',zoom_out:'Uzaklaştır',rotate:'Döndür',reset:'Sıfırla'}
  };
  for (const lang of Object.keys(I18N)) Object.assign(I18N[lang], Object.fromEntries(Object.entries(PLAYER_TEXT[lang]).map(([key,value]) => ['media_lounge_'+key,value])));

  let modal, viewer, empty, tray, waiting, uploadInput, currentSession = null, unsubscribe = null, unsubscribePresence=null;
  let activeCategory = 'image', lastSharedItemId = null;
  let applyingRemote = false, lastPlaybackWrite = 0, sessionsListener = null, creatingSession = false;
  const deviceId = Math.random().toString(36).slice(2,12);
  let presenceTimer = null, lastPeerOpen = false, peerNoticeDismissed = false, playbackGeneration = 0, lastPresenceEntries=null, presenceEverOpen=false, lastAppliedPlayback=null;
  const normalizeUser = value => '@' + String(value || '').replace(/^@/, '').toLowerCase();
  const me = () => normalizeUser(window.currentUser || '');
  const ACCEPT_BY_CATEGORY = {
    image: 'image/*,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.svg',
    video: 'video/*,.mp4,.mov,.m4v,.webm,.ogv,.mkv,.avi',
    audio: 'audio/*,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,audio/aac,audio/ogg,audio/flac,.mp3,.m4a,.wav,.aac,.flac,.ogg,.opus,.m4r,.aiff,.wma'
  };
  const AUDIO_EXTS = new Set(['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg', 'opus', 'm4r', 'aiff', 'wma']);
  const VIDEO_EXTS = new Set(['mp4', 'mov', 'm4v', 'webm', 'ogv', 'mkv', 'avi']);
  const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg']);

  function resolveMediaType(file) {
    const ext = (file.name || '').split('.').pop().toLowerCase();
    let mime = file.type || '';
    let category = null;

    if (/^image\//.test(mime) || IMAGE_EXTS.has(ext)) {
      category = 'image';
      if (!mime || mime === 'application/octet-stream') {
        mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      }
    } else if (/^video\//.test(mime) || VIDEO_EXTS.has(ext)) {
      category = 'video';
      if (!mime || mime === 'application/octet-stream') {
        mime = ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4';
      }
    } else if (/^audio\//.test(mime) || AUDIO_EXTS.has(ext)) {
      category = 'audio';
      if (!mime || mime === 'application/octet-stream') {
        mime = ext === 'm4a' ? 'audio/mp4' : ext === 'wav' ? 'audio/wav' : ext === 'aac' ? 'audio/aac' : ext === 'flac' ? 'audio/flac' : 'audio/mpeg';
      }
    }
    return { category, mime: mime || 'application/octet-stream' };
  }
  const tr = () => I18N[window.currentLang] || I18N.en;
  const esc = value => String(value || '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function installTranslations() {
    Object.keys(I18N).forEach(lang => {
      if (window.TRANSLATIONS && window.TRANSLATIONS[lang]) Object.assign(window.TRANSLATIONS[lang], I18N[lang]);
    });
    const label = document.querySelector('#media-lounge-btn [data-i18n="media_lounge_menu"]');
    if (label) label.textContent = tr().media_lounge_menu;
    const group=document.getElementById('shared-activities-group');
    if(group)group.setAttribute('aria-label',tr().shared_activities);
    const heading=document.getElementById('shared-activities-label');
    if(heading)heading.textContent=tr().shared_activities;
  }

  function applyOwnTranslations() {
    document.querySelectorAll('#media-lounge-modal [data-i18n]').forEach(el => {
      const value = tr()[el.dataset.i18n];
      if (value) el.textContent = value;
    });
    document.getElementById('media-lounge-categories')?.setAttribute('aria-label',tr().media_lounge_sections);
  }

  function sessionRef(id) { return window.db.collection('liveMediaSessions').doc(id); }
  function validSession(data) { return data && data.expiresAt > Date.now() && ['pending','active'].includes(data.status); }
  const presenceRef = (id,user=me()) => sessionRef(id).collection?.('presence')?.doc(user);
  async function setPresence(open,id=currentSession?.id) {
    if (!id) return;
    const ref=presenceRef(id);
    if(!ref) return;
    if (open) await ref.set({deviceId,open:true,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()});
    else await window.db.runTransaction(async tx => {
      const snap=await tx.get(ref);
      if(snap.data()?.deviceId===deviceId) tx.set(ref,{deviceId,open:false,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()});
    });
  }
  function handlePeerPresence(data) {
    lastPresenceEntries=data;
    const peer=currentSession?.participants?.find(user => user!==me());
    if (!peer) return;
    const entry=data?.[peer], seen=entry?.updatedAt?.toMillis?.() || 0;
    const open=!!entry?.open && Date.now()-seen<45000;
    const notice=document.getElementById('media-lounge-peer-notice');
    if (open) {presenceEverOpen=true;peerNoticeDismissed=false;}
    if ((lastPeerOpen || (presenceEverOpen && entry && !peerNoticeDismissed)) && !open && currentSession?.status==='active') {
      peerNoticeDismissed=false;
      const media=viewer?.querySelector('video,audio');
      if(media&&!media.paused) { const position=media.currentTime;media.pause();syncPlayback(media,false,true,position); }
    }
    lastPeerOpen=open;
    if (notice) notice.classList.toggle('hidden',open||!entry||peerNoticeDismissed||currentSession?.status!=='active');
  }

  async function createSession() {
    const chat = window.currentChat;
    if (!chat || chat.type !== 'dm') return alert(tr().media_lounge_dm_only);
    const creator = me();
    const peer = normalizeUser(chat.id);
    if (!creator || !peer) return;
    if (creatingSession) return;
    creatingSession = true;
    let ref = null;
    let stage = 'list-sessions';
    try {
      try {
        const existing = await window.db.collection('liveMediaSessions').where('participants','array-contains',creator).limit(30).get();
        const active = existing.docs.some(doc => {
          const data = doc.data();
          return validSession(data) && data.status === 'active' && data.participants.includes(peer);
        });
        if (active) return alert(tr().media_lounge_active_exists);
      } catch (listErr) {
        console.warn('Could not query active sessions, continuing', listErr?.code || listErr);
      }
      ref = window.db.collection('liveMediaSessions').doc();
      const messageId = Date.now().toString() + Math.random().toString(36).slice(2, 11);
      const now = Date.now();
      const expiresAt = now + SESSION_MS - (2 * 60 * 1000);
      stage = 'create-session';
      await ref.set({creator,participants:[creator,peer],inviteMessageId:messageId,status:'pending',items:[],activeCategory:'image',currentIndex:0,playback:{playing:false,position:0,updatedAt:now,changedBy:creator},createdAt:now,updatedAt:now,expiresAt});
      stage = 'send-invitation';
      const sent = await window.sendMessage('', 'live_media_invite', JSON.stringify({id:ref.id}), false, null, {messageId});
      if (!sent) { await ref.delete().catch(()=>{}); return; }
      stage = 'open-session';
      openSession(ref.id);
    } catch (error) {
      console.error('Media Lounge start failed', stage, error?.code || 'unknown', error);
      if (ref) await ref.delete().catch(()=>{});
      alert(tr().media_lounge_start_error);
    } finally {
      creatingSession = false;
    }
  }

  async function decide(sessionId, messageId, accepted) {
    const ref = sessionRef(sessionId);
    try {
      await window.db.runTransaction(async transaction => {
        const snap = await transaction.get(ref);
        const data = snap.data();
        if (!data || data.status !== 'pending' || !data.participants.includes(me()) || data.creator === me()) throw new Error('invalid invitation');
        transaction.update(ref,{status:accepted?'active':'declined',updatedAt:Date.now(),decidedBy:me()});
      });
      if (messageId) await window.db.collection('messages').doc(messageId).update({live_media_status:accepted?'accepted':'declined'});
      window.renderMessages?.();
      if (accepted) openSession(sessionId);
    } catch (error) { console.error('Media Lounge invitation failed', error); }
  }

  function openSession(id) {
    if (!modal) return;
    if (currentSession?.id !== id) { activeCategory = 'image'; lastSharedItemId = null; lastPeerOpen=false; lastPresenceEntries=null; presenceEverOpen=false; lastAppliedPlayback=null; peerNoticeDismissed=true; }
    applyOwnTranslations();
    modal.classList.remove('hidden');
    unsubscribe?.(); unsubscribePresence?.();
    unsubscribePresence=sessionRef(id).collection?.('presence')?.onSnapshot(snapshot=>{
      const entries={}; snapshot.forEach(doc=>{entries[doc.id]=doc.data();});
      handlePeerPresence(entries);
    },error=>console.error('Media Lounge presence sync failed',error?.code||'unknown'));
    setPresence(true,id).catch(error=>console.error('Media Lounge presence failed',error?.code||'unknown'));
    clearInterval(presenceTimer);
    presenceTimer=setInterval(()=>{
      if (document.visibilityState==='visible' && currentSession?.id===id) setPresence(true,id).catch(()=>{});
      const peer=currentSession?.participants?.find(user=>user!==me());
      if (peer && lastPresenceEntries) handlePeerPresence(lastPresenceEntries);
    },15000);
    unsubscribe = sessionRef(id).onSnapshot(snapshot => {
      if (!snapshot.exists) return closeLocal();
      currentSession = {id:snapshot.id,...snapshot.data()};
      if (currentSession.expiresAt <= Date.now()) { alert(tr().media_lounge_expired); return closeLocal(); }
      if (['declined','ended','superseded'].includes(currentSession.status)) { alert(currentSession.status==='superseded'?tr().activity_invite_superseded:currentSession.status==='ended'?tr().media_lounge_ended:tr().media_lounge_rejected); return closeLocal(); }
      render();
    }, error => { console.error('Media Lounge sync failed', error); closeLocal(); });
  }

  function closeLocal() {
    const id=currentSession?.id;
    const media=viewer?.querySelector('video,audio');
    if(media&&!media.paused) {const position=media.currentTime;media.pause();syncPlayback(media,false,true,position);}
    if(id) setPresence(false,id).catch(error=>console.error('Media Lounge presence failed',error?.code||'unknown'));
    clearInterval(presenceTimer); presenceTimer=null;
    unsubscribe?.(); unsubscribe = null; unsubscribePresence?.(); unsubscribePresence=null; currentSession = null;
    modal?.classList.add('hidden');
    if (viewer) { const media=viewer.querySelector('video,audio'); media?.pause(); viewer.replaceChildren(); viewer.dataset.key=''; }
  }

  function render() {
    const items = Array.isArray(currentSession.items) ? currentSession.items.filter(item => item.expiresAt > Date.now()) : [];
    const pending = currentSession.status === 'pending';
    waiting.classList.toggle('hidden', !pending);
    document.getElementById('media-lounge-add').disabled = pending;
    const index = Math.min(Math.max(Number(currentSession.currentIndex)||0,0),Math.max(items.length-1,0));
    const selected = items[index];
    if (selected?.id !== lastSharedItemId) {
      lastSharedItemId = selected?.id || null;
    }
    activeCategory = currentSession.activeCategory || selected?.type || 'image';
    uploadInput.accept = ACCEPT_BY_CATEGORY[activeCategory] || `${activeCategory}/*`;
    const categoryItems = items.map((item, globalIndex) => ({item, globalIndex})).filter(({item}) => item.type === activeCategory);
    document.querySelectorAll('#media-lounge-categories [data-media-category]').forEach(button => {
      const active = button.dataset.mediaCategory === activeCategory;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',String(active));
      button.querySelector('small').textContent = String(items.filter(item => item.type === button.dataset.mediaCategory).length);
    });
    empty.classList.toggle('hidden', categoryItems.length > 0);
    document.getElementById('media-lounge-empty-text').textContent = items.length ? tr().media_lounge_empty_category : tr().media_lounge_empty_text;
    viewer.classList.toggle('hidden', categoryItems.length === 0);
    document.getElementById('media-lounge-prev').disabled = categoryItems.length < 2;
    document.getElementById('media-lounge-next').disabled = categoryItems.length < 2;
    const categoryIndex = categoryItems.findIndex(({globalIndex}) => globalIndex === index);
    document.getElementById('media-lounge-counter').textContent = categoryItems.length ? `${Math.max(categoryIndex,0)+1} / ${categoryItems.length}` : '0 / 0';
    document.getElementById('media-lounge-file-name').textContent = items[index]?.name || '—';
    tray.replaceChildren(...categoryItems.map(({item,globalIndex}) => makeTile(item,globalIndex,index)));
    renderViewer(selected?.type === activeCategory ? selected : null);
  }

  function makeTile(item, index, active) {
    const button=document.createElement('button'); button.type='button'; button.className='media-lounge-tile'+(index===active?' active':'');
    if (item.type==='image') { const img=document.createElement('img'); img.src=item.url; img.alt=''; button.appendChild(img); }
    else { const icon=document.createElement('span'); icon.textContent=item.type==='video'?'▶':'♫'; button.appendChild(icon); }
    const name=document.createElement('small'); name.textContent=item.name; button.appendChild(name);
    button.onclick=()=>setIndex(index); return button;
  }

function renderViewer(item) {
    const existing=viewer.firstElementChild;
    if (!item) { const previous=viewer.querySelector('video,audio'); applyingRemote=true; viewer.replaceChildren(); previous?.pause(); applyingRemote=false; viewer.dataset.key=''; return; }
    if (viewer.dataset.key===item.id) { if(lastAppliedPlayback!==currentSession.playback?.updatedAt)applyPlayback(existing); return; }
    const previous=viewer.querySelector('video,audio');
    viewer.dataset.key=item.id; applyingRemote=true; viewer.replaceChildren(); previous?.pause(); applyingRemote=false;
    if (item.type==='image') {
      const wrap=document.createElement('div'); wrap.className='media-lounge-image-wrap';
      const stage=document.createElement('div'); stage.className='media-lounge-image-stage';
      const img=document.createElement('img'); img.src=item.url; img.alt=item.name||''; img.className='media-lounge-img'; img.draggable=false;
      stage.appendChild(img);
      const dock=document.createElement('div'); dock.className='media-lounge-image-dock';
      let zoom=1, rot=0;
      const applyT=()=>{ img.style.transform=`scale(${zoom}) rotate(${rot}deg)`; zoomPill.textContent=`${Math.round(zoom*100)}%`; };
      const zOut=document.createElement('button'); zOut.type='button'; zOut.className='image-dock-btn'; zOut.title=tr().media_lounge_zoom_out; zOut.setAttribute('aria-label',tr().media_lounge_zoom_out); zOut.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>'; zOut.onclick=()=>{ zoom=Math.max(0.5,Math.round((zoom-0.25)*100)/100); applyT(); };
      const zoomPill=document.createElement('button'); zoomPill.type='button'; zoomPill.className='image-dock-pill'; zoomPill.title=tr().media_lounge_reset; zoomPill.setAttribute('aria-label',tr().media_lounge_reset); zoomPill.textContent='100%'; zoomPill.onclick=()=>{ zoom=1; rot=0; applyT(); };
      const zIn=document.createElement('button'); zIn.type='button'; zIn.className='image-dock-btn'; zIn.title=tr().media_lounge_zoom_in; zIn.setAttribute('aria-label',tr().media_lounge_zoom_in); zIn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>'; zIn.onclick=()=>{ zoom=Math.min(3,Math.round((zoom+0.25)*100)/100); applyT(); };
      const rotBtn=document.createElement('button'); rotBtn.type='button'; rotBtn.className='image-dock-btn'; rotBtn.title=tr().media_lounge_rotate; rotBtn.setAttribute('aria-label',tr().media_lounge_rotate); rotBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>'; rotBtn.onclick=()=>{ rot=(rot+90)%360; applyT(); };
      const fsBtn=document.createElement('button'); fsBtn.type='button'; fsBtn.className='image-dock-btn'; fsBtn.title=tr().media_lounge_fullscreen; fsBtn.setAttribute('aria-label',tr().media_lounge_fullscreen); fsBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>'; fsBtn.onclick=()=>{ if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{}); else wrap.requestFullscreen?.().catch(()=>{}); };
      img.ondblclick=()=>{ zoom=zoom===1?2:1; applyT(); };
      dock.append(zOut,zoomPill,zIn,rotBtn,fsBtn); wrap.append(stage,dock); viewer.appendChild(wrap); return;
    }
    const wrap=document.createElement('div'); wrap.className='media-lounge-player-wrap'+(item.type==='video'?' modern-video-player':'');
    if(item.type==='audio'){
      wrap.classList.add('media-lounge-music-player');
      const art=document.createElement('div');art.className='media-lounge-audio-art';art.textContent='♫';wrap.appendChild(art);
      const label=document.createElement('small');label.textContent=tr().media_lounge_music_player;wrap.appendChild(label);
      const title=document.createElement('strong');title.textContent=item.name;wrap.appendChild(title);
    }
    const media=document.createElement(item.type==='video'?'video':'audio');
    media.src=item.url; media.controls=false; media.playsInline=true; media.setAttribute('webkit-playsinline',''); media.preload='metadata'; media.crossOrigin='anonymous';
    const controls=document.createElement('div');controls.className='media-lounge-player-controls';
    const play=document.createElement('button');play.type='button';play.className='player-btn player-play-btn';play.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';play.setAttribute('aria-label',tr().media_lounge_play);
    const togglePlay=()=>{if(media.paused)media.play().catch(()=>showPlayerStatus(tr().media_lounge_blocked));else media.pause();};
    play.onclick=togglePlay;
    if(item.type==='video') media.onclick=togglePlay;
    const skipB=document.createElement('button'); skipB.type='button'; skipB.className='player-btn player-skip-btn'; skipB.title=tr().media_lounge_skip_back; skipB.setAttribute('aria-label',tr().media_lounge_skip_back); skipB.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4a8 8 0 1 0 7.7 5.7"/><path d="M20 4v5h-5"/><text x="12" y="15" font-size="7.5" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none">10</text></svg>';
    skipB.onclick=()=>{ media.currentTime=Math.max(0,media.currentTime-10); syncPlayback(media,!media.paused,true); };
    const skipF=document.createElement('button'); skipF.type='button'; skipF.className='player-btn player-skip-btn'; skipF.title=tr().media_lounge_skip_forward; skipF.setAttribute('aria-label',tr().media_lounge_skip_forward); skipF.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4a8 8 0 1 1-7.7 5.7"/><path d="M4 4v5h5"/><text x="12" y="15" font-size="7.5" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none">10</text></svg>';
    skipF.onclick=()=>{ const d=Number.isFinite(media.duration)?media.duration:media.currentTime+10; media.currentTime=Math.min(d,media.currentTime+10); syncPlayback(media,!media.paused,true); };
    const time=document.createElement('span');time.className='player-time-display';time.textContent='0:00 / 0:00';
    const seekWrap=document.createElement('div'); seekWrap.className='player-seek-wrap';
    const seekProgress=document.createElement('div'); seekProgress.className='player-seek-filled';
    const seek=document.createElement('input');seek.type='range';seek.className='player-seek-slider';seek.min='0';seek.max='1000';seek.value='0';seek.setAttribute('aria-label',tr().media_lounge_seek);
    seek.onchange=()=>{if(Number.isFinite(media.duration))media.currentTime=Number(seek.value)*media.duration/1000;};
    seek.oninput=()=>{ seekProgress.style.width=`${Number(seek.value)/10}%`; };
    seekWrap.append(seekProgress,seek);
    const mute=document.createElement('button');mute.type='button';mute.className='player-btn player-mute-btn';mute.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';mute.setAttribute('aria-label',tr().media_lounge_mute);
    mute.onclick=()=>{
      media.muted=!media.muted;
      mute.innerHTML=media.muted?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
      mute.setAttribute('aria-label',tr()['media_lounge_'+(media.muted?'unmute':'mute')]);
    };
    const speedRates=[1,1.25,1.5,2,0.75]; let rateIdx=0;
    const speedBtn=document.createElement('button'); speedBtn.type='button'; speedBtn.className='player-btn player-speed-pill'; speedBtn.textContent='1x'; speedBtn.title=tr().media_lounge_speed; speedBtn.setAttribute('aria-label',tr().media_lounge_speed);
    speedBtn.onclick=()=>{ rateIdx=(rateIdx+1)%speedRates.length; const r=speedRates[rateIdx]; media.playbackRate=r; speedBtn.textContent=`${r}x`; };
    controls.append(play,skipB,skipF,time,seekWrap,mute,speedBtn);
    if(item.type==='video') {
      if(document.pictureInPictureEnabled){
        const pipBtn=document.createElement('button'); pipBtn.type='button'; pipBtn.className='player-btn player-pip-btn'; pipBtn.title=tr().media_lounge_pip; pipBtn.setAttribute('aria-label',tr().media_lounge_pip); pipBtn.innerHTML='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 4.5H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-11a2 2 0 0 0-2-2z"/><rect x="12" y="11.5" width="7" height="5" rx="1"/></svg>';
        pipBtn.onclick=()=>{ if(document.pictureInPictureElement)document.exitPictureInPicture?.().catch(()=>{}); else media.requestPictureInPicture?.().catch(()=>{}); };
        controls.appendChild(pipBtn);
      }
      const full=document.createElement('button');full.type='button';full.className='player-btn player-fullscreen-btn';full.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';full.setAttribute('aria-label',tr().media_lounge_fullscreen);full.onclick=()=>wrap.requestFullscreen?.().catch(()=>{media.requestFullscreen?.().catch(()=>{});});controls.appendChild(full);
      let idleTimer=null;
      const resetIdle=()=>{ controls.classList.remove('idle-hide'); clearTimeout(idleTimer); if(!media.paused){ idleTimer=setTimeout(()=>{ controls.classList.add('idle-hide'); },3200); } };
      wrap.onmousemove=resetIdle; wrap.ontouchstart=resetIdle;
    }
    const status=document.createElement('span');status.className='media-lounge-player-status';status.setAttribute('role','status');
    function showPlayerStatus(text){status.textContent=text;}
    function updateControls(){
      play.innerHTML=media.paused?'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
      play.setAttribute('aria-label',tr()['media_lounge_'+(media.paused?'play':'pause')]);
      const duration=Number.isFinite(media.duration)?media.duration:0;
      const pct=duration?Math.round(1000*media.currentTime/duration):0;
      seek.value=String(pct); seekProgress.style.width=`${pct/10}%`;
      time.textContent=`${formatTime(media.currentTime)} / ${formatTime(duration)}`;
    }
    media.addEventListener('loadedmetadata',()=>{showPlayerStatus('');updateControls();applyPlayback(media);});
    media.addEventListener('error',()=>showPlayerStatus(tr().media_lounge_failed));
    media.addEventListener('play',()=>{updateControls();syncPlayback(media,true,true);});media.addEventListener('pause',()=>{updateControls();syncPlayback(media,false,true);});
    media.addEventListener('seeked',()=>{updateControls();syncPlayback(media,!media.paused,true);});
    media.addEventListener('ended',()=>syncPlayback(media,false,true));
    media.addEventListener('timeupdate',()=>{updateControls();if(!media.paused&&Date.now()-lastPlaybackWrite>3000)syncPlayback(media,true);});
    wrap.append(media,controls,status); viewer.appendChild(wrap); applyPlayback(media);
  }

  function formatTime(seconds){const s=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}

  function applyPlayback(root) {
    const media = root?.matches?.('video,audio') ? root : root?.querySelector?.('video,audio');
    const state=currentSession?.playback; if(!media||!state)return;
    if (media.readyState===0) return;
    lastAppliedPlayback=state.updatedAt;
    if(state.changedBy===me() && viewer.dataset.key===lastSharedItemId && !media.paused && state.playing) return;
    let target=Number(state.position)||0; if(state.playing)target+=(Date.now()-(Number(state.updatedAt)||Date.now()))/1000;
    applyingRemote=true;
    if(Number.isFinite(media.duration))target=Math.min(target,media.duration);
    if(Math.abs((media.currentTime||0)-target)>1.2)try{media.currentTime=Math.max(0,target);}catch(_){ }
    if(state.playing&&media.paused)media.play().catch(()=>{const status=viewer.querySelector('.media-lounge-player-status');if(status)status.textContent=tr().media_lounge_blocked;}); else if(!state.playing&&!media.paused)media.pause();
    const generation=++playbackGeneration;
    setTimeout(()=>{if(generation===playbackGeneration)applyingRemote=false;},250);
  }

  function syncPlayback(media, playing, force=false, position=media.currentTime) {
    if(applyingRemote||!viewer.contains(media)||!currentSession||currentSession.status!=='active')return;
    if(!force&&Date.now()-lastPlaybackWrite<3000)return; lastPlaybackWrite=Date.now();
    sessionRef(currentSession.id).update({playback:{playing,position:Number(position)||0,updatedAt:Date.now(),changedBy:me()},updatedAt:Date.now()}).catch(error=>{console.error('Media Lounge playback failed',error?.code||'unknown');const status=viewer.querySelector('.media-lounge-player-status');if(status)status.textContent=tr().media_lounge_syncError;});
  }

  function setIndex(index) {
    if(!currentSession||currentSession.status!=='active')return;
    const category=currentSession.items?.[index]?.type||activeCategory;
    sessionRef(currentSession.id).update({activeCategory:category,currentIndex:index,playback:{playing:false,position:0,updatedAt:Date.now(),changedBy:me()},updatedAt:Date.now()}).catch(console.error);
  }

  function selectCategory(category) {
    if (!['image','video','audio'].includes(category)) return;
    uploadInput.accept = ACCEPT_BY_CATEGORY[category] || `${category}/*`;
    const items = Array.isArray(currentSession?.items) ? currentSession.items : [];
    const first = items.findIndex(item => item.type === category && item.expiresAt > Date.now());
    if (!currentSession || currentSession.status!=='active')return;
    const index=first>=0?first:currentSession.currentIndex;
    activeCategory=category;
    document.querySelectorAll('#media-lounge-categories [data-media-category]').forEach(button=>{
      button.classList.toggle('active',button.dataset.mediaCategory===category);
      button.setAttribute('aria-selected',String(button.dataset.mediaCategory===category));
    });
    sessionRef(currentSession.id).update({activeCategory:category,currentIndex:index,playback:{playing:false,position:0,updatedAt:Date.now(),changedBy:me()},updatedAt:Date.now()}).catch(console.error);
  }

  async function uploadFiles(files) {
    if(!currentSession||currentSession.status!=='active')return;
    const selected=[...files];
    const itemsToUpload = selected.map(file => {
      const resolved = resolveMediaType(file);
      return { file, ...resolved };
    });
    if (itemsToUpload.some(item => !item.category)) {
      return alert(tr().media_lounge_type_error);
    }
    const addButton=document.getElementById('media-lounge-add'); addButton.disabled=true; const old=addButton.innerHTML; addButton.textContent=tr().media_lounge_uploading;
    try {
      for(const item of itemsToUpload){
        const { file, category, mime } = item;
        const requestUpload=window.accountFunctions.httpsCallable('requestLargeMediaUpload');
        const result=await requestUpload({fileName:file.name,fileSize:file.size,mimeType:mime,chatId:currentSession.id,purpose:'live_media'});
        const plan=result.data; const response=await fetch(plan.uploadUrl,{method:'PUT',body:file,headers:{'Content-Type':mime}}); if(!response.ok)throw new Error(`HTTP ${response.status}`);
        await window.accountFunctions.httpsCallable('confirmLargeMediaUpload')({fileId:plan.fileId,provider:plan.provider,storageKey:plan.storageKey,fileName:file.name,fileSize:file.size,mimeType:mime,chatId:currentSession.id,expiresAt:plan.expiresAt,purpose:'live_media'});
        await sessionRef(currentSession.id).update({items:window.firebase.firestore.FieldValue.arrayUnion({id:plan.fileId,type:category,name:file.name,url:plan.downloadUrl,provider:plan.provider,expiresAt:plan.expiresAt,addedBy:me(),addedAt:Date.now()}),updatedAt:Date.now()});
      }
    } catch(error){console.error('Media Lounge upload failed',error);alert(tr().media_lounge_upload_error);} finally {addButton.disabled=false;addButton.innerHTML=old;uploadInput.value='';}
  }

  async function endSession(){
    if(!currentSession)return;
    const endedSession=currentSession;
    try {
      await sessionRef(endedSession.id).update({status:'ended',endedBy:me(),updatedAt:Date.now()});
      if(endedSession.inviteMessageId) await window.db.collection('messages').doc(endedSession.inviteMessageId).update({live_media_status:'ended'});
    } catch(error) { console.error('Media Lounge end failed',error); }
    closeLocal();
  }

  function dismissPeerNotice() {peerNoticeDismissed=true;document.getElementById('media-lounge-peer-notice')?.classList.add('hidden');}

  function renderInvite(message){
    let data={};try{data=JSON.parse(message.mediaUrl||'{}');}catch(_){ }
    const status=message.live_media_status||'pending';
    const mine=String(message.sender_username||'').toLowerCase()===me();
    const state=status==='accepted'?tr().media_lounge_accepted:status==='declined'?tr().media_lounge_rejected:status==='ended'?tr().media_lounge_ended:status==='superseded'?tr().activity_invite_superseded:'';
    const attrs=window.actionAttrs||(()=> '');
    const actions=!mine&&status==='pending'?`<div class="live-media-invite-actions"><button class="live-media-accept" ${attrs('acceptLiveMediaInvite',data.id,message.id)}>${esc(tr().media_lounge_accept)}</button><button class="live-media-reject" ${attrs('rejectLiveMediaInvite',data.id,message.id)}>${esc(tr().media_lounge_reject)}</button></div>`:status==='accepted'?`<div class="live-media-invite-actions"><button class="live-media-accept" ${attrs('openLiveMediaSession',data.id)}>${esc(tr().media_lounge_title)}</button></div>`:'';
    return `<div class="live-media-invite-card"><div class="live-media-invite-top"><span class="live-media-invite-icon">◉</span><strong>${esc(tr().media_lounge_invite_title)}</strong></div><p>${state?esc(state):`${esc(message.sender_username)} ${esc(tr().media_lounge_invite_text)}`}</p>${actions}</div>`;
  }

  function listenForActiveSessions(){
    if(sessionsListener||!me()||!window.db)return;
    sessionsListener=window.db.collection('liveMediaSessions').where('participants','array-contains',me()).limit(20).onSnapshot(snapshot=>{
      snapshot.docChanges().forEach(change=>{const data=change.doc.data();if(change.type==='modified'&&data.status==='active'&&data.expiresAt>Date.now()&&data.participants.includes(String(window.currentChat?.id||'').toLowerCase()))openSession(change.doc.id);});
    },error=>console.error('Media Lounge listener failed',error));
  }

  document.addEventListener('DOMContentLoaded',()=>{
    installTranslations(); modal=document.getElementById('media-lounge-modal');viewer=document.getElementById('media-lounge-viewer');empty=document.getElementById('media-lounge-empty');tray=document.getElementById('media-lounge-tray');waiting=document.getElementById('media-lounge-waiting');uploadInput=document.getElementById('media-lounge-upload');
    document.getElementById('media-lounge-btn')?.addEventListener('click',createSession);
    document.getElementById('media-lounge-close')?.addEventListener('click',closeLocal);
    document.getElementById('media-lounge-continue')?.addEventListener('click',dismissPeerNotice);
    document.getElementById('media-lounge-peer-close')?.addEventListener('click',closeLocal);
    document.getElementById('media-lounge-peer-end')?.addEventListener('click',endSession);
    document.getElementById('media-lounge-add')?.addEventListener('click',()=>uploadInput.click()); uploadInput?.addEventListener('change',()=>uploadFiles(uploadInput.files));
    const categories=[...document.querySelectorAll('#media-lounge-categories [data-media-category]')];
    categories.forEach((button,index) => {
      button.addEventListener('click',()=>selectCategory(button.dataset.mediaCategory));
      button.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
        event.preventDefault();
        const direction=(event.key==='ArrowRight'?1:-1)*(['ar','fa'].includes(window.currentLang)?-1:1);
        const next=categories[(index+direction+categories.length)%categories.length];
        next.focus();selectCategory(next.dataset.mediaCategory);
      });
    });
    document.getElementById('media-lounge-end')?.addEventListener('click',endSession);
    const navigate=delta=>{const indices=(currentSession?.items||[]).map((item,index)=>item.type===activeCategory&&item.expiresAt>Date.now()?index:-1).filter(index=>index>=0);if(!indices.length)return;const position=indices.indexOf(currentSession.currentIndex);setIndex(indices[(position+delta+indices.length)%indices.length]);};
    document.getElementById('media-lounge-prev')?.addEventListener('click',()=>navigate(-1));
    document.getElementById('media-lounge-next')?.addEventListener('click',()=>navigate(1));
    const timer=setInterval(()=>{if(me()){clearInterval(timer);listenForActiveSessions();}},500);
  });
  window.addEventListener('doori-language-change',()=>{installTranslations();applyOwnTranslations();if(currentSession)render();window.renderMessages?.();});
  window.addEventListener('pagehide',()=>{if(currentSession)closeLocal();});
  window.addEventListener('doori-chat-change',()=>{if(currentSession)closeLocal();});
  window.renderDooriLiveMediaInvite=renderInvite;
  window.acceptLiveMediaInvite=(id,messageId)=>decide(id,messageId,true);
  window.rejectLiveMediaInvite=(id,messageId)=>decide(id,messageId,false);
  window.openLiveMediaSession=openSession;
  window.DooriLiveMediaTest={I18N,SESSION_MS,renderInvite,renderViewer};
})();
