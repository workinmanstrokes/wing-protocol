/**
 * Mobile playtest for the suit redesign. Uses the real sticks and the Skill button.
 * Does not call god mode. Spawn is not used. Cooldowns are read from the existing HUD probe.
 *
 *   CHROMIUM_PATH=/usr/bin/google-chrome node scripts/suit-playtest.mjs [url]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const out = "/workspace/screenshots/after";
mkdirSync(out, { recursive: true });

const ALL = ["aether", "forge", "scythe", "dune", "serpent", "storm", "vulture", "cross", "moth", "kiln", "kite"];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

const report = { url, errors: [], suits: [], save: {}, retry: null };

function saveFor(selected, extra = {}) {
  return {
    version: 2,
    credits: 4200,
    keys: 4,
    cores: 40,
    shards: 55,
    unlocked: ALL,
    selected,
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
    ...extra,
  };
}

async function boot(page, selected, opts = {}) {
  const seed = opts.legacy
    ? {
        version: 1,
        credits: 1337,
        keys: 2,
        unlocked: ["aether", "forge", "scythe"],
        selected: "scythe",
        inventory: [{ id: "g1", name: "Gundam Weave", slot: "armor", rarity: "rare", mods: { hp: 10 } }],
        equipped: { armor: "g1" },
        highKills: 9,
        bestTime: 40,
        sorties: 2,
      }
    : saveFor(selected);
  await page.addInitScript(({ seed, briefed }) => {
    localStorage.setItem("wing-protocol-save-v1", JSON.stringify(seed));
    if (briefed) localStorage.setItem("wp-controls-briefed", "1");
  }, { seed, briefed: opts.briefed !== false });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="main-menu"][data-ready="1"]').waitFor({ timeout: 15000 });
  return errors;
}

async function dualTouchSkill(page) {
  const left = await page.locator('[data-testid="touch-left"]').boundingBox();
  const right = await page.locator('[data-testid="touch-right"]').boundingBox();
  const skill = await page.locator('[data-testid="skill-btn"]').boundingBox();
  if (!left || !right || !skill) return { ok: false, reason: "controls not measurable", left: !!left, right: !!right, skill: !!skill };
  const cdp = await page.context().newCDPSession(page);
  const send = (type, pts) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id })),
    });
  const lp = { x: left.x + left.width * 0.5, y: left.y + left.height * 0.45, id: 1 };
  const rp = { x: right.x + right.width * 0.55, y: right.y + right.height * 0.4, id: 2 };
  const sp = { x: skill.x + skill.width / 2, y: skill.y + skill.height / 2, id: 3 };
  await send("touchStart", [lp]);
  await send("touchStart", [lp, rp]);
  for (let i = 1; i <= 8; i++) {
    await send("touchMove", [
      { ...lp, x: lp.x + 6 * i, y: lp.y - 3 * i },
      { ...rp, x: rp.x + 5 * i, y: rp.y - 4 * i },
    ]);
    await page.waitForTimeout(20);
  }
  const mid = await page.evaluate(() => {
    const t = window.__controlsTest;
    return { speed: t.getSpeed(), aim: t.aim(), skillCd: t.state().skillCd };
  });
  await send("touchStart", [
    { ...lp, x: lp.x + 48, y: lp.y - 24 },
    { ...rp, x: rp.x + 40, y: rp.y - 32 },
    sp,
  ]);
  await page.waitForTimeout(120);
  await send("touchEnd", []);
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => window.__controlsTest.state());
  return { ok: true, mid, after };
}

// --- legacy save still loads the owned suits ---
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = await boot(page, "aether", { legacy: true, briefed: true });
  report.errors.push(...errors);
  report.save = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("wing-protocol-save-v1"));
    return {
      version: raw.version,
      credits: raw.credits,
      selected: raw.selected,
      unlocked: raw.unlocked,
      gearName: raw.inventory?.[0]?.name ?? null,
      slot: raw.inventory?.[0]?.slot ?? null,
    };
  });
  await ctx.close();
}

// --- first-run brief + portrait pilots ---
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  report.errors.push(...(await boot(page, "aether", { briefed: false })));
  await page.locator('[data-tab="pilots"]').click();
  await page.locator('[data-testid="pilot-detail"]').waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/portrait-pilots.png` });
  const copy = await page.locator('[data-testid="skill-desc"]').innerText();
  const passive = await page.locator('[data-testid="passive-desc"]').innerText();
  report.aetherCopy = { copy, passive };
  await page.locator('[data-tab="play"]').click();
  await page.locator('[data-testid="deploy"]').first().click();
  await page.locator('[data-testid="combat"]').waitFor();
  await page.locator('[data-testid="controls-brief"]').waitFor();
  await page.screenshot({ path: `${out}/portrait-brief.png` });
  await page.locator('[data-testid="controls-brief"] button').click();
  await page.waitForFunction(() => (window.__controlsTest?.state().time ?? 0) > 0.6, null, { timeout: 10000 });
  await page.screenshot({ path: `${out}/portrait-combat.png` });
  await ctx.close();
}

// --- several suits: real multi-touch move + aim + skill, then cooldown ticks ---
for (const id of ["aether", "dune", "scythe", "storm", "kite", "kiln"]) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  report.errors.push(...(await boot(page, id, { briefed: true })));
  await page.locator('[data-testid="deploy"]').first().click();
  await page.locator('[data-testid="combat"]').waitFor();
  await page.waitForFunction(() => (window.__controlsTest?.state().time ?? 0) > 0.4, null, { timeout: 10000 });
  const touch = await dualTouchSkill(page);
  let cooled = null;
  if (touch.ok && touch.after.skillCd > 0) {
    const start = touch.after.skillCd;
    await page.waitForTimeout(600);
    cooled = await page.evaluate(() => window.__controlsTest.state().skillCd);
    touch.cooledBy = +(start - cooled).toFixed(2);
  }
  if (id === "aether" || id === "dune") {
    await page.screenshot({ path: `${out}/portrait-skill-${id}.png` });
  }
  report.suits.push({ id, touch });
  await ctx.close();
}

// --- landscape skill + retry back to the menu ---
{
  const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  report.errors.push(...(await boot(page, "aether", { briefed: true })));
  await page.locator('[data-testid="deploy"]').first().click();
  await page.locator('[data-testid="combat"]').waitFor();
  await page.waitForFunction(() => (window.__controlsTest?.state().time ?? 0) > 0.4, null, { timeout: 10000 });
  await page.keyboard.down("Space");
  await page.waitForTimeout(90);
  await page.keyboard.up("Space");
  await page.waitForTimeout(160);
  const st = await page.evaluate(() => window.__controlsTest.state());
  await page.screenshot({ path: `${out}/landscape-skill.png` });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Abort run" }).click();
  await page.locator('[data-testid="main-menu"]').waitFor({ timeout: 8000 });
  await page.locator('[data-testid="deploy"]').first().click();
  await page.locator('[data-testid="combat"]').waitFor();
  const again = await page.waitForFunction(() => (window.__controlsTest?.state().time ?? 0) > 0.3, null, { timeout: 10000 }).then(() => true).catch(() => false);
  report.retry = { skillCdAfterSpace: st.skillCd, redeployed: again };
  await ctx.close();
}

await browser.close();
report.errors = [...new Set(report.errors)];
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
