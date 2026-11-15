/* Offline service worker (runtime version; static builds overwrite it with a full precache via scripts/gen-sw.mjs).
   Cache name carries a version — BUMP IT on every release so an installed
   home-screen PWA picks up the new build: a changed sw.js makes the browser
   install the new worker, which deletes every old cache on activate, and
   ios.js shows an "update ready" prompt instead of silently serving stale files.
   Same-origin requests: network first (updates arrive right away), cached copy when offline. */
const CACHE = 'wingprotocol-runtime-v2';
const FILES = ["./", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "ios.js"];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(new Request(f, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html').then((r) => r || caches.match('./')) : Response.error()))));
});
