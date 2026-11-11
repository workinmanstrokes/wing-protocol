import assert from "node:assert/strict";
import test from "node:test";
import {
  aliveCap,
  baseSpawnInterval,
  randomEliteChance,
  sectorIncomingMul,
  swarmExtras,
  trashKind,
} from "./sector-balance.ts";

test("sector 1 caps the field and ramps smoothly", () => {
  const caps = [0, 20, 40, 60, 80, 100].map((t) => aliveCap(0, t, false));
  assert.deepEqual([caps[0], caps[caps.length - 1]], [5, 12]);
  for (let i = 1; i < caps.length; i++) assert.ok(caps[i]! >= caps[i - 1]!, caps.join(","));
  assert.ok(aliveCap(0, 60, true) <= 14);
  assert.equal(aliveCap(1, 40, true), 96);
  assert.equal(aliveCap(2, 80, false), 96);
});

test("sector 1 spawn mix stays readable", () => {
  assert.equal(trashKind(0, 10, 0.03, 0.01), "drone");
  assert.equal(trashKind(0, 40, 0.13, 0.05), "walker");
  assert.equal(trashKind(0, 40, 0.13, 0.5), "drone");
  assert.notEqual(trashKind(0, 40, 0.13, 0.01), "swarm");
  assert.notEqual(trashKind(0, 40, 0.13, 0.01), "charger");
  assert.equal(trashKind(0, 90, 0.3, 0.01), "swarm");
  assert.equal(swarmExtras(0, 40), 1);
  assert.equal(swarmExtras(0, 90), 2);
  assert.equal(swarmExtras(1, 40), 5);
  assert.equal(randomEliteChance(0, 0.3), 0);
  assert.ok(randomEliteChance(1, 0.4) > 0.08);
});

test("sector 1 incoming damage eases back toward full, later sectors do not", () => {
  assert.ok(sectorIncomingMul(0, 0) <= 0.78);
  assert.ok(sectorIncomingMul(0, 100) < 0.9);
  assert.ok(sectorIncomingMul(0, 100) > sectorIncomingMul(0, 0));
  assert.equal(sectorIncomingMul(1, 20), 1);
  assert.equal(sectorIncomingMul(2, 50), 1);
  assert.ok(baseSpawnInterval(0, 0) > 0.85);
  assert.ok(baseSpawnInterval(0.9, 2) < baseSpawnInterval(0.2, 0));
});
