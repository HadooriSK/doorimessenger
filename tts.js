(function(root){
 'use strict';
 const STORAGE_KEY='doori_tts_voice_gender',SUPPORTED=['de','en','tr','ar','fa'];
 const FEMALE_HINTS=/\bfemale\b|zira|samantha|victoria|anna|amelie|katja|hedda|layla|salma|dilara|yelda/i;
 const MALE_HINTS=/\bmale\b|david|mark|daniel|stefan|george|khalid|hamza|cem|tolga/i;
 let gender=localStorage.getItem(STORAGE_KEY)==='male'?'male':'female',activeAudio=null,audioUnlocked=false,audioCtx=null,activeSource=null,pendingBlob=null,keepAliveSource=null,keepAliveGain=null;
 const locale=language=>root.DooriLanguage?.locale?.(language)||({de:'de-DE',en:'en-US',tr:'tr-TR',ar:'ar-SA',fa:'fa-IR'}[language]||'en-US');
 const shortLanguage=value=>{const code=String(value||'').toLowerCase().split('-')[0];return SUPPORTED.includes(code)?code:'en';};
 function languageOf(text,fallback){return root.DooriLanguage?.detect?.(text,shortLanguage(fallback))?.language||shortLanguage(fallback);}
 function candidates(language){const prefix=shortLanguage(language);return root.speechSynthesis?.getVoices?.().filter(voice=>voice.lang.toLowerCase().startsWith(prefix))||[];}
 function selectVoice(language){const voices=candidates(language),hints=gender==='female'?FEMALE_HINTS:MALE_HINTS;return voices.find(voice=>hints.test(voice.name))||voices[gender==='male'&&voices.length>1?1:0]||null;}
 function engineFor(){return 'gemini-3.8-flash-tts';}
 function endpoint(){return String(root.DOORI_TTS_ENDPOINT||document.querySelector('meta[name="doori-tts-endpoint"]')?.content||'').trim().replace(/\/$/,'');}
 function cleanPunctuationWords(value,language){
  const protectedParts=[];let text=String(value||'').trim().replace(/"[^"]*"|„[^“]*“|“[^”]*”|«[^»]*»|'[^']*'/gu,match=>`\uE000${protectedParts.push(match)-1}\uE001`);const rules={de:[['Komma',','],['Punkt','.'],['Fragezeichen','?'],['Ausrufezeichen','!']],en:[['comma',','],['period','.'],['full stop','.'],['question mark','?'],['exclamation mark','!']],tr:[['virgül',','],['nokta','.'],['soru işareti','?'],['ünlem işareti','!']],ar:[['فاصلة',','],['نقطة','.'],['علامة استفهام','?'],['علامة تعجب','!']],fa:[['ویرگول',','],['نقطه','.'],['علامت سؤال','?'],['علامت تعجب','!']]};
  for(const [word,mark] of rules[shortLanguage(language)]||[]){const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');text=text.replace(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`,'giu'),(_,prefix)=>`${prefix}${mark}`);}
  return text.replace(/\s+([,.!?؟،])/g,'$1').replace(/[,.،]{2,}/g,'.').replace(/([!?؟])(?:\s*[,.!?؟،])+/g,'$1').replace(/([,.!?؟،])(?=\p{L})/gu,'$1 ').replace(/\uE000(\d+)\uE001/g,(_,index)=>protectedParts[Number(index)]);
 }
 let pendingText=null;
 function systemSpeak(text,language){return new Promise(resolve=>{if(!root.speechSynthesis||!root.SpeechSynthesisUtterance){resolve(false);return;}root.speechSynthesis.cancel();root.speechSynthesis.resume?.();const utterance=new root.SpeechSynthesisUtterance(text);utterance.lang=locale(language);utterance.voice=selectVoice(language);utterance.rate=1;utterance.pitch=gender==='female'?1.04:.96;let settled=false;const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(ok)pendingText=null;else{pendingText={text,language};root.dispatchEvent(new CustomEvent('doori-tts-blocked'));}resolve(ok);};const timer=setTimeout(()=>finish(false),2500);utterance.onstart=()=>finish(true);utterance.onerror=()=>finish(false);root.speechSynthesis.speak(utterance);});}
 function getAudioContext(){if(!audioCtx){const Ctx=root.AudioContext||root.webkitAudioContext;if(Ctx)audioCtx=new Ctx();}return audioCtx;}
 function player(){if(!activeAudio){activeAudio=new Audio();activeAudio.setAttribute?.('playsinline','');activeAudio.setAttribute?.('webkit-playsinline','');activeAudio.preload='auto';activeAudio.style.display='none';document.body?.appendChild(activeAudio);}return activeAudio;}
 function silentWav(){const samples=2400,buffer=new ArrayBuffer(44+samples*2),view=new DataView(buffer),write=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};write(0,'RIFF');view.setUint32(4,36+samples*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,24000,true);view.setUint32(28,48000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples*2,true);return new Blob([buffer],{type:'audio/wav'});}
 function startKeepAlive(){
  const ctx=getAudioContext();
  if(ctx&&ctx.state!=='closed'){
   if(ctx.state!=='running')ctx.resume().catch(()=>{});
   if(!keepAliveSource){
    try{
     const buf=ctx.createBuffer(1,2400,ctx.sampleRate||24000);
     const src=ctx.createBufferSource();
     src.buffer=buf;src.loop=true;
     const gain=ctx.createGain();gain.gain.value=0.00001;
     src.connect(gain);gain.connect(ctx.destination);
     src.start(0);keepAliveSource=src;keepAliveGain=gain;
    }catch(_){}
   }
  }
  const audio=player();
  if(audio&&(audio.paused||!audio.src)){
   try{
    if(!audio.dataset.silentUrl)audio.dataset.silentUrl=URL.createObjectURL(silentWav());
    audio.src=audio.dataset.silentUrl;
    audio.loop=true;audio.muted=false;audio.volume=1;
    audio.play().catch(()=>{});
   }catch(_){}
  }
 }
 function stopKeepAlive(){
  if(keepAliveSource){
   try{keepAliveSource.stop();keepAliveSource.disconnect();keepAliveGain?.disconnect();}catch(_){}
   keepAliveSource=null;keepAliveGain=null;
  }
 }
 async function unlock(){
  try{
   startKeepAlive();
   const ctx=getAudioContext();
   const resume=ctx&&ctx.state!=='running'?ctx.resume():Promise.resolve();
   const audio=player();
   audioUnlocked=true;
   await Promise.all([resume,audio.play().catch(()=>{})]);
   return true;
  }catch{return false;}
 }
 async function playBlob(blob){
  const audio=player();
  try{
   audio.loop=false;
   const old=audio.dataset?.objectUrl;if(old)URL.revokeObjectURL(old);
   const objectUrl=URL.createObjectURL(blob);
   if(audio.dataset)audio.dataset.objectUrl=objectUrl;
   audio.src=objectUrl;audio.muted=false;audio.volume=1;
   audio.onended=()=>{audio.onended=null;stopKeepAlive();};
   await Promise.race([audio.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('AUDIO_PLAY_TIMEOUT')),3500))]);
   stopKeepAlive();
   return true;
  }catch(err){console.warn('Audio element play failed, falling back to Web Audio',err);}
  const ctx=getAudioContext();
  if(ctx){
   try{
    if(ctx.state!=='running')await Promise.race([ctx.resume(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('AUDIO_RESUME_TIMEOUT')),1500))]);
    if(ctx.state!=='running')throw new Error('AUDIO_CONTEXT_NOT_RUNNING');
    const arrayBuffer=await blob.arrayBuffer();
    const audioBuffer=await new Promise((resolve,reject)=>{ctx.decodeAudioData(arrayBuffer,resolve,reject);});
    stopKeepAlive();
    if(activeSource){try{activeSource.stop();}catch{}}
    const source=ctx.createBufferSource();
    source.buffer=audioBuffer;
    source.connect(ctx.destination);
    source.onended=()=>{if(activeSource===source)activeSource=null;};
    source.start(0);
    activeSource=source;
    return true;
   }catch(err){console.warn('Web Audio decode failed',err);}
  }
  throw new Error('AUDIO_PLAYBACK_FAILED');
 }
 async function neuralSpeak(text,language,url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(`${url}/synthesize`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language,gender,model:engineFor(language)}),signal:controller.signal});if(!response.ok)throw new Error('TTS_HTTP');const blob=await response.blob();if(!blob.type.startsWith('audio/'))throw new Error('TTS_AUDIO');return playBlob(blob);}finally{clearTimeout(timer);}}
 function base64Audio(value,type){const binary=atob(value),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type:type||'audio/wav'});}
 async function geminiSpeak(text,language){if(!root.accountFunctions?.httpsCallable)throw new Error('TTS_UNAVAILABLE');const result=await root.accountFunctions.httpsCallable('synthesizeDooriSpeech')({text,language,gender}),data=result?.data||{};if(!data.audioBase64)throw new Error('TTS_AUDIO');pendingBlob=base64Audio(data.audioBase64,data.mimeType);try{const played=await playBlob(pendingBlob);pendingBlob=null;return played;}catch(error){root.dispatchEvent(new CustomEvent('doori-tts-blocked'));throw error;}}
 async function replay(){if(pendingText)return systemSpeak(pendingText.text,pendingText.language);if(!pendingBlob)return false;try{const played=await playBlob(pendingBlob);pendingBlob=null;return played;}catch{return false;}}
 function speak(value,{language}={}){pendingBlob=null;pendingText=null;const expected=shortLanguage(language),text=cleanPunctuationWords(value,expected),url=endpoint();if(!/[\p{L}\p{N}]/u.test(text))return false;const task=url?neuralSpeak(text,expected,url):geminiSpeak(text,expected);return task.catch(error=>{if(pendingBlob)return false;console.warn('Doori neural TTS unavailable; using system fallback.',error?.message||'error');root.dispatchEvent(new CustomEvent('doori-tts-fallback',{detail:{language:expected,model:engineFor(expected)}}));return systemSpeak(text,expected);});}
 function stop(){root.speechSynthesis?.cancel?.();stopKeepAlive();if(activeSource){try{activeSource.stop();}catch{}activeSource=null;}if(activeAudio){activeAudio.pause();activeAudio.currentTime=0;}}
 function setGender(value){gender=value==='male'?'male':'female';localStorage.setItem(STORAGE_KEY,gender);root.dispatchEvent(new CustomEvent('doori-tts-voice-change',{detail:{gender}}));return gender;}
 function getGender(){return gender;}
 root.DooriTTS={speak,stop,unlock,replay,hasPending:()=>!!(pendingBlob||pendingText),setGender,getGender,languageOf,engineFor,cleanPunctuationWords};
})(window);
