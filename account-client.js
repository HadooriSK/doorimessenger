// Firebase Auth + atomic Firestore writes. No Cloud Functions or public email lookup.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else root.accountClient = factory(root.auth, root.db, root.firebase.firestore.FieldValue, root.crypto);
})(typeof window === 'undefined' ? globalThis : window, function (auth, db, fields, crypto) {
    const keyOf = value => '@' + String(value || '').replace(/^@/, '').toLowerCase();
    const profileFields = ['avatarUrl', 'profilePics', 'searchable', 'avatarVisibility', 'callPrivacy', 'lastSeenPrivacy', 'bio'];
    const fail = () => { throw Object.assign(new Error('Invalid account or credentials'), { code: 'auth/invalid-credential' }); };
    function publicProfile(data) {
        const result = { uid: data.uid, username: data.username, id_number: data.id_number || '' };
        for (const field of profileFields) if (data[field] !== undefined) result[field] = data[field];
        return result;
    }
    async function registerAccount({ username: raw }) {
        const user = auth.currentUser;
        if (!user?.email || typeof raw !== 'string' || !/^@?[\p{L}\p{N}_.-]{10,64}$/u.test(raw)) fail();
        const username = raw.startsWith('@') ? raw : '@' + raw;
        const key = keyOf(username);
        const random = crypto.getRandomValues(new Uint32Array(1))[0];
        const data = { uid: user.uid, email: user.email, username, id_number: String(100000 + random % 900000), createdAt: fields.serverTimestamp() };
        const batch = db.batch();
        batch.set(db.collection('accounts').doc(user.uid), { username, key });
        batch.set(db.collection('users').doc(key), data);
        batch.set(db.collection('profiles').doc(key), publicProfile(data));
        await batch.commit();
        return { username, id: data.id_number };
    }
    async function ensureAccount() {
        const user = auth.currentUser;
        if (!user) fail();
        const ref = db.collection('accounts').doc(user.uid);
        const existing = await ref.get();
        if (existing.exists) return existing.data();
        // Legacy migration is bound to the authenticated UID, never to a supplied email.
        const users = await db.collection('users').where('uid', '==', user.uid).limit(2).get();
        if (users.size !== 1) fail();
        const data = users.docs[0].data(), key = keyOf(data.username);
        if (key !== users.docs[0].id) fail();
        const account = { username: data.username, key };
        await db.runTransaction(async tx => {
            const mapped = await tx.get(ref);
            if (mapped.exists) return;
            tx.set(ref, account);
            tx.set(db.collection('profiles').doc(key), publicProfile(data));
        });
        return account;
    }
    async function signIn({ email, password, username, id }) {
        const user = (await auth.signInWithEmailAndPassword(email, password)).user;
        try {
            const account = await ensureAccount();
            const data = (await db.collection('users').doc(account.key).get()).data();
            if ((username && account.key !== keyOf(username)) || String(data.id_number) !== id) fail();
            return user;
        } catch (error) {
            await auth.signOut();
            throw error;
        }
    }
    async function publishGroupLink(group, rotate = false) {
        const token = !rotate && /^[a-f0-9]{48}$/.test(group.inviteToken || '') ? group.inviteToken
            : Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
        const batch = db.batch();
        batch.update(db.collection('groups').doc(group.id), { inviteToken: token });
        batch.set(db.collection('groupLinks').doc(token), { groupId: group.id, name: group.name, avatar: group.avatarUrl || null });
        await batch.commit();
        return token;
    }
    async function groupInviteInfo({ groupId, token }) {
        if (!/^[a-f0-9]{48}$/.test(token || '')) fail();
        const snap = await db.collection('groupLinks').doc(token).get();
        if (!snap.exists || snap.data().groupId !== groupId) fail();
        return { ...snap.data(), id: groupId, members: [] };
    }
    async function acceptGroupInvitation({ groupId, token, messageId }) {
        const account = await ensureAccount();
        const batch = db.batch();
        const joinProof = messageId ? { messageId } : { token };
        batch.update(db.collection('groups').doc(groupId), { members: fields.arrayUnion(account.username), joinProof });
        if (messageId) batch.update(db.collection('messages').doc(messageId), { invite_status: 'accepted' });
        await batch.commit();
    }
    async function recordMissedCall(callId, data) {
        if (!['ended', 'rejected'].includes(data.status) || data.answer) return;
        const account = await ensureAccount();
        if (data.receiver !== account.username) return;
        const ref = db.collection('users').doc(account.key).collection('callHistory').doc(callId);
        await db.runTransaction(async tx => {
            if ((await tx.get(ref)).exists) return;
            tx.set(ref, { peer: data.caller, type: 'missed', timestamp: data.endedAt || data.timestamp || fields.serverTimestamp(), duration: 0, seen: false });
        });
    }
    return { registerAccount, ensureAccount, signIn, publishGroupLink, groupInviteInfo, acceptGroupInvitation, recordMissedCall };
});
