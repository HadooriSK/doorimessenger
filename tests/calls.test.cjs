const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'agora-calls.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

function readCallTranslations() {
  const marker = 'const TEXT = ';
  const start = source.indexOf(marker) + marker.length;
  const end = source.indexOf('\n};', start) + 2;
  const context = {};
  vm.createContext(context);
  vm.runInContext(`globalThis.value = ${source.slice(start, end)}`, context);
  return context.value;
}

test('voice and video call UI has modern controls without duplicate ids', () => {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const required = [
    'call-modal', 'call-duration', 'speaker-toggle-btn', 'mute-call-btn', 'accept-call-btn', 'reject-call-btn',
    'video-call-modal', 'video-grid', 'video-remote', 'video-local', 'video-call-duration',
    'video-speaker-toggle-btn', 'video-toggle-cam-btn', 'video-switch-camera-btn',
    'video-toggle-mic-btn', 'video-share-screen-btn', 'video-fullscreen-btn',
    'video-accept-btn', 'video-reject-btn'
  ];
  for (const id of required) assert.ok(document.getElementById(id), `missing #${id}`);
  for (const id of required) assert.equal(document.querySelectorAll(`#${id}`).length, 1, `#${id} must be unique`);
  assert.equal(document.querySelectorAll('#group-call-participants').length, 1, 'group call participant container must be unique');
  assert.equal(document.getElementById('call-modal').getAttribute('aria-modal'), 'true');
  assert.equal(document.getElementById('video-call-modal').getAttribute('aria-modal'), 'true');
  dom.window.close();
});

test('group spaces expose calls, administration and responsive member tools', () => {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  for (const id of ['group-audio-call-btn','group-video-call-btn','group-quick-invite-btn','group-quick-media-btn','group-member-filter-input','group-members-badge','group-readonly-toggle']) {
    assert.equal(document.querySelectorAll(`#${id}`).length, 1, `missing or duplicate #${id}`);
  }
  assert.match(source, /window\.startGroupCall=async/);
  assert.match(source, /collection\('call_participants'\)/);
  dom.window.close();
});

test('call UI and runtime messages cover all five languages', () => {
  const translations = readCallTranslations();
  const languages = ['de', 'en', 'ar', 'fa', 'tr'];
  const keys = Object.keys(translations.en).sort();
  for (const language of languages) {
    assert.deepEqual(Object.keys(translations[language]).sort(), keys, `${language} call keys differ`);
    for (const key of keys) assert.ok(translations[language][key].trim(), `empty ${language}.${key}`);
  }
  const dom = new JSDOM(html);
  for (const element of dom.window.document.querySelectorAll('[data-call-i18n], [data-call-i18n-title]')) {
    const key = element.dataset.callI18n || element.dataset.callI18nTitle;
    for (const language of languages) assert.ok(translations[language][key], `missing ${language}.${key}`);
  }
  dom.window.close();
});

test('calls use Agora tokens and support resilient media controls', () => {
  assert.match(source, /httpsCallable\('getAgoraToken'\)/);
  assert.match(source, /window\.AgoraRTC\.createClient/);
  assert.match(source, /createMicrophoneAudioTrack\(\{AEC:true,ANS:true,AGC:true\}\)/);
  assert.match(source, /createCameraVideoTrack/);
  assert.match(source, /connection-state-change/);
  assert.match(source, /unansweredTimer\(\)/);
  assert.match(source, /createScreenVideoTrack/);
  assert.match(source, /requestFullscreen/);
  assert.match(source, /localVideo\.setDevice/);
  assert.match(source, /client\.unpublish/);
  assert.match(source, /old\.leave\(\)/);
});

test('Firestore call signaling remains limited to participants', () => {
  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/calls\/\{callId\}/);
  assert.match(rules, /resource\.data\.caller == name\(\) \|\| resource\.data\.receiver == name\(\)/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\['answer', 'status', 'endedAt'\]\)/);
  assert.match(rules, /candidateCollection in \['callerCandidates', 'receiverCandidates'\]/);
});

test('Agora token generation is server-side and participant-authorized', () => {
  const functions = fs.readFileSync(path.join(root, 'functions', 'index.js'), 'utf8');
  assert.match(functions, /defineSecret\('AGORA_APP_CERTIFICATE'\)/);
  assert.match(functions, /exports\.getAgoraToken=onCall/);
  assert.match(functions, /RtcTokenBuilder\.buildTokenWithUserAccount/);
  assert.match(functions, /Not a call participant/);
  assert.match(functions, /No active group call/);
  assert.doesNotMatch(source, /AGORA_APP_CERTIFICATE|appCertificate/i);
});

test('telephony router resolves fallback cascade in Agora -> Daily -> GetStream -> WebRTC order', async () => {
  const {resolveTelephonySession, recordTelephonyDuration, telephonyDefaults} = require(path.join(root, 'functions', 'telephony-router.js'));
  assert.deepEqual(telephonyDefaults.telephonyOrder, ['agora', 'daily', 'getstream', 'webrtc']);

  // Mock database
  const store = new Map();
  const mockDb = {
    collection: name => ({
      doc: id => ({
        get: async () => ({
          exists: store.has(`${name}/${id}`),
          data: () => store.get(`${name}/${id}`)
        }),
        set: async (val, opt) => {
          const key = `${name}/${id}`;
          if (opt?.merge && store.has(key)) {
            store.set(key, {...store.get(key), ...val});
          } else {
            store.set(key, val);
          }
        }
      })
    }),
    runTransaction: async fn => fn({
      get: async ref => ref.get(),
      set: async (ref, val, opt) => ref.set(val, opt)
    })
  };

  const secrets = {
    agoraCertificate: 'mock_agora_cert',
    dailyKey: 'mock_daily_key',
    streamSecret: 'mock_stream_secret_that_is_at_least_32_bytes_long_here'
  };

  // 1. Primary provider Agora is picked first
  const session1 = await resolveTelephonySession({
    db: mockDb,
    channel: 'test_call_1',
    accountKey: '@alice',
    username: '@alice',
    scope: 'direct',
    type: 'audio',
    failedProviders: [],
    secrets,
    fetchImpl: async () => ({ok: true, json: async () => ({url: 'https://doori.daily.co/test_call_1'})})
  });
  assert.equal(session1.provider, 'agora');
  assert.equal(session1.role, 'primary');

  // 2. When Agora fails or is in failedProviders, Daily is chosen
  const session2 = await resolveTelephonySession({
    db: mockDb,
    channel: 'test_call_2',
    accountKey: '@alice',
    username: '@alice',
    scope: 'direct',
    type: 'audio',
    failedProviders: ['agora'],
    secrets,
    fetchImpl: async () => ({ok: true, json: async () => ({url: 'https://doori.daily.co/test_call_2'})})
  });
  assert.equal(session2.provider, 'daily');
  assert.equal(session2.role, 'fallback1');

  // 3. When Agora and Daily fail, GetStream is chosen
  const session3 = await resolveTelephonySession({
    db: mockDb,
    channel: 'test_call_3',
    accountKey: '@alice',
    username: '@alice',
    scope: 'direct',
    type: 'video',
    failedProviders: ['agora', 'daily'],
    secrets,
    fetchImpl: async () => ({ok: true, json: async () => ({})})
  });
  assert.equal(session3.provider, 'getstream');

  const session4 = await resolveTelephonySession({
    db:mockDb, channel:'test_call_4', accountKey:'@alice', username:'@alice', scope:'direct', type:'audio',
    failedProviders:['agora','daily','getstream'], secrets:{}, fetchImpl:async()=>({ok:false,status:503,json:async()=>({})})
  });
  assert.equal(session4.provider,'webrtc');
  assert.equal(session4.role,'fallback3');
  assert.equal(session3.role, 'fallback2');

  // 4. Record call duration updates budgets
  await recordTelephonyDuration(mockDb, {provider: 'agora', durationSeconds: 120, callType: 'audio'});
  await recordTelephonyDuration(mockDb, {provider: 'daily', durationSeconds: 300, callType: 'video'});
});

test('telephony secrets remain server-side and operator console cleanly separates AI and Telephony', () => {
  const functions = fs.readFileSync(path.join(root, 'functions', 'index.js'), 'utf8');
  assert.match(functions, /defineSecret\('DAILY_API_KEY'\)/);
  assert.match(functions, /defineSecret\('STREAM_API_SECRET'\)/);
  assert.match(functions, /exports\.getTelephonySession=onCall/);
  assert.match(functions, /exports\.recordCallDuration=onCall/);
  assert.match(functions, /exports\.updateTelephonyAdminConfig=onCall/);

  // Client does not contain secrets
  assert.doesNotMatch(source, /DAILY_API_KEY|STREAM_API_SECRET/i);

  // Operator UI HTML structure
  const opHtml = fs.readFileSync(path.join(root, 'operator.html'), 'utf8');
  assert.match(opHtml, /data-t="sectionAi"/);
  assert.match(opHtml, /data-t="sectionTelephony"/);
  assert.match(opHtml, /id="telephony-rows"/);
  assert.match(opHtml, /id="telephony-config-form"/);
  assert.match(opHtml, /data-t="telephonyNotice"/);

  // Operator JS localization across all 5 languages
  const opJs = fs.readFileSync(path.join(root, 'operator.js'), 'utf8');
  const context = { window: {}, document: {}, localStorage: { getItem: () => 'de', setItem: () => {} } };
  vm.createContext(context);
  // Extract T object
  const startT = opJs.indexOf('const T={');
  const endT = opJs.indexOf('};\nObject.assign(T.de', startT) + 1;
  vm.runInContext(`globalThis.T = ${opJs.slice(startT + 8, endT)}`, context);
  const T = context.T;

  const languages = ['de', 'en', 'ar', 'fa', 'tr'];
  const telephonyKeys = [
    'sectionAi', 'sectionTelephony', 'telephonyNotice', 'telephonyAudioToday',
    'telephonyVideoToday', 'telephonySwitchesToday', 'telephonyProvidersTitle',
    'telephonyConfigTitle', 'role', 'status', 'audioMin', 'videoMin', 'totalMin',
    'monthlyLimit', 'trackingMethod', 'trackingInfo', 'rolePrimary', 'roleFallback1',
    'roleFallback2', 'statusActive', 'statusDegraded', 'statusLimitReached',
    'agoraLimit', 'dailyLimit', 'streamLimit', 'failoverTimeout'
  ];

  for (const lang of languages) {
    assert.ok(T[lang], `missing language ${lang} in operator console`);
    for (const key of telephonyKeys) {
      assert.ok(T[lang][key], `missing operator console key ${lang}.${key}`);
      assert.ok(T[lang][key].trim().length > 0, `empty operator console key ${lang}.${key}`);
    }
  }
});

test('Daily and GetStream use their official browser SDKs and current public key', () => {
  const calls = fs.readFileSync(path.join(root, 'agora-calls.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const router = fs.readFileSync(path.join(root, 'functions', 'telephony-router.js'), 'utf8');
  assert.match(html, /vendor\/telephony-providers\.js/);
  assert.match(calls, /DooriTelephonyProviders\?\.DailyIframe/);
  assert.match(calls, /DooriTelephonyProviders\?\.StreamVideoClient/);
  assert.match(calls, /streamCall\.join\(\{create:false,maxJoinRetries:1\}\)/);
  assert.doesNotMatch(calls, /connectWebRtcFallback\('(?:daily|getstream)'/);
  assert.match(router, /STREAM_PUBLIC_KEY = 'jp5eav3shbqe'/);
  assert.match(router, /serverSide \? \{server: true\}/);
  assert.match(router, /roomUrl,/);
});

test('video calls use picture-in-picture swapping and cross-tab login is safe', () => {
  const calls=fs.readFileSync(path.join(root,'agora-calls.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(calls,/function toggleVideoFocus\(\)/);
  assert.match(calls,/local-video-main/);
  assert.match(css,/\.video-stage\.local-video-main #video-local/);
  assert.match(css,/#video-local video/);
  assert.match(app,/typeof window\.handleUserOnline === 'function'/);
  for(const language of ['de','en','ar','fa','tr'])assert.match(calls,new RegExp(`${language}:\\{swapVideo:`));
});

test('direct calls remain calling until the peer rings and explicitly accepts', () => {
  const calls=fs.readFileSync(path.join(root,'agora-calls.js'),'utf8');
  assert.match(calls,/ringing:'Es klingelt …'/);
  assert.match(calls,/ringing:'Ringing …'/);
  assert.match(calls,/ringing:'يرنّ الآن …'/);
  assert.match(calls,/ringing:'در حال زنگ خوردن …'/);
  assert.match(calls,/ringing:'Çalıyor …'/);
  assert.match(calls,/update\(\{status:'ringing',ringingAt:/);
  assert.match(calls,/data\.status==='ringing'&&call\.outgoing\)status\('ringing'/);
  assert.match(calls,/else if\(call\.status==='connected'\)\{status\('connected'/);
  assert.match(calls,/await call\.ref\.update\(\{answer:[^}]+\},status:'connected'\}\)/);
});

