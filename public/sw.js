/* Offline service worker (runtime version; static builds overwrite it with a full precache via scripts/gen-sw.mjs).
   Cache name carries a version — BUMP IT on every release so an installed
   home-screen PWA picks up the new build: a changed sw.js makes the browser
   install the new worker, which waits until the player is between missions
   (ios.js), then takes over and deletes every old cache on activate.
   Same-origin requests: network first (updates arrive right away), cached copy when offline. */
const CACHE = 'wingprotocol-runtime-v3';
// Every game on the arcade site shares one cache storage, so only clear this game's own old caches.
const OWN = 'wingprotocol-';
const FILES = ["./", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "ios.js"];
// A new build installs and then WAITS. It never takes over on its own, because that reloads the page
// (ios.js) and would throw the player out of a running mission. It takes over when ios.js sends
// SKIP_WAITING (player is between missions) or when every window closes (next launch).
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(new Request(f, { cache: 'reload' })).catch(() => {}))))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(OWN) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
    // After a deploy the server may no longer have a file the running (older) build still asks for,
    // like a code chunk loaded mid-run. Serve the cached copy instead of breaking the session.
    if (res && res.status === 404 && req.mode !== 'navigate') return caches.match(req, { ignoreSearch: true }).then((hit) => hit || res);
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html').then((r) => r || caches.match('./')) : Response.error()))));
});
