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
  Object.assign(I18N.de,{media_lounge_play:'Abspielen',media_lounge_pause:'Pause',media_lounge_seek:'Position',media_lounge_volume:'Lautstärke',media_lounge_mute:'Stummschalten',media_lounge_fullscreen:'Vollbild',media_lounge_playback_error:'Die Datei kann nicht abgespielt werden. Bitte überprüfe das Format oder lade sie erneut hoch.'});
  Object.assign(I18N.en,{shared_activities:'Shared activities',activity_invite_superseded:'Replaced by a newer invitation.',activity_already_active:'A shared activity is already active here.',media_lounge_active_exists:'A Media Lounge is already active in this chat.'});
  Object.assign(I18N.en,{media_lounge_play:'Play',media_lounge_pause:'Pause',media_lounge_seek:'Seek',media_lounge_volume:'Volume',media_lounge_mute:'Mute',media_lounge_fullscreen:'Fullscreen',media_lounge_playback_error:'This file cannot be played. Check the format or upload it again.'});
  Object.assign(I18N.ar,{shared_activities:'أنشطة مشتركة',activity_invite_superseded:'استُبدلت بدعوة أحدث.',activity_already_active:'يوجد نشاط مشترك نشط هنا بالفعل.',media_lounge_active_exists:'توجد صالة وسائط نشطة بالفعل في هذه الدردشة.'});
  Object.assign(I18N.ar,{media_lounge_play:'تشغيل',media_lounge_pause:'إيقاف مؤقت',media_lounge_seek:'موضع التشغيل',media_lounge_volume:'مستوى الصوت',media_lounge_mute:'كتم الصوت',media_lounge_fullscreen:'ملء الشاشة',media_lounge_playback_error:'تعذّر تشغيل الملف. تحقّق من التنسيق أو أعد رفعه.'});
  Object.assign(I18N.fa,{shared_activities:'فعالیت‌های مشترک',activity_invite_superseded:'با دعوت جدیدتری جایگزین شد.',activity_already_active:'در اینجا یک فعالیت مشترک فعال است.',media_lounge_active_exists:'در این گفت‌وگو یک سالن رسانه فعال وجود دارد.'});
  Object.assign(I18N.fa,{media_lounge_play:'پخش',media_lounge_pause:'مکث',media_lounge_seek:'موقعیت پخش',media_lounge_volume:'بلندی صدا',media_lounge_mute:'بی\u200cصدا',media_lounge_fullscreen:'تمام\u200cصفحه',media_lounge_playback_error:'این فایل پخش نمی\u200cشود. قالب آن را بررسی کنید یا دوباره بارگذاری کنید.'});
  Object.assign(I18N.tr,{shared_activities:'Ortak etkinlikler',activity_invite_superseded:'Daha yeni bir davetle değiştirildi.',activity_already_active:'Burada zaten etkin bir ortak etkinlik var.',media_lounge_active_exists:'Bu sohbette zaten etkin bir Medya Salonu var.'});
  Object.assign(I18N.tr,{media_lounge_play:'Oynat',media_lounge_pause:'Duraklat',media_lounge_seek:'Konum',media_lounge_volume:'Ses düzeyi',media_lounge_mute:'Sessize al',media_lounge_fullscreen:'Tam ekran',media_lounge_playback_error:'Bu dosya oynatılamıyor. Biçimini kontrol edin veya yeniden yükleyin.'});

  let modal, viewer, empty, tray, waiting, uploadInput, currentSession = null, unsubscribe = null;
  let activeCategory = 'image', lastSharedItemId = null;
  let applyingRemote = false, lastPlaybackWrite = 0, sessionsListener = null, creatingSession = false;
  let pendingPlayback = null, playbackSequence = 0;
  const playbackClientId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
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
      await ref.set({creator,participants:[creator,peer],inviteMessageId:messageId,status:'pending',items:[],currentIndex:0,playback:{playing:false,position:0,updatedAt:now,changedBy:creator},createdAt:now,updatedAt:now,expiresAt});
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
    if (currentSession?.id !== id) { activeCategory = 'image'; lastSharedItemId = null; }
    applyOwnTranslations();
    modal.classList.remove('hidden');
    unsubscribe?.();
    unsubscribe = sessionRef(id).onSnapshot(snapshot => {
      if (!snapshot.exists) return closeLocal();
      currentSession = {id:snapshot.id,...snapshot.data()};
      if (currentSession.expiresAt <= Date.now()) { alert(tr().media_lounge_expired); return closeLocal(); }
      if (['declined','ended','superseded'].includes(currentSession.status)) { alert(currentSession.status==='superseded'?tr().activity_invite_superseded:currentSession.status==='ended'?tr().media_lounge_ended:tr().media_lounge_rejected); return closeLocal(); }
      render();
    }, error => { console.error('Media Lounge sync failed', error); closeLocal(); });
  }

  function closeLocal() {
    pendingPlayback=null; playbackSequence++;
    unsubscribe?.(); unsubscribe = null; currentSession = null;
    modal?.classList.add('hidden');
    if (viewer) { const media=viewer.querySelector('video,audio'); media?.pause(); viewer.replaceChildren(); }
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
      if (selected) activeCategory = selected.type;
    }
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

  const clock = seconds => {
    if (!Number.isFinite(seconds)) return '0:00';
    const value = Math.max(0, Math.floor(seconds));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
  };

  function renderViewer(item) {
    if (!item) {
      const previous=viewer.querySelector('video,audio');
      viewer.replaceChildren(); previous?.pause(); viewer.dataset.key=''; return;
    }
    if (viewer.dataset.key===item.id) { applyPlayback(viewer); return; }
    const previous=viewer.querySelector('video,audio');
    viewer.dataset.key=item.id; viewer.replaceChildren();
    // Pause the detached player without publishing a pause for the next item.
    previous?.pause();
    if (item.type==='image') {
      const img=document.createElement('img'); img.src=item.url; img.alt=item.name||''; viewer.appendChild(img); return;
    }
    const panel=document.createElement('div'); panel.className='media-lounge-player';
    const media=document.createElement(item.type==='video'?'video':'audio');
    media.src=item.url; media.controls=false; media.playsInline=true; media.preload='metadata';
    if (item.type==='video') {
      media.setAttribute('playsinline',''); media.setAttribute('webkit-playsinline','');
      const screen=document.createElement('div'); screen.className='media-lounge-screen';
      screen.appendChild(media); panel.appendChild(screen);
    } else {
      const art=document.createElement('div'); art.className='media-lounge-audio-art'; art.textContent='♫'; panel.appendChild(art);
      const label=document.createElement('small'); label.textContent=tr().media_lounge_music_player; panel.appendChild(label);
      const title=document.createElement('strong'); title.textContent=item.name; panel.appendChild(title);
      panel.classList.add('media-lounge-player-audio'); panel.appendChild(media);
    }
    const controls=document.createElement('div'); controls.className='media-lounge-controls';
    const play=document.createElement('button'); play.type='button'; play.className='media-lounge-play';
    const elapsed=document.createElement('span'); elapsed.className='media-lounge-time';
    const seek=document.createElement('input'); seek.type='range'; seek.className='media-lounge-seek'; seek.min='0'; seek.max='1000'; seek.value='0'; seek.setAttribute('aria-label',tr().media_lounge_seek);
    const duration=document.createElement('span'); duration.className='media-lounge-time';
    const mute=document.createElement('button'); mute.type='button'; mute.className='media-lounge-mute';
    const volume=document.createElement('input'); volume.type='range'; volume.className='media-lounge-volume'; volume.min='0'; volume.max='100'; volume.value='100'; volume.setAttribute('aria-label',tr().media_lounge_volume);
    controls.append(play,elapsed,seek,duration,mute,volume);
    if (item.type==='video') {
      const full=document.createElement('button'); full.type='button'; full.className='media-lounge-fullscreen'; full.textContent='⛶'; full.title=tr().media_lounge_fullscreen; full.setAttribute('aria-label',full.title);
      full.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else if(panel.requestFullscreen)panel.requestFullscreen().catch(()=>{});else media.webkitEnterFullscreen?.();};
      controls.appendChild(full);
    }
    panel.appendChild(controls); viewer.appendChild(panel);
    const update=()=>{
      if (!panel.isConnected) return;
      play.textContent=media.paused?'▶':'❚❚'; play.setAttribute('aria-label',media.paused?tr().media_lounge_play:tr().media_lounge_pause);
      mute.textContent=media.muted||media.volume===0?'🔇':'🔊'; mute.setAttribute('aria-label',tr().media_lounge_mute);
      elapsed.textContent=clock(media.currentTime); duration.textContent=clock(media.duration);
      if (Number.isFinite(media.duration)&&media.duration>0&&!seek.matches(':active')) seek.value=String(Math.round(media.currentTime/media.duration*1000));
    };
    play.onclick=()=>{if(media.paused)media.play().catch(()=>showPlayerError(panel));else media.pause();};
    seek.oninput=()=>{if(Number.isFinite(media.duration)&&media.duration>0)media.currentTime=Number(seek.value)/1000*media.duration; update();};
    seek.onchange=()=>syncPlayback(media,!media.paused,true);
    mute.onclick=()=>{media.muted=!media.muted;update();};
    volume.oninput=()=>{media.volume=Number(volume.value)/100;media.muted=false;update();};
    media.addEventListener('loadedmetadata',()=>{applyPlayback(media);update();});
    media.addEventListener('timeupdate',()=>{update();if(!media.paused&&Date.now()-lastPlaybackWrite>4000)syncPlayback(media,true);});
    media.addEventListener('play',()=>{update();syncPlayback(media,true,true);});
    media.addEventListener('pause',()=>{update();syncPlayback(media,false,true);});
    media.addEventListener('seeked',()=>{update();syncPlayback(media,!media.paused,true);});
    media.addEventListener('ended',()=>{update();syncPlayback(media,false,true);});
    media.addEventListener('error',()=>showPlayerError(panel));
    update(); applyPlayback(media);
  }

  function showPlayerError(panel) {
    if (!panel.isConnected || panel.querySelector('.media-lounge-error')) return;
    const message=document.createElement('p'); message.className='media-lounge-error'; message.textContent=tr().media_lounge_playback_error;
    panel.appendChild(message);
  }

  function applyPlayback(root) {
    const media = root?.matches?.('video,audio') ? root : root?.querySelector?.('video,audio');
    const state=currentSession?.playback;
    if(!media||!state||state.clientId===playbackClientId)return;
    // Playback state belongs to one item; never resume a different video/audio.
    if(state.itemId && state.itemId!==viewer.dataset.key)return;
    let target=Number(state.position)||0;
    if(state.playing)target+=Math.max(0,(Date.now()-(Number(state.updatedAt)||Date.now()))/1000);
    if(Number.isFinite(media.duration))target=Math.min(target,media.duration);
    applyingRemote=true;
    if(Math.abs((media.currentTime||0)-target)>1.2) {
      if(media.readyState) {try{media.currentTime=Math.max(0,target);}catch(_){}}
      else media.addEventListener('loadedmetadata',()=>{if(viewer.contains(media))media.currentTime=Math.max(0,target);},{once:true});
    }
    if(state.playing&&media.paused)media.play().catch(()=>{ /* iOS requires a local tap to allow sound. */ });
    else if(!state.playing&&!media.paused)media.pause();
    setTimeout(()=>{applyingRemote=false;},250);
  }

  function syncPlayback(media, playing, force=false) {
    if(applyingRemote||!viewer.contains(media)||!currentSession||currentSession.status!=='active')return;
    if(!force&&Date.now()-lastPlaybackWrite<4000)return;
    lastPlaybackWrite=Date.now();
    const id=currentSession.id;
    const playback={itemId:viewer.dataset.key,playing,position:Number(media.currentTime)||0,updatedAt:Date.now(),changedBy:me(),clientId:playbackClientId};
    // Coalesce rapid seeking events so older writes cannot overtake the latest position.
    pendingPlayback=playback;
    const sequence=++playbackSequence;
    if(force)flushPlayback(id,sequence);
    else setTimeout(()=>flushPlayback(id,sequence),300);
  }

  function flushPlayback(id,sequence) {
    if(sequence!==playbackSequence||!pendingPlayback||currentSession?.id!==id)return;
    const playback=pendingPlayback; pendingPlayback=null;
    sessionRef(id).update({playback,updatedAt:Date.now()}).catch(console.error);
  }

  function setIndex(index) {
    if(!currentSession||currentSession.status!=='active')return;
    pendingPlayback=null; playbackSequence++;
    sessionRef(currentSession.id).update({currentIndex:index,playback:{itemId:currentSession.items?.[index]?.id||null,playing:false,position:0,updatedAt:Date.now(),changedBy:me(),clientId:playbackClientId},updatedAt:Date.now()}).catch(console.error);
  }

  function selectCategory(category) {
    if (!['image','video','audio'].includes(category)) return;
    activeCategory = category;
    uploadInput.accept = ACCEPT_BY_CATEGORY[category] || `${category}/*`;
    const items = Array.isArray(currentSession?.items) ? currentSession.items : [];
    const first = items.findIndex(item => item.type === category && item.expiresAt > Date.now());
    if (first >= 0 && first !== currentSession.currentIndex && currentSession.status === 'active') {
      setIndex(first);
      currentSession.currentIndex = first;
    }
    if (currentSession) render();
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
  window.renderDooriLiveMediaInvite=renderInvite;
  window.acceptLiveMediaInvite=(id,messageId)=>decide(id,messageId,true);
  window.rejectLiveMediaInvite=(id,messageId)=>decide(id,messageId,false);
  window.openLiveMediaSession=openSession;
  window.DooriLiveMediaTest={I18N,SESSION_MS,renderInvite};
})();
