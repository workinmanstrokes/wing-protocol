/**
 * Data-driven suit abilities. Combat reads these numbers; the roster doc
 * (`docs/mech-roster.md`) and `MECHS` in data.ts must stay in step.
 */
import type { MechId } from "./types";
import { MECHS } from "./data.ts";

export const ABILITY = {
  aether: { weaponMul: 1.12, takenMul: 1, glideDelay: 1.6, glideFrac: 0.028, beamDmg: 4.4, beamSpeed: 1100, beamLife: 0.38, beamPierce: 14, beamR: 3.2 },
  forge: { takenMul: 0.88, braceMul: 0.7, rootMul: 0.22, root: 1.35, shells: 6, spread: 0.16, shellSpeed: 420, shellLife: 0.7, shellDmg: 2.1, shellR: 5, shellExplode: 26 },
  scythe: { tempo: 0.55, tempoMul: 1.28, dash: 168, iFrame: 0.22, trailR: 26, trailDmg: 3.1 },
  dune: { bulwarkMul: 0.5, bulwarkCd: 7, aegis: 3, aegisHalf: 0.95, shove: 48, shoveR: 120, shoveDmg: 1.1 },
  serpent: { orbit: 4.2, venom: 2, venomFrac: 0.22 },
  storm: { every: 5, chainFrac: 0.4, chainR: 96, chainHeal: 3, net: 3.2, netR: 108, netReach: 150, netTick: 0.45, netDmg: 0.35, netSlow: 0.62, netDr: 0.84 },
  vulture: { mines: 3, mineGap: 70, mineArm: 0.55, mineLife: 4.2, mineR: 36, mineDmg: 2.5, crater: 1.15, craterR: 34, craterTick: 0.35, craterDmg: 0.22, craterMin: 18 },
  cross: { ward: 3.2, wardMul: 0.72, healFrac: 0.12, mendDelay: 2, mendFrac: 0.016, mendBelow: 0.5 },
  moth: { lure: 2.6, lureReach: 150, lureR: 168, lureBurst: 86, lureDmg: 3.2, wakeR: 78, wakeSlow: 0.78 },
  kiln: { seal: 2.1, sealMul: 0.62, scorchR: 70, scorchTick: 0.4, scorchDmg: 0.7, thornR: 52, thornFrac: 0.18 },
  kite: { dash: 150, iFrame: 0.36, line: 2.2, lineR: 16, lineTick: 0.2, lineDmg: 0.55, slip: 0.48, slipMul: 0.86, slipDr: 0.64, buffer: 12, bufferCd: 3.4 },
} as const;

export function rosterIds(): MechId[] {
  return MECHS.map((m) => m.id);
}

/** Weapon damage multiplier from the suit passive (1 for suits without one). */
export function weaponDamageMul(id: MechId): number {
  return id === "aether" ? ABILITY.aether.weaponMul : 1;
}

export function incomingDamageMul(
  id: MechId,
  flags: { bulwark: boolean; brace: boolean; ward: boolean; slip?: boolean; net?: boolean },
): number {
  let m = 1;
  if (id === "aether") m *= ABILITY.aether.takenMul;
  if (id === "forge") m *= ABILITY.forge.takenMul;
  if (flags.brace && id === "forge") m *= ABILITY.forge.braceMul;
  if (flags.bulwark && id === "dune") m *= ABILITY.dune.bulwarkMul;
  if (flags.ward && id === "cross") m *= ABILITY.cross.wardMul;
  if (flags.slip && id === "kite") m *= ABILITY.kite.slipDr;
  if (flags.net && id === "storm") m *= ABILITY.storm.netDr;
  return m;
}

export function moveMul(id: MechId, flags: { tempo: boolean; rooted: boolean; sealed: boolean }): number {
  let m = 1;
  if (flags.tempo && id === "scythe") m *= ABILITY.scythe.tempoMul;
  if (flags.rooted && id === "forge") m *= ABILITY.forge.rootMul;
  if (flags.sealed && id === "kiln") m *= ABILITY.kiln.sealMul;
  return m;
}

/** Fire-interval multiplier. Below 1 means faster. */
export function fireIntervalMul(id: MechId, speed: number, maxSpeed: number): number {
  if (id !== "kite" || maxSpeed <= 0) return 1;
  return speed > maxSpeed * ABILITY.kite.slip ? ABILITY.kite.slipMul : 1;
}

export function angDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** A shot flying into the shield's front arc is caught. `face` is the aim angle. */
export function aegisBlocks(face: number, vx: number, vy: number, half = ABILITY.dune.aegisHalf): boolean {
  if (vx * vx + vy * vy < 1) return false;
  const incoming = Math.atan2(vy, vx);
  return Math.abs(angDiff(incoming, face + Math.PI)) <= half;
}

/** Enemy sits in the wake behind the facing, inside `radius`. */
export function inWake(px: number, py: number, face: number, mx: number, my: number, radius: number): boolean {
  const dx = mx - px;
  const dy = my - py;
  const d = Math.hypot(dx, dy);
  if (d > radius || d < 8) return false;
  return dx * Math.cos(face) + dy * Math.sin(face) < -8;
}

export function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
