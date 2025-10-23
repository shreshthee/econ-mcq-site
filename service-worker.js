/* EconoLearn - Service Worker */
const CACHE_VERSION = 'v6'; // 🔁 bump this to force an update
const CACHE_NAME = `econolearn-cache-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './main.jsx',
  './questions.json',
  './ganesh.png',
  './favicon-16.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest'
];

// On install: cache important files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// On activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

// Fetch handler: stale-while-revalidate for same-origin requests
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cacheRes => {
      const fetchPromise = fetch(req).then(networkRes => {
        if (networkRes && networkRes.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(req, networkRes.clone()));
        }
        return networkRes;
      }).catch(() => cacheRes || Promise.reject('no-match'));

      // Serve cache first, update in background
      return cacheRes || fetchPromise;
    })
  );
});

// Allow page to trigger skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
