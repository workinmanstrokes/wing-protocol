import { test } from "node:test";
import assert from "node:assert/strict";
import { MUZZLE_SPEED, leadTime, muzzleSpeed, segmentHitsCircle } from "./shots.ts";
import { TRASH_STATS } from "./sector-balance.ts";

const STEP = 1 / 60;

test("fast rounds no longer skip through small enemies", () => {
  // gatling round (r 3.2) vs a swarm drone (r 8) sitting between two step positions
  const r = TRASH_STATS.swarm[0] + 3.2;
  const step = MUZZLE_SPEED.gatling * STEP; // ~13.7 px
  assert.ok(step > r, "a round really can jump over a swarm drone in one step");
  // drone centre halfway between the start and end points: the old end-point test misses it
  const x0 = 0;
  const x1 = step;
  const cx = step / 2 + 0.01;
  const oldHit = (x1 - cx) ** 2 < r * r && (x0 - cx) ** 2 < r * r;
  assert.equal(oldHit, cx > step - r && cx < r);
  assert.ok(segmentHitsCircle(x0, 0, x1, 0, cx, 0, r));
});

test("Aether beam skill speed is covered too", () => {
  const step = 1100 * STEP;
  const r = TRASH_STATS.swarm[0] + 3.2;
  for (let i = 0; i <= 20; i++) {
    const cx = (step * i) / 20;
    assert.ok(segmentHitsCircle(0, 0, step, 0, cx, 3, r), `missed at ${cx}`);
  }
});

test("near misses stay misses", () => {
  assert.equal(segmentHitsCircle(0, 0, 14, 0, 7, 12, 11), false);
  assert.equal(segmentHitsCircle(0, 0, 14, 0, 30, 0, 11), false);
  assert.equal(segmentHitsCircle(0, 0, 14, 0, -15, 0, 11), false);
});

test("zero-length segment is a plain circle test", () => {
  assert.equal(segmentHitsCircle(5, 5, 5, 5, 5, 9, 5), true);
  assert.equal(segmentHitsCircle(5, 5, 5, 5, 5, 11, 5), false);
});

test("lead time follows the weapon's real round speed", () => {
  assert.ok(Math.abs(leadTime(410, muzzleSpeed("gatling")) - 0.5) < 1e-9);
  assert.ok(leadTime(300, muzzleSpeed("mortar")) > leadTime(300, muzzleSpeed("gatling")));
  assert.equal(leadTime(5000, muzzleSpeed("beam")), 0.5);
  assert.equal(muzzleSpeed("fang"), 560);
  assert.equal(muzzleSpeed("unknown"), 560);
});
