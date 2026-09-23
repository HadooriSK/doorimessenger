(function(root){
 'use strict';
 const STORAGE_KEY='doori_tts_voice_gender',SUPPORTED=['de','en','tr','ar','fa'];
 const FEMALE_HINTS=/\bfemale\b|zira|samantha|victoria|anna|amelie|katja|hedda|layla|salma|dilara|yelda/i;
 const MALE_HINTS=/\bmale\b|david|mark|daniel|stefan|george|khalid|hamza|cem|tolga/i;
 let gender=localStorage.getItem(STORAGE_KEY)==='male'?'male':'female',activeAudio=null;
 const locale=language=>root.DooriLanguage?.locale?.(language)||({de:'de-DE',en:'en-US',tr:'tr-TR',ar:'ar-SA',fa:'fa-IR'}[language]||'en-US');
 const shortLanguage=value=>{const code=String(value||'').toLowerCase().split('-')[0];return SUPPORTED.includes(code)?code:'en';};
 function languageOf(text,fallback){return root.DooriLanguage?.detect?.(text,shortLanguage(fallback))?.language||shortLanguage(fallback);}
 function candidates(language){const prefix=shortLanguage(language);return root.speechSynthesis?.getVoices?.().filter(voice=>voice.lang.toLowerCase().startsWith(prefix))||[];}
 function selectVoice(language){const voices=candidates(language),hints=gender==='female'?FEMALE_HINTS:MALE_HINTS;return voices.find(voice=>hints.test(voice.name))||voices[gender==='male'&&voices.length>1?1:0]||null;}
 function engineFor(language){return shortLanguage(language)==='fa'?'parsvoice-xtts':'xtts-v2';}
 function endpoint(){return String(root.DOORI_TTS_ENDPOINT||document.querySelector('meta[name="doori-tts-endpoint"]')?.content||'').trim().replace(/\/$/,'');}
 function cleanPunctuationWords(value,language){
  const protectedParts=[];let text=String(value||'').trim().replace(/"[^"]*"|„[^“]*“|“[^”]*”|«[^»]*»|'[^']*'/gu,match=>`\uE000${protectedParts.push(match)-1}\uE001`);const rules={de:[['Komma',','],['Punkt','.'],['Fragezeichen','?'],['Ausrufezeichen','!']],en:[['comma',','],['period','.'],['full stop','.'],['question mark','?'],['exclamation mark','!']],tr:[['virgül',','],['nokta','.'],['soru işareti','?'],['ünlem işareti','!']],ar:[['فاصلة',','],['نقطة','.'],['علامة استفهام','?'],['علامة تعجب','!']],fa:[['ویرگول',','],['نقطه','.'],['علامت سؤال','?'],['علامت تعجب','!']]};
  for(const [word,mark] of rules[shortLanguage(language)]||[]){const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');text=text.replace(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`,'giu'),(_,prefix)=>`${prefix}${mark}`);}
  return text.replace(/\s+([,.!?؟،])/g,'$1').replace(/([,.!?؟،])(?=\p{L})/gu,'$1 ').replace(/\uE000(\d+)\uE001/g,(_,index)=>protectedParts[Number(index)]);
 }
 function systemSpeak(text,language){if(!root.speechSynthesis||!root.SpeechSynthesisUtterance)return false;root.speechSynthesis.cancel();const utterance=new root.SpeechSynthesisUtterance(text);utterance.lang=locale(language);utterance.voice=selectVoice(language);utterance.rate=1;utterance.pitch=gender==='female'?1.04:.96;root.speechSynthesis.speak(utterance);return true;}
 async function neuralSpeak(text,language,url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(`${url}/synthesize`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language,gender,model:engineFor(language)}),signal:controller.signal});if(!response.ok)throw new Error('TTS_HTTP');const blob=await response.blob();if(!blob.type.startsWith('audio/'))throw new Error('TTS_AUDIO');stop();activeAudio=new Audio(URL.createObjectURL(blob));activeAudio.onended=()=>{URL.revokeObjectURL(activeAudio.src);activeAudio=null;};await activeAudio.play();return true;}finally{clearTimeout(timer);}}
 function speak(value,{language}={}){const expected=shortLanguage(language),text=cleanPunctuationWords(value,expected),url=endpoint();if(!text)return false;if(!url)return systemSpeak(text,expected);return neuralSpeak(text,expected,url).catch(error=>{console.warn('Doori neural TTS unavailable; using system fallback.',error?.message||'error');root.dispatchEvent(new CustomEvent('doori-tts-fallback',{detail:{language:expected,model:engineFor(expected)}}));return systemSpeak(text,expected);});}
 function stop(){root.speechSynthesis?.cancel?.();if(activeAudio){activeAudio.pause();activeAudio=null;}}
 function setGender(value){gender=value==='male'?'male':'female';localStorage.setItem(STORAGE_KEY,gender);root.dispatchEvent(new CustomEvent('doori-tts-voice-change',{detail:{gender}}));return gender;}
 function getGender(){return gender;}
 root.DooriTTS={speak,stop,setGender,getGender,languageOf,engineFor,cleanPunctuationWords};
})(window);
