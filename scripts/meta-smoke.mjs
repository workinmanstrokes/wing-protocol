#!/usr/bin/env node
/**
 * Browser smoke test for the meta menu. Phone viewport. Covers: menu renders
 * fast (no splash), every tab, opening crates, equipping gear, the Prism Vault,
 * and starting each mode (Sortie, Tower incl. a room pick, Elite, Boss Rush).
 *
 *   node scripts/meta-smoke.mjs [url]       (default http://127.0.0.1:8080/)
 *   CHROMIUM_PATH=/path/to/chrome node scripts/meta-smoke.mjs
 *
 * Tower room pick uses the dev-only cheat hooks, so point it at `vite dev` or
 * a build opened with ?debug.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const out = process.env.SMOKE_OUT ?? "/workspace/out/wp-meta";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" && !/favicon|Failed to load resource|_vercel/i.test(m.text())) errors.push(`console: ${m.text()}`);
});

const results = [];
async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`ok   ${name} (${Date.now() - t0}ms)`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e?.message ?? e) });
    console.log(`FAIL ${name}: ${e?.message ?? e}`);
    await page.screenshot({ path: `${out}/fail-${name.replace(/\W+/g, "-")}.png` }).catch(() => {});
  }
}
const tap = (sel) => page.locator(sel).first().click();
const expectVisible = (sel, timeout = 5000) => page.locator(sel).first().waitFor({ state: "visible", timeout });

async function backToMenu() {
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("button", { name: "Abort run" }).click();
  if (await page.locator('[data-testid="results"]').isVisible().catch(() => false)) await tap('[data-testid="to-menu"]');
  await expectVisible('[data-testid="main-menu"]');
}

await step("menu loads with Deploy in under 3s (no splash)", async () => {
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.goto(new URL("ios.js", url).href);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expectVisible('[data-testid="main-menu"][data-ready="1"] [data-testid="deploy"]', 3000);
  const ms = Date.now() - t0;
  if (ms > 3000) throw new Error(`deploy interactive after ${ms}ms`);
  console.log(`     menu interactive in ${ms}ms`);
  await expectVisible('[data-testid="menu-bg"]');
  const box = await page.locator('[data-testid="deploy"]').boundingBox();
  if (!box || box.y < 844 * 0.7) throw new Error(`Deploy not in thumb zone (y=${box?.y})`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/01-play.png` });
});

await step("tabs: hangar, store, pilots, play", async () => {
  await tap('[data-tab="hangar"]');
  await expectVisible('[aria-label="Loadout"]');
  await page.screenshot({ path: `${out}/02-hangar-empty.png` });
  await tap('[data-tab="store"]');
  await expectVisible('[data-testid="vault"]');
  await page.screenshot({ path: `${out}/03-store.png`, fullPage: true });
  await tap('[data-tab="pilots"]');
  await expectVisible('[data-testid="pilot-detail"]');
  if ((await page.locator("[data-mech]").count()) !== 11) throw new Error("expected 11 mechs in roster");
  await tap('[data-mech="moth"]');
  await expectVisible("text=Find it in the Prism Vault");
  await page.screenshot({ path: `${out}/04-pilots.png` });
  await tap('[data-tab="play"]');
  await expectVisible('[aria-label="Missions"]');
});

await step("store: odds shown, open free crate and a supply crate", async () => {
  await tap('[data-tab="store"]');
  const odds = await page.locator('[aria-label="Drop odds"]').count();
  if (odds < 4) throw new Error(`odds lists: ${odds}`);
  await expectVisible('[aria-label="Prism Vault odds"]');
  await tap('[data-testid="open-free"]');
  await expectVisible('[data-testid="reveal"]');
  await page.screenshot({ path: `${out}/05-reveal.png` });
  await tap('[data-testid="reveal-ok"]');
  const freeLabel = await page.locator('[data-testid="open-free"]').innerText();
  if (/open free/i.test(freeLabel)) throw new Error("free crate did not go on cooldown");
  await tap('[data-testid="buy-supply-credits"]');
  await expectVisible('[data-testid="reveal"]');
  await tap('[data-testid="reveal-ok"]');
  await tap('[data-testid="buy-supply-keys"]');
  await expectVisible('[data-testid="reveal"]');
  await tap('[data-testid="reveal-ok"]');
});

await step("store: rewarded-ad crate (stub)", async () => {
  await tap('[data-testid="open-ad"]');
  await expectVisible('[aria-label="Sponsor ad"]');
  await expectVisible('[data-testid="reveal"]', 6000);
  await tap('[data-testid="reveal-ok"]');
});

await step("hangar: equip a part and stats update", async () => {
  await tap('[data-tab="hangar"]');
  let found = false;
  for (const s of ["weapon", "secondary", "frame", "thrusters", "core"]) {
    await tap(`[data-slot="${s}"]`);
    if ((await page.locator('[data-testid="gear-card"]').count()) > 0) {
      await tap('[data-testid="gear-card"]');
      await expectVisible('[data-testid="gear-detail"]');
      await tap('[data-testid="equip-toggle"]');
      const label = await page.locator('[data-testid="equip-toggle"]').innerText();
      if (!/unequip/i.test(label)) throw new Error("equip did not apply");
      const slotText = await page.locator(`[data-slot="${s}"]`).innerText();
      if (/empty/i.test(slotText)) throw new Error("slot still empty");
      const stats = await page.locator('[data-testid="mech-stats"]').innerText();
      if (!stats.includes("+")) throw new Error(`no stat delta shown: ${stats}`);
      found = true;
      break;
    }
  }
  if (!found) throw new Error("no gear to equip");
  await page.screenshot({ path: `${out}/06-hangar-equipped.png`, fullPage: true });
});

await step("prism vault opens with cores and shows pity", async () => {
  // leave the app first: it re-saves its in-memory state on pagehide
  await page.goto(new URL("ios.js", url).href);
  await page.evaluate(() => {
    const k = "wing-protocol-save-v1";
    const s = JSON.parse(localStorage.getItem(k));
    s.cores = 200;
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expectVisible('[data-testid="main-menu"][data-ready="1"]');
  await tap('[data-tab="store"]');
  const before = await page.locator('[data-testid="pity"]').innerText();
  await tap('[data-testid="open-vault"]');
  await expectVisible('[data-testid="reveal"]');
  await page.screenshot({ path: `${out}/07-vault-reveal.png` });
  await tap('[data-testid="reveal-ok"]');
  const after = await page.locator('[data-testid="pity"]').innerText();
  if (before === after && !/All vault mechs/.test(after)) {
    // a natural mech hit also resets pity to 10, so text can match; accept if a vault mech is now owned
    const owned = await page.locator('[data-testid="vault"]').innerText();
    if (!/[1-3]\/3 vault mechs/.test(owned)) throw new Error("pity counter did not move");
  }
  const cores = await page.locator('[data-currency="cores"]').innerText();
  if (cores.trim() !== "140") throw new Error(`cores after vault: ${cores}`);
});

for (const mode of ["sortie", "elite", "rush"]) {
  await step(`start mode: ${mode}`, async () => {
    await tap('[data-tab="play"]');
    await tap(`[data-mode="${mode}"]`);
    if (mode === "elite") {
      await tap('[data-boss="ace"]');
      await page.getByRole("button", { name: "Glass Cannon" }).click();
    }
    await tap('[data-testid="deploy"]');
    await expectVisible(`[data-testid="combat"][data-mode="${mode}"]`);
    await page.waitForTimeout(1500);
    const st = await page.evaluate(() => window.__controlsTest?.state());
    if (!st || !(st.time > 0.5)) throw new Error(`combat loop not running: ${JSON.stringify(st)}`);
    await page.screenshot({ path: `${out}/08-combat-${mode}.png` });
    await backToMenu();
  });
}

await step("start mode: tower, clear floor 1, pick a room, floor 2 starts", async () => {
  await tap('[data-tab="play"]');
  await tap('[data-mode="tower"]');
  await tap('[data-testid="deploy"]');
  await expectVisible('[data-testid="combat"][data-mode="tower"]');
  await page.waitForTimeout(800);
  const hasCheats = await page.evaluate(() => typeof window.__controlsTest?.skipTo === "function");
  if (!hasCheats) throw new Error("dev cheat hooks unavailable (run against vite dev or ?debug)");
  await page.evaluate(() => {
    window.__controlsTest.god(true);
    window.__controlsTest.skipTo(44.5);
  });
  await expectVisible('[data-testid="tower-rooms"]', 8000);
  await page.screenshot({ path: `${out}/09-tower-rooms.png` });
  await tap("[data-room]");
  await expectVisible('[data-testid="combat"][data-mode="tower"]');
  await page.waitForTimeout(600);
  const hud = await page.locator('[data-testid="combat"]').innerText();
  if (!/floor 2/i.test(hud)) throw new Error("floor 2 label missing");
  await backToMenu(); // aborting banks the climb -> results -> menu
  const best = await page.locator('[data-mode="tower"]').innerText();
  if (!/best floor 1/i.test(best)) throw new Error(`tower best not recorded: ${best}`);
});

await step("elite win pays first-clear cores", async () => {
  await tap('[data-tab="play"]');
  const before = Number((await page.locator('[data-currency="cores"]').innerText()).trim());
  await tap('[data-mode="elite"]');
  await tap('[data-boss="titan"]');
  await tap('[data-testid="deploy"]');
  await expectVisible('[data-testid="combat"][data-mode="elite"]');
  await page.evaluate(() => window.__controlsTest.god(true));
  await page.waitForFunction(() => (window.__controlsTest?.state().bosses ?? 0) >= 1, null, { timeout: 10000 });
  await page.evaluate(() => window.__controlsTest.killBosses());
  await expectVisible('[data-testid="results"]', 8000);
  const payout = await page.locator('[data-testid="payout"]').innerText();
  if (!/\+20 cores/i.test(payout)) throw new Error(`payout: ${payout}`);
  await page.screenshot({ path: `${out}/13-elite-win.png` });
  await tap('[data-testid="to-menu"]');
  const after = Number((await page.locator('[data-currency="cores"]').innerText()).trim());
  if (after !== before + 20) throw new Error(`cores ${before} -> ${after}`);
});

await step("vault mechs: art + each plays and casts its skill", async () => {
  await page.goto(new URL("ios.js", url).href);
  await page.evaluate(() => {
    const k = "wing-protocol-save-v1";
    const s = JSON.parse(localStorage.getItem(k));
    s.unlocked = [...new Set([...s.unlocked, "moth", "kiln", "kite"])];
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expectVisible('[data-testid="main-menu"][data-ready="1"]');
  for (const id of ["moth", "kiln", "kite"]) {
    await tap('[data-tab="pilots"]');
    await tap(`[data-mech="${id}"]`);
    await page.evaluate(() => document.querySelector("main .overflow-y-auto")?.scrollTo(0, 0));
    await page.waitForTimeout(250);
    await page.locator('[data-testid="pilot-detail"]').screenshot({ path: `${out}/11-pilot-${id}.png` });
    await tap('[data-tab="play"]');
    await tap('[data-mode="sortie"]');
    await tap('[data-testid="deploy"]');
    await expectVisible('[data-testid="combat"][data-mode="sortie"]');
    await page.evaluate(() => window.__controlsTest?.spawn?.(25));
    await page.waitForTimeout(900);
    await page.keyboard.press("Space");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/12-skill-${id}.png` });
    const st = await page.evaluate(() => window.__controlsTest?.state());
    if (!st || !(st.time > 1)) throw new Error(`${id}: loop not running`);
    await backToMenu();
  }
});

await step("missions board shows progress after runs", async () => {
  await tap('[data-tab="play"]');
  await expectVisible("[data-mission]");
  await page.screenshot({ path: `${out}/10-missions.png`, fullPage: true });
});

await browser.close();
const failed = results.filter((r) => !r.ok);
if (errors.length) console.log("\nbrowser errors:\n" + errors.join("\n"));
console.log(`\n${results.length - failed.length}/${results.length} smoke steps passed`);
process.exit(failed.length || errors.length ? 1 : 0);
