const CACHE_NAME = 'web-messenger-v98-game-invitations';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css?v=324',
  '/app.js?v=343',
  '/games.js?v=2',
  '/security.js?v=1',
  '/auth-translations.js?v=9',
  '/account-client.js?v=1',
  '/vendor/purify.min.js',
  '/vendor/firebase-app-compat.js',
  '/vendor/firebase-auth-compat.js',
  '/vendor/firebase-firestore-compat.js',
  '/vendor/firebase-functions-compat.js',
  '/firebase-config.js?v=28',
  '/webrtc.js?v=59',
  '/doodle.js?v=276',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('web-messenger-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(cached => cached || Response.error());
    })
  );
});
