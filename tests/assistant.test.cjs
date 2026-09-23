const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {createAssistantRouter,compactMessages,LocalFallbackError,GROQ_MODEL,GEMINI_MODEL}=require('../functions/assistant-router');
const root=path.resolve(__dirname,'..');

function response(ok,json,status=ok?200:429){return {ok,status,json:async()=>json};}

test('assistant context is bounded and keeps the newest messages',()=>{
 const messages=Array.from({length:20},(_,index)=>({role:index%2?'assistant':'user',content:String(index).padEnd(1000,'x')}));
 const compact=compactMessages(messages);
 assert.ok(compact.length<=10);
 assert.ok(compact.reduce((sum,item)=>sum+item.content.length,0)<=6000);
 assert.match(compact.at(-1).content,/^19/);
});

test('router uses Groq first and does not expose its provider',async()=>{
 const calls=[];
 const route=createAssistantRouter({groqKey:'secret',cloudflareToken:'other',fetchImpl:async(url)=>{calls.push(url);return response(true,{choices:[{message:{content:'Hallo'}}]});}});
 assert.deepEqual(await route({messages:[{role:'user',content:'Hallo'}],language:'de'}),{text:'Hallo'});
 assert.equal(calls.length,1);
 assert.equal(Object.keys(await route({messages:[{role:'user',content:'Test'}]})).includes('provider'),false);
 assert.equal(GROQ_MODEL,'openai/gpt-oss-20b');
});

test('router follows Groq then Gemini then Cloudflare',async()=>{
 const calls=[];
 const route=createAssistantRouter({groqKey:'g',geminiKey:'m',cloudflareToken:'c',cloudflareAccountId:'public-account',fetchImpl:async(url)=>{calls.push(url);if(url.includes('groq.com'))return response(false,{});if(url.includes('googleapis.com'))return response(false,{});return response(true,{result:{response:'مرحبا'}});}});
 assert.deepEqual(await route({messages:[{role:'user',content:'مرحبا'}],language:'ar'}),{text:'مرحبا'});
 assert.equal(calls.length,3);
 assert.match(calls[0],/groq/);assert.match(calls[1],/googleapis/);assert.match(calls[2],/cloudflare/);
 assert.equal(GEMINI_MODEL,'gemini-2.5-flash-lite');
});

test('quota guard skips exhausted providers without calling them',async()=>{
 const calls=[];
 const route=createAssistantRouter({groqKey:'g',geminiKey:'m',cloudflareToken:'c',cloudflareAccountId:'public-account',beforeProvider:async provider=>provider!=='groq',fetchImpl:async url=>{calls.push(url);return response(true,{candidates:[{content:{parts:[{text:'Gemini'}]}}]});}});
 assert.deepEqual(await route({messages:[{role:'user',content:'Hi'}]}),{text:'Gemini'});
 assert.equal(calls.length,1);assert.match(calls[0],/googleapis/);
});

test('slow provider is aborted and Gemini takes over',async()=>{
 const calls=[];
 const route=createAssistantRouter({groqKey:'g',geminiKey:'m',allowCloudflare:false,providerTimeoutMs:10,fetchImpl:(url,options)=>{calls.push(url);if(url.includes('groq.com'))return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));return Promise.resolve(response(true,{candidates:[{content:{parts:[{text:'Fast fallback'}]}}]}));}});
 assert.deepEqual(await route({messages:[{role:'user',content:'Hi'}]}),{text:'Fast fallback'});
 assert.equal(calls.length,2);
});

test('simultaneous provider failures request local fallback without retries',async()=>{
 let calls=0;
 const route=createAssistantRouter({groqKey:'g',geminiKey:'m',cloudflareToken:'c',cloudflareAccountId:'public-account',fetchImpl:async()=>{calls++;return response(false,{});}});
 await assert.rejects(()=>route({messages:[{role:'user',content:'Hi'}]}),error=>error instanceof LocalFallbackError);
 assert.equal(calls,3);
});

test('central TTS keeps the selected gender independent of providers',()=>{
 const dom=new JSDOM('',{url:'https://doori-messenger.de',runScripts:'outside-only'}),spoken=[];
 dom.window.SpeechSynthesisUtterance=function(text){this.text=text;};
 dom.window.speechSynthesis={cancel(){},getVoices:()=>[{name:'Anna',lang:'de-DE'},{name:'Daniel',lang:'de-DE'}],speak:value=>spoken.push(value)};
 dom.window.eval(fs.readFileSync(path.join(root,'tts.js'),'utf8'));
 assert.equal(dom.window.DooriTTS.setGender('male'),'male');
 assert.equal(dom.window.localStorage.getItem('doori_tts_voice_gender'),'male');
 dom.window.DooriTTS.speak('Hallo',{language:'de-DE'});
 assert.equal(spoken[0].voice.name,'Daniel');assert.equal(spoken[0].pitch,0.96);
 const source=fs.readFileSync(path.join(root,'tts.js'),'utf8');assert.doesNotMatch(source,/groq|gemini|cloudflare/i);
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
