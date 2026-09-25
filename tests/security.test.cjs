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
test('email sign-in diagnostics contain only the stage and error code', async () => {
  const logged=[];
  const previous=console.error;
  const failure=Object.assign(new Error('private details'),{code:'permission-denied'});
  const auth={currentUser:{uid:'test-uid'},signInWithEmailAndPassword:async()=>({user:{}}),signOut:async()=>{}};
  const db={collection:name=>({doc:()=>({get:async()=>name==='accounts'
    ? {exists:true,data:()=>({key:'@testuser'})} : Promise.reject(failure)})})};
  const client=require('../account-client')(auth,db,{},{});
  console.error=(...args)=>logged.push(args);
  try {
    await assert.rejects(client.signIn({email:'private@example.test',password:'private-password',id:'123456'}),failure);
  } finally {
    console.error=previous;
  }
  assert.deepEqual(logged,[['Email sign-in failed','contact-id-check','permission-denied']]);
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(app,/console\.error\('Login failed', loginStage, error\?\.code \|\| 'unknown'\)/);
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

test('collaborative Doodle is private-chat only and has synchronized modern tools', () => {
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const doodle=fs.readFileSync(path.join(root,'doodle.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(app,/doodleBtnGlobal\.style\.display = type === 'dm' \? 'flex' : 'none'/);
 assert.match(app,/currentChat\.type !== 'dm'/);
 for (const id of ['doodle-color-presets','doodle-background-select','doodle-download-btn']) assert.match(html,new RegExp(`id="${id}"`));
 assert.match(doodle,/action: 'background'/);
 assert.match(doodle,/collection\('strokes'\)/);
 assert.match(doodle,/where\('receiver', '==', window\.currentUser\.toLowerCase\(\)\)/);
 assert.doesNotMatch(doodle,/window\.sendMessage\('', 'doodle_invite', null\);[\s\S]{0,120}openDoodleWorkspace\(\)/);
 assert.match(doodle,/data\.type === 'accept'[\s\S]{0,120}openDoodleWorkspace\(\)/);
 for (const lang of ['de','en','ar','fa','tr']) assert.match(app,new RegExp(`Object\\.assign\\(TRANSLATIONS\\.${lang}, \\{ lbl_doodle:'Doodle'`));
});

test('chat-list presence dots require fresh online presence and use green or red state', () => {
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 assert.match(app,/const isOnlineNow = !!presence\?\.isOnline && lastSeenMs > 0 && Date\.now\(\) - lastSeenMs <= 75000/);
 assert.match(app,/contact-presence-dot/);
 assert.match(app,/\? 'busy' : 'online'/);
 assert.match(css,/\.contact-presence-dot\.online \{ background:#28c76f; \}/);
 assert.match(css,/\.contact-presence-dot\.busy \{ background:#ff5d6c; \}/);
 assert.match(css,/\.chat-item\.unread::after \{ display:none; \}/);
});
test('authentication additions cover five languages', () => {
 const dom=new JSDOM('',{runScripts:'outside-only'});
 dom.window.eval(fs.readFileSync(path.join(root,'auth-translations.js'),'utf8'));
 const texts=dom.window.AUTH_TRANSLATIONS;
 for (const lang of ['de','en','fa','ar','tr']) {
  assert.deepEqual(Object.keys(texts[lang]).sort(),Object.keys(texts.en).sort());
  for (const key of ['security_recovery_link','security_recover_button','security_recovery_instructions','security_recovery_sent','security_recovery_error']) assert.ok(texts[lang][key].trim(),`${lang}.${key}`);
  assert.doesNotMatch(Object.values(texts[lang]).join(' '),/firebase/i,`${lang} must not expose the backend provider`);
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
  for(const file of ['security.js','auth-translations.js','account-client.js','message-cache.js','app.js','agora-calls.js','doodle.js']) w.eval(fs.readFileSync(path.join(root,file),'utf8'));
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

test('login reset preserves the message store read by the renderer',()=>{
 const vm=require('node:vm');
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const reset=source.slice(source.indexOf('async function loadUserData() {')+'async function loadUserData() {'.length,source.indexOf('        try {',source.indexOf('async function loadUserData() {')));
 const renderStart=source.indexOf('    function renderMessages() {');
 const read=source.slice(renderStart,source.indexOf('        const limitMap',renderStart))+'return allMsgs; }';
 const store=new Map([['@old', [{id:'old'}]]]);
 const context={messages:store,window:{messages:store},currentChat:{id:'@friend',type:'dm'},normalizeUsername:security.normalizeUsername};
 vm.createContext(context);
 vm.runInContext(reset,context);
 assert.equal(context.messages.size,0);
 context.messages.set('@friend',[{id:'history',text:'Existing history',timestamp:1}]);
 vm.runInContext(read,context);
 assert.equal(context.renderMessages()[0]?.text,'Existing history');
 assert.equal(context.messages,context.window.messages);
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
 for(const file of ['index.html','firebase-config.js','account-client.js','app.js','agora-calls.js']){
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

test('native two-player game center covers all games and five languages',()=>{
 const games=fs.readFileSync(path.join(root,'games.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const rules=fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
 const build=fs.readFileSync(path.join(root,'scripts/build-hosting.cjs'),'utf8');
 for(const lang of ['de','en','ar','fa','tr']) assert.match(games,new RegExp(`\\b${lang}:\\{`));
 for(const type of ['tictactoe','connect4','memory','quiz','battleship']) assert.ok(games.includes(type),type);
 assert.match(games,/runTransaction/);
 assert.doesNotMatch(games,/<iframe|https?:\/\//i,'game module remains native');
 assert.match(html,/id="games-btn"/);
 assert.match(html,/quiz-questions\.js\?v=1/);
  assert.match(html,/games\.js\?v=5/);
 assert.match(rules,/match \/gameSessions\/\{gameId\}/);
 assert.match(rules,/participants\.size\(\) == 2/);
 assert.match(build,/'games\.js'/);
 assert.match(build,/'quiz-questions\.js'/);
});
test('branded account action page covers all five languages and hides the default handler',()=>{
 const html=fs.readFileSync(path.join(root,'account-action.html'),'utf8');
 const script=fs.readFileSync(path.join(root,'account-action.js'),'utf8');
 assert.match(script,/doori-messenger\.firebaseapp\.com/); // Internal SDK configuration only.
 const dom=new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),{runScripts:'outside-only',url:'https://doori-messenger.de/account/action?lang=de'});
 assert.doesNotMatch(dom.window.document.body.textContent,/Firebase/i);
 dom.window.firebase={initializeApp(){},auth(){return {}},app(){return {functions(){return {httpsCallable(){}}}}}};
 dom.window.eval(script+';window.__ACTION_TEXT=ACTION_TEXT');
 const texts=dom.window.__ACTION_TEXT;
 for(const lang of ['de','en','ar','fa','tr']) {
  assert.deepEqual(Object.keys(texts[lang]).sort(),Object.keys(texts.en).sort());
  for(const k of ['deleteTitle','deleteSubtitle','deleteWarning','deleteButton','deleting','deleteSuccess']) {
   assert.ok(texts[lang][k] && texts[lang][k].trim().length > 0, `Missing ${lang}.${k}`);
  }
 }
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8')).hosting.rewrites[0].source,'/account/action');
 dom.window.close();
});

test('modern settings additions cover all five languages and preserve RTL for ar and fa',async ()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://localhost/'});
 const w=dom.window;
 w.alert=()=>{};w.confirm=()=>false;w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});
 w.AudioContext=class { constructor(){this.state='running';} resume(){return Promise.resolve();} createBuffer(){return {};} createBufferSource(){return {connect(){},start(){},buffer:null};} get destination(){return {};} };
 w.DOMPurify=createDOMPurify(w);
 w.auth={onAuthStateChanged(){},currentUser:null};
 w.db={clearPersistence:()=>Promise.resolve(),collection:()=>({doc:()=>({get:()=>Promise.resolve({exists:false})})})};
 w.BroadcastChannel=class { postMessage() {} close() {} addEventListener() {} };
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({}, {get:()=>()=>{}});
 w.accountFunctions={httpsCallable:()=>async()=>({data:{}})};
 w.firebase={auth:Object.assign(()=>w.auth,{Auth:{Persistence:{LOCAL:'local',SESSION:'session'}}}),firestore:{FieldValue:{}}};
 for(const file of ['security.js','auth-translations.js','account-client.js','message-cache.js','app.js']) w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 await new Promise(resolve=>setTimeout(resolve,100));

 // Composer plus menu must open visibly and close only after an outside click.
 const plusMenuButton = w.document.getElementById('plus-menu-btn');
 const plusMenu = w.document.getElementById('plus-menu-dropdown');
 assert.ok(plusMenuButton && plusMenu, 'plus menu controls exist');
 plusMenuButton.click();
 assert.equal(plusMenu.classList.contains('hidden'), false, 'plus menu opens after clicking plus');
 w.document.body.click();
 assert.equal(plusMenu.classList.contains('hidden'), true, 'plus menu closes after outside click');
 const texts=w.TRANSLATIONS;
  const requiredKeys=[
   'tab_account', 'lbl_account_email', 'lbl_change_password', 'lbl_current_password',
   'lbl_new_password', 'lbl_confirm_password', 'btn_update_password', 'msg_password_updated',
   'err_password_mismatch', 'err_wrong_current_password', 'lbl_app_lock', 'lbl_app_lock_desc',
   'lbl_set_pin', 'btn_enable_pin', 'btn_disable_pin', 'msg_pin_enabled', 'msg_pin_disabled',
   'err_pin_invalid', 'pin_enter_title', 'pin_enter_prompt', 'pin_unlock_btn', 'err_pin_wrong',
   'lbl_danger_zone', 'btn_delete_account', 'msg_confirm_delete_account', 'prompt_delete_password',
   'msg_account_deleted', 'msg_deletion_email_sent', 'lbl_notification_sound', 'opt_sound_chime', 'opt_sound_soft',
   'opt_sound_bell', 'opt_sound_classic', 'btn_test_sound', 'lbl_hide_preview',
   'lbl_hide_preview_desc', 'lbl_vibrate', 'lbl_vibrate_desc', 'lbl_auto_media',
   'opt_media_always', 'opt_media_wifi', 'opt_media_manual', 'btn_export_chat',
   'msg_export_success', 'err_no_chat_to_export',
   'tab_filter_all', 'tab_filter_direct', 'tab_filter_groups', 'tab_filter_unread',
   'ctx_star', 'ctx_unstar', 'btn_starred_messages', 'modal_starred_title', 'msg_starred_empty',
   'btn_unstar', 'btn_jump_to_chat', 'btn_shared_media', 'modal_shared_media_title',
   'tab_media_photos', 'tab_media_audio', 'tab_media_files', 'msg_no_media_found',
   'lbl_profile_status', 'lbl_profile_status_desc', 'ph_custom_status',
   'opt_status_available', 'opt_status_busy', 'opt_status_work', 'opt_status_travel',
   'opt_status_vacation', 'opt_status_sleep', 'btn_save_status', 'msg_status_updated'
  ];
  for (const lang of ['de','en','fa','ar','tr']) {
   for (const key of requiredKeys) {
    assert.ok(texts[lang] && typeof texts[lang][key] === 'string' && texts[lang][key].trim().length > 0, `Missing or empty ${lang}.${key}`);
   }
  }
  assert.ok(html.includes('id="tab-account"'));
  assert.ok(html.includes('id="app-lock-overlay"'));
  assert.ok(html.includes('id="setting-sound-type"'));
  assert.ok(html.includes('id="btn-export-chat"'));
  assert.ok(html.includes('id="chat-filter-bar"'));
  assert.ok(html.includes('id="list-chats-items"'));
  assert.ok(html.includes('id="starred-messages-modal"'));
  assert.ok(html.includes('id="shared-media-modal"'));
  assert.ok(html.includes('id="status-presets"'));
  assert.ok(html.includes('id="btn-save-status"'));
  assert.ok(html.includes('id="current-chat-status-badge"'));
  assert.ok(html.includes('id="chat-starred-btn"'));
  assert.ok(html.includes('id="chat-media-btn"'));
  dom.window.close();
 });

test('two-step account deletion sends red confirmation email and second deleted email in 5 languages', ()=>{
 const funcCode=fs.readFileSync(path.join(root,'functions','index.js'),'utf8');
 assert.match(funcCode,/exports\.requestAccountDeletion/);
 assert.match(funcCode,/exports\.confirmAccountDeletion/);
 assert.match(funcCode,/customDeletionLink/);
 assert.match(funcCode,/background-color:#d63031/);
 assert.match(funcCode,/color:#ffffff/);
 assert.match(funcCode,/accountDeletionRequests/);
 const actionHtml=fs.readFileSync(path.join(root,'account-action.html'),'utf8');
 assert.ok(actionHtml.includes('id="delete-box"'));
 assert.ok(actionHtml.includes('id="delete-confirm-button"'));
 assert.ok(actionHtml.includes('firebase-functions-compat.js'));
 assert.ok(actionHtml.includes('europe-west3-doori-messenger.cloudfunctions.net'));
 const appCode=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(appCode,/requestAccountDeletion/);
});

test('five modern features (chat filter, voice speed, starred messages, profile status, shared media) are fully functional', async () => {
 const html = fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const dom = new JSDOM(html,{runScripts:'outside-only',url:'https://localhost/'});
 const w = dom.window;
 w.alert = () => {};
 w.confirm = () => true;
 w.matchMedia = () => ({matches:false,addListener(){},addEventListener(){}});
 w.DOMPurify = createDOMPurify(w);
 w.auth = {onAuthStateChanged(){},currentUser:null};
 w.db = {clearPersistence:()=>Promise.resolve(),collection:()=>({doc:()=>({get:()=>Promise.resolve({exists:false}),set:()=>Promise.resolve(),onSnapshot:()=>()=>{}})})};
 w.BroadcastChannel = class { postMessage() {} close() {} addEventListener() {} };
 w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {get:()=>()=>{}});
 w.accountFunctions = {httpsCallable:()=>async()=>({data:{}})};
 w.firebase = {auth:Object.assign(()=>w.auth,{Auth:{Persistence:{LOCAL:'local',SESSION:'session'}}}),firestore:{FieldValue:{}}};
 for(const file of ['security.js','auth-translations.js','account-client.js','message-cache.js','app.js']) w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 await new Promise(resolve=>setTimeout(resolve,100));

 // 1. Chat filter bar and pills exist
 const filterBar = w.document.getElementById('chat-filter-bar');
 assert.ok(filterBar, 'chat-filter-bar exists');
 const pills = filterBar.querySelectorAll('.filter-pill');
 assert.equal(pills.length, 3, '3 filter pills: all, direct and unread');
 assert.deepEqual(Array.from(pills, pill => pill.dataset.filter), ['all','direct','unread']);

 // 2. Audio player playback speed button and preload="none" for bandwidth optimization
 const playerHtml = w.renderCustomPlayer('https://example.com/audio.mp3', 'audio');
 assert.ok(playerHtml.includes('player-speed-btn'), 'custom player has speed toggle button');
 assert.ok(playerHtml.includes('preload="none"'), 'custom player has preload none for bandwidth saving');

 // 3. Starred messages helper and modal
 assert.ok(typeof w.isMessageStarred === 'function');
 assert.ok(typeof w.toggleStarMessage === 'function');
 const testMsg = { id: 'msg123', sender_username: '@alice', text: 'Hello star', timestamp: Date.now() };
 assert.equal(w.isMessageStarred('msg123'), false);
 w.toggleStarMessage(testMsg);
 assert.equal(w.isMessageStarred('msg123'), true);
 w.toggleStarMessage(testMsg);
 assert.equal(w.isMessageStarred('msg123'), false);

  // 4. Status presets exist and custom status input exists
  const presets = w.document.querySelectorAll('.status-preset-btn');
  assert.ok(presets.length >= 6, 'at least 6 status presets');
  const customStatus = w.document.getElementById('setting-custom-status');
  assert.ok(customStatus, 'custom status input exists');
  const saveStatusBtn = w.document.getElementById('btn-save-status');
  assert.ok(saveStatusBtn, 'btn-save-status exists');

  // Verify multilingual status preset resolution across languages
  assert.ok(typeof w.getPresetKeyFromStatus === 'function', 'getPresetKeyFromStatus exists');
  assert.equal(w.getPresetKeyFromStatus('🚀 Bei der Arbeit'), 'opt_status_work');
  assert.equal(w.getPresetKeyFromStatus('🚀 At work'), 'opt_status_work');
  assert.equal(w.getPresetKeyFromStatus('🚀 در حال کار'), 'opt_status_work');
  assert.equal(w.getPresetKeyFromStatus('🚀 في العمل'), 'opt_status_work');
  assert.equal(w.getPresetKeyFromStatus('🚀 İşte'), 'opt_status_work');
  customStatus.value = '🚀 Bei der Arbeit';
  w.currentLang = 'fa';
  w.syncSettingsStatusUI();
  assert.equal(customStatus.value, '🚀 در حال کار', 'Status preset translated to Persian');
  w.currentLang = 'ar';
  w.syncSettingsStatusUI();
  assert.equal(customStatus.value, '🚀 في العمل', 'Status preset translated to Arabic');

 // 5. Shared media modal and tabs exist
 const mediaModal = w.document.getElementById('shared-media-modal');
 assert.ok(mediaModal, 'shared-media-modal exists');
 const mediaTabs = mediaModal.querySelectorAll('.shared-media-tab');
 assert.equal(mediaTabs.length, 3, '3 media tabs (photos, audio, files)');

 // 6. MessageCache functionality (IndexedDB / Memory fallback)
 assert.ok(w.MessageCache, 'MessageCache is defined');
 const sampleMsgs = [
   { id: 'm1', text: 'Old msg', timestamp: 1000 },
   { id: 'm2', text: 'New msg', timestamp: 2000 }
 ];
 await w.MessageCache.saveMessages('chat_test', sampleMsgs);
 const latest = await w.MessageCache.getLatestMessages('chat_test', 10);
 assert.equal(latest.length, 2, 'MessageCache stores and returns latest messages');
 assert.equal(latest[0].id, 'm1');
 assert.equal(latest[1].id, 'm2');

 // 7. Message pagination in DOM (only latest 40 messages rendered initially)
 const container = w.document.getElementById('messages-container');
 const bigMsgList = [];
 for (let i = 1; i <= 60; i++) {
   bigMsgList.push({ id: 'msg_' + i, text: 'Message ' + i, timestamp: i * 1000, sender_username: '@alice' });
 }
 w.messages.set('chat_paginated', bigMsgList);
 w.currentChat = { id: 'chat_paginated', type: 'dm', name: '@alice' };
 w.visibleMessageLimits.set('chat_paginated', 40);
 w.renderMessages();
 const renderedCount = container.children.length;
 assert.ok(renderedCount <= 40, `Only up to 40 messages rendered initially, actual: ${renderedCount}`);

 // A contact stored without @ must still render messages indexed with canonical @.
 w.messages.delete('chat_paginated');
 w.messages.set('@chat_paginated', [{ id: 'alias_msg', text: 'Existing aliased history', timestamp: 9000, sender_username: '@chat_paginated' }]);
 w.renderMessages();
 assert.match(container.textContent, /Existing aliased history/, 'history renders across username/@username aliases');

 // 8. Status appears in parentheses in chat list next to name/ID and does not overwrite Online status
 w.users.set('bob', { status: '☕ Beschäftigt', bio: '☕ Beschäftigt' });
 w.users.set('@bob', { status: '☕ Beschäftigt', bio: '☕ Beschäftigt' });
 w.chatData.contacts = [{ id: 'bob', name: 'bob', type: 'dm', isSecret: false }];
 w.currentLang = 'de';
 w.renderChatList();
 const contactItem = w.document.querySelector('.chat-item[data-id="bob"]');
 assert.ok(contactItem, 'contactItem exists');
 assert.ok(contactItem.innerHTML.includes('(☕ Beschäftigt)'), 'Status appears in parentheses next to name in list');
 const onlineStatusEl = w.document.getElementById('current-chat-status');
 assert.ok(onlineStatusEl, 'current-chat-status indicator exists independently');
 const currentUserStatusDisplay = w.document.getElementById('current-user-status-display');
 assert.ok(currentUserStatusDisplay, 'current-user-status-display exists in sidebar header');

 dom.window.close();
});

test('Aurora UI keeps primary calls visible, moves secondary actions into the menu and supports responsive light/RTL layouts', () => {
 const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
 const css = fs.readFileSync(path.join(root,'style.css'),'utf8');
 const appCode = fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(html,/id="call-buttons-container"/);
 assert.match(html,/id="video-call-btn"/);
 assert.match(html,/id="call-btn"/);
 assert.match(html,/id="chat-more-btn"[^>]+data-i18n-title="title_more_options"/);
 assert.match(html,/id="dropdown-starred-messages"/);
 assert.match(html,/id="dropdown-shared-media"/);
 assert.match(css,/\.chat-actions #chat-starred-btn,[\s\S]*#chat-media-btn \{ display: none !important; \}/);
 assert.match(css,/\.chat-container\.split-view/);
 assert.match(css,/Aurora three-column shell: icon rail \+ conversations \+ chat/);
 assert.match(css,/\.chat-container\.split-view \.top-nav/);
 assert.match(css,/flex-direction:column/);
 assert.ok((html.match(/class="nav-icon"/g) || []).length >= 6, 'desktop icon rail has navigation icons');
 assert.match(html,/id="conversation-details-panel"/);
 assert.match(html,/id="chat-empty-state"/);
 assert.match(appCode,/const split = prefersSplitMessenger\(\);/);
 assert.match(appCode,/syncMessengerLayout\(false\);/);
 assert.match(css,/\.chat-container\.awaiting-chat #chat-page \.main-chat \{ display:none!important; \}/);
 assert.match(css,/\.composer-tools-row,.chat-input-area,.plus-menu-container \{ overflow:visible!important; \}/);
 assert.match(css,/Mobile web: the existing menu becomes a slim vertical dock/);
 assert.match(css,/#start-page\.active \{ position:relative;padding-inline-start:70px; \}/);
 assert.match(css,/#start-page\.active \.top-nav \{/);
 assert.match(css,/@media \(max-width: 899px\)/);
 assert.match(css,/body\.light-mode \.settings-content/);
 assert.match(css,/\.rtl-mode \.settings-tabs \.tab-btn\.active/);
 assert.match(appCode,/if \(videoBtn\) videoBtn\.style\.display = 'flex'/);
 assert.match(appCode,/if \(callContainer\) callContainer\.style\.display = 'flex'/);
  for (const lang of ['de','en','fa','ar','tr']) {
   const marker = new RegExp(`${lang}: \\{[^}]*title_more_options:`);
   assert.match(appCode, marker, `missing title_more_options for ${lang}`);
  }
});

function activityDb(records) {
  const store = new Map(Object.entries(records));
  return {
    store,
    collection: name => ({doc: id => ({path:`${name}/${id}`})}),
    runTransaction: async callback => {
      const writes=[];
      const transaction={
        get: async ref => ({data:()=>store.get(ref.path) && structuredClone(store.get(ref.path))}),
        update: (ref, patch) => writes.push(()=>store.set(ref.path,{...store.get(ref.path),...patch})),
        set: (ref, data) => writes.push(()=>store.set(ref.path,structuredClone(data)))
      };
      const result=await callback(transaction);
      writes.forEach(write=>write());
      return result;
    }
  };
}

test('new activity supersedes a pending game invitation and leaves accepted sessions untouched', async () => {
  const {replaceActivityInvitation}=require('../functions/activity-invitations');
  const now=Date.now(), participants=['@alice','@bob'];
  const newMessage={id:'newlounge123',mediaType:'live_media_invite',mediaUrl:JSON.stringify({id:'lounge123'}),
    sender_username:'@alice',recipient_username:'@bob',participants,isPublic:false,timestamp:now};
  const oldMessage={id:'oldgame123',mediaType:'game_invite',mediaUrl:JSON.stringify({id:'game12345'}),
    sender_username:'@bob',recipient_username:'@alice',participants,isPublic:false,timestamp:now-1000};
  const db=activityDb({
    'messages/newlounge123':newMessage,'messages/oldgame123':oldMessage,
    'gameSessions/game12345':{status:'pending',createdBy:'@bob',participants},
    'liveMediaSessions/lounge123':{status:'pending',creator:'@alice',participants}
  });
  const result=await replaceActivityInvitation(db,'@alice','@bob','newlounge123',['oldgame123']);
  assert.equal(result.replaced,1);
  assert.equal(db.store.get('messages/oldgame123').game_status,'superseded');
  assert.equal(db.store.get('gameSessions/game12345').status,'superseded');
  assert.equal(db.store.get('liveMediaSessions/lounge123').status,'pending');
  assert.ok([...db.store.keys()].some(name=>name.startsWith('_activityInvites/')));

  db.store.set('gameSessions/game12345',{status:'active',createdBy:'@bob',participants});
  db.store.set('messages/oldgame123',oldMessage);
  const accepted=await replaceActivityInvitation(db,'@alice','@bob','newlounge123',['oldgame123']);
  assert.equal(accepted.replaced,0);
  assert.equal(db.store.get('gameSessions/game12345').status,'active');
  assert.equal(db.store.get('messages/oldgame123').game_status,undefined);
});

test('activity replacement rejects foreign chats and cannot terminate a newer Doodle invite', async () => {
  const {replaceActivityInvitation}=require('../functions/activity-invitations');
  const now=Date.now(), participants=['@alice','@bob'];
  const db=activityDb({
    'messages/newdoodle123':{id:'newdoodle123',mediaType:'doodle_invite',sender_username:'@alice',recipient_username:'@bob',participants,isPublic:false,timestamp:now},
    'messages/olddoodle123':{id:'olddoodle123',mediaType:'doodle_invite',sender_username:'@bob',recipient_username:'@alice',participants,isPublic:false,timestamp:now-1000},
    'messages/foreign123':{id:'foreign123',mediaType:'game_invite',sender_username:'@alice',recipient_username:'@mallory',participants:['@alice','@mallory'],isPublic:false,timestamp:now-1000},
    'doodle_sessions/session_@alice_@bob':{type:'invite',caller:'@alice',receiver:'@bob',inviteMessageId:'newdoodle123'}
  });
  const result=await replaceActivityInvitation(db,'@alice','@bob','newdoodle123',['olddoodle123','foreign123']);
  assert.equal(result.replaced,1);
  assert.equal(db.store.get('messages/olddoodle123').activity_status,'superseded');
  assert.equal(db.store.get('doodle_sessions/session_@alice_@bob').type,'invite');
  assert.equal(db.store.get('messages/foreign123').activity_status,undefined);
  await assert.rejects(replaceActivityInvitation(db,'@mallory','@bob','newdoodle123',[]),{code:'permission-denied'});
});

test('pair-level invitation pointer replaces the previous request without a cached chat history', async () => {
  const {replaceActivityInvitation}=require('../functions/activity-invitations');
  const now=Date.now(),participants=['@alice','@bob'];
  const db=activityDb({
    'messages/firstgame123':{id:'firstgame123',mediaType:'game_invite',mediaUrl:'{"id":"game12345"}',sender_username:'@alice',recipient_username:'@bob',participants,isPublic:false,timestamp:now},
    'messages/secondlounge123':{id:'secondlounge123',mediaType:'live_media_invite',mediaUrl:'{"id":"lounge12345"}',sender_username:'@bob',recipient_username:'@alice',participants,isPublic:false,timestamp:now},
    'gameSessions/game12345':{status:'pending',createdBy:'@alice',participants},
    'liveMediaSessions/lounge12345':{status:'pending',creator:'@bob',participants}
  });
  assert.equal((await replaceActivityInvitation(db,'@alice','@bob','firstgame123',[])).replaced,0);
  assert.equal((await replaceActivityInvitation(db,'@bob','@alice','secondlounge123',[])).replaced,1);
  assert.equal(db.store.get('gameSessions/game12345').status,'superseded');
});

test('activity invite acceptance checks the backing Doodle session and its message id', () => {
  const doodle=fs.readFileSync(path.join(root,'doodle.js'),'utf8');
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(doodle,/data\.type!=='invite'/);
  assert.match(doodle,/data\.inviteMessageId!==messageId/);
  assert.match(doodle,/transaction\.update\(currentDoodleDocRef,\{type:'accept'/);
  assert.match(app,/replaceActivityInvitation/);
  assert.match(app,/activity_invite_superseded/);
  assert.doesNotMatch(app,/doodleTypes\.includes\(m\.mediaType\)[\s\S]{0,160}\.delete\(\)/);
  const rules=fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
  assert.match(rules,/resource\.data\.type in \['invite', 'reject', 'end'\]/);
  assert.match(rules,/request\.resource\.data\.caller == resource\.data\.receiver/);
});
