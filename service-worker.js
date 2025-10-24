/* ===== EconoLearn – Service Worker (fresh loads + instant update) =====
   Strategy:
   - network-first for: index.html, main.jsx, questions.json (always fresh UI/data)
   - cache-first for: images/icons/CDNs (fast UI)
   - immediate activation on new deploy (skipWaiting + clientsClaim)
   - auto reload once when new SW takes control
*/

const CACHE_NAME = 'econolearn-cache-v6-2025-10-24-02'; // ← bump this each deploy

const CORE_ASSETS = [
  './',
  './index.html',
  './main.jsx',
  './questions.json',
  './ganesh.png',
  './favicon-16.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// Listen for SKIP_WAITING messages
self.addEventListener('message', (evt) => {
  if (evt?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install – pre-cache core
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate – clean old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Fetch strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const isHTML = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html') || url.pathname.endsWith('index.html');
  const isApp = url.pathname.endsWith('/main.jsx') || url.pathname.endsWith('main.jsx');
  const isData = url.pathname.endsWith('/questions.json') || url.pathname.endsWith('questions.json');

  if (isHTML || isApp || isData) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    if (req.method === 'GET' && fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(req, { ignoreVary: true, ignoreSearch: false });
    return cached || new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, { ignoreVary: true, ignoreSearch: false });
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (req.method === 'GET' && fresh && fresh.ok && (fresh.type === 'basic' || fresh.type === 'cors')) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    return cached || new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}