const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const createDOMPurify = require('dompurify');
const security = require('../security');
const root = path.resolve(__dirname,'..');
test('mentions preserve canonical @ and support all supported alphabets', () => {
 assert.deepEqual(security.collectMentions('Hi @Alice @ALICE @علی @unknown', ['@Alice','@علی']), ['@alice','@علی']);
});
test('login usernames resolve identically with or without an at sign',()=>{
 assert.equal(security.normalizeUsername('@Hedisubs'),'@hedisubs');
 assert.equal(security.normalizeUsername('Hedisubs'),'@hedisubs');
});
test('destination survives switching chats and saved messages are private', () => {
 const chat={id:'@alice',type:'dm'};
 const message={...security.messageDestination(chat,'@Bob'),text:'private'};
 chat.id='general'; chat.type='room';
 assert.deepEqual(message.participants,['@bob','@alice']);
 assert.equal(message.recipient_username,'@alice');
 assert.equal(message.isPublic,false);
 assert.deepEqual(security.messageDestination({id:'saved',type:'saved'},'@Bob').participants,['@bob']);
});
test('actual sendMessage keeps the original destination across asynchronous work', async () => {
 const vm=require('node:vm');
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=source.indexOf('async function sendMessage(');
 const end=source.indexOf('    async function executeSendMessage(',start);
 const sent=[];
 const context={...security,currentChat:{id:'@alice',type:'dm',isSecret:true},currentUser:'@Bob',
  blockedContacts:new Set(),editingMessageId:null,ttlSelect:{value:'0'},replyingToMessage:null,messages:new Map(),
  localStorage:{getItem:()=>null},executeSendMessage:async message=>sent.push(message)};
 context.encryptMessage=async()=>{context.currentChat={id:'@eve',type:'dm',isSecret:false};return 'encrypted';};
 vm.createContext(context);
 vm.runInContext(source.slice(start,end),context);
 await context.sendMessage('private');
 assert.equal(sent[0].recipient_username,'@alice');
 assert.equal(sent[0].chat_id,'@alice');
 assert.equal(sent[0].isSecret,true);
 assert.equal(sent[0].sender_username,'@Bob');
 assert.equal(sent[0].isPublic,false);
 await context.sendMessage('scheduled',null,null,false,Date.now()+60000);
 assert.equal(sent.length,1);
 context.currentChat={id:'saved',type:'saved'};
 await context.sendMessage('note');
 assert.equal(sent[1].isSecret,false);
 assert.ok(Object.values(sent[1]).every(value=>value!==undefined));
});
test('sanitizer removes executable markup and keeps display text', () => {
 const dom = new JSDOM('<div id="target"></div>');
 global.DOMPurify=createDOMPurify(dom.window);
 const name='<img src=x onerror="globalThis.pwned=true">';
 const target=dom.window.document.getElementById('target');
 target.innerHTML=security.safeHTML(`<b>${security.escapeHTML(name)}</b><img src=x onerror="alert(1)"><a href="javascript:alert(1)">bad</a><svg onload="alert(1)"></svg>`);
 assert.equal(target.querySelector('b').textContent,name);
 assert.equal(target.querySelector('[onerror],[onload],[onclick]'),null);
 assert.equal(target.querySelector('a').getAttribute('href'),null);
 dom.window.close();
});
test('action arguments cannot break out of HTML attributes or become code', () => {
 const dom=new JSDOM('<main></main>');
 global.DOMPurify=createDOMPurify(dom.window);
 const value=`');alert(1);//" onmouseover="alert(2)`;
 dom.window.document.querySelector('main').innerHTML=security.safeHTML(`<button ${security.actionAttrs('acceptGroupInvite',value)}>Join</button>`);
 const btn=dom.window.document.querySelector('button');
 assert.deepEqual(JSON.parse(btn.dataset.dooriArgs),[value]);
 assert.equal(btn.hasAttribute('onmouseover'),false);
 dom.window.close();
});
test('authentication additions cover five languages', () => {
 const dom=new JSDOM('',{runScripts:'outside-only'});
 dom.window.eval(fs.readFileSync(path.join(root,'auth-translations.js'),'utf8'));
 const texts=dom.window.AUTH_TRANSLATIONS;
 for (const lang of ['de','en','fa','ar','tr']) {
  assert.deepEqual(Object.keys(texts[lang]).sort(),Object.keys(texts.en).sort());
  for (const key of ['security_recovery_link','security_recover_button','security_recovery_instructions','security_recovery_sent','security_recovery_error']) assert.ok(texts[lang][key].trim(),`${lang}.${key}`);
 }
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.equal((html.match(/id="forgot-username-id-link"/g)||[]).length,1);
 assert.doesNotMatch(html,/id="forgot-password-link"/);
 dom.window.close();
});
test('application always starts dark and still supports switching to light mode', async () => {
 for (const mode of ['light','dark']) {
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://localhost/'});
  const w=dom.window;
  const errors=[];
  w.addEventListener('error',e=>{errors.push(e.error?.stack || e.message);e.preventDefault();});
  w.alert=()=>{};w.confirm=()=>false;w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});
  w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};
  w.AudioContext=class { constructor(){this.state='running';} resume(){return Promise.resolve();} createBuffer(){return {};} createBufferSource(){return {connect(){},start(){},buffer:null};} get destination(){return {};} };
  w.fetch=async()=>({json:async()=>[]});
  w.BroadcastChannel=class { postMessage() {} close() {} addEventListener() {} };
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({}, {get:()=>()=>{}});
  w.localStorage.setItem('doori_theme_mode',mode);
  w.DOMPurify=createDOMPurify(w);
  w.auth={onAuthStateChanged(){},currentUser:null};
  w.db={clearPersistence:()=>Promise.resolve()};
  w.accountFunctions={httpsCallable:()=>async()=>({data:{}})};
  w.firebase={auth:Object.assign(()=>w.auth,{Auth:{Persistence:{LOCAL:'local',SESSION:'session'}}}),firestore:{FieldValue:{}}};
  for(const file of ['security.js','auth-translations.js','account-client.js','app.js','webrtc.js','doodle.js']) w.eval(fs.readFileSync(path.join(root,file),'utf8'));
  await new Promise(resolve=>setTimeout(resolve,100));
  const schedule=w.document.getElementById('send-schedule-btn');
  assert.equal(w.document.getElementById('email-input').classList.contains('hidden'),true);
  assert.equal(w.document.getElementById('id-input').classList.contains('hidden'),false);
  const disabled=schedule.disabled, hidden=schedule.hidden;
  const startsDark=!w.document.body.classList.contains('light-mode');
  w.document.getElementById('setting-theme-mode').value='light';
  w.document.getElementById('setting-theme-mode').dispatchEvent(new w.Event('change'));
  const switchesToLight=w.document.body.classList.contains('light-mode');
  w.document.getElementById('tab-register').click();
  assert.equal(w.document.getElementById('tab-register').classList.contains('active'),true);
  assert.equal(w.document.getElementById('tab-login').classList.contains('active'),false);
  assert.equal(w.document.getElementById('tab-register').getAttribute('aria-selected'),'true');
  assert.equal(w.document.getElementById('email-label').classList.contains('hidden'),false);
  assert.equal(w.document.getElementById('registration-email-hint').classList.contains('hidden'),false);
  assert.equal(w.document.getElementById('id-label').classList.contains('hidden'),true);
  assert.equal(w.document.getElementById('forgot-links').style.display,'none');
  assert.equal(w.document.getElementById('username-label').dataset.i18n,'security_register_username_label');
  assert.equal(w.document.getElementById('email-label').dataset.i18n,'security_register_email_label');
  assert.equal(w.document.getElementById('password-label').dataset.i18n,'security_register_password_label');
  w.document.getElementById('tab-login').click();
  assert.equal(w.document.getElementById('tab-login').classList.contains('active'),true);
  assert.equal(w.document.getElementById('tab-register').classList.contains('active'),false);
  assert.equal(w.document.getElementById('username-label').dataset.i18n,'security_field_username_email');
  assert.equal(w.document.getElementById('password-label').classList.contains('hidden'),false);
  assert.equal(w.document.getElementById('id-label').classList.contains('hidden'),false);
  assert.equal(w.document.getElementById('forgot-links').style.display,'flex');
  dom.window.close();
  assert.deepEqual(errors,[],mode+' startup errors');
  assert.equal(disabled,true);
  assert.equal(hidden,true);
  assert.equal(startsDark,true);
  assert.equal(switchesToLight,true);
 }
});
test('add-contact actions stay inside their hidden modal and are translated',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const dom=new JSDOM(html);
 const close=dom.window.document.getElementById('close-add-contact-btn');
 const result=dom.window.document.getElementById('user-search-result');
 assert.equal(close.closest('#add-contact-modal')?.classList.contains('hidden'),true);
 assert.equal(result.closest('#add-contact-modal')?.id,'add-contact-modal');
 assert.equal(close.dataset.i18n,'btn_cancel');
 assert.equal(dom.window.document.querySelector('[data-i18n="modal_add_contact"]')?.closest('#add-contact-modal')?.id,'add-contact-modal');
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
 for(const text of ['Kontakt hinzufügen','Add contact','افزودن مخاطب','إضافة جهة اتصال','Kişi ekle']) assert.ok(source.includes(text),text);
 dom.window.close();
});
test('composer keeps only send beside the message field and moves plus to tools',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const dom=new JSDOM(html);
 const main=dom.window.document.querySelector('.composer-main-row');
 const tools=dom.window.document.querySelector('.composer-tools-row');
 assert.equal(main.querySelector('#message-input')?.id,'message-input');
 assert.equal(main.querySelector('#send-btn')?.id,'send-btn');
 assert.equal(main.querySelector('#plus-menu-btn'),null);
 assert.equal(tools.querySelector('#plus-menu-btn')?.id,'plus-menu-btn');
 assert.equal(tools.querySelector('#send-btn'),null);
 assert.equal(dom.window.document.getElementById('send-btn').dataset.i18nTitle,'title_send_message');
 dom.window.close();
});
test('voice playback survives periodic chat refreshes',()=>{
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(source,/media\.dataset\.playPending = 'true'/);
 assert.doesNotMatch(source,/if\(currentChat && !activeMedia\) renderMessages\(\)/);
 assert.match(source,/return b64\.replace\(/);
 assert.doesNotMatch(source,/URL\.createObjectURL\(blob\)/);
 assert.doesNotMatch(source,/alert\('Media Play Error:/);
});

test('sanitizer keeps stored audio data URLs playable',()=>{
 const dom=new JSDOM('<main></main>');
 global.DOMPurify=createDOMPurify(dom.window);
 const main=dom.window.document.querySelector('main');
 main.innerHTML=security.safeHTML('<audio src="data:audio/webm;base64,AAAA"></audio>');
 assert.equal(main.querySelector('audio')?.getAttribute('src'),'data:audio/webm;base64,AAAA');
 dom.window.close();
});

test('opening a chat renders its existing history immediately',()=>{
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=source.indexOf('function selectChat(id, type)');
 const end=source.indexOf('    ctxChatPin.addEventListener',start);
 const selectChatSource=source.slice(start,end);
 assert.match(selectChatSource,/renderMessages\(\);/);
 assert.match(selectChatSource,/markMessagesAsRead\(id\);/);
});

test('voice recording emits non-empty periodic chunks in a supported format',()=>{
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(source,/MediaRecorder\.isTypeSupported/);
 assert.match(source,/mediaRecorder\.start\(250\)/);
 assert.match(source,/e\.data && e\.data\.size > 0/);
 assert.match(source,/if \(!blob\.size\)/);
 for (const lang of ['de','en','ar','fa','tr']) {
   assert.match(source, new RegExp(`${lang}: \\{[^\\n]+err_empty_recording:`));
 }
});
test('Blaze deployment keeps mail secrets server-side and limits message listeners',()=>{
 const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8'));
 assert.equal(config.functions.source,'functions');assert.equal(config.emulators.functions.port,5001);
 for(const file of ['index.html','firebase-config.js','account-client.js','app.js','webrtc.js']){
  const code=fs.readFileSync(path.join(root,file),'utf8');
  assert.doesNotMatch(code,/xkeysib-[A-Za-z0-9_-]+|firebase-storage|\.storage\(\)/,file);
 }
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/orderBy\('timestamp', 'desc'\)\.limit\(50\)/);
 assert.match(app,/dmQuery\(\)\.limit\(200\)/);
});
test('email action links use an authorized continue domain and keep the branded destination',()=>{
 const source=fs.readFileSync(path.join(root,'functions','index.js'),'utf8');
 assert.match(source,/generatePasswordResetLink\(email,\{url:'https:\/\/doori-messenger\.web\.app\/'\}\)/);
 assert.match(source,/generateEmailVerificationLink\(record\.email,\{url:'https:\/\/doori-messenger\.web\.app\/'\}\)/);
 assert.match(source,/new URL\('https:\/\/doori-messenger\.de\/account\/action'\)/);
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/accountCreated \? 'security_created_email_error'/);
});
test('removed third-party games are absent from the public application',()=>{
 const publicSource=['index.html','app.js','style.css'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
 assert.doesNotMatch(publicSource,/games-menu-btn|games-list-modal|game-player-iframe|GAMES_LIST|billiards\.vercel|clumsy-bird|hextris\.io|react-tetris|flappy-bird|gabrielecirulli/i);
});
test('branded account action page covers all five languages and hides the default handler',()=>{
 const html=fs.readFileSync(path.join(root,'account-action.html'),'utf8');
 const script=fs.readFileSync(path.join(root,'account-action.js'),'utf8');
 assert.match(script,/doori-messenger\.firebaseapp\.com/); // Internal SDK configuration only.
 const dom=new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),{runScripts:'outside-only',url:'https://doori-messenger.de/account/action?lang=de'});
 assert.doesNotMatch(dom.window.document.body.textContent,/Firebase/i);
 dom.window.firebase={initializeApp(){},auth(){return {}}};
 dom.window.eval(script+';window.__ACTION_TEXT=ACTION_TEXT');
 const texts=dom.window.__ACTION_TEXT;
 for(const lang of ['de','en','ar','fa','tr']) assert.deepEqual(Object.keys(texts[lang]).sort(),Object.keys(texts.en).sort());
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8')).hosting.rewrites[0].source,'/account/action');
 dom.window.close();
});
