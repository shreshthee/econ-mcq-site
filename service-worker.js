// EconoLearn - Service Worker
const CACHE = 'econolearn-v2';
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
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(urls)));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});