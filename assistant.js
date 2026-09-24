(function(root){
 'use strict';
 const CHAT_ID='doori-assistant';
 const TEXT={
  de:{name:'Doori Assistent',status:'KI-Assistent · erkennt deine Sprache',mic:'Mit Doori sprechen',starting:'Mikrofon wird geöffnet …',stop:'Aufnahme stoppen',voiceOn:'Sprachausgabe ist an',voiceOff:'Sprachausgabe ist aus',female:'Weibliche Stimme',male:'Männliche Stimme',textLimit:'Dein tägliches Limit für KI-Textnachrichten ist erreicht.',voiceLimit:'Dein tägliches Limit für KI-Sprachzeit ist erreicht.',listening:'Ich höre zu … Tippe auf Stopp zum Senden.',thinking:'Doori denkt nach …',welcome:'Hallo! Ich bin dein Doori Assistent. Du kannst mir schreiben oder das Mikrofon benutzen.',unavailable:'Im Moment ist kein kostenloser KI-Dienst verfügbar und die lokale KI ist auf diesem Gerät nicht schnell genug. Bitte versuche es später noch einmal.',speechUnavailable:'Spracheingabe ist auf diesem Gerät gerade nicht verfügbar.',speechFailed:'Die Sprache konnte nicht erkannt werden. Bitte versuche es erneut.',localReady:'Lokale KI ist bereit.'},
  en:{name:'Doori Assistant',status:'AI assistant · detects your language',mic:'Talk to Doori',starting:'Opening microphone …',stop:'Stop recording',voiceOn:'Voice output is on',voiceOff:'Voice output is off',female:'Female voice',male:'Male voice',textLimit:'Your daily AI text-message limit has been reached.',voiceLimit:'Your daily AI voice-time limit has been reached.',listening:'I am listening … Tap stop to send.',thinking:'Doori is thinking …',welcome:'Hello! I am your Doori Assistant. You can write to me or use the microphone.',unavailable:'No free AI service is available right now, and local AI is not fast enough on this device. Please try again later.',speechUnavailable:'Speech input is currently unavailable on this device.',speechFailed:'Your speech could not be recognized. Please try again.',localReady:'Local AI is ready.'},
  ar:{name:'مساعد Doori',status:'مساعد ذكي · يكتشف لغتك تلقائياً',mic:'تحدث مع Doori',starting:'جارٍ فتح الميكروفون …',stop:'إيقاف التسجيل',voiceOn:'الإخراج الصوتي مفعّل',voiceOff:'الإخراج الصوتي متوقف',female:'صوت أنثوي',male:'صوت ذكوري',textLimit:'لقد وصلت إلى الحد اليومي للرسائل النصية بالذكاء الاصطناعي.',voiceLimit:'لقد وصلت إلى الحد اليومي لوقت التحدث مع الذكاء الاصطناعي.',listening:'أنا أستمع … اضغط على إيقاف للإرسال.',thinking:'Doori يفكر …',welcome:'مرحباً! أنا مساعد Doori. يمكنك الكتابة إليّ أو استخدام الميكروفون.',unavailable:'لا تتوفر حالياً خدمة ذكاء اصطناعي مجانية، والذكاء المحلي ليس سريعاً بما يكفي على هذا الجهاز. يرجى المحاولة لاحقاً.',speechUnavailable:'الإدخال الصوتي غير متاح حالياً على هذا الجهاز.',speechFailed:'تعذر التعرف على كلامك. يرجى المحاولة مرة أخرى.',localReady:'الذكاء المحلي جاهز.'},
  fa:{name:'دستیار Doori',status:'دستیار هوشمند · زبان شما را تشخیص می‌دهد',mic:'با Doori صحبت کنید',starting:'در حال باز کردن میکروفون …',stop:'توقف ضبط',voiceOn:'پخش صوتی روشن است',voiceOff:'پخش صوتی خاموش است',female:'صدای زنانه',male:'صدای مردانه',textLimit:'سقف روزانه پیام متنی هوش مصنوعی شما تمام شده است.',voiceLimit:'سقف روزانه گفت‌وگوی صوتی شما تمام شده است.',listening:'گوش می‌دهم … برای ارسال روی توقف بزنید.',thinking:'Doori در حال فکر کردن است …',welcome:'سلام! من دستیار Doori هستم. می‌توانید بنویسید یا از میکروفون استفاده کنید.',unavailable:'در حال حاضر سرویس هوش مصنوعی رایگانی در دسترس نیست و هوش محلی در این دستگاه به اندازه کافی سریع نیست. لطفاً بعداً دوباره تلاش کنید.',speechUnavailable:'ورودی صوتی در حال حاضر روی این دستگاه در دسترس نیست.',speechFailed:'گفتار شما شناسایی نشد. لطفاً دوباره تلاش کنید.',localReady:'هوش محلی آماده است.'},
  tr:{name:'Doori Asistan',status:'Yapay zekâ asistanı · dilini algılar',mic:'Doori ile konuş',starting:'Mikrofon açılıyor …',stop:'Kaydı durdur',voiceOn:'Sesli yanıt açık',voiceOff:'Sesli yanıt kapalı',female:'Kadın sesi',male:'Erkek sesi',textLimit:'Günlük yapay zekâ metin mesajı sınırına ulaştın.',voiceLimit:'Günlük yapay zekâ ses süresi sınırına ulaştın.',listening:'Seni dinliyorum … Göndermek için durdura dokun.',thinking:'Doori düşünüyor …',welcome:'Merhaba! Ben Doori Asistan. Bana yazabilir veya mikrofonu kullanabilirsin.',unavailable:'Şu anda ücretsiz bir yapay zekâ hizmeti kullanılamıyor ve yerel yapay zekâ bu cihazda yeterince hızlı değil. Lütfen daha sonra tekrar dene.',speechUnavailable:'Sesli giriş şu anda bu cihazda kullanılamıyor.',speechFailed:'Konuşman tanınamadı. Lütfen tekrar dene.',localReady:'Yerel yapay zekâ hazır.'}
 };
 const state={busy:false,starting:false,transcribing:false,initialized:false,voice:localStorage.getItem('doori_ai_voice')!=='off',recognition:null,recorder:null,recordStream:null,recordStarted:0,recordChunks:[],recordTimer:null,localSession:null,localChecked:false,localFast:false,lastLanguage:localStorage.getItem('doori_ai_last_language')||null};
 const lang=()=>['de','en','ar','fa','tr'].includes(root.currentLang)?root.currentLang:'en';
 const t=()=>TEXT[lang()]||TEXT.en;
 const historyKey=()=>`doori_ai_history_v1:${String(root.currentUser||'guest').toLowerCase()}`;
 function history(){try{const value=JSON.parse(localStorage.getItem(historyKey())||'[]');return Array.isArray(value)?value.slice(-40):[];}catch{return [];}}
 function save(list){localStorage.setItem(historyKey(),JSON.stringify(list.slice(-40)));}
 function message(role,content){return {id:`ai-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,sender_username:role==='assistant'?CHAT_ID:String(root.currentUser||''),text:String(content),timestamp:Date.now(),read:true};}
 function sync(){
  const list=history();
  if(!list.length){list.push(message('assistant',t().welcome));save(list);}
  root.messages?.set(CHAT_ID,list);
  root.renderMessages?.();
 }
 function add(role,content){const list=history();list.push(message(role,content));save(list);root.messages?.set(CHAT_ID,list);root.renderMessages?.();}
 function setStatus(value){const el=document.getElementById('current-chat-status');if(el&&isActive())el.textContent=value;}
 function isActive(){return root.currentChat?.type==='assistant';}
 function getAvatar(){return root.DooriTTS?.getGender?.()==='male'?'👨‍💻':'👩‍💻';}
 function updateAvatar(){const avatar=document.getElementById('current-chat-avatar');if(avatar&&isActive())avatar.textContent=getAvatar();root.renderChatList?.();}
 function updateControls(){
  const mic=document.getElementById('assistant-mic-btn'),voice=document.getElementById('assistant-voice-btn'),selector=document.getElementById('assistant-voice-select');
  const row=document.getElementById('assistant-controls-row');
  if(row)row.classList.toggle('hidden',!isActive());
  if(mic){const recording=state.recorder?.state==='recording';mic.classList.toggle('hidden',!isActive());mic.classList.toggle('starting',state.starting&&!recording);mic.textContent=recording?'⏹':state.starting?'…':'🎙️';mic.title=recording?t().stop:state.starting?t().starting:t().mic;mic.setAttribute('aria-label',mic.title);mic.setAttribute('aria-pressed',recording?'true':'false');}
  if(voice){voice.classList.toggle('hidden',!isActive());voice.textContent=state.voice?'🔊':'🔇';voice.title=state.voice?t().voiceOn:t().voiceOff;voice.setAttribute('aria-label',voice.title);}
  if(selector){selector.classList.toggle('hidden',!isActive());selector.value=root.DooriTTS?.getGender?.()||'female';selector.options[0].textContent=t().female;selector.options[1].textContent=t().male;selector.setAttribute('aria-label',`${t().female} / ${t().male}`);}
  root.DooriLive?.showControls(isActive());root.DooriLive?.updateBtn?.();
 }
 function stableLanguage(text){const fallback=state.lastLanguage||lang(),detected=root.DooriLanguage?.detect?.(text,fallback)||{language:fallback,confidence:0};if(detected.confidence>=.7&&detected.language!==state.lastLanguage){state.lastLanguage=detected.language;localStorage.setItem('doori_ai_last_language',state.lastLanguage);}return state.lastLanguage||fallback;}
 function chooseTranscript(result){const alternatives=Array.from(result||[]).map(item=>String(item?.transcript||'').trim()).filter(Boolean),fallback=state.lastLanguage||lang();return alternatives.sort((a,b)=>(root.DooriLanguage?.detect?.(b,fallback)?.confidence||0)-(root.DooriLanguage?.detect?.(a,fallback)?.confidence||0))[0]||'';}
 function languageCode(language=state.lastLanguage||lang()){return root.DooriLanguage?.locale?.(language)||{de:'de-DE',en:'en-US',ar:'ar-SA',fa:'fa-IR',tr:'tr-TR'}[language]||navigator.language||'en-US';}
 function speak(text,language){
  const expected=language||state.lastLanguage||lang();if(state.voice&&root.DooriLanguage?.sameLanguage?.(text,expected)!==false)root.DooriTTS?.speak(text,{language:expected});
 }
 async function benchmarkLocal(){
  if(state.localChecked)return state.localFast;
  state.localChecked=true;
  try{
   const api=root.LanguageModel||root.ai?.languageModel;if(!api)return false;
   const started=performance.now();
   state.localSession=api.create?await api.create({systemPrompt:'You are Doori, a concise friendly assistant.'}):await api.createSession?.();
   if(!state.localSession?.prompt)return false;
   await Promise.race([state.localSession.prompt('Reply only: OK'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('slow')),4000))]);
   state.localFast=performance.now()-started<4500;return state.localFast;
  }catch{state.localSession=null;state.localFast=false;return false;}
 }
 async function localReply(prompt){
  if(!await benchmarkLocal())return null;
  try{return String(await state.localSession.prompt(`Reply completely in ${state.lastLanguage||lang()}, warmly and concisely. Never switch language. User: ${prompt}`)).trim()||null;}catch{return null;}
 }
 async function send(text,meta={}){
  const clean=String(text||'').trim().slice(0,2000);if(!clean||state.busy)return false;root.DooriTTS?.stop();
  const suppliedLanguage=root.DooriLanguage?.supported?.includes(meta.language)?meta.language:null,expectedLanguage=suppliedLanguage||stableLanguage(clean);if(suppliedLanguage){state.lastLanguage=suppliedLanguage;localStorage.setItem('doori_ai_last_language',suppliedLanguage);}state.busy=true;document.body.classList.add('assistant-thinking');add('user',clean);setStatus(t().thinking);updateControls();
  try{
   const compact=history().slice(-10).map(item=>({role:item.sender_username===CHAT_ID?'assistant':'user',content:String(item.text||'').slice(0,2000)})).filter(item=>item.content.trim());
   const result=await root.accountFunctions.httpsCallable('askDooriAssistant')({messages:compact,language:expectedLanguage,source:meta.source==='voice'?'voice':'text',voiceSeconds:meta.voiceSeconds||0});
   let answer=String(result?.data?.text||'').trim();
   if(!answer&&result?.data?.localFallback)answer=await localReply(clean);
   if(!answer)answer=t().unavailable;
   const answerLanguage=result?.data?.language||expectedLanguage;add('assistant',answer);if(meta.source==='voice')speak(answer,answerLanguage);return true;
  }catch(error){if(error?.code==='functions/resource-exhausted'&&error?.details?.limitType){add('assistant',error.details.limitType==='voice'?t().voiceLimit:t().textLimit);return false;}const answer=await localReply(clean)||t().unavailable;add('assistant',answer);if(meta.source==='voice')speak(answer,expectedLanguage);return true;}
  finally{state.busy=false;document.body.classList.remove('assistant-thinking');setStatus(t().status);updateControls();}
 }
 function preferredAudioType(){return ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(type=>root.MediaRecorder?.isTypeSupported?.(type))||'';}
 function blobToBase64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');reader.readAsDataURL(blob);});}
 async function finishRecording(){
  const recorder=state.recorder;if(!recorder||recorder.state==='inactive')return;recorder.stop();
 }
 async function startRecording(){
  if(state.recorder?.state==='recording'){await finishRecording();return true;}
  if(!navigator.mediaDevices?.getUserMedia||!root.MediaRecorder)return false;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false}),mimeType=preferredAudioType();
   const recorder=mimeType?new MediaRecorder(stream,{mimeType}):new MediaRecorder(stream);state.recordStream=stream;state.recorder=recorder;state.recordChunks=[];state.recordStarted=Date.now();
   recorder.ondataavailable=event=>{if(event.data?.size)state.recordChunks.push(event.data);};
   recorder.onerror=()=>{stream.getTracks().forEach(track=>track.stop());state.recorder=null;setStatus(t().speechFailed);};
   recorder.onstop=async()=>{clearTimeout(state.recordTimer);state.recordTimer=null;const seconds=Math.max(1,Math.min(30,(Date.now()-state.recordStarted)/1000)),type=recorder.mimeType||state.recordChunks[0]?.type||'audio/mp4',blob=new Blob(state.recordChunks,{type});stream.getTracks().forEach(track=>track.stop());state.recorder=null;state.recordStream=null;state.recordChunks=[];document.body.classList.remove('assistant-recording');document.getElementById('assistant-mic-btn')?.classList.remove('recording');updateControls();if(blob.size<128){setStatus(t().speechFailed);return;}state.transcribing=true;setStatus(t().thinking);try{const audioBase64=await blobToBase64(blob),result=await root.accountFunctions.httpsCallable('transcribeDooriSpeech')({audioBase64,mimeType:type,voiceSeconds:seconds,languageHint:state.lastLanguage||lang()});const transcript=String(result?.data?.text||'').trim(),language=result?.data?.language;if(!transcript)throw new Error('EMPTY_TRANSCRIPT');await send(transcript,{source:'voice',voiceSeconds:seconds,language});}catch{add('assistant',t().speechFailed);setStatus(t().status);}finally{state.transcribing=false;}};
   if((recorder.mimeType||mimeType).includes('mp4'))recorder.start();else recorder.start(250);document.body.classList.add('assistant-recording');document.getElementById('assistant-mic-btn')?.classList.add('recording');updateControls();setStatus(t().listening);state.recordTimer=setTimeout(()=>{if(state.recorder===recorder&&recorder.state==='recording')recorder.stop();},30000);return true;
  }catch{state.recordStream?.getTracks().forEach(track=>track.stop());state.recorder=null;state.recordStream=null;document.body.classList.remove('assistant-recording');updateControls();add('assistant',t().speechUnavailable);setStatus(t().status);return true;}
 }
 function browserRecognition(){
  const Recognition=root.SpeechRecognition||root.webkitSpeechRecognition;
  if(!Recognition){add('assistant',t().speechUnavailable);return;}
  state.recognition?.abort?.();const recognition=new Recognition();state.recognition=recognition;
  recognition.lang=languageCode();recognition.interimResults=false;recognition.maxAlternatives=3;
  let startedAt=Date.now();recognition.onstart=()=>{startedAt=Date.now();setStatus(t().listening);};
  recognition.onerror=()=>setStatus(t().status);
  recognition.onend=()=>{if(!state.busy)setStatus(t().status);};
  recognition.onresult=event=>send(chooseTranscript(event.results?.[0]),{source:'voice',voiceSeconds:Math.max(1,(Date.now()-startedAt)/1000)});recognition.start();
 }
 async function startListening(){if(state.starting||state.transcribing||state.busy)return;state.starting=true;updateControls();setStatus(t().starting);root.DooriTTS?.stop();state.voice=true;localStorage.setItem('doori_ai_voice','on');root.DooriTTS?.unlock?.();try{if(!await startRecording())browserRecognition();}finally{state.starting=false;updateControls();}}
 function toggleVoice(){if(root.DooriTTS?.hasPending?.()){root.DooriTTS.replay().then(played=>{if(played)setStatus(t().status);});return;}state.voice=!state.voice;localStorage.setItem('doori_ai_voice',state.voice?'on':'off');if(!state.voice)root.DooriTTS?.stop();else root.DooriTTS?.unlock?.();updateControls();}
 root.addEventListener('doori-tts-blocked',()=>setStatus(({de:'Tippe auf den Lautsprecher, um die Antwort abzuspielen.',en:'Tap the speaker to play the reply.',ar:'اضغط على مكبر الصوت لتشغيل الرد.',fa:'برای پخش پاسخ روی بلندگو بزنید.',tr:'Yanıtı dinlemek için hoparlöre dokun.'})[lang()]));
 function activate(){sync();setStatus(t().status);updateControls();root.dispatchEvent(new Event('doori-assistant-activated'));}
 function initialize(){if(state.initialized)return;state.initialized=true;const micBtn=document.getElementById('assistant-mic-btn');micBtn?.addEventListener('click',startListening);document.getElementById('assistant-voice-btn')?.addEventListener('click',toggleVoice);document.getElementById('assistant-voice-select')?.addEventListener('change',event=>{root.DooriTTS?.setGender(event.target.value);updateAvatar();});root.addEventListener('doori-tts-voice-change',updateAvatar);root.DooriLive?.initialize?.();updateControls();}
 root.DooriAssistant={CHAT_ID,TEXT,isAssistant:id=>id===CHAT_ID,getName:()=>t().name,getStatus:()=>t().status,getAvatar,send,activate,initialize,updateControls,sync,chooseTranscript};
})(window);
