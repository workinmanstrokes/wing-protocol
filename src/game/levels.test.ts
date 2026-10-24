import { test } from "node:test";
import assert from "node:assert/strict";
import { PACE_EVENTS, paceMultiplier, sectorLayout } from "./levels.ts";

test("each sector layout keeps the spawn point clear and stays in-world", () => {
  for (const s of [0, 1, 2]) {
    const obs = sectorLayout(s, 1700, 1700, 3400);
    assert.ok(obs.length >= 10 && obs.length <= 80, `sector ${s} count ${obs.length}`);
    for (const o of obs) {
      assert.ok(Math.hypot(o.x - 1700, o.y - 1700) >= 150);
      assert.ok(o.x >= 60 && o.x <= 3340 && o.y >= 60 && o.y <= 3340);
    }
  }
});

test("sector layouts use distinct obstacle kinds", () => {
  const kinds = [0, 1, 2].map((s) => sectorLayout(s, 1700, 1700, 3400)[0]!.kind);
  assert.deepEqual(kinds, ["wreck", "pylon", "barrier"]);
});

test("sector 3 ring has gates (chokepoints)", () => {
  const ring = sectorLayout(2, 1700, 1700, 3400).filter((o) => Math.abs(Math.hypot(o.x - 1700, o.y - 1700) - 420) < 5);
  assert.equal(ring.length, 28);
});

test("pacing: lull after sector change, surge, boss damping", () => {
  const base = { bossAlive: false, uplinkActive: false };
  assert.equal(paceMultiplier(10, base), 1);
  assert.ok(paceMultiplier(102, base) < 0.5);
  assert.ok(paceMultiplier(60, base) > 2);
  assert.ok(paceMultiplier(60, { bossAlive: true, uplinkActive: false }) < 2);
});

test("pace events never collide with bosses or uplinks", () => {
  const fixed = [88, 188, 270, 40, 140, 228];
  for (const e of PACE_EVENTS) for (const f of fixed) assert.ok(Math.abs(e.t - f) >= 6, `${e.t} vs ${f}`);
});
