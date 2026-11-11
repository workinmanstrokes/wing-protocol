/**
 * Deterministic sector-1 sortie sim. Same spawn budget the game uses, plus a
 * careful-pilot model (kites, focuses fire, dodges telegraphs, spends the
 * defensive skill). No canvas. Seeds make run-to-run variance measurable.
 */
import { ABILITY, incomingDamageMul } from "./abilities.ts";
import { MECH_MAP, MECHS } from "./data.ts";
import type { MechId } from "./types.ts";
import { PACE_EVENTS, paceMultiplier } from "./levels.ts";
import {
  TRASH_STATS,
  aliveCap,
  baseSpawnInterval,
  randomEliteChance,
  sectorIncomingMul,
  swarmExtras,
  trashKind,
  type TrashKind,
} from "./sector-balance.ts";

export type BudgetProfile = "legacy" | "current";

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Body = {
  kind: string;
  hp: number;
  speed: number;
  dmg: number;
  r: number;
  dist: number;
  fireCd: number;
  elite: boolean;
  shooter: boolean;
  boss: boolean;
};

const SHOOTERS = new Set(["walker", "crawler", "titan", "ace"]);

function scaleAt(time: number) {
  const t = Math.min(1, time / 300);
  return { t, hp: 1 + t * 1.9, dmg: 1 + t * 1.1 };
}

function makeTrash(kind: TrashKind, time: number, elite: boolean, rng: Rng, dist: number): Body {
  const d = TRASH_STATS[kind];
  const { t, hp, dmg } = scaleAt(time);
  const speed = kind === "drone" ? 118 + t * 40 : kind === "swarm" ? 168 + t * 30 : d[2];
  const body: Body = {
    kind,
    hp: d[1] * hp,
    speed,
    dmg: d[3] * dmg,
    r: d[0],
    dist,
    fireCd: kind === "charger" ? 1.8 : d[5],
    elite: false,
    shooter: SHOOTERS.has(kind),
    boss: false,
  };
  if (elite) {
    body.elite = true;
    body.hp *= 3.2;
    body.dmg *= 1.25;
    body.r *= 1.25;
    if (rng() < 0.2) body.speed *= 1.6;
  }
  return body;
}

export type SpawnSample = { time: number; alive: number };

/**
 * Spawn pressure only. A flat kill rate stands in for the pilot so the
 * comparison is the budget, not the suit.
 */
export function sampleSpawnPressure(profile: BudgetProfile, seed: number, killRate = 1.35): SpawnSample[] {
  const rng = mulberry32(seed);
  const bodies: Body[] = [];
  const samples: SpawnSample[] = [];
  let time = 0;
  let spawnAcc = 0;
  let paceIdx = 0;
  let surgeUntil = 0;
  const dt = 0.1;
  const killAcc = { v: 0 };

  const count = () => bodies.length;

  const push = (b: Body | null) => {
    if (b) bodies.push(b);
  };

  while (time < 100) {
    time += dt;
    const surging = time < surgeUntil;
    const bossAlive = bodies.some((b) => b.boss);
    const pace =
      profile === "current"
        ? paceMultiplier(time, { bossAlive, uplinkActive: false })
        : legacyPace(time, bossAlive);
    const intensity = Math.min(1, time / 300);
    const interval =
      profile === "current" ? baseSpawnInterval(intensity, 0) / pace : Math.max(0.12, 0.85 - intensity * 0.68) / pace;
    const cap = profile === "current" ? aliveCap(0, time, surging) : 96;

    while (paceIdx < PACE_EVENTS.length && time >= PACE_EVENTS[paceIdx]!.t && PACE_EVENTS[paceIdx]!.t < 100) {
      const e = PACE_EVENTS[paceIdx]!;
      paceIdx += 1;
      if (e.kind === "surge") surgeUntil = time + (e.dur ?? 8);
      // Legacy's first elite was at 22s (spawned below). The 48s beat is the new timeline only.
      if (e.kind === "elite" && e.t >= 40 && !(profile === "legacy" && e.t < 70)) {
        const elites = bodies.filter((b) => b.elite).length;
        const promote = profile === "legacy" || elites < 1;
        push(makeTrash("walker", time, promote, rng, 480 + rng() * 80));
      }
    }
    if (profile === "legacy" && time >= 22 && time < 22 + dt) {
      push(makeTrash("walker", time, true, rng, 500));
    }

    spawnAcc += dt;
    while (spawnAcc >= interval) {
      spawnAcc -= interval;
      if (count() >= cap) {
        spawnAcc = 0;
        break;
      }
      const roll = rng();
      const kind: TrashKind =
        profile === "current"
          ? trashKind(0, time, intensity, roll)
          : legacyKind(intensity, roll);
      const eliteRoll = profile === "current" ? randomEliteChance(0, intensity) : intensity < 0.15 ? 0 : 0.05 + intensity * 0.14;
      const elite = kind !== "swarm" && rng() < eliteRoll && bodies.filter((b) => b.elite).length < (profile === "current" ? 1 : 4);
      push(makeTrash(kind, time, elite, rng, 520 + rng() * 180));
      if (kind === "swarm") {
        const extra = profile === "current" ? swarmExtras(0, time) : 5;
        for (let i = 0; i < extra && count() < cap; i++) push(makeTrash("swarm", time, false, rng, 500 + rng() * 40));
      }
    }
    if (time >= 88 && time < 88 + dt && !bodies.some((b) => b.boss)) {
      const { hp, dmg } = scaleAt(time);
      bodies.push({
        kind: "titan",
        hp: 600 * hp,
        speed: 88,
        dmg: 26 * dmg,
        r: 36,
        dist: 560,
        fireCd: 1.2,
        elite: false,
        shooter: true,
        boss: true,
      });
    }

    killAcc.v += killRate * dt;
    while (killAcc.v >= 1 && bodies.length) {
      killAcc.v -= 1;
      let bi = 0;
      for (let i = 1; i < bodies.length; i++) if (bodies[i]!.hp < bodies[bi]!.hp) bi = i;
      const victim = bodies[bi]!;
      victim.hp -= profile === "current" ? 28 : 22;
      if (victim.hp <= 0) bodies.splice(bi, 1);
    }
    if (Math.abs(time * 10 - Math.round(time * 10)) < 0.001 || Math.abs((time % 5)) < dt * 0.6) {
      samples.push({ time: Math.round(time * 10) / 10, alive: bodies.length });
    }
  }
  return samples;
}

function legacyKind(t: number, roll: number): TrashKind {
  if (t > 0.12 && roll < 0.18) return "swarm";
  if (t > 0.2 && roll < 0.42) return "walker";
  if (roll < 0.5 && t > 0.25) return "charger";
  return "drone";
}

function legacyPace(time: number, bossAlive: boolean): number {
  let k = 1;
  if (time >= 58 && time < 67) k = 2.2;
  if (bossAlive) k *= 0.6;
  return k;
}

export type SuitRun = {
  id: MechId;
  cleared: boolean;
  endHp: number;
  deathTime: number | null;
  minHp: number;
};

type Pilot = {
  hp: number;
  maxHp: number;
  speed: number;
  dps: number;
  range: number;
  sinceHit: number;
  iframe: number;
  skillCd: number;
  skillT: number;
  bulwark: boolean;
  bulwarkT: number;
  buffer: boolean;
  bufferT: number;
  slip: boolean;
};

function pilotFor(id: MechId): Pilot {
  const m = MECH_MAP[id];
  const weaponMul = id === "aether" ? ABILITY.aether.weaponMul : 1;
  return {
    hp: m.stats.hp,
    maxHp: m.stats.hp,
    speed: m.stats.speed,
    dps: m.stats.damage * m.stats.fireRate * weaponMul,
    range: m.stats.range,
    sinceHit: 99,
    iframe: 0,
    skillCd: 1.2,
    skillT: 0,
    bulwark: id === "dune",
    bulwarkT: 0,
    buffer: false,
    bufferT: 0,
    slip: false,
  };
}

function skillCooldown(id: MechId): number {
  return MECH_MAP[id].skill.cooldown;
}

/**
 * One careful sector-1 run. The pilot keeps distance when they can, focuses
 * the nearest hull, dodges telegraphed slams unless surrounded, and uses the
 * defensive skill on cooldown.
 */
export function simulateCarefulRun(id: MechId, seed: number, profile: BudgetProfile): SuitRun {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const p = pilotFor(id);
  const bodies: Body[] = [];
  let time = 0;
  let spawnAcc = 0;
  let paceIdx = 0;
  let surgeUntil = 0;
  let legacyElite22 = false;
  const dt = 0.1;
  let minHp = p.hp;
  let deathTime: number | null = null;
  let dealtAcc = 0;

  const trashCap = () => (profile === "current" ? aliveCap(0, time, time < surgeUntil) : 80);
  const nonBoss = () => bodies.reduce((n, b) => n + (b.boss ? 0 : 1), 0);

  const spawnBody = (b: Body) => {
    bodies.push(b);
  };

  while (time < 100 && p.hp > 0) {
    time += dt;
    const bossAlive = bodies.some((b) => b.boss);
    const intensity = Math.min(1, time / 300);
    const pace = profile === "current" ? paceMultiplier(time, { bossAlive, uplinkActive: false }) : legacyPace(time, bossAlive);
    const interval =
      profile === "current" ? baseSpawnInterval(intensity, 0) / pace : Math.max(0.12, 0.85 - intensity * 0.68) / pace;

    while (paceIdx < PACE_EVENTS.length && time >= PACE_EVENTS[paceIdx]!.t && PACE_EVENTS[paceIdx]!.t < 100) {
      const e = PACE_EVENTS[paceIdx]!;
      paceIdx += 1;
      if (e.kind === "surge") surgeUntil = Math.max(surgeUntil, e.t + (e.dur ?? 8));
      if (e.kind === "elite") {
        const elites = bodies.filter((b) => b.elite).length;
        const promote = profile === "legacy" || elites < 1;
        spawnBody(makeTrash("walker", time, promote, rng, 460));
      }
    }
    if (profile === "legacy" && !legacyElite22 && time >= 22) {
      legacyElite22 = true;
      spawnBody(makeTrash("walker", time, true, rng, 480));
    }
    if (time >= 88 && time < 88 + dt && !bodies.some((b) => b.boss)) {
      const { hp, dmg } = scaleAt(time);
      spawnBody({
        kind: "titan",
        hp: 600 * hp,
        speed: 88,
        dmg: 26 * dmg,
        r: 36,
        dist: 520,
        fireCd: 1.05,
        elite: false,
        shooter: true,
        boss: true,
      });
    }

    spawnAcc += dt;
    while (spawnAcc >= interval) {
      spawnAcc -= interval;
      if (nonBoss() >= trashCap()) {
        spawnAcc = 0;
        break;
      }
      const roll = rng();
      const kind = profile === "current" ? trashKind(0, time, intensity, roll) : legacyKind(intensity, roll);
      const eChance = profile === "current" ? randomEliteChance(0, intensity) : intensity < 0.15 ? 0 : 0.05 + intensity * 0.14;
      const elites = bodies.filter((b) => b.elite).length;
      const elite = kind !== "swarm" && rng() < eChance && elites < (profile === "current" ? 1 : 3);
      spawnBody(makeTrash(kind, time, elite, rng, 540 + rng() * 160));
      if (kind === "swarm") {
        const extra = profile === "current" ? swarmExtras(0, time) : 5;
        for (let i = 0; i < extra && nonBoss() < trashCap(); i++) {
          spawnBody(makeTrash("swarm", time, false, rng, 500 + rng() * 50));
        }
      }
    }

    const bubble = bodies.filter((b) => b.dist < 260).length;
    const handling = (p.range >= 280 ? 9 : 5) + (id === "kiln" || id === "dune" || id === "forge" ? 2 : 0);
    const crowded = bubble > handling;
    p.slip = id === "kite" && !crowded;
    if (id === "kite" && p.slip && !p.buffer) {
      p.bufferT -= dt;
      if (p.bufferT <= 0) p.buffer = true;
    }
    if (id === "dune" && !p.bulwark) {
      p.bulwarkT -= dt;
      if (p.bulwarkT <= 0) p.bulwark = true;
    }
    p.skillCd -= dt;
    p.skillT = Math.max(0, p.skillT - dt);
    p.iframe = Math.max(0, p.iframe - dt);
    p.sinceHit += dt;

    if (p.skillCd <= 0) {
      p.skillCd = skillCooldown(id);
      if (id === "scythe") p.iframe = Math.max(p.iframe, ABILITY.scythe.iFrame);
      if (id === "kite") {
        p.iframe = Math.max(p.iframe, ABILITY.kite.iFrame);
        p.buffer = true;
        for (const b of bodies) if (!b.boss) b.dist += 70;
      }
      if (id === "kiln") {
        p.iframe = Math.max(p.iframe, ABILITY.kiln.seal);
        p.skillT = ABILITY.kiln.seal;
      }
      if (id === "dune") p.skillT = ABILITY.dune.aegis;
      if (id === "storm") p.skillT = ABILITY.storm.net;
      if (id === "cross") p.skillT = ABILITY.cross.ward;
      if (id === "moth") {
        p.skillT = ABILITY.moth.lure;
        for (const b of bodies) if (!b.boss && b.dist < 280) b.dist = Math.max(b.dist, 120);
      }
      if (id === "forge") p.skillT = 0;
    }

    let speed = p.speed * (crowded ? 0.62 : 1);
    if (id === "kiln" && p.skillT > 0) speed *= ABILITY.kiln.sealMul;
    for (const b of bodies) {
      let chase = b.speed;
      if (id === "storm" && p.skillT > 0 && b.dist < ABILITY.storm.netR + 40) chase *= ABILITY.storm.netSlow;
      if (b.kind === "charger") {
        b.fireCd -= dt;
        if (b.fireCd <= 0) {
          b.fireCd = 2.6;
          if (crowded) b.dist = Math.max(0, b.dist - 120);
        }
      }
      const gap = speed - chase;
      const hold = Math.min(p.range * 0.78, b.boss ? 250 : 210);
      if (gap >= 0) b.dist = b.dist > hold ? Math.max(hold, b.dist - 110 * dt) : hold;
      else b.dist = Math.max(0, b.dist + gap * dt);
    }

    let target = -1;
    let bestHp = 1e12;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i]!;
      if (b.dist > p.range + b.r) continue;
      if (b.hp < bestHp) {
        bestHp = b.hp;
        target = i;
      }
    }
    if (target >= 0) {
      const dealt = p.dps * dt;
      bodies[target]!.hp -= dealt;
      dealtAcc += dealt;
      if (id === "serpent") bodies[target]!.hp -= dealt * ABILITY.serpent.venomFrac * 0.35;
      if (id === "storm" && dealtAcc >= (p.dps / Math.max(0.2, MECH_MAP[id].stats.fireRate)) * ABILITY.storm.every) {
        dealtAcc = 0;
        p.hp = Math.min(p.maxHp, p.hp + ABILITY.storm.chainHeal);
      }
    }
    for (let i = bodies.length - 1; i >= 0; i--) if (bodies[i]!.hp <= 0) bodies.splice(i, 1);

    if (id === "aether" && p.sinceHit > ABILITY.aether.glideDelay) {
      p.hp = Math.min(p.maxHp, p.hp + dt * p.maxHp * ABILITY.aether.glideFrac);
    }
    if (id === "cross" && p.skillT > 0) p.hp = Math.min(p.maxHp, p.hp + dt * p.maxHp * (ABILITY.cross.healFrac / ABILITY.cross.ward));
    if (id === "cross" && p.hp < p.maxHp * ABILITY.cross.mendBelow && p.sinceHit > ABILITY.cross.mendDelay) {
      p.hp = Math.min(p.maxHp, p.hp + dt * p.maxHp * ABILITY.cross.mendFrac);
    }

    let hit: number | null = null;
    const shotMul = crowded ? 0.34 : 0.05;
    for (const b of bodies) {
      if (b.kind !== "charger") b.fireCd -= dt;
      if (b.dist < b.r + 16) hit = Math.max(hit ?? 0, b.dmg * (b.boss && b.dist < 200 ? 1.15 : 1));
      if (b.shooter && b.fireCd <= 0 && b.dist < 620) {
        b.fireCd = b.boss ? 1.05 : b.kind === "crawler" ? 2.2 : 1.7;
        if (id === "dune" && p.skillT > 0) continue;
        hit = Math.max(hit ?? 0, b.dmg * 0.7 * shotMul);
      }
    }
    const lureSafe = id === "moth" && p.skillT > 0 && !crowded;
    if (hit !== null && p.iframe <= 0 && !lureSafe) {
      let dmg = hit * (profile === "current" ? sectorIncomingMul(0, time) : 1);
      const slip = id === "kite" && p.slip;
      const net = id === "storm" && p.skillT > 0;
      const ward = id === "cross" && p.skillT > 0;
      dmg *= incomingDamageMul(id, { bulwark: id === "dune" && p.bulwark, brace: false, ward, slip, net });
      if (id === "dune" && p.bulwark) {
        p.bulwark = false;
        p.bulwarkT = ABILITY.dune.bulwarkCd;
      }
      if (slip && p.buffer) {
        dmg = Math.max(0, dmg - ABILITY.kite.buffer);
        p.buffer = false;
        p.bufferT = ABILITY.kite.bufferCd;
      }
      p.hp -= dmg;
      p.sinceHit = 0;
      p.iframe = 0.45;
      if (id === "kiln") {
        for (const b of bodies) if (b.dist < ABILITY.kiln.thornR + 20) b.hp -= dmg * ABILITY.kiln.thornFrac;
      }
    }
    if (p.hp < minHp) minHp = p.hp;
    if (p.hp <= 0) {
      deathTime = time;
      p.hp = 0;
      break;
    }
  }

  return { id, cleared: p.hp > 0 && time >= 100, endHp: Math.max(0, p.hp), deathTime, minHp };
}

export type SuitReport = {
  id: MechId;
  seeds: number;
  clearRate: number;
  meanEndHp: number;
  meanDeath: number | null;
};

export function reportSuit(id: MechId, profile: BudgetProfile, seeds = 20): SuitReport {
  let clears = 0;
  let hp = 0;
  let deaths = 0;
  let deathSum = 0;
  for (let s = 1; s <= seeds; s++) {
    const run = simulateCarefulRun(id, s * 997, profile);
    if (run.cleared) clears += 1;
    hp += run.endHp;
    if (run.deathTime !== null) {
      deaths += 1;
      deathSum += run.deathTime;
    }
  }
  return {
    id,
    seeds,
    clearRate: clears / seeds,
    meanEndHp: hp / seeds,
    meanDeath: deaths ? deathSum / deaths : null,
  };
}

export function reportRoster(profile: BudgetProfile, seeds = 20): SuitReport[] {
  return MECHS.map((m) => reportSuit(m.id, profile, seeds));
}

export function aliveSpread(profile: BudgetProfile, seeds = 24): { meanAt40: number; stdAt40: number; meanPeak: number } {
  const at40: number[] = [];
  const peaks: number[] = [];
  for (let s = 1; s <= seeds; s++) {
    const samples = sampleSpawnPressure(profile, s * 131);
    let peak = 0;
    let a40 = 0;
    for (const row of samples) {
      if (row.alive > peak) peak = row.alive;
      if (Math.abs(row.time - 40) < 0.11) a40 = row.alive;
    }
    at40.push(a40);
    peaks.push(peak);
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const m40 = mean(at40);
  const variance = at40.reduce((a, b) => a + (b - m40) ** 2, 0) / at40.length;
  return { meanAt40: m40, stdAt40: Math.sqrt(variance), meanPeak: mean(peaks) };
}
