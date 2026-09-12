// SMVITM Voting PWA Service Worker
const CACHE_NAME = 'smvitm-voting-v3';
const OFFLINE_URL = '/auth/signin';

// Install: cache offline fallback and take over immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL).catch(() => {}))
  );
});

// Activate: wipe out any outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Always Network-First to guarantee real-time updates and prevent stale chunk errors
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Always bypass for localhost, live TV, admin, API, Next internals, Turbopack, and dev sockets
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/live') ||
    url.pathname.startsWith('/tv') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/__turbopack') ||
    url.pathname === '/sw.js' ||
    url.pathname === '/manifest.json'
  ) {
    return;
  }

  // Network-first strategy for everything else
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('Network error', { status: 503 });
      })
  );
});
