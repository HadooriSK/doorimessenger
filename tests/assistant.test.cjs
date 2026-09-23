const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createAssistantRouter,compactMessages,LocalFallbackError,GROQ_MODEL}=require('../functions/assistant-router');
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

test('router falls back to Cloudflare once after Groq quota response',async()=>{
 const calls=[];
 const route=createAssistantRouter({groqKey:'g',cloudflareToken:'c',cloudflareAccountId:'public-account',fetchImpl:async(url)=>{calls.push(url);if(url.includes('groq.com'))return response(false,{});return response(true,{result:{response:'مرحبا'}});}});
 assert.deepEqual(await route({messages:[{role:'user',content:'مرحبا'}],language:'ar'}),{text:'مرحبا'});
 assert.equal(calls.length,2);
});

test('router requests local fallback without paid retries',async()=>{
 let calls=0;
 const route=createAssistantRouter({groqKey:'g',cloudflareToken:'c',cloudflareAccountId:'public-account',fetchImpl:async()=>{calls++;return response(false,{});}});
 await assert.rejects(()=>route({messages:[{role:'user',content:'Hi'}]}),error=>error instanceof LocalFallbackError);
 assert.equal(calls,2);
});

test('assistant client covers all five languages and secrets stay server-side',()=>{
 const source=fs.readFileSync(path.join(root,'assistant.js'),'utf8');
 for(const language of ['de','en','ar','fa','tr'])assert.match(source,new RegExp(`\\b${language}:\\{`));
 const publicFiles=['index.html','app.js','assistant.js','firebase-config.js'];
 for(const file of publicFiles){const value=fs.readFileSync(path.join(root,file),'utf8');assert.doesNotMatch(value,/GROQ_API_KEY|CLOUDFLARE_API_TOKEN|gsk_|Bearer\s+[A-Za-z0-9_-]{20,}/);}
 const functions=fs.readFileSync(path.join(root,'functions','index.js'),'utf8');
 assert.match(functions,/defineSecret\('GROQ_API_KEY'\)/);
 assert.match(functions,/defineSecret\('CLOUDFLARE_API_TOKEN'\)/);
 assert.match(functions,/reserveDailyAssistantBudget/);
});
