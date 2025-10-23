// ===================== EconoLearn Service Worker =====================
// Caches core files for offline access

const CACHE_NAME = 'econolearn-cache-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/main.jsx',
  '/questions.json',
  '/ganesh.png',
  '/icon192.png',
  '/icon512.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('🔹 Caching core assets...');
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((resp) => {
      return (
        resp ||
        fetch(e.request).then((r) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, r.clone());
            return r;
          });
        })
      );
    })
  );
});