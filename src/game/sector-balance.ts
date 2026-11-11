/**
 * Sector 1 spawn budget. Combat and the headless sim both read these so a
 * careful run is not a coin flip, while sectors 2 and 3 keep their pressure.
 * Pure: no DOM, no Math.random.
 */

export type TrashKind = "drone" | "walker" | "crawler" | "swarm" | "charger" | "sniper" | "shielder";

/** r, hp, speed, dmg, xp, fireCd. Speed/hp/dmg still scale with run progress at spawn. */
export const TRASH_STATS: Record<TrashKind, [number, number, number, number, number, number]> = {
  drone: [12, 14, 118, 8, 1, 99],
  walker: [16, 32, 86, 12, 3, 1.8],
  crawler: [22, 70, 58, 18, 8, 2.4],
  swarm: [8, 6, 168, 5, 1, 99],
  charger: [15, 40, 70, 16, 4, 99],
  sniper: [14, 26, 96, 10, 5, 2.6],
  shielder: [18, 46, 64, 14, 7, 99],
};

/** Sector 1 never has more than this many non-boss hulls, surge included. */
export const SECTOR1_CAP = 12;

/**
 * How many non-boss hulls may be alive at once.
 * Sector 1 ramps from 5 to a hard 12. The surge flag does not raise it, and
 * scripted elites must promote a hull already on the field once it is full.
 * Later sectors stay high enough that the cap does not change their fights.
 */
export function aliveCap(sector: number, time: number, _surging = false): number {
  if (sector > 0) return 96;
  const u = Math.min(1, Math.max(0, time / 100));
  const s = u * u * (3 - 2 * u);
  return Math.min(SECTOR1_CAP, Math.round(5 + s * 7));
}

/** Seconds between trash spawns, before the pace multiplier. */
export function baseSpawnInterval(intensity: number, sector: number): number {
  const raw = Math.max(0.12, 0.85 - intensity * 0.68);
  if (sector > 0) return raw;
  // Sector 1 opens slower and never snaps to the late-run floor.
  return Math.max(0.48, raw * 1.22);
}

/**
 * Trash mix. Sector 1 is drones, then walkers, then a few pairs — not a
 * random brick of chargers and six-packs. Later sectors keep the old mix.
 */
export function trashKind(sector: number, time: number, _progress: number, roll: number): TrashKind {
  if (sector <= 0) {
    if (time < 32) return "drone";
    if (time < 58) return roll < 0.2 ? "walker" : "drone";
    if (time < 78) return roll < 0.08 ? "swarm" : roll < 0.32 ? "walker" : "drone";
    return roll < 0.1 ? "swarm" : roll < 0.16 ? "charger" : roll < 0.4 ? "walker" : "drone";
  }
  if (sector === 1) {
    if (roll < 0.16) return "swarm";
    if (roll < 0.3) return "charger";
    if (roll < 0.42) return "sniper";
    if (roll < 0.6) return "walker";
    if (roll < 0.68) return "shielder";
    return "drone";
  }
  if (roll < 0.14) return "swarm";
  if (roll < 0.26) return "charger";
  if (roll < 0.38) return "sniper";
  if (roll < 0.5) return "shielder";
  if (roll < 0.66) return "crawler";
  if (roll < 0.8) return "walker";
  return "drone";
}

/** Extra bodies a swarm roll pulls in. Sector 1 stays a pair, not a pack of six. */
export function swarmExtras(sector: number, time: number): number {
  if (sector <= 0) return time < 80 ? 1 : 2;
  return 5;
}

/** Random elite rolls. Sector 1 uses the authored beats only, so seeds stop spiking. */
export function randomEliteChance(sector: number, progress: number): number {
  if (sector <= 0) return 0;
  if (progress < 0.15) return 0;
  return 0.05 + progress * 0.14;
}

/**
 * Incoming-damage multiplier. Sector 1 starts gentler and eases back toward
 * full by the titan, so the boss still matters. Later sectors are unchanged.
 */
export function sectorIncomingMul(sector: number, time: number): number {
  if (sector > 0) return 1;
  const u = Math.min(1, Math.max(0, time / 100));
  return 0.76 + u * 0.12;
}

/** How hard a scripted surge multiplies the spawn interval. */
export function surgePace(time: number): number {
  return time < 100 ? 1.4 : 2.2;
}
