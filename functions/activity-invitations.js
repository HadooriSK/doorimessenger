'use strict';
const {createHash} = require('node:crypto');

const TYPES = new Set(['doodle_invite', 'live_media_invite', 'game_invite']);
const key = value => String(value || '').toLowerCase();
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,128}$/.test(value);
const invalid = () => { const error = new Error('Invalid activity invitation'); error.code = 'permission-denied'; throw error; };
const samePair = (participants, pair) => Array.isArray(participants) && participants.length === 2 &&
    participants.map(key).sort().join('|') === pair.join('|');
const pending = message => message.mediaType === 'doodle_invite' ? !message.activity_status || message.activity_status === 'pending'
    : message.mediaType === 'game_invite' ? !message.game_status || message.game_status === 'pending'
    : !message.live_media_status || message.live_media_status === 'pending';
const statusField = type => type === 'doodle_invite' ? 'activity_status'
    : type === 'game_invite' ? 'game_status' : 'live_media_status';

function sessionReference(db, message, pair) {
    if (message.mediaType === 'doodle_invite') return db.collection('doodle_sessions').doc(`session_${pair.join('_')}`);
    let data;
    try { data = JSON.parse(message.mediaUrl || '{}'); } catch { return null; }
    if (!validId(data.id)) return null;
    return db.collection(message.mediaType === 'game_invite' ? 'gameSessions' : 'liveMediaSessions').doc(data.id);
}

function sessionMatches(message, session, pair) {
    if (!session) return false;
    if (message.mediaType === 'doodle_invite') return key(session.caller) === key(message.sender_username) &&
        key(session.receiver) === key(message.recipient_username) &&
        (!session.inviteMessageId || session.inviteMessageId === message.id);
    return samePair(session.participants, pair) &&
        key(message.mediaType === 'game_invite' ? session.createdBy : session.creator) === key(message.sender_username) &&
        (!session.inviteMessageId || session.inviteMessageId === message.id);
}

async function replaceActivityInvitation(db, sender, peer, newId, previousIds = []) {
    const pair = [key(sender), key(peer)].sort();
    if (!pair[0].startsWith('@') || !pair[1].startsWith('@') || pair[0] === pair[1] ||
        !validId(newId) || !Array.isArray(previousIds) || previousIds.length > 30 || previousIds.some(id => !validId(id))) invalid();
    const pointer = db.collection('_activityInvites').doc(createHash('sha256').update(pair.join('|')).digest('hex'));
    const messages = db.collection('messages');
    return db.runTransaction(async transaction => {
        const newRef = messages.doc(newId);
        const [newSnap, pointerSnap] = await Promise.all([transaction.get(newRef), transaction.get(pointer)]);
        const fresh = newSnap.data();
        if (!fresh || fresh.id !== newId || !TYPES.has(fresh.mediaType) || !samePair(fresh.participants, pair) ||
            key(fresh.sender_username) !== key(sender) || key(fresh.recipient_username) !== key(peer) ||
            fresh.isPublic !== false || !pending(fresh) ||
            !Number.isFinite(fresh.timestamp) || Math.abs(Date.now() - fresh.timestamp) > 10 * 60 * 1000) invalid();
        const newSessionRef = sessionReference(db, fresh, pair);
        if (!newSessionRef) invalid();
        const oldIds = [...new Set([...previousIds, pointerSnap.data()?.messageId].filter(id => validId(id) && id !== newId))];
        const oldRefs = oldIds.map(id => messages.doc(id));
        const [newSessionSnap, ...oldSnaps] = await Promise.all([transaction.get(newSessionRef), ...oldRefs.map(ref => transaction.get(ref))]);
        const newSession = newSessionSnap.data();
        if (!sessionMatches(fresh, newSession, pair) ||
            !(fresh.mediaType === 'doodle_invite' ? ['invite', 'accept'].includes(newSession.type)
                : ['pending', 'active'].includes(newSession.status))) invalid();
        const candidates = oldSnaps.map((snap, index) => ({ref:oldRefs[index], message:snap.data()}))
            .filter(({message}) => message && TYPES.has(message.mediaType) && samePair(message.participants, pair) &&
                message.isPublic === false && pending(message));
        const sessionRefs = candidates.map(({message}) => sessionReference(db, message, pair));
        const sessionSnaps = await Promise.all(sessionRefs.map(ref => ref ? transaction.get(ref) : null));
        let replaced = 0;
        candidates.forEach(({ref, message}, index) => {
            const session = sessionSnaps[index]?.data();
            if (!session || !sessionMatches(message, session, pair)) {
                if (message.mediaType !== 'doodle_invite' || !session ||
                    !samePair([session.caller, session.receiver], pair) || session.inviteMessageId !== newId) return;
                transaction.update(ref, {[statusField(message.mediaType)]:'superseded'});
                replaced++;
                return;
            }
            if (message.mediaType === 'doodle_invite' ? session.type !== 'invite' : session.status !== 'pending') return;
            transaction.update(ref, {[statusField(message.mediaType)]:'superseded'});
            transaction.update(sessionRefs[index], message.mediaType === 'doodle_invite'
                ? {type:'end',ts:Date.now()} : {status:'superseded',updatedAt:Date.now()});
            replaced++;
        });
        transaction.set(pointer, {messageId:newId,participants:pair,updatedAt:Date.now()});
        return {replaced};
    });
}

module.exports = {replaceActivityInvitation};
