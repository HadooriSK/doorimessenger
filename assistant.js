(function(root){
 'use strict';
 const CHAT_ID='doori-assistant';
 const TEXT={
  de:{name:'Doori Assistent',status:'KI-Assistent · erkennt deine Sprache',mic:'Mit Doori sprechen',voiceOn:'Sprachausgabe ist an',voiceOff:'Sprachausgabe ist aus',female:'Weibliche Stimme',male:'Männliche Stimme',listening:'Ich höre zu …',thinking:'Doori denkt nach …',welcome:'Hallo! Ich bin dein Doori Assistent. Du kannst mir schreiben oder das Mikrofon benutzen.',unavailable:'Im Moment ist kein kostenloser KI-Dienst verfügbar und die lokale KI ist auf diesem Gerät nicht schnell genug. Bitte versuche es später noch einmal.',speechUnavailable:'Spracheingabe wird von diesem Browser leider nicht unterstützt.',localReady:'Lokale KI ist bereit.'},
  en:{name:'Doori Assistant',status:'AI assistant · detects your language',mic:'Talk to Doori',voiceOn:'Voice output is on',voiceOff:'Voice output is off',female:'Female voice',male:'Male voice',listening:'I am listening …',thinking:'Doori is thinking …',welcome:'Hello! I am your Doori Assistant. You can write to me or use the microphone.',unavailable:'No free AI service is available right now, and local AI is not fast enough on this device. Please try again later.',speechUnavailable:'Speech input is not supported by this browser.',localReady:'Local AI is ready.'},
  ar:{name:'مساعد Doori',status:'مساعد ذكي · يكتشف لغتك تلقائياً',mic:'تحدث مع Doori',voiceOn:'الإخراج الصوتي مفعّل',voiceOff:'الإخراج الصوتي متوقف',female:'صوت أنثوي',male:'صوت ذكوري',listening:'أنا أستمع …',thinking:'Doori يفكر …',welcome:'مرحباً! أنا مساعد Doori. يمكنك الكتابة إليّ أو استخدام الميكروفون.',unavailable:'لا تتوفر حالياً خدمة ذكاء اصطناعي مجانية، والذكاء المحلي ليس سريعاً بما يكفي على هذا الجهاز. يرجى المحاولة لاحقاً.',speechUnavailable:'هذا المتصفح لا يدعم الإدخال الصوتي.',localReady:'الذكاء المحلي جاهز.'},
  fa:{name:'دستیار Doori',status:'دستیار هوشمند · زبان شما را تشخیص می‌دهد',mic:'با Doori صحبت کنید',voiceOn:'پخش صوتی روشن است',voiceOff:'پخش صوتی خاموش است',female:'صدای زنانه',male:'صدای مردانه',listening:'گوش می‌دهم …',thinking:'Doori در حال فکر کردن است …',welcome:'سلام! من دستیار Doori هستم. می‌توانید بنویسید یا از میکروفون استفاده کنید.',unavailable:'در حال حاضر سرویس هوش مصنوعی رایگانی در دسترس نیست و هوش محلی در این دستگاه به اندازه کافی سریع نیست. لطفاً بعداً دوباره تلاش کنید.',speechUnavailable:'این مرورگر از ورودی صوتی پشتیبانی نمی‌کند.',localReady:'هوش محلی آماده است.'},
  tr:{name:'Doori Asistan',status:'Yapay zekâ asistanı · dilini algılar',mic:'Doori ile konuş',voiceOn:'Sesli yanıt açık',voiceOff:'Sesli yanıt kapalı',female:'Kadın sesi',male:'Erkek sesi',listening:'Seni dinliyorum …',thinking:'Doori düşünüyor …',welcome:'Merhaba! Ben Doori Asistan. Bana yazabilir veya mikrofonu kullanabilirsin.',unavailable:'Şu anda ücretsiz bir yapay zekâ hizmeti kullanılamıyor ve yerel yapay zekâ bu cihazda yeterince hızlı değil. Lütfen daha sonra tekrar dene.',speechUnavailable:'Bu tarayıcı sesli girişi desteklemiyor.',localReady:'Yerel yapay zekâ hazır.'}
 };
 const state={busy:false,voice:localStorage.getItem('doori_ai_voice')!=='off',recognition:null,localSession:null,localChecked:false,localFast:false};
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
  if(mic){mic.classList.toggle('hidden',!isActive());mic.title=t().mic;mic.setAttribute('aria-label',t().mic);}
  if(voice){voice.classList.toggle('hidden',!isActive());voice.textContent=state.voice?'🔊':'🔇';voice.title=state.voice?t().voiceOn:t().voiceOff;voice.setAttribute('aria-label',voice.title);}
  if(selector){selector.classList.toggle('hidden',!isActive());selector.value=root.DooriTTS?.getGender?.()||'female';selector.options[0].textContent=t().female;selector.options[1].textContent=t().male;selector.setAttribute('aria-label',`${t().female} / ${t().male}`);}
 }
 function languageCode(){return {de:'de-DE',en:'en-US',ar:'ar-SA',fa:'fa-IR',tr:'tr-TR'}[lang()]||navigator.language||'en-US';}
 function speak(text){
  if(state.voice)root.DooriTTS?.speak(text,{language:languageCode()});
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
  try{return String(await state.localSession.prompt(`Reply in the same language as the user, warmly and concisely. User: ${prompt}`)).trim()||null;}catch{return null;}
 }
 async function send(text){
  const clean=String(text||'').trim().slice(0,2000);if(!clean||state.busy)return false;
  state.busy=true;document.body.classList.add('assistant-thinking');add('user',clean);setStatus(t().thinking);updateControls();
  try{
   const compact=history().slice(-10).map(item=>({role:item.sender_username===CHAT_ID?'assistant':'user',content:item.text}));
   const result=await root.accountFunctions.httpsCallable('askDooriAssistant')({messages:compact,language:lang()});
   let answer=String(result?.data?.text||'').trim();
   if(!answer&&result?.data?.localFallback)answer=await localReply(clean);
   if(!answer)answer=t().unavailable;
   add('assistant',answer);speak(answer);return true;
  }catch{const answer=await localReply(clean)||t().unavailable;add('assistant',answer);speak(answer);return true;}
  finally{state.busy=false;document.body.classList.remove('assistant-thinking');setStatus(t().status);updateControls();}
 }
 function startListening(){
  const Recognition=root.SpeechRecognition||root.webkitSpeechRecognition;
  if(!Recognition){add('assistant',t().speechUnavailable);return;}
  state.recognition?.abort?.();const recognition=new Recognition();state.recognition=recognition;
  recognition.lang=languageCode();recognition.interimResults=false;recognition.maxAlternatives=1;
  recognition.onstart=()=>setStatus(t().listening);
  recognition.onerror=()=>setStatus(t().status);
  recognition.onend=()=>{if(!state.busy)setStatus(t().status);};
  recognition.onresult=event=>send(event.results?.[0]?.[0]?.transcript||'');recognition.start();
 }
 function toggleVoice(){state.voice=!state.voice;localStorage.setItem('doori_ai_voice',state.voice?'on':'off');if(!state.voice)root.DooriTTS?.stop();updateControls();}
 function activate(){sync();setStatus(t().status);updateControls();}
 function initialize(){document.getElementById('assistant-mic-btn')?.addEventListener('click',startListening);document.getElementById('assistant-voice-btn')?.addEventListener('click',toggleVoice);document.getElementById('assistant-voice-select')?.addEventListener('change',event=>{root.DooriTTS?.setGender(event.target.value);updateAvatar();});root.addEventListener('doori-tts-voice-change',updateAvatar);updateControls();}
 root.DooriAssistant={CHAT_ID,TEXT,isAssistant:id=>id===CHAT_ID,getName:()=>t().name,getStatus:()=>t().status,getAvatar,send,activate,initialize,updateControls,sync};
})(window);
