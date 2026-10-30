#!/usr/bin/env node
/**
 * Movement + aim feel check (headless). Point it at `vite dev` (or a build with ?debug).
 *
 *   node scripts/move-aim-check.mjs [url] [label]
 *
 * Desktop: holds D for 1.2s then releases, sampling every rendered frame, and reports
 * frame-to-frame jitter of the on-screen world scroll and the speed ramp. Then points the
 * mouse at 8 directions and reports the angle error between the cursor and the guns.
 * Mobile (S25 Ultra 412x915 @3.5x, portrait + landscape): drags the left and right touch
 * sticks and screenshots the floating joysticks.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const label = process.argv[3] ?? "run";
const out = `${process.env.CHECK_OUT ?? "/workspace/out/wp-move-aim"}/${label}`;
mkdirSync(out, { recursive: true });
const report = { label, url };

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

async function startRun(page) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="main-menu"][data-ready="1"] [data-testid="deploy"]').first().waitFor({ timeout: 15000 });
  await page.locator('[data-testid="deploy"]').first().click();
  await page.locator('[data-testid="combat"]').first().waitFor({ timeout: 10000 });
  await page.waitForFunction(() => (window.__controlsTest?.state().time ?? 0) > 0.3, null, { timeout: 10000 });
  await page.evaluate(() => window.__controlsTest.god?.(true));
}

const stats = (a) => {
  const m = a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length));
  return { mean: +m.toFixed(3), sd: +sd.toFixed(3), max: +Math.max(...a).toFixed(3) };
};

// ---- desktop: movement ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await startRun(page);
  await page.mouse.move(640, 200); // keep aim fixed so camera look-ahead is constant
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__mv = [];
    const tick = () => {
      const t = window.__controlsTest;
      const s = t.state();
      window.__mv.push({ t: performance.now(), spd: t.getSpeed(), cam: t.camera?.() ?? null, sx: s.screen.x, sy: s.screen.y });
      if (window.__mv.length < 150) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1200);
  await page.keyboard.up("KeyD");
  await page.waitForFunction(() => window.__mv.length >= 150, null, { timeout: 10000 });
  const mv = await page.evaluate(() => window.__mv);
  // world scroll per frame = camera delta (after) or player-world delta approximated via speed*dt (before)
  const perFrame = [];
  for (let i = 1; i < mv.length; i++) {
    const dt = (mv[i].t - mv[i - 1].t) / 1000;
    if (mv[i].cam && mv[i - 1].cam) perFrame.push(Math.hypot(mv[i].cam.x - mv[i - 1].cam.x, mv[i].cam.y - mv[i - 1].cam.y) / Math.max(1e-3, dt));
  }
  // jitter: change in on-screen player position per frame (should glide, not stutter)
  const screenJerk = [];
  for (let i = 2; i < mv.length; i++) {
    const ax = mv[i].sx - 2 * mv[i - 1].sx + mv[i - 2].sx;
    const ay = mv[i].sy - 2 * mv[i - 1].sy + mv[i - 2].sy;
    screenJerk.push(Math.hypot(ax, ay));
  }
  const spd = mv.map((s) => s.spd);
  const peak = Math.max(...spd);
  const i90 = spd.findIndex((v) => v >= peak * 0.9);
  const iPeak = spd.indexOf(peak);
  const iStop = spd.findIndex((v, i) => i > iPeak && v < peak * 0.05);
  report.movement = {
    frames: mv.length,
    peakSpeed: +peak.toFixed(1),
    msTo90pct: i90 > 0 ? Math.round(mv[i90].t - mv[0].t) : null,
    msToStopAfterPeak: iStop > 0 ? Math.round(mv[iStop].t - mv[iPeak].t) : null,
    onScreenPlayerJerkPx: stats(screenJerk),
    cameraSpeedPerFrame: perFrame.length ? stats(perFrame) : "n/a (no camera probe)",
  };
  writeFileSync(`${out}/movement-samples.json`, JSON.stringify(mv));

  // ---- desktop: aim accuracy ----
  const errs = [];
  const hasAimProbe = await page.evaluate(() => typeof window.__controlsTest.aim === "function");
  if (hasAimProbe) {
    for (let k = 0; k < 8; k++) {
      const st = await page.evaluate(() => window.__controlsTest.state());
      const a = (k / 8) * Math.PI * 2 + 0.3;
      const tx = st.screen.x + Math.cos(a) * 220;
      const ty = st.screen.y + Math.sin(a) * 220;
      await page.mouse.move(tx, ty);
      await page.waitForTimeout(900); // let the camera look-ahead settle
      const r = await page.evaluate(() => window.__controlsTest.aim());
      const want = Math.atan2(ty - r.screen.y, tx - r.screen.x);
      let d = r.fire - want;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      errs.push(Math.abs((d * 180) / Math.PI));
    }
    report.aimErrorDeg = stats(errs);
  } else report.aimErrorDeg = "n/a (no aim probe on this build)";
  await page.screenshot({ path: `${out}/desktop-aim.png` });
  await ctx.close();
}

// ---- mobile: S25 Ultra portrait + landscape ----
for (const [name, vp] of [["portrait", { width: 412, height: 915 }], ["landscape", { width: 915, height: 412 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 3.5, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await startRun(page);
  const cdp = await ctx.newCDPSession(page);
  const left = await page.locator('[data-testid="touch-left"]').boundingBox().catch(() => null);
  const right = await page.locator('[data-testid="touch-right"]').boundingBox().catch(() => null);
  const visible = await page.locator('[data-testid="touch-left"]').isVisible().catch(() => false);
  const res = { sticksVisible: visible };
  if (visible && left && right) {
    const lp = { x: left.x + left.width * 0.45, y: left.y + left.height * 0.55, id: 1 };
    const rp = { x: right.x + right.width * 0.55, y: right.y + right.height * 0.5, id: 2 };
    const send = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id })) });
    await send("touchStart", [lp]);
    await send("touchStart", [lp, rp]);
    for (let i = 1; i <= 10; i++) {
      await send("touchMove", [
        { ...lp, x: lp.x + 4 * i, y: lp.y - 2.5 * i },
        { ...rp, x: rp.x - 3 * i, y: rp.y - 4 * i },
      ]);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(500);
    res.speedWhileDragging = +(await page.evaluate(() => window.__controlsTest.getSpeed())).toFixed(1);
    res.aim = await page.evaluate(() => window.__controlsTest.aim?.() ?? null);
    await page.screenshot({ path: `${out}/mobile-${name}-drag.png` });
    await send("touchEnd", []);
  } else {
    await page.screenshot({ path: `${out}/mobile-${name}-drag.png` });
  }
  report[`mobile_${name}`] = res;
  await ctx.close();
}

await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
