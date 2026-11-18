import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SQUAD,
  SQUAD_ORDERS,
  WINGMEN,
  nearestTarget,
  orderForKey,
  orderForPadButton,
  pickFocusTarget,
  slotFor,
  wingmanShotDamage,
} from "./squad.ts";
import { pickAutoTarget } from "./aim.ts";

test("three orders, two wingmen, one key each", () => {
  assert.deepEqual(
    SQUAD_ORDERS.map((o) => o.id),
    ["focus", "spread", "regroup"],
  );
  assert.equal(WINGMEN, 2);
  assert.equal(orderForKey("Digit1"), "focus");
  assert.equal(orderForKey("Digit2"), "spread");
  assert.equal(orderForKey("Numpad3"), "regroup");
  assert.equal(orderForKey("KeyQ"), null);
  assert.equal(orderForPadButton(2), "focus");
  assert.equal(orderForPadButton(3), "spread");
  assert.equal(orderForPadButton(1), "regroup");
  assert.equal(orderForPadButton(0), null);
});

test("wingmen never out-shoot the player", () => {
  for (const o of SQUAD_ORDERS) {
    const per = wingmanShotDamage(o.id, 100) / SQUAD[o.id].interval;
    assert.ok(
      per * WINGMEN < 100 * 0.4,
      `${o.id}: both wingmen ${per * WINGMEN} dps vs player 100`,
    );
    assert.ok(per > 0);
  }
});

test("formation slots: focus flanks the guns, regroup is tighter, spread is wide", () => {
  const dist = (s: { x: number; y: number }) => Math.hypot(s.x, s.y);
  const f0 = slotFor("focus", 0, 2, 0, 0, 0, 0);
  const f1 = slotFor("focus", 1, 2, 0, 0, 0, 0);
  // aiming right (+x): wingmen on either side, a little behind
  assert.ok(f0.y * f1.y < 0, "one each side");
  assert.ok(f0.x < 0 && f1.x < 0, "behind the guns");
  const r0 = slotFor("regroup", 0, 2, 0, 0, 0, 0);
  assert.ok(dist(r0) < dist(f0), "regroup is tighter than focus");
  for (let t = 0; t < 10; t += 0.7) {
    const s0 = slotFor("spread", 0, 2, 0, 0, 0, t);
    const s1 = slotFor("spread", 1, 2, 0, 0, 0, t);
    assert.ok(dist(s0) > 100 && dist(s0) < 160);
    assert.ok(Math.hypot(s0.x - s1.x, s0.y - s1.y) > 180, "opposite sides of the orbit");
  }
});

test("focus picks the target near the crosshair and prefers bosses", () => {
  const ahead = { alive: true, x: 300, y: 10 };
  const side = { alive: true, x: 0, y: 200 };
  assert.equal(pickFocusTarget(0, 0, 0, [side, ahead], null), ahead);
  const boss = { alive: true, x: 320, y: 120, boss: true };
  assert.equal(pickFocusTarget(0, 0, 0, [ahead, boss], null), boss);
  const far = { alive: true, x: 5000, y: 0 };
  assert.equal(pickFocusTarget(0, 0, 0, [far], null), null);
});

test("focus keeps its target unless something is clearly better", () => {
  const a = { alive: true, x: 300, y: 0 };
  const b = { alive: true, x: 290, y: 0 };
  assert.equal(pickFocusTarget(0, 0, 0, [a, b], a), a, "no flicker between near-equal targets");
  a.alive = false;
  assert.equal(pickFocusTarget(0, 0, 0, [a, b], a), b, "dead target is dropped");
});

test("nearest target respects range and skips the dead", () => {
  const near = { alive: false, x: 10, y: 0 };
  const mid = { alive: true, x: 100, y: 0 };
  assert.equal(nearestTarget(0, 0, [near, mid], 200), mid);
  assert.equal(nearestTarget(0, 0, [near, mid], 50), null);
});

test("auto aim locks the nearest threat, bosses first, and holds its lock", () => {
  const near = { alive: true, x: 100, y: 0 };
  const far = { alive: true, x: 250, y: 0 };
  assert.equal(pickAutoTarget(0, 0, [far, near], 400, null), near);
  const boss = { alive: true, x: 160, y: 0, boss: true };
  assert.equal(pickAutoTarget(0, 0, [near, boss], 400, null), boss);
  const a = { alive: true, x: 200, y: 0 };
  const b = { alive: true, x: 190, y: 0 };
  assert.equal(pickAutoTarget(0, 0, [a, b], 400, a), a, "holds lock");
  assert.equal(
    pickAutoTarget(0, 0, [{ alive: true, x: 900, y: 0 }], 400, null),
    null,
    "out of range",
  );
});
