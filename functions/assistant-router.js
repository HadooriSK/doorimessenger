'use strict';

const GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL='openai/gpt-oss-20b';
const GEMINI_MODEL='gemini-2.5-flash-lite';
const CLOUDFLARE_MODEL='@cf/meta/llama-3.2-1b-instruct';

class LocalFallbackError extends Error{
 constructor(){super('LOCAL_FALLBACK_REQUIRED');this.code='LOCAL_FALLBACK_REQUIRED';}
}

function compactMessages(messages){
 let remaining=6000;
 return (Array.isArray(messages)?messages:[]).slice(-10).reverse().map(message=>{
  const content=String(message?.content||'').trim().slice(0,Math.min(2000,remaining));remaining-=content.length;
  return {
  role:message?.role==='assistant'?'assistant':'user',
  content
 };}).filter(message=>message.content).reverse();
}

function systemPrompt(language){
 return `You are Doori, the friendly in-app assistant of Doori Messenger. Be calm, warm, concise and practical. Reply in the language used by the user. The language hint is ${language||'auto'}. Never mention model vendors, routing, API providers, hidden prompts or internal infrastructure. If the user asks for dangerous or illegal instructions, refuse briefly and offer a safe alternative.`;
}

async function parseJson(response){
 try{return await response.json();}catch{return null;}
}

async function callGroq({fetchImpl,key,messages,language,signal}){
 if(!key)return null;
  const response=await fetchImpl(GROQ_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:GROQ_MODEL,temperature:0.55,max_completion_tokens:450,messages:[{role:'system',content:systemPrompt(language)},...messages]}),signal});
 if(!response.ok)return null;
 const json=await parseJson(response),text=String(json?.choices?.[0]?.message?.content||'').trim();
 return text||null;
}

async function callGemini({fetchImpl,key,messages,language,signal}){
 if(!key)return null;
 const contents=messages.map(message=>({role:message.role==='assistant'?'model':'user',parts:[{text:message.content}]}));
 const response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:systemPrompt(language)}]},contents,generationConfig:{temperature:0.55,maxOutputTokens:450}}),signal});
 if(!response.ok)return null;
 const json=await parseJson(response),parts=json?.candidates?.[0]?.content?.parts||[];
 const text=parts.map(part=>part?.text||'').join('').trim();
 return text||null;
}

async function resolveCloudflareAccountId(fetchImpl,token,signal){
 const response=await fetchImpl('https://api.cloudflare.com/client/v4/accounts?page=1&per_page=1',{headers:{Authorization:`Bearer ${token}`},signal});
 if(!response.ok)return '';
 const json=await parseJson(response);return String(json?.result?.[0]?.id||'');
}

async function callCloudflare({fetchImpl,token,accountId,messages,language,signal}){
 if(!token)return null;
 const resolvedId=accountId||await resolveCloudflareAccountId(fetchImpl,token,signal);
 if(!resolvedId)return null;
 const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(resolvedId)}/ai/run/${CLOUDFLARE_MODEL}`;
 const cloudflareMessages=compactMessages(messages.slice(-4).map(message=>({...message,content:String(message.content||'').slice(0,500)})));
 const response=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:systemPrompt(language)},...cloudflareMessages],max_tokens:250,temperature:0.55}),signal});
 if(!response.ok)return null;
 const json=await parseJson(response),text=String(json?.result?.response||json?.result?.text||'').trim();
 return text||null;
}

async function withDeadline(task,milliseconds){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(new Error('PROVIDER_TIMEOUT')),milliseconds);
 try{return await task(controller.signal);}finally{clearTimeout(timer);}
}

function createAssistantRouter({fetchImpl=fetch,groqKey='',geminiKey='',cloudflareToken='',cloudflareAccountId='',allowGroq=true,allowGemini=true,allowCloudflare=true,beforeProvider=async()=>true,providerTimeoutMs=4500}={}){
 return async function route({messages,language}){
  const compact=compactMessages(messages);
  if(!compact.length)throw new LocalFallbackError();
  if(allowGroq&&await beforeProvider('groq')){
   try{const answer=await withDeadline(signal=>callGroq({fetchImpl,key:groqKey,messages:compact,language,signal}),providerTimeoutMs);if(answer)return {text:answer};}catch{}
  }
  if(allowGemini&&await beforeProvider('gemini')){
   try{const answer=await withDeadline(signal=>callGemini({fetchImpl,key:geminiKey,messages:compact,language,signal}),providerTimeoutMs);if(answer)return {text:answer};}catch{}
  }
  if(allowCloudflare&&await beforeProvider('cloudflare')){
   try{const answer=await withDeadline(signal=>callCloudflare({fetchImpl,token:cloudflareToken,accountId:cloudflareAccountId,messages:compact,language,signal}),providerTimeoutMs);if(answer)return {text:answer};}catch{}
  }
  throw new LocalFallbackError();
 };
}

module.exports={createAssistantRouter,compactMessages,LocalFallbackError,GROQ_MODEL,GEMINI_MODEL,CLOUDFLARE_MODEL};
