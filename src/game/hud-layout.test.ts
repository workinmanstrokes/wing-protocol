import assert from "node:assert/strict";
import test from "node:test";
import {
  clampThreatMark,
  comboPopupRect,
  hullReadoutRect,
  minimapCenter,
  rectsOverlap,
  skillButtonRect,
  stickBandRect,
  threatSafeRect,
  timerRect,
} from "./hud-layout.ts";

const VIEWS = [
  { name: "portrait", w: 412, h: 915 },
  { name: "landscape", w: 915, h: 412 },
];

test("combo popup sits below the readout band", () => {
  const portrait = comboPopupRect(412, 915);
  const safe = threatSafeRect(412, 915);
  assert.ok(portrait.y >= safe.y + 36, `portrait combo ${portrait.y} vs safe ${safe.y}`);
  const land = comboPopupRect(915, 412);
  assert.ok(land.y >= 120);
});

test("combo popup stays clear of the hull readout and the timer", () => {
  for (const v of VIEWS) {
    const combo = comboPopupRect(v.w, v.h);
    const hull = hullReadoutRect(v.w, v.h);
    const timer = timerRect(v.w, v.h);
    assert.equal(rectsOverlap(combo, hull, 12), false, v.name);
    assert.equal(rectsOverlap(combo, timer, 8), false, v.name);
    const mm = minimapCenter(v.w);
    const nearest = Math.hypot(combo.x + combo.w / 2 - mm.cx, combo.y + combo.h / 2 - mm.cy);
    assert.ok(nearest > mm.r + 24, `${v.name} minimap ${nearest}`);
  }
});

test("edge marks avoid the aim stick, minimap, timer, and hull", () => {
  for (const v of VIEWS) {
    const safe = threatSafeRect(v.w, v.h);
    const sticks = stickBandRect(v.w, v.h);
    const skill = skillButtonRect(v.w, v.h);
    const mm = minimapCenter(v.w);
    const spots = [
      [v.w - 70, v.h - 60],
      [v.w - 40, 36],
      [v.w - 64, mm.cy],
      [24, 40],
      [v.w / 2, v.h - 20],
      [-40, v.h * 0.7],
      [v.w + 80, 20],
      [skill.x + 10, skill.y + 10],
    ];
    for (const [sx, sy] of spots) {
      const p = clampThreatMark(sx!, sy!, v.w, v.h);
      assert.ok(p.x >= safe.x - 0.5 && p.x <= safe.x + safe.w + 0.5, `${v.name} x ${sx}`);
      assert.ok(p.y >= safe.y - 0.5 && p.y <= safe.y + safe.h + 0.5, `${v.name} y ${sy}`);
      assert.ok(p.y <= sticks.y + 0.5, `${v.name} stick ${sy}`);
      assert.ok(Math.hypot(p.x - mm.cx, p.y - mm.cy) >= mm.r + 12, `${v.name} map ${sx},${sy} -> ${p.x},${p.y}`);
      assert.ok(p.y >= 96, `${v.name} top ${p.y}`);
    }
  }
});

test("squad buttons stay clear of the readout, timer, minimap, skill button and the ship", async () => {
  const { squadBarRect } = await import("./hud-layout.ts");
  for (const v of [...VIEWS, { name: "small portrait", w: 360, h: 640 }, { name: "small landscape", w: 740, h: 360 }]) {
    const squad = squadBarRect(v.w, v.h);
    assert.equal(rectsOverlap(squad, hullReadoutRect(v.w, v.h), 8), false, `${v.name} hull`);
    assert.equal(rectsOverlap(squad, timerRect(v.w, v.h), 8), false, `${v.name} timer`);
    assert.equal(rectsOverlap(squad, skillButtonRect(v.w, v.h), 8), false, `${v.name} skill`);
    assert.equal(rectsOverlap(squad, comboPopupRect(v.w, v.h), 8), false, `${v.name} combo`);
    const mm = minimapCenter(v.w);
    const cx = Math.max(squad.x, Math.min(squad.x + squad.w, mm.cx));
    const cy = Math.max(squad.y, Math.min(squad.y + squad.h, mm.cy));
    assert.ok(Math.hypot(cx - mm.cx, cy - mm.cy) > mm.r, `${v.name} minimap`);
    // the player's ship sits near the screen centre: keep the buttons off it
    const ship = { x: v.w / 2 - 40, y: v.h / 2 - 40, w: 80, h: 80 };
    assert.equal(rectsOverlap(squad, ship, 0), false, `${v.name} ship`);
  }
});

test("threat marks never land on the squad buttons", async () => {
  const { squadBarRect, pointInRect } = await import("./hud-layout.ts");
  for (const v of VIEWS) {
    const squad = squadBarRect(v.w, v.h);
    for (let y = 0; y <= v.h; y += 23) {
      for (const x of [-50, squad.x + 5, squad.x + squad.w / 2]) {
        const p = clampThreatMark(x, y, v.w, v.h);
        assert.equal(pointInRect(p.x, p.y, squad, 0), false, `${v.name} ${x},${y}`);
      }
    }
  }
});
