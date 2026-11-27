// Update-while-playing simulation. Runs the real service worker (scripts/sw.tpl.js and public/sw.js)
// and the real page script (public/ios.js) against a small fake browser that follows the service
// worker lifecycle: a new worker installs, then waits unless it calls skipWaiting; when it takes over,
// the page gets 'controllerchange'. Checks that a deploy landing mid-mission never reloads the page,
// and that the new build applies once the player is back on the menu.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const IOS = read("public/ios.js");
const TEMPLATE = read("scripts/sw.tpl.js")
  .replace("__CACHE__", "wingprotocol-test")
  .replace("__FILES__", JSON.stringify(["./"]));
const RUNTIME = read("public/sw.js");

class Target {
  constructor() { this.l = {}; }
  addEventListener(t, f) { (this.l[t] ||= []).push(f); }
  removeEventListener(t, f) { this.l[t] = (this.l[t] || []).filter((x) => x !== f); }
  dispatch(t, e = {}) { for (const f of [...(this.l[t] || [])]) f({ type: t, ...e }); }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** One service worker script running in its own global, with spies on what it does. */
function bootWorker(src, { net = {}, cached = {} } = {}) {
  const self = new Target();
  const spy = { skipWaiting: 0, claimed: 0 };
  self.skipWaiting = () => { spy.skipWaiting++; return Promise.resolve(); };
  self.clients = { claim: () => { spy.claimed++; return Promise.resolve(); } };
  self.location = { origin: "https://game.test" };
  const store = new Map(Object.entries(cached));
  const caches = {
    open: async () => ({ add: async () => {}, put: async (req, res) => store.set(new URL(req.url).pathname, res) }),
    keys: async () => [],
    delete: async () => true,
    match: async (req) => store.get(new URL(typeof req === "string" ? `https://game.test/${req.replace("./", "")}` : req.url).pathname),
  };
  const fetch = async (req) => {
    const path = new URL(req.url).pathname;
    if (!(path in net)) throw new TypeError("offline");
    const status = net[path];
    return { ok: status >= 200 && status < 300, status, type: "basic", clone() { return this; } };
  };
  vm.runInNewContext(src, { self, caches, fetch, Request: class { constructor(u) { this.url = u; } }, URL, Response: { error: () => ({ error: true }) }, Promise, console });
  const fire = async (type, extra = {}) => {
    const waits = [];
    let responded;
    self.dispatch(type, { waitUntil: (p) => waits.push(p), respondWith: (p) => { responded = p; }, ...extra });
    await Promise.all(waits);
    return responded;
  };
  return { spy, fire, store };
}

/** A page running ios.js with a fake service worker container and DOM. */
function bootPage(swSource, { controlled = true } = {}) {
  const w = new Target();
  const d = new Target();
  const reloads = { n: 0 };
  const attrs = {};
  const body = { kids: [], appendChild(el) { this.kids.push(el); el.parent = this; } };
  const makeEl = () => ({
    kids: [], style: {}, attrs: {}, l: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(el) { this.kids.push(el); },
    addEventListener(t, f) { this.l[t] = f; },
    remove() { if (this.parent) this.parent.kids = this.parent.kids.filter((k) => k !== this); this.parent = null; },
  });
  Object.assign(d, {
    hidden: false,
    body,
    head: { appendChild() {} },
    currentScript: { src: "https://game.test/ios.js" },
    documentElement: { classList: { add() {} }, getAttribute: (k) => attrs[k] ?? null, setAttribute: (k, v) => { attrs[k] = String(v); } },
    createElement: makeEl,
  });

  const container = new Target();
  container.controller = controlled ? { id: "old" } : null;
  const reg = new Target();
  reg.waiting = null;
  reg.installing = null;
  let pendingUpdate = null; // set by deploy()
  reg.update = () => {
    if (!pendingUpdate) return;
    const u = pendingUpdate;
    pendingUpdate = null;
    void install(u);
  };
  const workers = [];
  async function takeOver(worker) {
    worker.state = "activated";
    reg.waiting = null;
    await worker.sw.fire("activate");
    container.controller = worker;
    container.dispatch("controllerchange");
  }
  async function install(src) {
    const sw = bootWorker(src);
    const worker = new Target();
    worker.sw = sw;
    worker.state = "installing";
    worker.postMessage = async (data) => {
      const before = sw.spy.skipWaiting;
      await sw.fire("message", { data });
      if (sw.spy.skipWaiting > before && worker.state === "installed") await takeOver(worker);
    };
    workers.push(worker);
    reg.installing = worker;
    reg.dispatch("updatefound");
    await sw.fire("install");
    reg.installing = null;
    worker.state = "installed";
    if (sw.spy.skipWaiting > 0 || !container.controller) { // skipWaiting, or nothing running yet
      await takeOver(worker);
      return;
    }
    reg.waiting = worker;
    worker.dispatch("statechange");
  }
  container.register = async () => {
    // First visit: register() resolves, then this build installs in the background and claims the page.
    if (!controlled) setTimeout(() => void install(swSource), 0);
    return reg;
  };

  Object.assign(w, {
    top: null,
    navigator: { serviceWorker: container, standalone: false },
    matchMedia: () => ({ matches: true }),
    location: { protocol: "https:", hostname: "game.test", port: "", reload: () => { reloads.n++; } },
    setInterval: () => 0,
  });
  w.top = w;
  const ctx = { window: w, document: d, navigator: w.navigator, location: w.location, URL, getComputedStyle: () => ({}) };
  vm.runInNewContext(IOS, ctx);

  const page = {
    reloads,
    workers,
    banner: () => body.kids.find((k) => k.attrs["data-testid"] === "sw-update-banner"),
    async load() { w.dispatch("load"); for (let i = 0; i < 8; i++) await flush(); },
    /** What src/components/game-app.tsx does on every screen change. */
    screen(s) { attrs["data-wp-busy"] = s === "menu" ? "0" : "1"; w.dispatch("wp-play-state"); },
    /** A new version is deployed and the page's next update check finds it. */
    async deploy(src) { pendingUpdate = src; reg.update(); for (let i = 0; i < 5; i++) await flush(); },
    async setHidden(h) { d.hidden = h; d.dispatch("visibilitychange"); for (let i = 0; i < 5; i++) await flush(); },
    async tap(testid) {
      const b = page.banner();
      const btn = b && b.kids.find((k) => k.attrs["data-testid"] === testid);
      assert.ok(btn, `no ${testid} button on screen`);
      if (btn.onclick) btn.onclick(); else btn.l.click();
      for (let i = 0; i < 5; i++) await flush();
    },
  };
  return page;
}

for (const [name, src] of [["sw.tpl.js (GitHub Pages build)", TEMPLATE], ["public/sw.js (Vercel)", RUNTIME]]) {
  test(`${name}: a new build waits after install and only takes over when asked`, async () => {
    const sw = bootWorker(src);
    await sw.fire("install");
    assert.equal(sw.spy.skipWaiting, 0, "install must not skip waiting (that reloads a running mission)");
    await sw.fire("message", { data: { type: "SKIP_WAITING" } });
    assert.equal(sw.spy.skipWaiting, 1);
  });

  test(`${name}: a file the old build still needs is served from cache when the server dropped it`, async () => {
    const sw = bootWorker(src, { net: { "/assets/old-chunk.js": 404, "/assets/missing.js": 404 }, cached: { "/assets/old-chunk.js": { cachedCopy: true } } });
    const req = (p, mode = "no-cors") => ({ method: "GET", url: `https://game.test${p}`, mode });
    assert.deepEqual(await sw.fire("fetch", { request: req("/assets/old-chunk.js") }), { cachedCopy: true });
    assert.equal((await sw.fire("fetch", { request: req("/assets/missing.js") })).status, 404);
  });

  test(`${name}: an update deployed mid-mission never reloads the game`, async () => {
    const page = bootPage(src);
    await page.load();
    page.screen("combat");
    await page.deploy(src);
    assert.equal(page.workers.length, 1, "the update check should have found the new build");
    assert.equal(page.workers[0].state, "installed", "new build waits");
    assert.equal(page.reloads.n, 0, "no reload during the mission");
    assert.equal(page.banner(), undefined, "no update bar over the fight");
    await page.setHidden(true); // player checks a text mid-mission
    await page.setHidden(false);
    assert.equal(page.reloads.n, 0, "backgrounding mid-mission does not apply it either");
    page.screen("results");
    assert.equal(page.reloads.n, 0);
    assert.equal(page.banner(), undefined, "results screen is still part of the run");

    page.screen("menu"); // between missions
    assert.ok(page.banner(), "update bar shows on the menu");
    page.screen("combat"); // starts another run instead
    assert.equal(page.banner(), undefined, "bar hides when a run starts");
    page.screen("menu");
    await page.tap("sw-update-reload");
    assert.equal(page.workers[0].state, "activated");
    assert.equal(page.reloads.n, 1, "reloads exactly once, on the player's tap");
  });

  test(`${name}: leaving the app while on the menu applies a waiting update quietly`, async () => {
    const page = bootPage(src);
    await page.load();
    page.screen("menu");
    await page.deploy(src);
    await page.tap("sw-update-dismiss");
    assert.equal(page.banner(), undefined);
    await page.setHidden(true);
    assert.equal(page.reloads.n, 1);
  });

  test(`${name}: the very first visit does not reload when the worker takes control`, async () => {
    const page = bootPage(src, { controlled: false });
    page.screen("combat");
    await page.load();
    assert.equal(page.workers[0].state, "activated");
    assert.equal(page.reloads.n, 0);
  });
}
