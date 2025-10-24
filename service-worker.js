// EconoLearn – Service Worker (v3)
// Cache-first for app shell + navigation fallback for SPA routes.
// Works on GitHub Pages (project path safe) and iOS Safari.

const SW_VERSION = 'v3';
const CACHE_NAME = `econolearn-cache-${SW_VERSION}`;

// Build absolute URLs relative to the SW scope (GitHub Pages safe)
const SCOPE = new URL(self.registration.scope);
const abs = (u) => new URL(u, SCOPE).toString();

const PRECACHE_URLS = [
  './',                // root under project scope
  './index.html',
  './main.jsx',
  './questions.json',
  './ganesh.png',
  './favicon-16.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  // External CDNs – cache on first visit (do not pre-cache to avoid opaque failures)
  // Tailwind, React, Babel are requested by index.html; cache-first policy below will cover repeats.
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS.map(abs)).catch(() => {})
    )
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith('econolearn-cache-') && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin GET, fallback to network.
// For navigation requests, return cached index.html (SPA).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // Navigation fallback to index.html (SPA routing safety)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(abs('./index.html')).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Only same-origin assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            // Cache valid 200 OK same-origin responses
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => caches.match(abs('./index.html'))); // offline fallback
      })
    );
  }
});

// Optional: manual skipWaiting support
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});