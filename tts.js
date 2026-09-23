(function(root){
 'use strict';
 const STORAGE_KEY='doori_tts_voice_gender';
 const FEMALE_HINTS=/\bfemale\b|zira|samantha|victoria|anna|amelie|katja|hedda|layla|salma|dilara|yelda/i;
 const MALE_HINTS=/\bmale\b|david|mark|daniel|stefan|george|khalid|hamza|cem|tolga/i;
 let gender=localStorage.getItem(STORAGE_KEY)==='male'?'male':'female';
 function languageOf(text,fallback){
  if(/[\u0600-\u06ff]/.test(text))return /[پچژگکی]/.test(text)?'fa-IR':'ar-SA';
  if(/[ğüşöçıİ]/i.test(text))return 'tr-TR';
  if(/[äöüß]/i.test(text))return 'de-DE';
  return fallback||navigator.language||'en-US';
 }
 function candidates(language){
  const prefix=language.split('-')[0].toLowerCase();
  return root.speechSynthesis?.getVoices?.().filter(voice=>voice.lang.toLowerCase().startsWith(prefix))||[];
 }
 function selectVoice(language){
  const voices=candidates(language),hints=gender==='female'?FEMALE_HINTS:MALE_HINTS;
  return voices.find(voice=>hints.test(voice.name))||voices[gender==='male'&&voices.length>1?1:0]||null;
 }
 function speak(text,{language}={}){
  if(!root.speechSynthesis||!root.SpeechSynthesisUtterance)return false;
  root.speechSynthesis.cancel();
  const utterance=new root.SpeechSynthesisUtterance(String(text||''));
  utterance.lang=languageOf(utterance.text,language);utterance.voice=selectVoice(utterance.lang);utterance.rate=1;utterance.pitch=gender==='female'?1.04:0.96;
  root.speechSynthesis.speak(utterance);return true;
 }
 function stop(){root.speechSynthesis?.cancel?.();}
 function setGender(value){gender=value==='male'?'male':'female';localStorage.setItem(STORAGE_KEY,gender);root.dispatchEvent(new CustomEvent('doori-tts-voice-change',{detail:{gender}}));return gender;}
 function getGender(){return gender;}
 root.DooriTTS={speak,stop,setGender,getGender,languageOf};
})(window);
