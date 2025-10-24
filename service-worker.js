/* ===== EconoLearn – Service Worker (cache-bust + fast update) =====
   Strategy:
   - cache-first for static assets (fast UI)
   - network-first for questions.json (fresh data)
   - immediate activation on new deploy (skipWaiting + clientsClaim)
   - version bump by changing CACHE_NAME each time you push
*/

const CACHE_NAME = 'econolearn-cache-v5-2025-10-24-01'; // ← bump this on each deploy

// List all core assets that never change often
const CORE_ASSETS = [
  './',
  './index.html',
  './main.jsx',
  './questions.json',     // still cached, but we override strategy below
  './ganesh.png',
  './favicon-16.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// Install – pre-cache core assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

// Activate – remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/* Fetch strategy:
   - questions.json → network-first (so updates appear instantly)
   - all else → cache-first (fallback to network)
*/
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for questions.json
  if (url.pathname.endsWith('/questions.json') || url.pathname.endsWith('questions.json')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for everything else
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, { ignoreVary: true, ignoreSearch: false });
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    // Only cache basic/cors GET responses
    if (req.method === 'GET' && fresh && fresh.ok && (fresh.type === 'basic' || fresh.type === 'cors')) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    // Optional: return a fallback page or empty Response
    return cached || new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    if (req.method === 'GET' && fresh && fresh.ok) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(req, { ignoreVary: true, ignoreSearch: true });
    return cached || new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}