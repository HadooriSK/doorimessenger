const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'webrtc.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

function readCallTranslations() {
  const marker = 'const CALL_TRANSLATIONS = ';
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

test('calls wait for TURN configuration and support resilient media controls', () => {
  assert.match(source, /const iceServersReady = \(async \(\) =>/);
  assert.match(source, /await Promise\.race\(\[iceServersReady/);
  assert.match(source, /await createCallPeerConnection\(\)/);
  assert.match(source, /echoCancellation: true, noiseSuppression: true, autoGainControl: true/);
  assert.match(source, /connectionstatechange/);
  assert.match(source, /startUnansweredTimeout\(\)/);
  assert.match(source, /replaceTrack\(nextTrack\)/);
  assert.match(source, /getDisplayMedia/);
  assert.match(source, /requestFullscreen/);
  assert.match(source, /cameraFacingMode === 'user' \? 'environment' : 'user'/);
  assert.match(source, /callerCandidatesUnsubscribe/);
  assert.match(source, /receiverCandidatesUnsubscribe/);
});

test('Firestore call signaling remains limited to participants', () => {
  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/calls\/\{callId\}/);
  assert.match(rules, /resource\.data\.caller == name\(\) \|\| resource\.data\.receiver == name\(\)/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\['answer', 'status', 'endedAt'\]\)/);
  assert.match(rules, /candidateCollection in \['callerCandidates', 'receiverCandidates'\]/);
});
