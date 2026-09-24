const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {createAssistantRouter,compactMessages,LocalFallbackError,GROQ_MODEL,GEMINI_MODEL,cloudflareNeurons}=require('../functions/assistant-router');
const {detect,sameLanguage}=require('../functions/assistant-language');
const root=path.resolve(__dirname,'..');

function response(ok,json,status=ok?200:429){return {ok,status,json:async()=>json};}

test('assistant context is bounded and keeps the newest messages',()=>{
 const messages=Array.from({length:20},(_,index)=>({role:index%2?'assistant':'user',content:String(index).padEnd(1000,'x')}));
 const compact=compactMessages(messages);
 assert.ok(compact.length<=10);
 assert.ok(compact.reduce((sum,item)=>sum+item.content.length,0)<=6000);
 assert.match(compact.at(-1).content,/^19/);
});

test('router uses Gemini first and does not expose its provider',async()=>{
 const calls=[];
 const route=createAssistantRouter({geminiKey:'secret',cloudflareToken:'other',fetchImpl:async(url)=>{calls.push(url);return response(true,{candidates:[{content:{parts:[{text:'Hallo'}]}}]});}});
 assert.deepEqual(await route({messages:[{role:'user',content:'Hallo'}],language:'de'}),{text:'Hallo',language:'de'});
 assert.equal(calls.length,1);
 assert.equal(Object.keys(await route({messages:[{role:'user',content:'Test'}]})).includes('provider'),false);
 assert.equal(GROQ_MODEL,'openai/gpt-oss-20b');
});

test('router follows Gemini then Groq then Cloudflare',async()=>{
 const calls=[];
 const route=createAssistantRouter({groqKey:'g',geminiKey:'m',cloudflareToken:'c',cloudflareAccountId:'public-account',fetchImpl:async(url)=>{calls.push(url);if(url.includes('groq.com'))return response(false,{});if(url.includes('googleapis.com'))return response(false,{});return response(true,{result:{response:'مرحبا'}});}});
 assert.deepEqual(await route({messages:[{role:'user',content:'مرحبا'}],language:'ar'}),{text:'مرحبا',language:'ar'});
 assert.equal(calls.length,3);
 assert.match(calls[0],/googleapis/);assert.match(calls[1],/groq/);assert.match(calls[2],/cloudflare/);
 assert.equal(GEMINI_MODEL,'gemini-3.5-flash-lite');
 const groqFirstCalls=[];
 const groqFirstRoute=createAssistantRouter({groqKey:'g',geminiKey:'m',cloudflareToken:'c',cloudflareAccountId:'public-account',providerOrder:['groq','gemini','cloudflare'],fetchImpl:async url=>{groqFirstCalls.push(url);return response(true,{choices:[{message:{content:'Groq First'}}]});}});
 assert.deepEqual(await groqFirstRoute({messages:[{role:'user',content:'Hi'}]}),{text:'Groq First'});
 assert.equal(groqFirstCalls.length,1);assert.match(groqFirstCalls[0],/groq/);
});

test('quota guard skips exhausted providers without calling them',async()=>{
 const calls=[];
 const route=createAssistantRouter({groqKey:'g',geminiKey:'m',cloudflareToken:'c',cloudflareAccountId:'public-account',beforeProvider:async provider=>provider!=='gemini',fetchImpl:async url=>{calls.push(url);return response(true,{choices:[{message:{content:'Groq'}}]});}});
 assert.deepEqual(await route({messages:[{role:'user',content:'Hi'}]}),{text:'Groq'});
 assert.equal(calls.length,1);assert.match(calls[0],/groq/);
});

test('slow Gemini is aborted and Groq takes over',async()=>{
 const calls=[];
 const route=createAssistantRouter({groqKey:'g',geminiKey:'m',allowCloudflare:false,providerTimeoutMs:10,fetchImpl:(url,options)=>{calls.push(url);if(url.includes('googleapis.com'))return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));return Promise.resolve(response(true,{choices:[{message:{content:'Fast fallback'}}]}));}});
 assert.deepEqual(await route({messages:[{role:'user',content:'Hi'}]}),{text:'Fast fallback'});
 assert.equal(calls.length,2);
});

test('simultaneous provider failures request local fallback without retries',async()=>{
 let calls=0;
 const route=createAssistantRouter({groqKey:'g',geminiKey:'m',cloudflareToken:'c',cloudflareAccountId:'public-account',fetchImpl:async()=>{calls++;return response(false,{});}});
 await assert.rejects(()=>route({messages:[{role:'user',content:'Hi'}]}),error=>error instanceof LocalFallbackError);
 assert.equal(calls,3);
});

test('central Gemini TTS keeps the selected gender and has a system fallback',async()=>{
 const dom=new JSDOM('',{url:'https://doori-messenger.de',runScripts:'outside-only'}),spoken=[];
 dom.window.SpeechSynthesisUtterance=function(text){this.text=text;};
 dom.window.speechSynthesis={cancel(){},getVoices:()=>[{name:'Anna',lang:'de-DE'},{name:'Daniel',lang:'de-DE'}],speak:value=>{spoken.push(value);value.onstart?.();}};
 dom.window.accountFunctions={httpsCallable:()=>async()=>{throw new Error('offline');}};
 dom.window.eval(fs.readFileSync(path.join(root,'tts.js'),'utf8'));
 assert.equal(dom.window.DooriTTS.setGender('male'),'male');
 assert.equal(dom.window.localStorage.getItem('doori_tts_voice_gender'),'male');
 await dom.window.DooriTTS.speak('Hallo',{language:'de-DE'});
 assert.equal(spoken[0].voice.name,'Daniel');assert.equal(spoken[0].pitch,0.96);
 assert.equal(dom.window.DooriTTS.engineFor('fa'),'gemini-3.8-flash-tts');assert.equal(dom.window.DooriTTS.engineFor('de'),'gemini-3.8-flash-tts');
 assert.equal(dom.window.DooriTTS.cleanPunctuationWords('Hallo Komma wie geht es Fragezeichen','de'),'Hallo, wie geht es?');
 assert.equal(dom.window.DooriTTS.cleanPunctuationWords('Das Wort „Komma“ wird ausgesprochen.','de'),'Das Wort „Komma“ wird ausgesprochen.');
 assert.equal(dom.window.DooriTTS.cleanPunctuationWords('Punkt Punkt Komma Punkt Komma','de'),'.');
 const source=fs.readFileSync(path.join(root,'tts.js'),'utf8');assert.match(source,/synthesizeDooriSpeech/);assert.match(source,/webkit-playsinline/);assert.match(source,/audio\.muted=false/);assert.match(source,/appendChild\(activeAudio\)/);assert.match(source,/speechSynthesis\.resume/);
 dom.window.speechSynthesis.speak=value=>value.onerror?.();
 assert.equal(await dom.window.DooriTTS.speak('Hallo',{language:'de'}),false);
 assert.equal(dom.window.DooriTTS.hasPending(),true);
 dom.window.speechSynthesis.speak=value=>value.onstart?.();
 assert.equal(await dom.window.DooriTTS.replay(),true);
 assert.equal(dom.window.DooriTTS.hasPending(),false);
 dom.window.close();
});

test('iPhone-compatible recorder sends MP4 audio to multilingual Whisper before chat',async()=>{
 const html='<button id="assistant-mic-btn"></button><button id="assistant-voice-btn"></button><select id="assistant-voice-select"><option value="female"></option><option value="male"></option></select><div id="current-chat-status"></div><div id="current-chat-avatar"></div>';
 const dom=new JSDOM(html,{url:'https://doori-messenger.de',runScripts:'outside-only'}),calls=[];const w=dom.window,track={stopped:false,stop(){this.stopped=true;}},stream={getTracks:()=>[track]};
 w.currentLang='de';w.currentUser='tester';w.currentChat={type:'assistant'};w.messages=new Map();w.renderMessages=()=>{};w.renderChatList=()=>{};w.DooriTTS={getGender:()=> 'female',setGender:value=>value,stop(){},speak(){}};
 Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>stream}});
 class Recorder{static isTypeSupported(type){return type==='audio/mp4';}constructor(input,options){this.stream=input;this.mimeType=options.mimeType;this.state='inactive';Recorder.last=this;}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new w.Blob(['a'.repeat(512)],{type:this.mimeType})});this.onstop?.();}}w.MediaRecorder=Recorder;
 w.accountFunctions={httpsCallable:name=>async payload=>{calls.push({name,payload});if(name==='transcribeDooriSpeech')return {data:{text:'سلام، حال شما چطور است؟',language:'fa'}};return {data:{text:'من خوبم، ممنون.',language:'fa'}};}};
 w.eval(fs.readFileSync(path.join(root,'assistant-language.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'assistant.js'),'utf8'));w.DooriAssistant.initialize();const mic=w.document.getElementById('assistant-mic-btn');mic.click();await new Promise(resolve=>setTimeout(resolve,5));assert.equal(Recorder.last.mimeType,'audio/mp4');mic.click();await new Promise(resolve=>setTimeout(resolve,150));
 assert.equal(calls[0].name,'transcribeDooriSpeech');assert.equal(calls[0].payload.mimeType,'audio/mp4');assert.ok(calls[0].payload.audioBase64);assert.equal(calls[1].payload.language,'fa');assert.equal(calls[1].payload.source,'voice');assert.equal(track.stopped,true);dom.window.close();
});

test('language lock recognizes all five languages and rejects confident provider drift',async()=>{
 const samples={de:'Warum ist das nicht auf Deutsch?',en:'Why is this not in English?',tr:'Bu neden Türkçe değil?',ar:'لماذا هذا ليس باللغة العربية؟',fa:'چرا این به زبان فارسی نیست؟'};
 for(const [language,text] of Object.entries(samples)){assert.equal(detect(text,'en').language,language);assert.equal(sameLanguage(text,language),true);}
 const events=[];const route=createAssistantRouter({groqKey:'g',geminiKey:'m',allowCloudflare:false,onProviderEvent:event=>events.push(event),fetchImpl:async url=>url.includes('googleapis.com')?response(true,{candidates:[{content:{parts:[{text:'Bu Türkçe bir cevaptır ve doğru değildir.'}]}}]}):response(true,{choices:[{message:{content:'Das ist eine deutsche und passende Antwort.'}}]})});
 assert.deepEqual(await route({messages:[{role:'user',content:samples.de}],language:'de'}),{text:'Das ist eine deutsche und passende Antwort.',language:'de'});
 assert.equal(events[0].outcome,'language');assert.equal(events[1].outcome,'success');
});

test('Cloudflare usage converts model tokens to official neuron units',()=>{
 assert.equal(cloudflareNeurons(1_000_000,0),2457);
 assert.equal(cloudflareNeurons(0,1_000_000),18252);
 assert.equal(cloudflareNeurons(1000,250),7.02);
});

test('speech dialog keeps detected language, supports deliberate switching and passes voice metadata',async()=>{
 const html='<button id="assistant-mic-btn"></button><button id="assistant-voice-btn"></button><select id="assistant-voice-select"><option value="female"></option><option value="male"></option></select><div id="current-chat-status"></div><div id="current-chat-avatar"></div>';
 const dom=new JSDOM(html,{url:'https://doori-messenger.de',runScripts:'outside-only'}),calls=[],spoken=[];const w=dom.window;
 w.currentLang='de';w.currentUser='tester';w.currentChat={type:'assistant'};w.messages=new Map();w.renderMessages=()=>{};w.renderChatList=()=>{};
 w.DooriTTS={getGender:()=> 'female',setGender:value=>value,stop(){},speak:(text,options)=>spoken.push({text,options})};
 w.accountFunctions={httpsCallable:()=>async payload=>{calls.push(payload);return {data:{text:payload.language==='tr'?'Bu Türkçe bir yanıttır.':'Das ist eine deutsche Antwort.',language:payload.language}};}};
 class Recognition{constructor(){Recognition.last=this;}start(){this.onstart?.();}abort(){}}w.SpeechRecognition=Recognition;
 w.eval(fs.readFileSync(path.join(root,'assistant-language.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'assistant.js'),'utf8'));w.DooriAssistant.initialize();
 w.document.getElementById('assistant-mic-btn').click();await new Promise(resolve=>setTimeout(resolve,5));Recognition.last.onresult({results:[[{transcript:'Warum ist das auf Deutsch?',confidence:.9}]]});await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(calls[0].language,'de');assert.equal(calls[0].source,'voice');assert.ok(calls[0].voiceSeconds>=1);assert.equal(spoken[0].options.language,'de');
 await w.DooriAssistant.send('Bu neden Türkçe değil?');assert.equal(calls[1].language,'tr');assert.equal(spoken.length,1,'typed replies must not trigger speech');
 dom.window.close();
});

test('assistant client covers all five languages and secrets stay server-side',()=>{
 const source=fs.readFileSync(path.join(root,'assistant.js'),'utf8');
 for(const language of ['de','en','ar','fa','tr'])assert.match(source,new RegExp(`\\b${language}:\\{`));
 const publicFiles=['index.html','app.js','assistant.js','tts.js','firebase-config.js'];
 for(const file of publicFiles){const value=fs.readFileSync(path.join(root,file),'utf8');assert.doesNotMatch(value,/GROQ_API_KEY|GEMINI_API_KEY|CLOUDFLARE_API_TOKEN|gsk_|Bearer\s+[A-Za-z0-9_-]{20,}/);}
 const functions=fs.readFileSync(path.join(root,'functions','index.js'),'utf8');
 assert.match(functions,/defineSecret\('GROQ_API_KEY'\)/);
 assert.match(functions,/defineSecret\('CLOUDFLARE_API_TOKEN'\)/);
 assert.match(functions,/defineSecret\('GEMINI_API_KEY'\)/);
 assert.match(functions,/reserveDailyAssistantBudget/);
});

test('per-user AI limits and protected operator dashboard are server enforced',()=>{
 const functions=fs.readFileSync(path.join(root,'functions','index.js'),'utf8');
 assert.match(functions,/textMessagesPerUser:100/);assert.match(functions,/voiceSecondsPerUser:3600/);
 assert.match(functions,/reserveUserAssistantUsage/);assert.match(functions,/defineSecret\('DOORI_ADMIN_EMAIL'\)/);
 assert.match(functions,/exports\.transcribeDooriSpeech=onCall/);assert.match(functions,/whisper-large-v3-turbo/);assert.match(functions,/Transcribe it verbatim in the original language and original script/);assert.match(functions,/transcribeWithGemini/);assert.match(functions,/geminiSpeechDailyRequests:100/);assert.match(functions,/reserveDailySpeechSeconds/);
 assert.match(functions,/validSpeechResult/);assert.match(functions,/Script=Han/);assert.match(functions,/transcript=validSpeechResult\(await transcribeWithGemini/);assert.match(functions,/Gemini speech recognition unavailable or invalid; trying Whisper/);
 assert.match(functions,/exports\.getAssistantAdminDashboard=onCall/);assert.match(functions,/exports\.updateAssistantAdminConfig=onCall/);
 assert.match(functions,/cloudflareDailyNeurons:10000/);assert.match(functions,/cloudflare-neurons-/);assert.doesNotMatch(functions,/cloudflareDailyRequests:3/);
 assert.match(functions,/exports\.synthesizeDooriSpeech=onCall/);assert.match(functions,/gemini-3\.8-flash-tts/);assert.match(functions,/geminiTtsDailyRequests:100/);
 assert.match(functions,/requireAdmin\(request\)\{signedIn\(request,true\)/);assert.match(functions,/actual!==allowed/);assert.match(functions,/recordAssistantMetrics/);
 const html=fs.readFileSync(path.join(root,'operator.html'),'utf8'),client=fs.readFileSync(path.join(root,'operator.js'),'utf8');
 for(const language of ['de','en','ar','fa','tr'])assert.match(client,new RegExp(`\\b${language}:\\{`));
 assert.match(html,/id="provider-rows"/);assert.match(html,/id="config-form"/);assert.match(html,/name="geminiSpeechDailyRequests"/);assert.match(html,/name="geminiTtsDailyRequests"/);assert.match(html,/name="cloudflareDailyNeurons"/);for(const language of ['de','en','ar','fa','tr']){assert.match(client,new RegExp(`Object\\.assign\\(T\\.${language},\\{[^}]*geminiSpeechLimit`));assert.match(client,new RegExp(`Object\\.assign\\(T\\.${language},\\{geminiTtsLimit`));}
 assert.doesNotMatch(fs.readFileSync(path.join(root,'index.html'),'utf8'),/operator-console|operator\.html/);
 const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8'));assert.ok(config.hosting.rewrites.some(item=>item.source==='/operator-console'&&item.destination==='/operator.html'));
});

test('Gemini Live mode integrates gemini-3.8-live with ephemeral tokens, 5 languages and secure isolation',()=>{
 const liveClient=fs.readFileSync(path.join(root,'doori-live.js'),'utf8');
 for(const lang of ['de','en','ar','fa','tr']) assert.match(liveClient,new RegExp(`\\b${lang}:\\s*\\{`));
 assert.match(liveClient,/models\/gemini-3\.8-live/);
 assert.match(liveClient,/BidiGenerateContentConstrained/);
 assert.match(liveClient,/getLiveToken/);
 assert.match(liveClient,/realtimeInput:\s*\{\s*audio:/);
 assert.match(liveClient,/mimeType:\s*'audio\/pcm;rate=16000'/);
 assert.match(liveClient,/responseModalities:\s*\['AUDIO'\]/);
 const setupSource=liveClient.match(/const setup = (\{[\s\S]*?\n      \s*\});/)[1];
 const wire=JSON.parse(JSON.stringify(Function('sysPrompt','liveVoice','state','return ('+setupSource+')')('test',()=> 'Kore',{resumeHandle:''})));
 assert.deepEqual(wire.setup.generationConfig.responseModalities,['AUDIO']);
 assert.equal(wire.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Kore');
 assert.deepEqual(wire.setup.contextWindowCompression,{triggerTokens:25600,slidingWindow:{targetTokens:12800}});
 assert.deepEqual(wire.setup.sessionResumption,{});
 assert.match(liveClient,/DooriTTS\?\.getGender\?\.\(\) === 'male' \? 'Puck' : 'Kore'/);
 assert.match(liveClient,/sessionResumptionUpdate/);
 assert.match(liveClient,/newHandle/);
 assert.match(liveClient,/msg\.goAway/);
 assert.match(liveClient,/doori-tts-voice-change', restartForVoice/);
 assert.equal(wire.setup.responseModalities,undefined,'modalities must not be sent directly in setup');
 assert.equal(wire.setup.speechConfig,undefined,'speech config belongs inside generationConfig');
 assert.match(liveClient,/captureBuffer\.length < 1600/);
 assert.match(liveClient,/playbackSources:\s*new Set\(\)/);
 assert.match(liveClient,/for \(const src of state\.playbackSources\)/);
 assert.match(liveClient,/sinkGain\.connect\(ctx\.destination\)/);
 assert.doesNotMatch(liveClient,/state\.playing && rms > [\d.]+\) \{\s*stopPlayback\(\)/);
 for(const key of ['micDenied','micBusy']) assert.equal((liveClient.match(new RegExp(`\\b${key}:`, 'g'))||[]).length,5);
 assert.doesNotMatch(liveClient,/media_chunks|generation_config|response_modalities/);
 assert.doesNotMatch(liveClient,/AIza|AQ\.[A-Za-z0-9]|GROQ_API_KEY|CLOUDFLARE_API_TOKEN/);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/id="doori-live-btn"/);
 assert.match(html,/id="doori-live-status"/);
 assert.match(html,/doori-live\.js\?v=\d+/);
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.match(sw,/doori-live\.js/);
 const build=fs.readFileSync(path.join(root,'scripts/build-hosting.cjs'),'utf8');
 assert.match(build,/'doori-live\.js'/);
 const functions=fs.readFileSync(path.join(root,'functions/index.js'),'utf8');
 assert.match(functions,/exports\.getLiveToken=onCall/);
 assert.match(functions,/v1beta\/auth_tokens/);
 assert.doesNotMatch(functions,/replace\(\/\^auth_tokens/);
 assert.match(functions,/liveDailySessionsPerUser/);
 assert.match(functions,/live-v2-\$\{uid\}-\$\{day\}/);
 assert.match(functions,/liveDailyLimit/);
});

test('Gemini Live suppresses iPhone speaker echo and unsolicited startup greetings',()=>{
 const source=fs.readFileSync(path.join(root,'doori-live.js'),'utf8');
 assert.match(source,/state\.playing \|\| Date\.now\(\) < state\.ignoreInputUntil/);
 assert.match(source,/state\.ignoreInputUntil = Date\.now\(\) \+ 700/);
 assert.match(source,/state\.ignoreInputUntil = Date\.now\(\) \+ 500/);
 assert.match(source,/Wait silently until the user has spoken a complete first utterance/);
 assert.match(source,/never repeat a greeting/i);
});

test('mobile Live status stays on one row without moving the voice selector',()=>{
 const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 assert.match(css,/\.assistant-controls-row\s*\{[^}]*flex-wrap:\s*nowrap/s);
 assert.match(css,/\.doori-live-status\s*\{[^}]*flex:\s*1 1 auto[^}]*text-overflow:\s*ellipsis/s);
 assert.match(css,/\.assistant-voice-select\s*\{[^}]*flex:\s*0 0 auto/s);
});
