import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAimAssist, angleDiff, ASSIST_CONE, ASSIST_PULL } from "./aim.ts";

test("no targets leaves aim untouched", () => {
  assert.equal(applyAimAssist(1, 0, 0, []), 1);
});

test("target outside cone is ignored (no auto-lock)", () => {
  const behind = [{ x: -200, y: 0, alive: true }];
  assert.equal(applyAimAssist(0, 0, 0, behind), 0);
  const side = [{ x: 0, y: 200, alive: true }];
  assert.equal(applyAimAssist(0, 0, 0, side), 0);
});

test("target out of range is ignored", () => {
  assert.equal(applyAimAssist(0, 0, 0, [{ x: 2000, y: 10, alive: true }]), 0);
});

test("target inside small cone gets a partial nudge, never a full snap", () => {
  const ang = ASSIST_CONE * 0.8;
  const t = [{ x: Math.cos(ang) * 300, y: Math.sin(ang) * 300, alive: true }];
  const out = applyAimAssist(0, 0, 0, t);
  assert.ok(Math.abs(out - ang * ASSIST_PULL) < 1e-9);
  assert.ok(out < ang);
});

test("dead targets ignored and angles wrap", () => {
  assert.equal(applyAimAssist(0, 0, 0, [{ x: 300, y: 1, alive: false }]), 0);
  assert.ok(Math.abs(angleDiff(Math.PI - 0.05, -Math.PI + 0.05) - 0.1) < 1e-9);
});
