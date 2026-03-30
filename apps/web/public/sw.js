// apps/web/public/sw.js
// Atom OS Service Worker — PWA offline support
// Strategy:
//   - App shell (HTML, CSS, JS): Cache-first → serve instantly, update in background
//   - API requests: Network-first → fallback to cache if offline
//   - Static assets: Cache-first with long TTL

const CACHE_VERSION = 'atom-os-v1';
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;
const DATA_CACHE    = `${CACHE_VERSION}-data`;

// Files that form the app shell — cached on install
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      // Cache the shell — don't fail if some assets aren't available yet
      return Promise.allSettled(
        SHELL_URLS.map(url =>
          cache.add(url).catch(() => {
            console.warn('[SW] Could not pre-cache:', url);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== SHELL_CACHE && key !== DATA_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except our API)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api/')) return;

  // API requests → Network-first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, DATA_CACHE));
    return;
  }

  // Navigation (HTML routes) → App shell
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => {
        if (cached) return cached;
        return fetch(request);
      })
    );
    return;
  }

  // Static assets → Cache-first
  event.respondWith(cacheFirstWithNetwork(request, SHELL_CACHE));
});

// ── STRATEGIES ────────────────────────────────────────────────────────────────

async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful API responses for offline use
      // Don't cache auth endpoints or mutating requests
      const url = new URL(request.url);
      const skipCache = ['/api/auth/', '/api/checkins/scan', '/api/qr/rotate'];
      const shouldCache = !skipCache.some(p => url.pathname.includes(p));
      if (shouldCache) {
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    // Offline — try cache
    const cached = await cache.match(request);
    if (cached) return cached;
    // Return offline JSON for API calls
    return new Response(
      JSON.stringify({ error: 'You are offline', code: 'OFFLINE' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ── BACKGROUND SYNC (future) ──────────────────────────────────────────────────
// When back online, re-validate any stale data
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
