/*
 * Blackhand service worker.
 *
 * Deliberately narrow, because this site has sessions, payments and paid
 * downloads that must never be served from a cache:
 *   - /_next/static/*  → cache-first. Build output with content-hashed names,
 *                         so a cached copy can never be stale. Makes repeat
 *                         visits and the installed app open fast.
 *   - page navigations → always the network; if that fails, the offline page.
 *   - everything else  → untouched: API routes, Supabase images, Midtrans,
 *                         downloads, non-GET requests.
 *
 * Bump VERSION whenever this file or offline.html changes.
 */
const VERSION = 'v2';
const STATIC_CACHE = `blackhand-static-${VERSION}`;
const OFFLINE_CACHE = `blackhand-offline-${VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('blackhand-') && key !== STATIC_CACHE && key !== OFFLINE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE }))
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
  }
});
