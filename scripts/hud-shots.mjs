/**
 * Portrait 412x915 and landscape 915x412 shots of the combo callout and
 * edge-threat chevrons against the hull readout, timer, minimap, and AIM stick.
 *
 *   node scripts/hud-shots.mjs before|after [url]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const phase = process.argv[2] ?? "after";
const url = process.argv[3] ?? "http://127.0.0.1:8080/?debug=1";
const out = `/workspace/screenshots/hud-${phase}`;
mkdirSync(out, { recursive: true });

const ALL = ["aether", "forge", "scythe", "dune", "serpent", "storm", "vulture", "cross", "moth", "kiln", "kite"];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

function saveFor() {
  return {
    version: 2,
    credits: 4200,
    keys: 4,
    cores: 40,
    shards: 55,
    unlocked: ALL,
    selected: "aether",
    inventory: [],
    equipped: {},
    highKills: 12,
    bestTime: 80,
    sorties: 4,
    freeCrateAt: 0,
    adCrates: { day: "", n: 0 },
    adExtract: { day: "", n: 0 },
    premiumPity: 2,
    premiumOpened: 3,
    towerBest: 6,
    towerCoreFloor: 5,
    eliteClears: { titan: 1 },
    eliteCores: { day: "", n: 0 },
    rushClears: 0,
    stats: { crates: 2, upgrades: 1, bossKills: 1 },
  };
}

const report = { phase, views: [] };

for (const view of [
  { name: "portrait", width: 412, height: 915 },
  { name: "landscape", width: 915, height: 412 },
]) {
  const ctx = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript((seed) => {
    localStorage.setItem("wing-protocol-save-v1", JSON.stringify(seed));
    localStorage.setItem("wp-controls-briefed", "1");
  }, saveFor());
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="main-menu"][data-ready="1"]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid="deploy"]').click();
  await page.locator('[data-testid="combat"]').waitFor({ timeout: 10000 });
  await page.waitForFunction(() => window.__controlsTest?.state, null, { timeout: 10000 });
  await page.evaluate(() => {
    window.__controlsTest.god(true);
    window.__controlsTest.setQuality("high");
  });
  await page.waitForTimeout(400);
  const placed = await page.evaluate(({ width, height }) => {
    const t = window.__controlsTest;
    t.setCombo(3);
    const w = width;
    const h = height;
    // Off-screen and edge threats: AIM corner, minimap/timer corner, left edge, below hull.
    // Off-screen and in the stick / timer / minimap corners, so the marks
    // are the chevrons rather than hulls sitting on the chrome.
    const spots = [
      [w - 70, h + 140],
      [w + 120, h - 50],
      [w + 100, 30],
      [w - 40, -90],
      [-110, 40],
      [-90, h * 0.55],
      [w * 0.5, h + 160],
      [w + 80, Math.min(150, h * 0.35)],
    ];
    for (const [sx, sy] of spots) {
      const dx = sx - w / 2;
      const dy = sy - h / 2;
      t.spawnOffset(dx, dy, "walker");
    }
    return t.state();
  }, view);
  await page.waitForTimeout(280);
  const boxes = await page.evaluate(() => {
    const hull = document.querySelector("[data-testid='hull-readout']");
    const combo = document.querySelector("[data-testid='combo-popup']");
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, text: el.textContent?.trim() ?? "" };
    };
    const overlap = (a, b) =>
      !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const h = box(hull);
    const c = box(combo);
    return { hull: h, combo: c, overlap: overlap(h, c), mobs: window.__controlsTest.state().mobs };
  });
  const file = `${out}/${view.name}-combo-chevrons.png`;
  await page.screenshot({ path: file });
  report.views.push({ ...view, file, placed: { mobs: placed.mobs, hp: placed.hp }, boxes, errors });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
