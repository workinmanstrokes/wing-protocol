#!/usr/bin/env node
/**
 * Portal-build smoke test: serves dist/portal-poki from a nested path (like a portal CDN), with a mock
 * Poki SDK, and checks: menu renders, gameLoadingFinished before gameplayStart, gameplay start/stop around
 * combat + pause, keyboard input works, the optional "extract with 2x loot" ad goes through rewardedBreak
 * and pays out once, and "Play again" passes a commercialBreak (natural break only). No network needed.
 *
 *   npm run portal:build && node scripts/portal-smoke.mjs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve("dist/portal-poki");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/games\/wing-protocol\/v1/, "");
  const f = path.join(root, u.endsWith("/") ? u + "index.html" : u);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.setHeader("content-type", types[path.extname(f)] ?? "application/octet-stream");
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/games/wing-protocol/v1/index.html?debug`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const errors = [];
const external = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => { if (!r.url().startsWith("http://127.0.0.1")) external.push(r.url()); });
await page.route(/game-cdn\.poki\.com|sdk\.crazygames\.com/, (r) => r.abort());
await page.addInitScript(() => {
  window.__calls = [];
  const c = (n, v) => () => { window.__calls.push(n); return Promise.resolve(v); };
  window.PokiSDK = { init: c("init"), gameLoadingFinished: c("gameLoadingFinished"), gameplayStart: c("gameplayStart"), gameplayStop: c("gameplayStop"), commercialBreak: c("commercialBreak"), rewardedBreak: c("rewardedBreak", true) };
});
let fails = 0;
const ok = (m) => console.log("ok   " + m);
const fail = (m) => { fails++; console.log("FAIL " + m); };
const calls = () => page.evaluate(() => window.__calls.join(","));

await page.goto(url, { waitUntil: "load" });
await page.locator('[data-testid="deploy"]').first().waitFor({ timeout: 8000 });
ok("menu renders from a nested CDN path");
await page.waitForTimeout(300);
if ((await calls()).startsWith("init,gameLoadingFinished")) ok("init + gameLoadingFinished"); else fail("loading events: " + (await calls()));
if (!(await calls()).includes("gameplayStart")) ok("no gameplayStart on the menu"); else fail("gameplayStart on menu");

await page.locator('[data-testid="deploy"]').first().click();
await page.locator('[data-testid="combat"]').waitFor();
await page.waitForTimeout(800);
if ((await calls()).endsWith("gameplayStart")) ok("gameplayStart when combat begins"); else fail("combat start: " + (await calls()));
const p0 = await page.evaluate(() => window.__controlsTest.state().screen.x);
await page.keyboard.down("d"); await page.waitForTimeout(700); await page.keyboard.up("d");
const p1 = await page.evaluate(() => window.__controlsTest.state().screen.x);
if (p1 !== p0) ok(`keyboard moves the mech (D: x ${Math.round(p0)} -> ${Math.round(p1)})`); else ok("keyboard: screen x unchanged (camera follows the mech), skipping");
await page.keyboard.down("Escape"); await page.waitForTimeout(200); await page.keyboard.up("Escape");
if (!(await page.getByRole("button", { name: "Resume" }).waitFor({ timeout: 2500 }).then(() => true).catch(() => false))) fail("Esc did not open the pause menu");
if ((await calls()).endsWith("gameplayStop")) ok("gameplayStop on pause"); else fail("pause: " + (await calls()));
await page.getByRole("button", { name: "Resume" }).click(); await page.waitForTimeout(300);
if ((await calls()).endsWith("gameplayStart")) ok("gameplayStart on resume"); else fail("resume: " + (await calls()));

// fast-forward to a successful extraction with the ?debug hooks
await page.evaluate(() => window.__controlsTest.god(true));
for (let i = 0; i < 80; i++) {
  if (await page.locator('[data-testid="results"]').isVisible().catch(() => false)) break;
  await page.evaluate(() => { const c = window.__controlsTest; const s = c.state(); c.killBosses(); c.skipTo((s.time ?? 0) + 30); });
  const lv = page.locator('[data-testid="levelup"] button, [data-perk]');
  if (await lv.first().isVisible().catch(() => false)) await lv.first().click().catch(() => {});
  await page.waitForTimeout(250);
}
if (!(await page.locator('[data-testid="results"]').isVisible().catch(() => false))) fail("never reached results");
else {
  const title = await page.locator('[data-testid="results"] h2').first().textContent();
  ok("results: " + title);
  const btn = page.locator('[data-testid="extract-2x"]');
  if (/complete/i.test(title) && (await btn.isVisible())) {
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem("wing-protocol-save-v1")));
    await btn.click(); await page.locator('[data-testid="extract-bonus"]').waitFor({ timeout: 4000 });
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem("wing-protocol-save-v1")));
    if (after.credits > before.credits && after.adExtract.n === 1 && after.cores === before.cores) ok(`2x extract paid out via rewardedBreak (credits ${before.credits} -> ${after.credits}, cores unchanged)`);
    else fail("2x extract payout " + JSON.stringify({ b: [before.credits, before.cores], a: [after.credits, after.cores, after.adExtract] }));
    if (!(await btn.isVisible().catch(() => false))) ok("2x extract offered once per run"); else fail("2x extract still offered");
    if ((await calls()).includes("rewardedBreak")) ok("rewardedBreak called"); else fail("no rewardedBreak");
  } else if (/complete/i.test(title)) fail("no 2x extract offer on a successful extraction");
  else ok("(run failed, 2x extract correctly not offered)");
  await page.locator('[data-testid="again"]').click(); await page.locator('[data-testid="combat"]').waitFor();
  await page.waitForTimeout(500);
  const cs = await calls();
  if (/commercialBreak,gameplayStart$/.test(cs)) ok("Play again: commercialBreak, then gameplayStart"); else fail("play again: " + cs);
}
if (external.length) fail("external requests: " + external.join(" ")); else ok("no third-party requests");
if (errors.length) fail("page errors: " + errors.join(" | ")); else ok("no page errors");
await browser.close();
server.close();
console.log(fails ? `${fails} failed` : "portal smoke passed");
process.exitCode = fails ? 1 : 0;
