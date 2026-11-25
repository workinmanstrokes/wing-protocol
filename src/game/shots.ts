/**
 * Shot helpers shared by the player's guns and auto aim.
 *
 * - `MUZZLE_SPEED`: how fast each main weapon's rounds leave the barrel
 *   (px/s), matching `Combat.shoot`. Auto aim leads moving targets by this,
 *   so the guns point where the enemy will be when the round arrives.
 * - `segmentHitsCircle`: swept hit test. Rounds move up to ~14 px per 60 Hz
 *   step (the Aether beam skill ~18 px) and the smallest enemies are 8 px
 *   across the radius, so a plain "is the round inside the enemy now" test
 *   let fast rounds skip straight through swarm drones. Testing the whole
 *   path travelled this step fixes that.
 */
import type { WeaponKind } from "./types.ts";

export const MUZZLE_SPEED: Record<WeaponKind, number> = {
  beam: 720,
  gatling: 820,
  melee: 420,
  shotgun: 640,
  arc: 640,
  mortar: 300,
  mote: 340,
  ember: 480,
  tether: 560,
  lance: 780,
  fang: 560,
};

export function muzzleSpeed(weapon: string): number {
  return (MUZZLE_SPEED as Record<string, number>)[weapon] ?? 560;
}

/** Seconds a round takes to cover `dist`, capped so far targets are not over-led. */
export function leadTime(dist: number, speed: number, cap = 0.5): number {
  return Math.min(cap, dist / Math.max(1, speed));
}

/** True when the segment (x0,y0)->(x1,y1) passes within `r` of (cx,cy). */
export function segmentHitsCircle(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const sx = x1 - x0;
  const sy = y1 - y0;
  const len2 = sx * sx + sy * sy;
  let t = 0;
  if (len2 > 1e-9) {
    t = ((cx - x0) * sx + (cy - y0) * sy) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
  }
  const dx = x0 + sx * t - cx;
  const dy = y0 + sy * t - cy;
  return dx * dx + dy * dy < r * r;
}
