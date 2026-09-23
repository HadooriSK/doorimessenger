/* doori-live.js – Doori Live-Sprachmodus (Gemini Live API, gemini-3.8-live)
 * Architektur: Backend holt ephemeral token → Browser verbindet WebSocket mit Token
 * API-Key verlässt den Server niemals.
 */
(function (root) {
  'use strict';

  /* ── Übersetzungen (de / en / ar / fa / tr) ───────────────────────── */
  const TEXT = {
    de: {
      btnLabel:   'Live',
      btnTitle:   'Echtzeitgespräch mit Doori starten',
      btnStop:    'Live-Gespräch beenden',
      connecting: 'Verbindung wird aufgebaut …',
      listening:  'Ich höre zu – sprich jetzt!',
      speaking:   'Doori spricht …',
      ended:      'Live-Gespräch beendet.',
      quota:      'Live momentan nicht verfügbar – kostenloses Kontingent erreicht. Bitte später erneut versuchen.',
      error:      'Live-Verbindung fehlgeschlagen. Bitte versuche es erneut.',
      retrying:   'Verbindung wird wiederhergestellt …',
      unsupported:'Live-Modus ist in diesem Browser nicht verfügbar.',
    },
    en: {
      btnLabel:   'Live',
      btnTitle:   'Start live conversation with Doori',
      btnStop:    'End live conversation',
      connecting: 'Connecting …',
      listening:  'I am listening – speak now!',
      speaking:   'Doori is speaking …',
      ended:      'Live session ended.',
      quota:      'Live is temporarily unavailable – free quota reached. Please try again later.',
      error:      'Live connection failed. Please try again.',
      retrying:   'Reconnecting …',
      unsupported:'Live mode is not supported in this browser.',
    },
    ar: {
      btnLabel:   'مباشر',
      btnTitle:   'بدء محادثة مباشرة مع Doori',
      btnStop:    'إنهاء المحادثة المباشرة',
      connecting: 'جارٍ الاتصال …',
      listening:  'أنا أستمع – تحدث الآن!',
      speaking:   'Doori يتحدث …',
      ended:      'انتهت الجلسة المباشرة.',
      quota:      'الوضع المباشر غير متاح مؤقتاً – تم الوصول إلى الحصة المجانية. يرجى المحاولة لاحقاً.',
      error:      'فشل الاتصال المباشر. يرجى المحاولة مرة أخرى.',
      retrying:   'جارٍ إعادة الاتصال …',
      unsupported:'الوضع المباشر غير مدعوم في هذا المتصفح.',
    },
    fa: {
      btnLabel:   'زنده',
      btnTitle:   'شروع گفتگوی زنده با Doori',
      btnStop:    'پایان گفتگوی زنده',
      connecting: 'در حال اتصال …',
      listening:  'گوش می‌دهم – الان صحبت کنید!',
      speaking:   'Doori در حال صحبت است …',
      ended:      'جلسه زنده پایان یافت.',
      quota:      'حالت زنده موقتاً در دسترس نیست – سهمیه رایگان به پایان رسیده. لطفاً بعداً دوباره تلاش کنید.',
      error:      'اتصال زنده ناموفق بود. لطفاً دوباره تلاش کنید.',
      retrying:   'در حال اتصال مجدد …',
      unsupported:'حالت زنده در این مرورگر پشتیبانی نمی‌شود.',
    },
    tr: {
      btnLabel:   'Canlı',
      btnTitle:   'Doori ile canlı konuşma başlat',
      btnStop:    'Canlı konuşmayı bitir',
      connecting: 'Bağlanıyor …',
      listening:  'Dinliyorum – şimdi konuş!',
      speaking:   'Doori konuşuyor …',
      ended:      'Canlı oturum sona erdi.',
      quota:      'Canlı şu an kullanılamıyor – ücretsiz kota doldu. Lütfen daha sonra tekrar dene.',
      error:      'Canlı bağlantı başarısız. Lütfen tekrar dene.',
      retrying:   'Yeniden bağlanıyor …',
      unsupported:'Canlı mod bu tarayıcıda desteklenmiyor.',
    },
  };

  const LIVE_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';
  const AUDIO_IN_MIME  = 'audio/pcm;rate=16000';   // raw PCM expected by Live API
  const SAMPLE_RATE_IN  = 16000;
  const SAMPLE_RATE_OUT = 24000;
  const CHUNK_INTERVAL  = 100; // ms between audio sends
  const RECONNECT_INIT  = 1500;
  const RECONNECT_MAX   = 60000;

  /* ── State ────────────────────────────────────────────────────────── */
  const state = {
    active:      false,   // user wants Live to be running
    ws:          null,
    audioCtx:    null,
    sourceNode:  null,    // ScriptProcessorNode / AudioWorklet for input
    micStream:   null,
    playQueue:   [],      // ArrayBuffers of PCM from server
    playing:     false,   // server audio is being played
    quotaBlocked: false,
    retryTimer:  null,
    retryDelay:  RECONNECT_INIT,
    token:       null,
    tokenExpiry: 0,
  };

  /* ── Helpers ──────────────────────────────────────────────────────── */
  const lang = () => ['de', 'en', 'ar', 'fa', 'tr'].includes(root.currentLang) ? root.currentLang : 'en';
  const t    = () => TEXT[lang()] || TEXT.en;

  function btn()    { return document.getElementById('doori-live-btn'); }
  function status() { return document.getElementById('doori-live-status'); }

  function setStatus(msg) {
    const el = status();
    if (el) { el.textContent = msg; el.classList.toggle('hidden', !msg); }
  }

  function updateBtn() {
    const b = btn();
    if (!b) return;
    const isRTL = ['ar','fa'].includes(lang());
    b.dir = isRTL ? 'rtl' : 'ltr';

    if (state.quotaBlocked) {
      b.disabled = true;
      b.classList.add('live-btn--disabled');
      b.classList.remove('live-btn--active');
      b.textContent = t().btnLabel;
      b.title = t().quota;
      return;
    }
    b.disabled = false;
    b.classList.toggle('live-btn--active', state.active);
    b.classList.remove('live-btn--disabled');
    b.textContent = t().btnLabel;
    b.title = state.active ? t().btnStop : t().btnTitle;
    b.setAttribute('aria-pressed', state.active ? 'true' : 'false');
  }

  /* ── Audio Context ────────────────────────────────────────────────── */
  function getAudioCtx() {
    if (!state.audioCtx || state.audioCtx.state === 'closed') {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      state.audioCtx = new AC({ sampleRate: SAMPLE_RATE_OUT });
    }
    if (state.audioCtx.state === 'suspended') state.audioCtx.resume().catch(() => {});
    return state.audioCtx;
  }

  /* ── PCM helpers ──────────────────────────────────────────────────── */
  function float32ToPcm16(float32Array) {
    const pcm = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm;
  }

  function pcm16ToFloat32(int16Array) {
    const f = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) f[i] = int16Array[i] / 32768;
    return f;
  }

  function b64ToBuffer(b64) {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  function bufToB64(buffer) {
    const bytes = new Uint8Array(buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  /* ── Playback queue ───────────────────────────────────────────────── */
  function schedulePlay(buffer) {
    state.playQueue.push(buffer);
    drainPlayQueue();
  }

  let nextPlayTime = 0;
  function drainPlayQueue() {
    const ctx = getAudioCtx();
    if (!ctx || !state.playQueue.length) return;
    state.playing = true;
    if (ctx.currentTime > nextPlayTime) nextPlayTime = ctx.currentTime;
    while (state.playQueue.length) {
      const raw  = state.playQueue.shift();
      const i16  = new Int16Array(raw);
      const f32  = pcm16ToFloat32(i16);
      const audioBuffer = ctx.createBuffer(1, f32.length, SAMPLE_RATE_OUT);
      audioBuffer.copyToChannel(f32, 0);
      const src = ctx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(ctx.destination);
      src.start(nextPlayTime);
      nextPlayTime += audioBuffer.duration;
      src.onended = () => { if (!state.playQueue.length) state.playing = false; };
    }
  }

  function stopPlayback() {
    state.playQueue = [];
    state.playing = false;
    nextPlayTime = 0;
  }

  /* ── Mic capture ──────────────────────────────────────────────────── */
  async function startMic() {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      state.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: SAMPLE_RATE_IN },
        video: false,
      });
      const ctx = getAudioCtx();
      if (!ctx) return false;

      // Resample to 16 kHz for the API (some browsers may be at 48 kHz)
      const sourceNode = ctx.createMediaStreamSource(state.micStream);
      // ScriptProcessor is deprecated but universally supported; use AudioWorklet when available
      const bufSize = 4096;
      const processor = ctx.createScriptProcessor(bufSize, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
        const f32 = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < f32.length; i++) sum += f32[i] * f32[i];
        const rms = Math.sqrt(sum / f32.length);
        if (state.playing && rms > 0.04) {
          stopPlayback();
          setStatus(t().listening);
        }
        const pcm16 = float32ToPcm16(f32);
        const b64 = bufToB64(pcm16.buffer);
        const msg = {realtime_input:{media_chunks:[{mime_type:AUDIO_IN_MIME,data:b64}]}};
        try { state.ws.send(JSON.stringify(msg)); } catch (_) {}
      };
      sourceNode.connect(processor);
      processor.connect(ctx.destination);
      state.sourceNode = processor;
      return true;
    } catch (err) {
      console.warn('DooriLive: mic error', err);
      return false;
    }
  }

  function stopMic() {
    try { state.sourceNode?.disconnect(); } catch (_) {}
    state.sourceNode = null;
    state.micStream?.getTracks().forEach(t => t.stop());
    state.micStream = null;
  }

  /* ── Token fetch ──────────────────────────────────────────────────── */
  async function fetchToken() {
    if (state.token && Date.now() < state.tokenExpiry) return state.token;
    const result = await root.accountFunctions.httpsCallable('getLiveToken')({});
    const tok = result?.data?.token;
    if (!tok) throw new Error('No token');
    state.token  = tok;
    state.tokenExpiry = Number(result?.data?.expiresAt || 0) || (Date.now() + 1800000);
    return tok;
  }

  /* ── WebSocket lifecycle ──────────────────────────────────────────── */
  async function connect() {
    if (state.ws) { state.ws.close(); state.ws = null; }
    let token;
    try {
      token = await fetchToken();
    } catch (err) {
      const code = err?.code || '';
      if (code === 'functions/resource-exhausted') {
        state.quotaBlocked = true;
        setStatus(t().quota);
        updateBtn();
        scheduleQuotaRetry();
        return;
      }
      console.warn('DooriLive: token error', err);
      setStatus(t().error);
      scheduleReconnect();
      return;
    }

    setStatus(t().connecting);
    const ws = new WebSocket(`${LIVE_WS}?access_token=${encodeURIComponent(token)}`);
    state.ws = ws;

    ws.onopen = async () => {
      state.retryDelay = RECONNECT_INIT;
      const sysPrompt = 'You are Doori, the friendly in-app assistant of Doori Messenger. Be warm, concise, and conversational. Keep responses short — typically 1 to 3 sentences. Detect the language of the user and always reply in the same language. Support German, English, Arabic, Persian, and Turkish. Arabic and Persian use RTL text direction. Never mention model names, API providers, or internal infrastructure. If asked for dangerous or illegal instructions, refuse briefly and offer a safe alternative.';
      const setup = {
        setup: {
          model: 'models/gemini-3.8-live',
          generation_config: {
            response_modalities: ['AUDIO'],
            speech_config: { voice_config: { prebuilt_voice_config: { voice_name: 'Aoede' } } },
          },
          system_instruction: {
            parts: [{ text: sysPrompt }]
          }
        },
      };
      ws.send(JSON.stringify(setup));
      const micOk = await startMic();
      if (!micOk) {
        setStatus(t().error);
        stopSession(false);
        return;
      }
      setStatus(t().listening);
      updateBtn();
    };

    ws.onmessage = async (event) => {
      try {
        const text = typeof event.data === 'string' ? event.data : await event.data.text();
        const msg = JSON.parse(text);

        if (msg.serverContent?.interrupted) {
          stopPlayback();
          setStatus(t().listening);
          return;
        }

        const parts = msg.serverContent?.modelTurn?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/pcm') && part.inlineData.data) {
            setStatus(t().speaking);
            schedulePlay(b64ToBuffer(part.inlineData.data));
          }
        }

        if (msg.serverContent?.turnComplete) {
          setStatus(t().listening);
        }
      } catch (e) {
        console.warn('DooriLive: parse error', e);
      }
    };

    ws.onerror = (e) => {
      console.warn('DooriLive: ws error', e);
    };

    ws.onclose = (event) => {
      stopMic();
      stopPlayback();
      if (!state.active) return; // clean close by user
      // 429 inside WS close reason
      if (event.reason?.includes('429') || event.reason?.includes('RESOURCE_EXHAUSTED')) {
        state.quotaBlocked = true;
        setStatus(t().quota);
        updateBtn();
        scheduleQuotaRetry();
        return;
      }
      setStatus(t().retrying);
      scheduleReconnect();
    };
  }

  /* ── Reconnect / quota retry ─────────────────────────────────────── */
  function scheduleReconnect() {
    if (!state.active) return;
    clearTimeout(state.retryTimer);
    state.retryTimer = setTimeout(async () => {
      if (!state.active) return;
      await connect();
    }, state.retryDelay);
    state.retryDelay = Math.min(state.retryDelay * 2, RECONNECT_MAX);
  }

  function scheduleQuotaRetry() {
    // Retry every 60 s to see if quota cleared
    clearTimeout(state.retryTimer);
    state.retryTimer = setTimeout(async () => {
      if (!state.active) return;
      try {
        await fetchToken(); // if this succeeds, quota is back
        state.quotaBlocked = false;
        state.retryDelay  = RECONNECT_INIT;
        updateBtn();
        await connect();
      } catch (_) {
        scheduleQuotaRetry(); // still blocked
      }
    }, 60000);
  }

  /* ── Session control ─────────────────────────────────────────────── */
  async function startSession() {
    if (state.active) return;
    if (!root.WebSocket) { setStatus(t().unsupported); return; }
    // Unlock audio context on user gesture (required by browsers)
    getAudioCtx();
    state.active = true;
    state.quotaBlocked = false;
    state.retryDelay  = RECONNECT_INIT;
    updateBtn();
    // Stop normal TTS/assistant recording if running
    root.DooriTTS?.stop?.();
    await connect();
  }

  function stopSession(updateUi = true) {
    state.active = false;
    clearTimeout(state.retryTimer);
    state.retryTimer = null;
    if (state.ws) { try { state.ws.close(1000, 'user_closed'); } catch (_) {} state.ws = null; }
    stopMic();
    stopPlayback();
    if (updateUi) {
      setStatus(t().ended);
      setTimeout(() => setStatus(''), 2500);
      updateBtn();
    }
  }

  function toggle() {
    if (state.active) stopSession();
    else startSession();
  }

  /* ── Button injection & initialization ───────────────────────────── */
  function injectButton() {
    let liveBtn = document.getElementById('doori-live-btn');
    const micBtn = document.getElementById('assistant-mic-btn');
    if (!liveBtn && micBtn) {
      const statusEl = document.createElement('span');
      statusEl.id = 'doori-live-status';
      statusEl.className = 'doori-live-status hidden';
      statusEl.style.cssText = 'font-size:12px;color:var(--accent);margin-left:4px;vertical-align:middle;';

      liveBtn = document.createElement('button');
      liveBtn.type    = 'button';
      liveBtn.id      = 'doori-live-btn';
      liveBtn.className = 'icon-btn assistant-control live-btn hidden';
      liveBtn.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.04em;padding:0 8px;min-width:40px;border-radius:20px;background:linear-gradient(135deg,#00c6fb,#005bea);color:#fff;border:none;box-shadow:0 2px 8px rgba(0,98,234,0.35);transition:opacity .2s,filter .2s;';
      liveBtn.setAttribute('aria-pressed', 'false');

      micBtn.insertAdjacentElement('afterend', liveBtn);
      liveBtn.insertAdjacentElement('afterend', statusEl);
    }
    if (liveBtn && !liveBtn.dataset.bound) {
      liveBtn.dataset.bound = 'true';
      liveBtn.addEventListener('touchstart', () => getAudioCtx(), { passive: true });
      liveBtn.addEventListener('click', toggle);
    }
    updateBtn();
  }

  function showControls(visible) {
    const b = btn();
    if (b) b.classList.toggle('hidden', !visible);
    // status visibility is managed separately
  }

  function initialize() {
    injectButton();
    // Show/hide when assistant chat is active
    root.addEventListener('doori-assistant-activated', () => showControls(true));
    root.addEventListener('doori-assistant-deactivated', () => {
      showControls(false);
      if (state.active) stopSession(false);
    });
  }

  /* ── CSS injection ───────────────────────────────────────────────── */
  (function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .live-btn--active {
        background: linear-gradient(135deg, #ff416c, #ff4b2b) !important;
        box-shadow: 0 0 0 3px rgba(255,65,108,.35), 0 2px 8px rgba(255,75,43,.4) !important;
        animation: live-pulse 1.6s ease-in-out infinite;
      }
      .live-btn--disabled {
        opacity: 0.4 !important;
        filter: grayscale(80%) !important;
        cursor: not-allowed !important;
      }
      @keyframes live-pulse {
        0%,100% { box-shadow: 0 0 0 3px rgba(255,65,108,.35), 0 2px 8px rgba(255,75,43,.4); }
        50%      { box-shadow: 0 0 0 6px rgba(255,65,108,.15), 0 2px 12px rgba(255,75,43,.6); }
      }
    `;
    document.head.appendChild(style);
  })();

  /* ── Public API ──────────────────────────────────────────────────── */
  root.DooriLive = { initialize, showControls, toggle, stopSession, updateBtn };

})(window);
