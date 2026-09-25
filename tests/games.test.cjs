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
  const sentMessages = new Map();
  let idCounter = 0;
  const snapshots = new Map();
  const makeRef = id => ({
    id,
    async set(data) { sessions.set(id, structuredClone(data)); },
    async delete() { sessions.delete(id); },
    async update(changes) {
      sessions.set(id, { ...sessions.get(id), ...structuredClone(changes) });
      snapshots.get(id)?.({ exists: true, data: () => structuredClone(sessions.get(id)) });
    },
    onSnapshot(next) { snapshots.set(id, next); next({ exists: sessions.has(id), data: () => structuredClone(sessions.get(id)) }); return () => snapshots.delete(id); }
  });
  w.db = {
    collection(name) {
      if (name === 'messages') return { doc(id) { return {
        async set(data) { sentMessages.set(id, structuredClone(data)); },
        async update(changes) { sentMessages.set(id, { ...(sentMessages.get(id) || {}), ...structuredClone(changes) }); }
      }; } };
      assert.equal(name, 'gameSessions');
      return {
        doc(id) { return makeRef(id || `game-${++idCounter}`); },
        where() { return { limit() { return { async get() { return { docs: [...sessions.entries()].map(([id, data]) => ({ id, data: () => structuredClone(data) })) }; } }; } }; }
      };
    },
    async runTransaction(run) {
       return run({
        async get(ref) { return { data: () => structuredClone(sessions.get(ref.id)) }; },
        update(ref, changes) {
          sessions.set(ref.id, { ...sessions.get(ref.id), ...structuredClone(changes) });
          snapshots.get(ref.id)?.({ exists: true, data: () => structuredClone(sessions.get(ref.id)) });
        }
      });
    }
  };
  w.eval(fs.readFileSync(path.join(root, 'quiz-questions.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(root, 'games.js'), 'utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { dom, w, sessions, sentMessages };
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

test('battleship state is Firestore-compatible and can be invited', async () => {
  const { dom, w, sessions } = client('@alice');
  w.sendMessage = async () => true;
  const state = w.DooriGamesTest.initial('battleship');
  assert.equal(Array.isArray(state.boards), false, 'Firestore does not allow arrays nested inside arrays');
  assert.equal(state.boards[0].length, 100);
  assert.equal(state.boards[1].length, 100);
  await w.DooriGamesTest.create('battleship');
  assert.equal([...sessions.values()][0].status, 'pending');
  dom.window.close();
});

test('quiz offers 70 localized questions and selects 10 unique questions per duel', () => {
  const { dom, w } = client();
  for (const language of ['de', 'en', 'ar', 'fa', 'tr']) {
    assert.equal(w.DOORI_QUIZ_QUESTIONS[language].length, 70, `70 questions for ${language}`);
    assert.ok(w.DOORI_QUIZ_QUESTIONS[language].every(q => q[0] && q[1].length === 4 && q[2] >= 0 && q[2] < 4));
  }
  const state = w.DooriGamesTest.initial('quiz');
  assert.equal(state.order.length, 10);
  assert.equal(new Set(state.order).size, 10);
  assert.ok(state.order.every(index => index >= 0 && index < 70));
  dom.window.close();
});

test('a newer request for the same game is sent so pending invitations can be superseded', async () => {
  const { dom, w, sessions } = client('@alice');
  const alerts = [];
  let sent = 0;
  w.alert = text => alerts.push(text);
  w.sendMessage = async () => { sent++; return true; };
  await w.DooriGamesTest.create('quiz');
  await w.DooriGamesTest.create('quiz');
  assert.equal(sessions.size, 2);
  assert.equal(sent, 2);
  assert.equal(alerts.length, 0);
  dom.window.close();
});

test('leaving creates a durable chat notification', async () => {
  const { dom, w, sessions, sentMessages } = client('@alice');
  w.sendMessage = async () => true;
  await w.DooriGamesTest.create('connect4');
  const id = [...sessions.keys()][0];
  const inviteId = sessions.get(id).inviteMessageId;
  sentMessages.set(inviteId, { mediaType: 'game_invite' });
  w.currentUser = '@bob';
  await w.DooriGamesTest.decide(id, 'declined', inviteId);
  assert.equal(sessions.get(id).status, 'declined');
  assert.equal(sentMessages.get(inviteId).game_status, 'declined');

  sessions.set(id, { ...sessions.get(id), status: 'active' });
  w.openDooriGame(id);
  await w.DooriGamesTest.close();
  assert.equal(sessions.get(id).status, 'left');
  assert.equal(JSON.parse([...sentMessages.values()].at(-1).mediaUrl).event, 'left');
  dom.window.close();
});

test('accepting or declining replaces invitation actions with a final status', async () => {
  const { dom, w, sessions, sentMessages } = client('@alice');
  w.sendMessage = async () => true;
  await w.DooriGamesTest.create('memory');
  const id = [...sessions.keys()][0];
  const inviteId = sessions.get(id).inviteMessageId;
  sentMessages.set(inviteId, { mediaType: 'game_invite' });
  w.currentUser = '@bob';
  await w.DooriGamesTest.decide(id, 'active', inviteId);
  assert.equal(sentMessages.get(inviteId).game_status, 'accepted');
  const accepted = w.renderDooriGameInvite({ id:'invite-1', sender_username:'@alice', mediaUrl:JSON.stringify({id,type:'memory'}), game_status:'accepted' });
  assert.match(accepted, /Spielanfrage angenommen/);
  assert.doesNotMatch(accepted, /acceptDooriGame|declineDooriGame/);

  sessions.set('game-declined', { ...sessions.get(id), status:'pending', inviteMessageId:'invite-2' });
  sentMessages.set('invite-2', { mediaType:'game_invite' });
  await w.DooriGamesTest.decide('game-declined', 'declined', 'invite-2');
  assert.equal(sentMessages.get('invite-2').game_status, 'declined');
  const declined = w.renderDooriGameInvite({ id:'invite-2', sender_username:'@alice', mediaUrl:JSON.stringify({id:'game-declined',type:'memory'}), game_status:'declined' });
  assert.match(declined, /Spielanfrage abgelehnt/);
  assert.doesNotMatch(declined, /acceptDooriGame|declineDooriGame|openDooriGame/);
  dom.window.close();
});
