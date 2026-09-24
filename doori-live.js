/* doori-live.js – Doori Live-Sprachmodus (Gemini Live API, gemini-3.8-live)
 * Architektur: Backend holt ephemeral token → Browser verbindet WebSocket mit Token
 * Unterstützt AudioWorklet (primär) + Analyser-ScriptProcessor (Fallback)
 * Hardware-Rate Downsampling auf 16 kHz PCM (In) / Native Upsampling (Out)
 * iOS Mute-Switch Override via DooriTTS.unlock()
 */
(function (root) {
  'use strict';

  /* ── Übersetzungen (de / en / ar / fa / tr) ───────────────────────── */
  const TEXT = {
    de: {
      btnLabel:    'Live',
      btnTitle:    'Echtzeitgespräch mit Doori starten',
      btnStop:     'Live-Gespräch beenden',
      connecting:  'Verbindung wird aufgebaut …',
      listening:   '🔴 Live: Ich höre zu …',
      hearing:     '🔴 Live: Höre zu (Sprache erkannt) …',
      speaking:    '🔴 Live: Doori spricht …',
      ended:       'Live-Gespräch beendet.',
      quota:       'Live momentan nicht verfügbar – kostenloses Kontingent erreicht. Bitte später erneut versuchen.',
      error:       'Live-Verbindung fehlgeschlagen. Bitte versuche es erneut.',
      retrying:    'Verbindung wird wiederhergestellt …',
      unsupported: 'Live-Modus ist in diesem Browser nicht verfügbar.',
    },
    en: {
      btnLabel:    'Live',
      btnTitle:    'Start live conversation with Doori',
      btnStop:     'End live conversation',
      connecting:  'Connecting …',
      listening:   '🔴 Live: Listening …',
      hearing:     '🔴 Live: Listening (speech detected) …',
      speaking:    '🔴 Live: Doori speaking …',
      ended:       'Live session ended.',
      quota:       'Live is temporarily unavailable – free quota reached. Please try again later.',
      error:       'Live connection failed. Please try again.',
      retrying:    'Reconnecting …',
      unsupported: 'Live mode is not supported in this browser.',
    },
    ar: {
      btnLabel:    'مباشر',
      btnTitle:    'بدء محادثة مباشرة مع Doori',
      btnStop:     'إنهاء المحادثة المباشرة',
      connecting:  'جارٍ الاتصال …',
      listening:   '🔴 مباشر: أستمع إليك …',
      hearing:     '🔴 مباشر: أستمع (تم رصد الصوت) …',
      speaking:    '🔴 مباشر: Doori يتحدث …',
      ended:       'انتهت الجلسة المباشرة.',
      quota:       'الوضع المباشر غير متاح مؤقتاً – تم الوصول إلى الحصة المجانية. يرجى المحاولة لاحقاً.',
      error:       'فشل الاتصال المباشر. يرجى المحاولة مرة أخرى.',
      retrying:    'جارٍ إعادة الاتصال …',
      unsupported: 'الوضع المباشر غير مدعوم في هذا المتصفح.',
    },
    fa: {
      btnLabel:    'زنده',
      btnTitle:    'شروع گفتگوی زنده با Doori',
      btnStop:     'پایان گفتگوی زنده',
      connecting:  'در حال اتصال …',
      listening:   '🔴 زنده: در حال گوش دادن …',
      hearing:     '🔴 زنده: در حال شنیدن (صدا دریافت شد) …',
      speaking:    '🔴 زنده: Doori در حال صحبت …',
      ended:       'جلسه زنده پایان یافت.',
      quota:       'حالت زنده موقتاً در دسترس نیست – سهمیه رایگان به پایان رسیده. لطفاً بعداً دوباره تلاش کنید.',
      error:       'اتصال زنده ناموفق بود. لطفاً دوباره تلاش کنید.',
      retrying:    'در حال اتصال مجدد …',
      unsupported: 'حالت زنده در این مرورگر پشتیبانی نمی‌شود.',
    },
    tr: {
      btnLabel:    'Canlı',
      btnTitle:    'Doori ile canlı konuşma başlat',
      btnStop:     'Canlı konuşmayı bitir',
      connecting:  'Bağlanıyor …',
      listening:   '🔴 Canlı: Dinliyorum …',
      hearing:     '🔴 Canlı: Dinliyorum (ses algılandı) …',
      speaking:    '🔴 Canlı: Doori konuşuyor …',
      ended:       'Canlı oturum sona erdi.',
      quota:       'Canlı şu an kullanılamıyor – ücretsiz kota doldu. Lütfen daha sonra tekrar dene.',
      error:       'Canlı bağlantı başarısız. Lütfen tekrar dene.',
      retrying:    'Yeniden bağlanıyor …',
      unsupported: 'Canlı mod bu tarayıcıda desteklenmiyor.',
    },
  };

  const LIVE_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';
  const RECONNECT_INIT = 1500;
  const RECONNECT_MAX  = 60000;

  const WORKLET_CODE = `
    class LiveMicProcessor extends AudioWorkletProcessor {
      process(inputs) {
        const input = inputs[0];
        if (input && input[0] && input[0].length) {
          this.port.postMessage(input[0]);
        }
        return true;
      }
    }
    registerProcessor('live-mic-processor', LiveMicProcessor);
  `;

  /* ── State ────────────────────────────────────────────────────────── */
  const state = {
    active:        false,
    ready:         false,
    ws:            null,
    audioCtx:      null,
    sourceNode:    null,
    workletNode:   null,
    processorNode: null,
    analyserNode:  null,
    micStream:     null,
    playing:       false,
    nextPlayTime:  0,
    quotaBlocked:  false,
    retryTimer:    null,
    retryDelay:    RECONNECT_INIT,
    token:         null,
    tokenExpiry:   0,
    lastRmsTime:   0,
    captureBuffer: new Float32Array(0),
  };

  const lang = () => ['de', 'en', 'ar', 'fa', 'tr'].includes(root.currentLang) ? root.currentLang : 'en';
  const t    = () => TEXT[lang()] || TEXT.en;

  function btn()    { return document.getElementById('doori-live-btn'); }
  function status() { return document.getElementById('doori-live-status'); }

  function setStatus(msg) {
    const el = status();
    if (el) {
      el.textContent = msg;
      el.classList.toggle('hidden', !msg);
    }
    const chatStatus = document.getElementById('current-chat-status');
    if (chatStatus && (root.currentChat?.type === 'assistant' || document.getElementById('assistant-mic-btn')?.offsetParent !== null)) {
      chatStatus.textContent = msg || root.DooriAssistant?.getStatus?.() || '';
    }
  }

  function updateBtn() {
    const b = btn();
    if (!b) return;
    const isRTL = ['ar', 'fa'].includes(lang());
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

  /* ── Web Audio Context ────────────────────────────────────────────── */
  function getAudioCtx() {
    if (!state.audioCtx || state.audioCtx.state === 'closed') {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      state.audioCtx = new AC();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume().catch(() => {});
    }
    return state.audioCtx;
  }

  async function unlockAudio() {
    // 1. Unlock Web Audio Context
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    // 2. Play silent buffer to unlock iOS hardware
    try {
      if (ctx) {
        const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
    } catch (_) {}
    // 3. Call DooriTTS unlock to switch iOS audio session to playback
    try {
      await root.DooriTTS?.unlock?.();
    } catch (_) {}
  }

  /* ── Downsampler: inRate → 16 kHz ─────────────────────────────────── */
  function downsampleTo16k(samples, inRate) {
    if (!samples || !samples.length) return new Float32Array(0);
    if (inRate === 16000) return samples;
    const ratio = inRate / 16000;
    const newLen = Math.round(samples.length / ratio);
    const result = new Float32Array(newLen);
    let offsetResult = 0;
    let offsetInput = 0;
    while (offsetResult < result.length) {
      const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
      let sum = 0, count = 0;
      for (let i = offsetInput; i < nextOffsetInput && i < samples.length; i++) {
        sum += samples[i];
        count++;
      }
      result[offsetResult] = count > 0 ? sum / count : (samples[offsetInput] || 0);
      offsetResult++;
      offsetInput = nextOffsetInput;
    }
    return result;
  }

  /* ── Upsampler: 24 kHz → Native Context Rate ──────────────────────── */
  function upsample24kToNative(f32_24k, targetRate) {
    if (!f32_24k || !f32_24k.length) return new Float32Array(0);
    if (targetRate === 24000) return f32_24k;
    const ratio = 24000 / targetRate;
    const targetLen = Math.round(f32_24k.length / ratio);
    const out = new Float32Array(targetLen);
    for (let i = 0; i < targetLen; i++) {
      const srcIdx = i * ratio;
      const i0 = Math.floor(srcIdx);
      const i1 = Math.min(i0 + 1, f32_24k.length - 1);
      const frac = srcIdx - i0;
      out[i] = f32_24k[i0] * (1 - frac) + f32_24k[i1] * frac;
    }
    return out;
  }

  /* ── Convert 16 kHz Float32 to Base64 PCM16 Little-Endian ─────────── */
  function float32ToB64Pcm16(f32) {
    const pcm = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(pcm.buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  /* ── Stream Audio Chunk to Gemini ─────────────────────────────────── */
  function processAndSendAudio(inputF32, inRate) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN || !state.ready) return;

    // Downsample to 16 kHz
    const samples16k = downsampleTo16k(inputF32, inRate);
    if (!samples16k.length) return;

    // RMS volume calculation
    let sum = 0;
    for (let i = 0; i < samples16k.length; i++) sum += samples16k[i] * samples16k[i];
    const rms = Math.sqrt(sum / samples16k.length);

    // Visual volume feedback & barge-in
    if (state.playing && rms > 0.035) {
      stopPlayback();
      setStatus(t().listening);
    } else if (!state.playing && rms > 0.025) {
      const now = Date.now();
      if (now - state.lastRmsTime > 800) {
        state.lastRmsTime = now;
        setStatus(t().hearing);
      }
    }

    // AudioWorklet callbacks can be only ~2.7 ms long on 48 kHz hardware.
    // Gemini Live expects practical streaming chunks, so aggregate to 100 ms.
    const combined = new Float32Array(state.captureBuffer.length + samples16k.length);
    combined.set(state.captureBuffer);
    combined.set(samples16k, state.captureBuffer.length);
    state.captureBuffer = combined;
    if (state.captureBuffer.length < 1600) return;
    const packet = state.captureBuffer.slice(0, 1600);
    state.captureBuffer = state.captureBuffer.slice(1600);

    const b64 = float32ToB64Pcm16(packet);
    const msg = {
      realtimeInput: {
        audio: {
          mimeType: 'audio/pcm;rate=16000',
          data: b64,
        },
      },
    };
    try { state.ws.send(JSON.stringify(msg)); } catch (_) {}
  }

  /* ── Play 24 kHz PCM Little-Endian Audio from Gemini ──────────────── */
  function playPcm24k(bytes) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const numSamples = Math.floor(bytes.byteLength / 2);
    if (!numSamples) return;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const f32_24k = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      f32_24k[i] = view.getInt16(i * 2, true) / 32768.0;
    }

    // Upsample to native context sampleRate so WebKit never glitches
    const nativeF32 = upsample24kToNative(f32_24k, ctx.sampleRate);
    const audioBuf = ctx.createBuffer(1, nativeF32.length, ctx.sampleRate);
    audioBuf.getChannelData(0).set(nativeF32);

    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now + 0.015, state.nextPlayTime);
    src.start(startTime);
    state.nextPlayTime = startTime + audioBuf.duration;
    state.playing = true;
    setStatus(t().speaking);

    src.onended = () => {
      if (ctx.currentTime >= state.nextPlayTime - 0.05) {
        state.playing = false;
        if (state.active) setStatus(t().listening);
      }
    };
  }

  function stopPlayback() {
    state.playing = false;
    const ctx = getAudioCtx();
    if (ctx) state.nextPlayTime = ctx.currentTime;
  }

  /* ── Microphone Capture (AudioWorklet + Analyser Fallback) ─────────── */
  async function startMic() {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      state.micStream = stream;

      const ctx = getAudioCtx();
      if (!ctx) return false;
      if (ctx.state === 'suspended') await ctx.resume();

      const sourceNode = ctx.createMediaStreamSource(stream);
      state.sourceNode = sourceNode;

      // Try AudioWorklet first (Modern standard, immune to GC and mute optimizations)
      let workletReady = false;
      if (ctx.audioWorklet?.addModule) {
        try {
          const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          await ctx.audioWorklet.addModule(workletUrl);
          URL.revokeObjectURL(workletUrl);

          const worklet = new AudioWorkletNode(ctx, 'live-mic-processor');
          worklet.port.onmessage = (e) => {
            processAndSendAudio(e.data, ctx.sampleRate);
          };
          sourceNode.connect(worklet);
          // Connect to analyser to keep WebKit rendering pipeline alive without speaker feedback
          const analyser = ctx.createAnalyser();
          worklet.connect(analyser);
          state.workletNode  = worklet;
          state.analyserNode = analyser;
          workletReady = true;
        } catch (err) {
          console.warn('[DooriLive] AudioWorklet init failed, using ScriptProcessor fallback', err);
        }
      }

      // ScriptProcessor Fallback with Analyser sink (prevents WebKit zero-gain optimization)
      if (!workletReady) {
        const bufSize = 2048;
        const processor = ctx.createScriptProcessor(bufSize, 1, 1);
        root._dooriLiveProcessor = processor; // Prevent GC
        state.processorNode = processor;

        processor.onaudioprocess = (e) => {
          const inputF32 = e.inputBuffer.getChannelData(0);
          const inRate   = e.inputBuffer.sampleRate || ctx.sampleRate || 48000;
          processAndSendAudio(inputF32, inRate);
        };

        const analyser = ctx.createAnalyser();
        sourceNode.connect(processor);
        processor.connect(analyser); // Analyser keeps processor alive without output to speakers!
        state.analyserNode = analyser;
      }

      return true;
    } catch (err) {
      console.warn('[DooriLive] mic error', err);
      return false;
    }
  }

  function stopMic() {
    try {
      state.sourceNode?.disconnect();
      state.workletNode?.disconnect();
      state.processorNode?.disconnect();
      state.analyserNode?.disconnect();
    } catch (_) {}
    state.sourceNode    = null;
    state.workletNode   = null;
    state.processorNode = null;
    state.analyserNode  = null;
    delete root._dooriLiveProcessor;
    state.micStream?.getTracks().forEach(t => t.stop());
    state.micStream = null;
    state.captureBuffer = new Float32Array(0);
  }

  /* ── Ephemeral Token ──────────────────────────────────────────────── */
  async function fetchToken() {
    if (state.token && Date.now() < state.tokenExpiry) return state.token;
    const result = await root.accountFunctions.httpsCallable('getLiveToken')({});
    const tok = result?.data?.token;
    if (!tok) throw new Error('No token');
    state.token = tok;
    state.tokenExpiry = Number(result?.data?.expiresAt || 0) || (Date.now() + 1800000);
    return tok;
  }

  /* ── WebSocket Connection ─────────────────────────────────────────── */
  async function connect() {
    if (state.ws) {
      try { state.ws.close(); } catch (_) {}
      state.ws = null;
    }
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
      console.warn('[DooriLive] token error', err);
      setStatus(t().error);
      scheduleReconnect();
      return;
    }

    setStatus(t().connecting);
    const ws = new WebSocket(`${LIVE_WS}?access_token=${encodeURIComponent(token)}`);
    state.ws = ws;

    ws.onopen = async () => {
      state.retryDelay = RECONNECT_INIT;
      state.ready      = false;
      const sysPrompt = 'You are Doori, the friendly in-app assistant of Doori Messenger. Be warm, concise, and conversational. Keep responses short — typically 1 to 3 sentences. Detect the language of the user and always reply in the same language. Support German, English, Arabic, Persian, and Turkish. Arabic and Persian use RTL text direction. Never mention model names, API providers, or internal infrastructure. If asked for dangerous or illegal instructions, refuse briefly and offer a safe alternative.';
      const setup = {
        setup: {
          model: 'models/gemini-3.8-live',
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' },
            },
          },
          systemInstruction: {
            parts: [{ text: sysPrompt }],
          },
        },
      };
      ws.send(JSON.stringify(setup));
      updateBtn();
    };

    ws.onmessage = async (event) => {
      try {
        const text = typeof event.data === 'string' ? event.data : await event.data.text();
        const msg = JSON.parse(text);

        // Handshake confirmed by Gemini
        if (msg.setupComplete) {
          state.ready = true;
          setStatus(t().listening);
          return;
        }

        // Server-side barge-in
        if (msg.serverContent?.interrupted) {
          stopPlayback();
          setStatus(t().listening);
          return;
        }

        // Handle model turn parts
        const parts = msg.serverContent?.modelTurn?.parts || msg.server_content?.model_turn?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const rawB64 = part.inlineData.data;
            const bin = atob(rawB64);
            const u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            playPcm24k(u8);
          }
        }

        if (msg.serverContent?.turnComplete) {
          if (!state.playing) setStatus(t().listening);
        }
      } catch (e) {
        console.warn('[DooriLive] parse error', e);
      }
    };

    ws.onerror = (e) => {
      console.warn('[DooriLive] ws error', e);
    };

    ws.onclose = (event) => {
      stopMic();
      stopPlayback();
      if (!state.active) return;
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
    clearTimeout(state.retryTimer);
    state.retryTimer = setTimeout(async () => {
      if (!state.active) return;
      try {
        await fetchToken();
        state.quotaBlocked = false;
        state.retryDelay   = RECONNECT_INIT;
        updateBtn();
        await connect();
      } catch (_) {
        scheduleQuotaRetry();
      }
    }, 60000);
  }

  /* ── Session Start / Stop ─────────────────────────────────────────── */
  async function startSession() {
    if (state.active) return;
    if (!root.WebSocket) {
      setStatus(t().unsupported);
      return;
    }
    await unlockAudio();
    state.active       = true;
    state.quotaBlocked = false;
    state.ready        = false;
    state.retryDelay   = RECONNECT_INIT;
    updateBtn();
    root.DooriTTS?.stop?.();

    setStatus(t().connecting);
    const micOk = await startMic();
    if (!micOk) {
      setStatus(t().error);
      stopSession(false);
      return;
    }
    await connect();
  }

  function stopSession(updateUi = true) {
    state.active = false;
    state.ready  = false;
    clearTimeout(state.retryTimer);
    state.retryTimer = null;
    if (state.ws) {
      try { state.ws.close(1000, 'user_closed'); } catch (_) {}
      state.ws = null;
    }
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

  /* ── Button Injection & Wiring ────────────────────────────────────── */
  function injectButton() {
    let liveBtn = document.getElementById('doori-live-btn');
    const micBtn = document.getElementById('assistant-mic-btn');
    if (!liveBtn && micBtn) {
      const statusEl = document.createElement('span');
      statusEl.id = 'doori-live-status';
      statusEl.className = 'doori-live-status hidden';
      statusEl.style.cssText = 'font-size:12px;color:var(--accent);margin-left:4px;vertical-align:middle;';

      liveBtn = document.createElement('button');
      liveBtn.type = 'button';
      liveBtn.id = 'doori-live-btn';
      liveBtn.className = 'icon-btn assistant-control live-btn hidden';
      liveBtn.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.04em;padding:0 8px;min-width:40px;border-radius:20px;background:linear-gradient(135deg,#00c6fb,#005bea);color:#fff;border:none;box-shadow:0 2px 8px rgba(0,98,234,0.35);transition:opacity .2s,filter .2s;';
      liveBtn.setAttribute('aria-pressed', 'false');

      micBtn.insertAdjacentElement('afterend', liveBtn);
      liveBtn.insertAdjacentElement('afterend', statusEl);
    }
    if (liveBtn && !liveBtn.dataset.bound) {
      liveBtn.dataset.bound = 'true';
      liveBtn.addEventListener('touchstart', unlockAudio, { passive: true });
      liveBtn.addEventListener('click', toggle);
    }
    updateBtn();
  }

  function showControls(visible) {
    const b = btn();
    if (b) b.classList.toggle('hidden', !visible);
  }

  function initialize() {
    injectButton();
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
  root.DooriLive = { initialize, showControls, toggle, stopSession, updateBtn, unlockAudio };

})(window);
