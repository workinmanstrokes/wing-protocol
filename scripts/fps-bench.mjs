/**
 * Crowded-fight frame rate at the playtest phone size.
 * Spawns a ring of walkers on top of the player and samples the in-game governor.
 *
 *   node scripts/fps-bench.mjs [url]
 */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/?debug=1";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--disable-frame-rate-limit"],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.addInitScript(() => {
  const ALL = ["aether", "forge", "scythe", "dune", "serpent", "storm", "vulture", "cross", "moth", "kiln", "kite"];
  localStorage.setItem(
    "wing-protocol-save-v1",
    JSON.stringify({
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
      towerBest: 0,
      towerCoreFloor: 0,
      eliteClears: {},
      eliteCores: { day: "", n: 0 },
      rushClears: 0,
      stats: { crates: 0, upgrades: 0, bossKills: 0 },
    }),
  );
  localStorage.setItem("wp-controls-briefed", "1");
  localStorage.setItem("wing-protocol-quality", "high");
});
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="main-menu"][data-ready="1"]').waitFor({ timeout: 20000 });
await page.locator('[data-testid="deploy"]').click();
await page.locator('[data-testid="combat"]').waitFor();
await page.waitForFunction(() => window.__controlsTest?.state, null, { timeout: 10000 });

async function sample(ms, keep) {
  const frames = [];
  const start = Date.now();
  while (Date.now() - start < ms) {
    const s = await page.evaluate((n) => {
      const t = window.__controlsTest;
      if (n > 0) {
        const alive = t.state().mobs;
        const need = Math.max(0, n - alive);
        for (let i = 0; i < need; i++) {
          const a = (i / Math.max(1, need)) * Math.PI * 2;
          t.spawnOffset(Math.cos(a) * 150, Math.sin(a) * 150, "walker");
        }
      }
      return t.state();
    }, keep);
    frames.push(s);
    await page.waitForTimeout(200);
  }
  const fps = frames.map((f) => f.fps).filter((n) => n > 0);
  const mobs = frames.map((f) => f.mobs);
  const avg = fps.reduce((a, b) => a + b, 0) / Math.max(1, fps.length);
  const min = fps.length ? Math.min(...fps) : 0;
  return { avg: Math.round(avg * 10) / 10, min, samples: fps.length, mobs: mobs.slice(-4), quality: frames.at(-1)?.quality };
}

await page.evaluate(() => {
  window.__controlsTest.god(true);
  window.__controlsTest.setQuality("high");
});
await page.waitForTimeout(800);
const idle = await sample(2000, 0);
const crowd = await sample(4000, 19);
console.log(JSON.stringify({ idle, crowd, errors }, null, 2));
await browser.close();
