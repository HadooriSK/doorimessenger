const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');

function client(username = '@alice') {
  const dom = new JSDOM('<!doctype html><body><div id="games-btn"><span data-i18n="games_menu">Spiele</span></div></body>', {
    runScripts: 'outside-only', url: 'https://doori-messenger.de/'
  });
  const w = dom.window;
  w.currentUser = username;
  w.currentLang = 'de';
  w.currentChat = { id: '@bob', type: 'dm', members: [] };
  w.TRANSLATIONS = { de:{}, en:{}, ar:{}, fa:{}, tr:{} };
  w.escapeHTML = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const sessions = new Map();
  let idCounter = 0;
  const snapshots = new Map();
  const makeRef = id => ({
    id,
    async set(data) { sessions.set(id, structuredClone(data)); },
    async delete() { sessions.delete(id); },
    onSnapshot(next) { snapshots.set(id, next); next({ exists: sessions.has(id), data: () => structuredClone(sessions.get(id)) }); return () => snapshots.delete(id); }
  });
  w.db = {
    collection(name) {
      assert.equal(name, 'gameSessions');
      return {
        doc(id) { return makeRef(id || `game-${++idCounter}`); },
        where() { return { limit() { return { async get() { return { docs: [] }; } }; } }; }
      };
    },
    async runTransaction(run) {
      await run({
        async get(ref) { return { data: () => structuredClone(sessions.get(ref.id)) }; },
        update(ref, changes) {
          sessions.set(ref.id, { ...sessions.get(ref.id), ...structuredClone(changes) });
          snapshots.get(ref.id)?.({ exists: true, data: () => structuredClone(sessions.get(ref.id)) });
        }
      });
    }
  };
  w.eval(fs.readFileSync(path.join(root, 'games.js'), 'utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { dom, w, sessions };
}

test('games menu and invitation strings exist in all five languages', () => {
  const { dom, w } = client();
  for (const language of ['de', 'en', 'ar', 'fa', 'tr']) {
    const strings = w.DooriGamesTest.I18N[language];
    for (const key of ['games_menu', 'accept', 'decline', 'request', 'acceptPrompt', 'waiting', 'sent', 'sendFailed']) {
      assert.ok(strings[key], `${key} exists for ${language}`);
    }
  }
  w.currentLang = 'tr';
  w.dispatchEvent(new w.CustomEvent('doori-language-change', { detail: { lang: 'tr' } }));
  assert.equal(w.document.querySelector('#games-btn span').textContent, 'Oyunlar');
  dom.window.close();
});

test('game invitation remains pending until the recipient accepts it', async () => {
  const { dom, w, sessions } = client('@alice');
  let sent;
  w.sendMessage = async (...args) => { sent = args; return true; };
  await w.DooriGamesTest.create('tictactoe');
  const [id, pending] = [...sessions.entries()][0];
  assert.equal(pending.status, 'pending');
  assert.deepEqual(pending.participants, ['@alice', '@bob']);
  assert.equal(sent[1], 'game_invite');
  assert.equal(JSON.parse(sent[2]).id, id);
  assert.match(w.document.querySelector('#games-body').textContent, /Warte darauf/);

  w.currentUser = '@bob';
  await w.DooriGamesTest.decide(id, 'active');
  assert.equal(sessions.get(id).status, 'active');
  assert.match(w.document.querySelector('#games-body').textContent, /Du bist am Zug|Mitspieler ist am Zug/);
  dom.window.close();
});

test('failed invitation message removes the orphaned game session', async () => {
  const { dom, w, sessions } = client('@alice');
  w.alert = () => {};
  w.sendMessage = async () => false;
  await w.DooriGamesTest.create('memory');
  assert.equal(sessions.size, 0);
  dom.window.close();
});
