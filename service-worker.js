const CACHE_NAME = 'web-messenger-v150-media-player';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css?v=338',
  '/media-lounge-player.css?v=1',
  '/app.js?v=363',
  '/tts.js?v=9',
  '/doori-live.js?v=11',
  '/assistant.js?v=13',
  '/quiz-questions.js?v=1',
  '/games.js?v=5',
  '/live-media.js?v=8',
  '/security.js?v=2',
  '/message-cache.js?v=2',
  '/auth-translations.js?v=10',
  '/account-client.js?v=2',
  '/vendor/purify.min.js',
  '/vendor/firebase-app-compat.js',
  '/vendor/firebase-auth-compat.js',
  '/vendor/firebase-firestore-compat.js',
  '/vendor/firebase-functions-compat.js',
  '/firebase-config.js?v=28',
  '/vendor/agora-rtc-sdk-ng.js?v=1',
  '/agora-calls.js?v=4',
  '/doodle.js?v=279',
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
