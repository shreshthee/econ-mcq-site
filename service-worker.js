// EconoLearn - Service Worker
const CACHE_NAME = 'econolearn-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './main.jsx',
  './questions.json',
  './ganesh.png',
  // icons
  './favicon.ico',
  './favicon-32.png',
  './favicon-16.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) =>
      response || fetch(event.request)
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names
        .filter((n) => n !== CACHE_NAME)
        .map((n) => caches.delete(n)))
    )
  );
});