// EconoLearn - Service Worker (force-upgrade)
const CACHE = 'econolearn-v3';
const urls = [
  './',
  './index.html',
  './main.jsx',
  './questions.json',
  './ganesh.png',
  './favicon-32.png',
  './favicon-16.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(urls)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});