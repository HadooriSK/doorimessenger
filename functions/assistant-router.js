'use strict';

const GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL='openai/gpt-oss-20b';
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

async function callGroq({fetchImpl,key,messages,language}){
 if(!key)return null;
  const response=await fetchImpl(GROQ_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:GROQ_MODEL,temperature:0.55,max_completion_tokens:450,messages:[{role:'system',content:systemPrompt(language)},...messages]}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)return null;
 const json=await parseJson(response),text=String(json?.choices?.[0]?.message?.content||'').trim();
 return text||null;
}

async function resolveCloudflareAccountId(fetchImpl,token){
 const response=await fetchImpl('https://api.cloudflare.com/client/v4/accounts?page=1&per_page=1',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000)});
 if(!response.ok)return '';
 const json=await parseJson(response);return String(json?.result?.[0]?.id||'');
}

async function callCloudflare({fetchImpl,token,accountId,messages,language}){
 if(!token)return null;
 const resolvedId=accountId||await resolveCloudflareAccountId(fetchImpl,token);
 if(!resolvedId)return null;
 const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(resolvedId)}/ai/run/${CLOUDFLARE_MODEL}`;
 const cloudflareMessages=compactMessages(messages.slice(-4).map(message=>({...message,content:String(message.content||'').slice(0,500)})));
 const response=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:systemPrompt(language)},...cloudflareMessages],max_tokens:250,temperature:0.55}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)return null;
 const json=await parseJson(response),text=String(json?.result?.response||json?.result?.text||'').trim();
 return text||null;
}

function createAssistantRouter({fetchImpl=fetch,groqKey='',cloudflareToken='',cloudflareAccountId='',allowGroq=true,allowCloudflare=true,beforeProvider=async()=>true}={}){
 return async function route({messages,language}){
  const compact=compactMessages(messages);
  if(!compact.length)throw new LocalFallbackError();
  if(allowGroq&&await beforeProvider('groq')){
   try{const answer=await callGroq({fetchImpl,key:groqKey,messages:compact,language});if(answer)return {text:answer};}catch{}
  }
  if(allowCloudflare&&await beforeProvider('cloudflare')){
   try{const answer=await callCloudflare({fetchImpl,token:cloudflareToken,accountId:cloudflareAccountId,messages:compact,language});if(answer)return {text:answer};}catch{}
  }
  throw new LocalFallbackError();
 };
}

module.exports={createAssistantRouter,compactMessages,LocalFallbackError,GROQ_MODEL,CLOUDFLARE_MODEL};
