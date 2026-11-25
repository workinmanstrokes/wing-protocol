import { test } from "node:test";
import assert from "node:assert/strict";
import { MOVE_CURVE, MOVE_DZ, MOVE_SAT, radial } from "./input.ts";

const mag = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);
const move = (m: number) => mag(radial(m, 0, MOVE_DZ, MOVE_CURVE, MOVE_SAT));

test("move stick: dead zone, no jump at its edge", () => {
  assert.equal(move(MOVE_DZ * 0.9), 0);
  assert.ok(move(MOVE_DZ + 0.01) < 0.03);
});

test("move stick reaches full speed before the rim", () => {
  for (const m of [MOVE_SAT, 0.95, 1, 1.3]) assert.ok(Math.abs(move(m) - 1) < 1e-9, `at ${m}: ${move(m)}`);
});

test("half push moves at least half speed (was ~40%)", () => {
  const half = move(0.58);
  const before = mag(radial(0.58, 0, 0.12, 1.35));
  assert.ok(before < 0.43, `old ${before}`);
  assert.ok(half > 0.55, `new ${half}`);
});

test("move response is monotonic and keeps direction", () => {
  let prev = 0;
  for (let i = 0; i <= 100; i++) {
    const v = move(i / 100);
    assert.ok(v >= prev - 1e-12);
    prev = v;
  }
  const d = radial(0.5, -0.5, MOVE_DZ, MOVE_CURVE, MOVE_SAT);
  assert.ok(Math.abs(Math.atan2(d.y, d.x) + Math.PI / 4) < 1e-9);
});

test("default radial (aim stick) is unchanged", () => {
  assert.equal(mag(radial(1, 0, 0.2)), 1);
  assert.ok(Math.abs(mag(radial(0.6, 0, 0.2)) - 0.5) < 1e-9);
});
