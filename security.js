(function (root) {
    'use strict';
    const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
    const normalizeUsername = value => '@' + String(value || '').replace(/^@/, '').toLowerCase();
    function collectMentions(text, members = []) {
        const known = new Set(members.map(normalizeUsername));
        return [...new Set((String(text || '').match(/@[\p{L}\p{N}_.-]+/gu) || [])
            .map(normalizeUsername).filter(name => known.has(name)))];
    }
    function messageDestination(chat, username) {
        if (!chat || !username) throw new Error('No active chat');
        const isPublic = chat.type === 'room' || chat.type === 'channel';
        const result = { chat_id: chat.id, isPublic };
        if (!isPublic) {
            const recipient = chat.type === 'saved' ? username : chat.id;
            result.participants = [...new Set([username, recipient].map(normalizeUsername))];
            if (chat.type === 'dm') result.recipient_username = recipient;
        }
        return result;
    }
    function safeHTML(value) {
        if (!root.DOMPurify) throw new Error('HTML sanitizer not loaded');
        return root.DOMPurify.sanitize(String(value ?? ''), {
            USE_PROFILES: { html: true },
            ADD_TAGS: ['audio', 'video', 'source'],
            FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'meta', 'link'],
            FORBID_ATTR: ['srcdoc'],
            ALLOW_UNKNOWN_PROTOCOLS: false
        });
    }
    const actionAttrs = (action, ...args) => `data-doori-action="${escapeHTML(action)}" data-doori-args="${escapeHTML(JSON.stringify(args))}"`;
    const api = { escapeHTML, normalizeUsername, collectMentions, messageDestination, safeHTML, actionAttrs };
    if (typeof module !== 'undefined') module.exports = api;
    Object.assign(root, api);
    if (root.document) root.document.addEventListener('click', event => {
        const button = event.target.closest('[data-doori-action]');
        if (!button) return;
        const allowed = new Set(['acceptGroupInvite', 'declineGroupInvite', 'showUserProfileModal',
            'toggleGroupAdmin', 'toggleMuteMember', 'removeGroupMember', 'unblockUser',
            'acceptDoodleInvite', 'rejectDoodleInvite']);
        const action = button.dataset.dooriAction;
        if (!allowed.has(action) || typeof root[action] !== 'function') return;
        try { root[action](...JSON.parse(button.dataset.dooriArgs || '[]')); }
        catch (error) { console.error('Action failed', error); }
    });
})(typeof window === 'undefined' ? globalThis : window);
