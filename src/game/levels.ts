/**
 * Level design data for Wing Protocol's three sectors: obstacle layouts and the
 * authored pacing timeline (lulls, surges, scheduled elites). Pure functions with
 * no DOM access so they can be unit tested. See /workspace/out/wing-level-design.md.
 */

export type ObstacleKind = "wreck" | "pylon" | "barrier";
export type Obstacle = { x: number; y: number; r: number; seed: number; kind: ObstacleKind };

/** Small deterministic PRNG so every run of a sector has the same learnable shape. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Build the obstacle layout for a sector around a centre point (the player's
 * position when the sector starts). Leaves a clear radius around the centre.
 *  - Sector 1 (Outer Yard): loose wreck clusters, wide open — the learning space.
 *  - Sector 2 (Ion Storm): pylon lanes — rows with gaps that funnel the horde.
 *  - Sector 3 (Reactor Core): a ring wall with four gates — chokepoints around a core.
 */
export function sectorLayout(sector: number, cx: number, cy: number, world: number): Obstacle[] {
  const out: Obstacle[] = [];
  const rand = rng(1000 + sector * 77);
  const clear = 150;
  const push = (x: number, y: number, r: number, kind: ObstacleKind) => {
    if (x < 60 || y < 60 || x > world - 60 || y > world - 60) return;
    if (Math.hypot(x - cx, y - cy) < clear + r) return;
    out.push({ x, y, r, kind, seed: Math.floor(rand() * 6) });
  };
  if (sector <= 0) {
    for (let c = 0; c < 7; c++) {
      const a = (c / 7) * Math.PI * 2 + rand() * 0.5;
      const d = 230 + rand() * 650;
      const gx = cx + Math.cos(a) * d;
      const gy = cy + Math.sin(a) * d;
      const n = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) push(gx + (rand() - 0.5) * 110, gy + (rand() - 0.5) * 110, 28, "wreck");
    }
  } else if (sector === 1) {
    // three diagonal lanes each side of the player, every lane broken by 2 gaps
    const ang = Math.PI / 4;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const vx = -uy, vy = ux;
    for (const off of [-560, -320, 320, 560]) {
      for (let s = -9; s <= 9; s++) {
        if (s === -4 || s === -3 || s === 3 || s === 4) continue; // gaps = chokepoints
        const along = s * 62;
        push(cx + vx * off + ux * along, cy + vy * off + uy * along, 20, "pylon");
      }
    }
  } else {
    // ring wall with four gates and an inner cover ring
    const R = 420;
    const segs = 36;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const gate = i % 9;
      if (gate === 0 || gate === 1) continue; // 4 gates, 2 segments wide
      push(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 26, "barrier");
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      push(cx + Math.cos(a) * 230, cy + Math.sin(a) * 230, 30, "barrier");
    }
  }
  return out;
}

export type PaceEvent = { t: number; kind: "elite" | "surge"; dur?: number };

/**
 * Authored timeline (absolute mission seconds). Bosses stay at 88/188/270 and
 * uplinks at 40/140/228 — events are placed so they never stack on top of them.
 */
export const PACE_EVENTS: PaceEvent[] = [
  { t: 22, kind: "elite" },
  { t: 58, kind: "surge", dur: 9 },
  { t: 72, kind: "elite" },
  { t: 118, kind: "elite" },
  { t: 158, kind: "surge", dur: 10 },
  { t: 172, kind: "elite" },
  { t: 212, kind: "elite" },
  { t: 245, kind: "surge", dur: 10 },
  { t: 258, kind: "elite" },
  { t: 286, kind: "surge", dur: 14 }, // final stand
];

/**
 * Spawn-rate multiplier for a given time: a breather after each sector change
 * and boss spawn, surges at scripted moments, lighter trash while a boss lives
 * or an uplink is being held (so those fights read clearly).
 */
export function paceMultiplier(time: number, opts: { bossAlive: boolean; uplinkActive: boolean }): number {
  const s = time % 100;
  let k = 1;
  if (time >= 100 && s < 7) k = 0.45; // relax after sector change
  for (const e of PACE_EVENTS) {
    if (e.kind === "surge" && time >= e.t && time < e.t + (e.dur ?? 8)) k = Math.max(k, 2.2);
  }
  if (opts.bossAlive) k *= 0.6;
  if (opts.uplinkActive) k *= 1.25; // risk while you hold the zone, reward on capture
  return k;
}
