// Doori Messenger - Client-Side Message Cache (IndexedDB with In-Memory Fallback)
(function() {
    const DB_NAME = 'doori_message_cache';
    const DB_VERSION = 1;
    const STORE_NAME = 'messages';

    const memoryFallback = new Map(); // chatId -> Map(id -> message)

    let dbPromise = null;

    function getIDB() {
        if (typeof window !== 'undefined' && window.indexedDB) {
            return window.indexedDB;
        }
        return null;
    }

    function initDB() {
        if (dbPromise) return dbPromise;
        const idb = getIDB();
        if (!idb) {
            dbPromise = Promise.resolve(null);
            return dbPromise;
        }

        dbPromise = new Promise((resolve) => {
            try {
                const request = idb.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        store.createIndex('chat_id', 'chatId', { unique: false });
                        store.createIndex('chat_ts', ['chatId', 'timestamp'], { unique: false });
                    }
                };
                request.onsuccess = (e) => resolve(e.target.result);
                request.onerror = (err) => {
                    console.warn('[MessageCache] IndexedDB open error, using memory fallback:', err);
                    resolve(null);
                };
            } catch (err) {
                console.warn('[MessageCache] IndexedDB init error:', err);
                resolve(null);
            }
        });
        return dbPromise;
    }

    const MessageCache = {
        init: initDB,

        async saveMessages(chatId, msgs) {
            if (!chatId || !Array.isArray(msgs) || msgs.length === 0) return;
            // Always keep memory fallback up to date
            if (!memoryFallback.has(chatId)) memoryFallback.set(chatId, new Map());
            const memMap = memoryFallback.get(chatId);
            msgs.forEach(m => {
                if (m && m.id) memMap.set(m.id, { ...m, chatId });
            });

            const db = await initDB();
            if (!db) return;

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    msgs.forEach(m => {
                        if (m && m.id) {
                            store.put({ ...m, chatId });
                        }
                    });
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (e) {
                    console.warn('[MessageCache] saveMessages error:', e);
                    resolve(false);
                }
            });
        },

        async getLatestMessages(chatId, limit = 40) {
            if (!chatId) return [];
            const db = await initDB();
            if (!db) {
                const memMap = memoryFallback.get(chatId);
                if (!memMap) return [];
                const list = Array.from(memMap.values()).sort((a, b) => a.timestamp - b.timestamp);
                return list.slice(-limit);
            }

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readonly');
                    const store = tx.objectStore(STORE_NAME);
                    const index = store.index('chat_ts');
                    // Key range for chatId
                    const range = IDBKeyRange.bound([chatId, 0], [chatId, Number.MAX_SAFE_INTEGER]);
                    const results = [];
                    // Open cursor in reverse to get latest first
                    const req = index.openCursor(range, 'prev');
                    req.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor && results.length < limit) {
                            results.push(cursor.value);
                            cursor.continue();
                        } else {
                            results.reverse(); // Return in chronological order
                            resolve(results);
                        }
                    };
                    req.onerror = () => resolve([]);
                } catch (e) {
                    console.warn('[MessageCache] getLatestMessages error:', e);
                    resolve([]);
                }
            });
        },

        async getOlderMessages(chatId, beforeTimestamp, limit = 40) {
            if (!chatId || !beforeTimestamp) return [];
            const db = await initDB();
            if (!db) {
                const memMap = memoryFallback.get(chatId);
                if (!memMap) return [];
                const list = Array.from(memMap.values())
                    .filter(m => m.timestamp < beforeTimestamp)
                    .sort((a, b) => a.timestamp - b.timestamp);
                return list.slice(-limit);
            }

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readonly');
                    const store = tx.objectStore(STORE_NAME);
                    const index = store.index('chat_ts');
                    const range = IDBKeyRange.bound([chatId, 0], [chatId, beforeTimestamp - 1]);
                    const results = [];
                    const req = index.openCursor(range, 'prev');
                    req.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor && results.length < limit) {
                            results.push(cursor.value);
                            cursor.continue();
                        } else {
                            results.reverse();
                            resolve(results);
                        }
                    };
                    req.onerror = () => resolve([]);
                } catch (e) {
                    console.warn('[MessageCache] getOlderMessages error:', e);
                    resolve([]);
                }
            });
        },

        async clearCache() {
            memoryFallback.clear();
            const db = await initDB();
            if (!db) return true;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    tx.objectStore(STORE_NAME).clear();
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (e) {
                    resolve(false);
                }
            });
        }
    };

    if (typeof window !== 'undefined') {
        window.MessageCache = MessageCache;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MessageCache;
    }
})();
