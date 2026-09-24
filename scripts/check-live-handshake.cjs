// Diagnostic: credentials stay in process memory; no audio or inference is sent.
const {execFileSync}=require('node:child_process');
const path=require('node:path');
(async()=>{
 const cli=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib/bin/firebase.js');
 const key=execFileSync(process.execPath,[cli,'functions:secrets:access','GEMINI_API_KEY','--project','doori-messenger'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
 console.log('Token HTTP status:',response.status);
 const body=await response.json();
 if(!response.ok){console.log('Provider status:',body.error?.status);return;}
 const source=require('node:fs').readFileSync(path.join(__dirname,'../doori-live.js'),'utf8');
 const setupSource=source.match(/const setup = (\{[\s\S]*?\n      \s*\});/)[1];
 const setup=Function('sysPrompt','liveVoice','state','return ('+setupSource+')')('Reply briefly.',()=> 'Kore',{resumeHandle:''});
 await new Promise(resolve=>{
 const ws=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token='+encodeURIComponent(body.name));
 const timer=setTimeout(()=>{console.log('Handshake timeout');ws.close();resolve();},15000);
 ws.onopen=()=>ws.send(JSON.stringify(setup));
 ws.onmessage=async e=>{const data=JSON.parse(typeof e.data==='string'?e.data:await e.data.text());console.log('Server message fields:',Object.keys(data));if(data.setupComplete){clearTimeout(timer);ws.close(1000);resolve();}};
 ws.onclose=e=>{clearTimeout(timer);console.log('Close:',e.code,e.reason.replaceAll(key,'[redacted]').replaceAll(body.name,'[redacted]'));resolve();};
 ws.onerror=()=>console.log('WebSocket transport error');
 });
})().catch(()=>{console.error('Diagnostic failed (credentials and raw response suppressed).');process.exitCode=1;});
