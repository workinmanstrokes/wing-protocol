/* iOS / PWA support (Safari "Add to Home Screen"). Web-only: does nothing harmful inside the native Capacitor app.
   - registers the offline service worker (sw.js) on real web hosts only
   - unlocks WebAudio on the first tap (iOS starts every AudioContext suspended)
   - stops pinch / double-tap zoom and rubber-band page scroll, keeps inner scroll areas working */
(function () {
  'use strict';
  var w = window, d = document;
  var native = !!(w.Capacitor && w.Capacitor.isNativePlatform && w.Capacitor.isNativePlatform());
  if (native) return; // the Android/Capacitor app keeps its existing behaviour untouched
  var topLevel = (function () { try { return w.top === w; } catch (e) { return false; } })();
  var standalone = w.navigator.standalone === true || (w.matchMedia && w.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
  d.documentElement.classList.add(standalone ? 'pwa-standalone' : 'pwa-browser');

  // 1. Service worker: only on http(s) web hosts, never in the native app or inside a portal iframe.
  // sw.js is resolved against this script's own URL (not the page URL) so the
  // registration + scope stay correct on sub-path hosts (e.g. GitHub Pages test
  // builds), where a bare 'sw.js' could resolve to the domain root.
  var capHost = location.protocol === 'https:' && location.hostname === 'localhost' && !location.port; // Capacitor Android origin
  var swUrl = (function () {
    try {
      var src = (d.currentScript && d.currentScript.src) || '';
      if (src) return new URL('sw.js', src).toString();
    } catch (e) {}
    return 'sw.js';
  })();
  // 'New version available' prompt: when a new worker is waiting, offer one tap to
  // reload into it instead of leaving the home-screen install on the old build
  // (no delete-and-re-add). The worker's SKIP_WAITING handler (sw.js) takes over;
  // controllerchange reloads once.
  var bannerShown = false;
  function promptUpdate(worker) {
    if (bannerShown || !d.body) return;
    bannerShown = true;
    var bar = d.createElement('div');
    bar.setAttribute('data-testid', 'sw-update-banner');
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom, 0px));z-index:9999;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:12px;background:#18181b;color:#fafafa;border:1px solid #3f3f46;font:600 14px/1.3 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.45)';
    bar.textContent = 'A new Wing Protocol build is ready.';
    var btn = d.createElement('button');
    btn.setAttribute('data-testid', 'sw-update-reload');
    btn.type = 'button';
    btn.textContent = 'Reload to update';
    btn.style.cssText = 'flex:none;padding:10px 14px;border:0;border-radius:8px;background:#e8c84a;color:#18181b;font:700 14px system-ui,sans-serif';
    btn.onclick = function () { worker.postMessage({ type: 'SKIP_WAITING' }); };
    var later = d.createElement('button');
    later.setAttribute('data-testid', 'sw-update-dismiss');
    later.type = 'button';
    later.textContent = 'Later';
    later.style.cssText = 'flex:none;min-height:36px;padding:0 10px;border:0;background:transparent;color:#a1a1aa;font:600 14px system-ui,sans-serif';
    later.addEventListener('click', function () { bar.remove(); });
    bar.appendChild(btn);
    bar.appendChild(later);
    d.body.appendChild(bar);
  }
  // Version check, independent of the service worker: a home-screen install
  // can sit on a stale worker/HTML, so poll the live page HTML itself with
  // the cache bypassed and compare the hashed build assets it references
  // (/_build/assets/*.js|css) with the ones this page actually loaded. A
  // mismatch means a newer build is deployed; offer the same one-tap reload
  // (no delete-and-re-add). Same-origin and relative, so it works on
  // snapshot sub-paths too; a fetch failure (offline) is silently ignored.
  var versionWorker = null; // set when a new service worker is waiting
  function buildAssets(urls) {
    var out = {}, i, u;
    for (i = 0; i < urls.length; i++) {
      u = urls[i];
      if (!u) continue;
      try { u = new URL(u, location.href).href.split('?')[0].split('#')[0]; } catch (e) { continue; }
      if (u.indexOf('/assets/') !== -1 && /\.(js|css)$/.test(u)) out[u] = true;
    }
    return out;
  }
  function liveBuildAssets() {
    var urls = [], i;
    for (i = 0; i < d.scripts.length; i++) urls.push(d.scripts[i].src);
    var links = d.querySelectorAll ? d.querySelectorAll('link[rel="stylesheet"]') : [];
    for (i = 0; i < links.length; i++) urls.push(links[i].href);
    return buildAssets(urls);
  }
  function checkVersion() {
    if (!topLevel || native || capHost) return;
    var href = location.href.split('#')[0];
    fetch(href, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
      return r.ok ? r.text() : '';
    }).then(function (html) {
      if (!html) return;
      // Only the assets the live page actually loads count: <script src>
      // and stylesheet <link href>. Preload/modulepreload links in the HTML
      // must be ignored, or they would look like a newer build on every load.
      var found = [], m, tagRe = /<(script|link)\b[^>]*>/g, attrRe = /(?:src|href)="([^"]+\.(?:js|css))[^"]*"/;
      while ((m = tagRe.exec(html))) {
        if (m[1] === 'link' && m[0].indexOf('stylesheet') === -1) continue;
        var a = attrRe.exec(m[0]);
        if (a) found.push(a[1]);
      }
      var live = liveBuildAssets(), next = buildAssets(found), changed = false, k, liveCount = 0, nextCount = 0;
      for (k in live) liveCount++;
      for (k in next) nextCount++;
      if (!liveCount || !nextCount) return; // nothing comparable (dev / error page)
      for (k in next) if (!live[k]) { changed = true; break; }
      if (!changed) for (k in live) if (!next[k]) { changed = true; break; }
      if (changed) {
        // Prefer activating the waiting worker; otherwise a plain reload
        // fetches the new hashed assets (the worker is network-first).
        promptUpdate(versionWorker || { postMessage: function () { w.location.reload(); } });
      }
    }).catch(function () {});
  }

  if (!native && !capHost && topLevel && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    w.addEventListener('load', function () {
      navigator.serviceWorker.register(swUrl).then(function (reg) {
        reg.update && reg.update();
        if (reg.waiting) { versionWorker = reg.waiting; promptUpdate(reg.waiting); }
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            // A new worker is ready while an old one still controls this page.
            if (nw.state === 'installed' && navigator.serviceWorker.controller) { versionWorker = nw; promptUpdate(nw); }
          });
        });
        var reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (!reloaded) { reloaded = true; w.location.reload(); }
        });
        // An old home-screen install only discovers the new build when the worker is
        // re-checked: poll while the page is open, and on every foregrounding.
        // The same poll runs the version check (live HTML asset hashes), which
        // catches a new build even when the worker update itself stalls.
        var check = function () { try { reg.update && reg.update(); } catch (e) {} checkVersion(); };
        w.setInterval(check, 60000);
        d.addEventListener('visibilitychange', function () { if (!d.hidden) check(); });
        check(); // check once on load, not only after 60s
      }).catch(function () {});
    });
  }

  // 2. WebAudio unlock: remember every AudioContext and resume them on the first user gesture.
  var AC = w.AudioContext || w.webkitAudioContext, ctxs = [];
  if (AC && !AC.__iosPatched) {
    var Patched = function (opts) { var c = opts === undefined ? new AC() : new AC(opts); ctxs.push(c); return c; };
    Patched.prototype = AC.prototype; Patched.__iosPatched = true;
    try { w.AudioContext = Patched; if (w.webkitAudioContext) w.webkitAudioContext = Patched; } catch (e) {}
  }
  function unlock() {
    for (var i = 0; i < ctxs.length; i++) {
      var c = ctxs[i];
      if (c.state === 'suspended' || c.state === 'interrupted') { try { c.resume(); } catch (e) {} }
      try { var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {}
    }
  }
  ['touchend', 'pointerup', 'click', 'keydown'].forEach(function (t) { d.addEventListener(t, unlock, { capture: true, passive: true }); });
  // Coming back from the background (iOS suspends audio): resume on the next tap too, which the listeners above do.
  d.addEventListener('visibilitychange', function () { if (!d.hidden) unlock(); });

  // 3. Zoom + rubber-band control.
  var css = 'html,body{overscroll-behavior:none;-webkit-text-size-adjust:100%;text-size-adjust:100%}' +
    'html,body,button,a,canvas,[role=button]{touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
    'canvas{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}';
  var st = d.createElement('style'); st.id = 'ios-pwa-style'; st.textContent = css; (d.head || d.documentElement).appendChild(st);
  ['gesturestart', 'gesturechange'].forEach(function (t) { d.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false }); });
  function scrollable(el) {
    for (; el && el !== d.body && el !== d.documentElement; el = el.parentElement) {
      if (el.nodeType !== 1) continue;
      var cs = getComputedStyle(el), oy = cs.overflowY, ox = cs.overflowX;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1) return true;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    }
    var se = d.scrollingElement || d.documentElement;
    return se.scrollHeight > w.innerHeight + 1; // a page that really scrolls keeps scrolling
  }
  d.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) { e.preventDefault(); return; } // pinch
    if (e.cancelable && !scrollable(e.target)) e.preventDefault(); // no rubber-band on fixed game screens
  }, { passive: false });
})();
