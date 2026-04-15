// apps/web/public/sw.js
// Atom OS Service Worker — v3
// Fixes: graceful install even if assets aren't cached, reliable offline support

const CACHE_VERSION = 'atom-os-v3';
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;
const DATA_CACHE    = `${CACHE_VERSION}-data`;

// ── INSTALL ─────────────────────────────────────────────────────────────────
// Don't pre-cache anything on install — avoids install failures.
// We'll cache pages as users visit them (runtime caching).
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v2...');
  // Skip waiting immediately — don't block on caching
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v2...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== SHELL_CACHE && key !== DATA_CACHE)
          .map(key => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from our origin or API
  if (request.method !== 'GET') return;

  // Skip Chrome extensions and non-http
  if (!url.protocol.startsWith('http')) return;

  // Skip Supabase and auth requests entirely — always network
  if (url.hostname.includes('supabase') || url.hostname.includes('anthropic')) return;

  // API requests → network first, brief cache fallback for offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Always fetch SW and index from network to avoid stale app versions.
  if (url.pathname === '/sw.js' || url.pathname === '/index.html') {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Navigation → network first for fresh app shell, fallback to cache when offline
  if (request.mode === 'navigate') {
    event.respondWith(serveAppShell(request));
    return;
  }

  // Static assets (JS, CSS, images) → cache first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  // Everything else → network
});

// ── STRATEGIES ────────────────────────────────────────────────────────────────

async function serveAppShell(request: Request) {
  // Prefer network so users get the latest deployed index.html without hard refresh.
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match('/index.html');
    if (cached) return cached;

    // Return a minimal offline page
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Atom OS - Offline</title>
        <style>
          body { background: #0A0A0A; color: #F0F0F0; font-family: sans-serif; 
                 display: flex; align-items: center; justify-content: center; 
                 min-height: 100vh; margin: 0; text-align: center; }
          h1 { color: #EF4444; font-size: 2rem; }
          p { color: #888; }
          button { background: #EF4444; color: white; border: none; 
                   padding: 12px 24px; border-radius: 8px; cursor: pointer; 
                   font-size: 1rem; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div>
          <div style="width:64px;height:64px;background:#EF4444;border-radius:16px;
                      display:flex;align-items:center;justify-content:center;
                      margin:0 auto 24px;font-size:2rem;font-weight:900;color:#0A0A0A">A</div>
          <h1>You're Offline</h1>
          <p>Check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </div>
      </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

async function networkFirstApi(request: Request) {
  const url = new URL(request.url);
  
  // These should NEVER be cached
  const noCacheRoutes = [
    '/api/auth/', '/api/checkins/scan', '/api/qr/rotate',
    '/api/qr/current', '/api/membership/admin-add',
  ];
  const skipCache = noCacheRoutes.some(r => url.pathname.includes(r));

  try {
    const response = await fetch(request);
    if (response.ok && !skipCache) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (!skipCache) {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    return new Response(
      JSON.stringify({ error: 'You are offline', code: 'OFFLINE' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirstAsset(request: Request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Asset not available offline', { status: 503 });
  }
}

// ── MESSAGES ─────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
