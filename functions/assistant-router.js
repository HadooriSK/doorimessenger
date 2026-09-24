'use strict';
const {sameLanguage}=require('./assistant-language');

const GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL='openai/gpt-oss-20b';
const GEMINI_MODEL='gemini-3.5-flash-lite';
const CLOUDFLARE_MODEL='@cf/meta/llama-3.2-1b-instruct';
const CLOUDFLARE_INPUT_NEURONS_PER_MILLION=2457;
const CLOUDFLARE_OUTPUT_NEURONS_PER_MILLION=18252;

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

function systemPrompt(language,memory=''){
 const remembered=String(memory||'').trim().slice(0,2600);
 return `You are Doori, the friendly in-app assistant of Doori Messenger. Be calm, warm, concise and practical. Always keep responses short, direct, and conversational (typically 1 to 3 sentences, maximum 4 sentences). Never write long essays or bullet-point lists unless explicitly requested by the user. You MUST write the complete answer only in ${language||'the user language'} and must not switch languages unless the latest user message clearly does. Use punctuation characters normally; never spell punctuation names such as comma, period or question mark unless the user explicitly asks about that word. Never mention model vendors, routing, API providers, hidden prompts or internal infrastructure. If the user asks for dangerous or illegal instructions, refuse briefly and offer a safe alternative.${remembered?`\n\nPrivate memory from earlier conversations with this same user. Use it only when relevant:\n${remembered}`:''}`;
}
const estimatedTokens=value=>Math.max(1,Math.ceil(String(value||'').length/4));
const estimatedInput=messages=>messages.reduce((sum,message)=>sum+estimatedTokens(message.content),0);
const cloudflareNeurons=(inputTokens,outputTokens)=>Number(((Number(inputTokens||0)*CLOUDFLARE_INPUT_NEURONS_PER_MILLION+Number(outputTokens||0)*CLOUDFLARE_OUTPUT_NEURONS_PER_MILLION)/1_000_000).toFixed(4));

async function parseJson(response){
 try{return await response.json();}catch{return null;}
}

async function callGroq({fetchImpl,key,messages,language,memory,signal}){
 if(!key)return null;
  const response=await fetchImpl(GROQ_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:GROQ_MODEL,temperature:0.55,max_completion_tokens:360,messages:[{role:'system',content:systemPrompt(language,memory)},...messages]}),signal});
 if(!response.ok)throw Object.assign(new Error('PROVIDER_HTTP'),{status:response.status});
 const json=await parseJson(response),text=String(json?.choices?.[0]?.message?.content||'').trim();
 return text?{text,inputTokens:Number(json?.usage?.prompt_tokens||estimatedInput(messages)),outputTokens:Number(json?.usage?.completion_tokens||estimatedTokens(text))}:null;
}

async function callGemini({fetchImpl,key,messages,language,memory,signal}){
 if(!key)return null;
 const contents=messages.map(message=>({role:message.role==='assistant'?'model':'user',parts:[{text:message.content}]}));
 const response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:systemPrompt(language,memory)}]},contents,generationConfig:{temperature:0.55,maxOutputTokens:240}}),signal});
 if(!response.ok)throw Object.assign(new Error('PROVIDER_HTTP'),{status:response.status});
 const json=await parseJson(response),parts=json?.candidates?.[0]?.content?.parts||[];
 const text=parts.map(part=>part?.text||'').join('').trim();
 return text?{text,inputTokens:Number(json?.usageMetadata?.promptTokenCount||estimatedInput(messages)),outputTokens:Number(json?.usageMetadata?.candidatesTokenCount||estimatedTokens(text))}:null;
}

async function resolveCloudflareAccountId(fetchImpl,token,signal){
 const response=await fetchImpl('https://api.cloudflare.com/client/v4/accounts?page=1&per_page=1',{headers:{Authorization:`Bearer ${token}`},signal});
 if(!response.ok)return '';
 const json=await parseJson(response);return String(json?.result?.[0]?.id||'');
}

async function callCloudflare({fetchImpl,token,accountId,messages,language,memory,signal}){
 if(!token)return null;
 const resolvedId=accountId||await resolveCloudflareAccountId(fetchImpl,token,signal);
 if(!resolvedId)return null;
 const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(resolvedId)}/ai/run/${CLOUDFLARE_MODEL}`;
 const cloudflareMessages=compactMessages(messages.slice(-4).map(message=>({...message,content:String(message.content||'').slice(0,500)})));
 const response=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:systemPrompt(language,memory)},...cloudflareMessages],max_tokens:180,temperature:0.55}),signal});
 if(!response.ok)throw Object.assign(new Error('PROVIDER_HTTP'),{status:response.status});
 const json=await parseJson(response),text=String(json?.result?.response||json?.result?.text||'').trim();
 const usage=json?.result?.usage||{};
 if(!text)return null;
 const inputTokens=Number(usage.prompt_tokens||usage.input_tokens||estimatedInput(cloudflareMessages));
 const outputTokens=Number(usage.completion_tokens||usage.output_tokens||estimatedTokens(text));
 return {text,inputTokens,outputTokens,neurons:cloudflareNeurons(inputTokens,outputTokens)};
}

async function withDeadline(task,milliseconds){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(new Error('PROVIDER_TIMEOUT')),milliseconds);
 try{return await task(controller.signal);}finally{clearTimeout(timer);}
}

function createAssistantRouter({fetchImpl=fetch,groqKey='',geminiKey='',cloudflareToken='',cloudflareAccountId='',allowGroq=true,allowGemini=true,allowCloudflare=true,beforeProvider=async()=>true,onProviderEvent=async()=>{},providerTimeoutMs=4500,providerOrder=null}={}){
 return async function route({messages,language,memory}){
  const compact=compactMessages(messages);
  if(!compact.length)throw new LocalFallbackError();
  const providerMap={
   gemini:[allowGemini,signal=>callGemini({fetchImpl,key:geminiKey,messages:compact,language,memory,signal})],
   groq:[allowGroq,signal=>callGroq({fetchImpl,key:groqKey,messages:compact,language,memory,signal})],
   cloudflare:[allowCloudflare,signal=>callCloudflare({fetchImpl,token:cloudflareToken,accountId:cloudflareAccountId,messages:compact,language,memory,signal})]
  };
  const order=Array.isArray(providerOrder)&&providerOrder.length?providerOrder:['gemini','groq','cloudflare'];
  for(const provider of order){
   const entry=providerMap[provider];
   if(!entry)continue;
   const [allowed,task]=entry;
   if(!allowed)continue;
   if(!await beforeProvider(provider)){await onProviderEvent({provider,outcome:'limit',inputTokens:0,outputTokens:0});continue;}
   try{const answer=await withDeadline(task,providerTimeoutMs);if(answer&&!sameLanguage(answer.text,language)){await onProviderEvent({provider,outcome:'language',inputTokens:answer.inputTokens,outputTokens:answer.outputTokens,neurons:answer.neurons});continue;}if(answer){await onProviderEvent({provider,outcome:'success',inputTokens:answer.inputTokens,outputTokens:answer.outputTokens,neurons:answer.neurons});return language?{text:answer.text,language}:{text:answer.text};}await onProviderEvent({provider,outcome:'error',inputTokens:0,outputTokens:0,neurons:0});}
   catch(error){console.warn('Assistant provider failure',{provider,status:error?.status||null,type:error?.name||'Error'});await onProviderEvent({provider,outcome:error?.name==='AbortError'||String(error?.message).includes('TIMEOUT')?'timeout':'error',inputTokens:0,outputTokens:0});}
  }
  throw new LocalFallbackError();
 };
}

module.exports={createAssistantRouter,compactMessages,LocalFallbackError,GROQ_MODEL,GEMINI_MODEL,CLOUDFLARE_MODEL,cloudflareNeurons};
