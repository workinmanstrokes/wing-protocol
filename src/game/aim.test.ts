import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAimAssist, angleDiff, assistPull, smoothAim, ASSIST_CONE, ASSIST_PULL } from "./aim.ts";

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
  assert.ok(Math.abs(out - ang * assistPull(ang)) < 1e-9);
  assert.ok(out < ang);
  assert.ok(out > 0);
});

test("assist is tiny and continuous at the cone edge (no snap)", () => {
  assert.equal(assistPull(ASSIST_CONE), 0);
  assert.ok(assistPull(ASSIST_CONE * 0.999) < 0.001);
  let maxCorr = 0;
  for (let i = 0; i <= 200; i++) {
    const d = (ASSIST_CONE * i) / 200;
    maxCorr = Math.max(maxCorr, d * assistPull(d));
  }
  // never more than ~1 degree of correction
  assert.ok((maxCorr * 180) / Math.PI <= 1.0, `max correction ${(maxCorr * 180) / Math.PI} deg`);
  assert.ok(ASSIST_PULL < 1);
});

test("aim smoothing follows flicks fast and settles exactly", () => {
  // a 90 degree flick is ~fully followed within 2 frames at 60 fps
  let a = 0;
  for (let i = 0; i < 2; i++) a = smoothAim(a, Math.PI / 2, 1 / 60);
  assert.ok(Math.abs(Math.PI / 2 - a) < 0.02, `after 2 frames: ${a}`);
  // small jitter is damped but still converges within ~0.15 s
  let b = 0;
  for (let i = 0; i < 9; i++) b = smoothAim(b, 0.02, 1 / 60);
  assert.ok(Math.abs(0.02 - b) < 0.001);
  // frame-rate independent: 120 fps lands near the 60 fps result
  let c60 = 0;
  let c120 = 0;
  for (let i = 0; i < 6; i++) c60 = smoothAim(c60, 0.3, 1 / 60);
  for (let i = 0; i < 12; i++) c120 = smoothAim(c120, 0.3, 1 / 120);
  assert.ok(Math.abs(c60 - c120) < 0.01);
});

test("dead targets ignored and angles wrap", () => {
  assert.equal(applyAimAssist(0, 0, 0, [{ x: 300, y: 1, alive: false }]), 0);
  assert.ok(Math.abs(angleDiff(Math.PI - 0.05, -Math.PI + 0.05) - 0.1) < 1e-9);
});
