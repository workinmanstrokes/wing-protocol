/**
 * Game modes as data: a RunConfig tells the combat loop how long a run is,
 * which sector it uses, how tough enemies are and which bosses appear. Pure.
 */
import type { GearMods, Reward } from "../types";

export type ModeId = "sortie" | "tower" | "elite" | "rush";
export type BossKind = "titan" | "ace" | "warden";

export interface RunConfig {
  mode: ModeId;
  label: string;
  /** Run length in seconds. For boss modes this is the time limit. */
  duration: number;
  /** Sector (0..2) to use; sorties advance through all three. */
  sector: number;
  /** Sorties change sectors and run uplinks / scripted surges. */
  scripted: boolean;
  enemyHp: number;
  enemyDmg: number;
  enemySpeed: number;
  spawnRate: number;
  /** Starting difficulty ramp (0..1). */
  intensity0: number;
  /** Bosses that spawn in order. Sortie uses its fixed timeline instead. */
  bosses: BossKind[];
  /** Seconds before the first boss / between bosses in boss modes. */
  bossDelay: number;
  bossHp: number;
  /** Win as soon as every listed boss is destroyed. */
  endWhenBossesDown: boolean;
  /** Extra player stats (tower buffs, modifiers). Same keys as gear mods. */
  playerMods: GearMods;
  /** Tower carries hull between floors. */
  startHpFrac: number;
  rewardMult: number;
}

export const BASE_CONFIG: RunConfig = {
  mode: "sortie",
  label: "Sortie",
  duration: 300,
  sector: 0,
  scripted: true,
  enemyHp: 1,
  enemyDmg: 1,
  enemySpeed: 1,
  spawnRate: 1,
  intensity0: 0,
  bosses: [],
  bossDelay: 0,
  bossHp: 1,
  endWhenBossesDown: false,
  playerMods: {},
  startHpFrac: 1,
  rewardMult: 1,
};

export function sortieConfig(): RunConfig {
  return { ...BASE_CONFIG };
}

/* ------------------------------ elite bosses ------------------------------ */

export const ELITE_BOSSES: { id: BossKind; name: string; sector: number; blurb: string }[] = [
  { id: "titan", name: "Titan Breach", sector: 0, blurb: "Armoured siege walker. Telegraphed slams." },
  { id: "ace", name: "Ace Duel", sector: 1, blurb: "Fast dash-striker in the ion storm." },
  { id: "warden", name: "Core Warden", sector: 2, blurb: "Three-phase reactor guardian with shield escorts." },
];

export interface EliteModifier {
  id: string;
  name: string;
  desc: string;
  apply: (c: RunConfig) => RunConfig;
  bonusCores: number;
}

export const ELITE_MODIFIERS: EliteModifier[] = [
  {
    id: "overcharged",
    name: "Overcharged",
    desc: "Boss hull +50%.",
    bonusCores: 2,
    apply: (c) => ({ ...c, bossHp: c.bossHp * 1.5 }),
  },
  {
    id: "escort",
    name: "Escort Wing",
    desc: "Minions spawn 60% faster.",
    bonusCores: 2,
    apply: (c) => ({ ...c, spawnRate: c.spawnRate * 1.6 }),
  },
  {
    id: "glass",
    name: "Glass Cannon",
    desc: "Enemies hit 50% harder, you deal +25%.",
    bonusCores: 2,
    apply: (c) => ({ ...c, enemyDmg: c.enemyDmg * 1.5, playerMods: addMods(c.playerMods, { damage: 0.25 }) }),
  },
  {
    id: "haste",
    name: "Afterburn",
    desc: "Everything hostile moves 25% faster.",
    bonusCores: 2,
    apply: (c) => ({ ...c, enemySpeed: c.enemySpeed * 1.25 }),
  },
];

export function addMods(a: GearMods, b: GearMods): GearMods {
  const out: GearMods = { ...a };
  for (const [k, v] of Object.entries(b) as [keyof GearMods, number][]) out[k] = (out[k] ?? 0) + v;
  return out;
}

export function eliteConfig(boss: BossKind, modifierIds: readonly string[] = []): RunConfig {
  const def = ELITE_BOSSES.find((b) => b.id === boss)!;
  let c: RunConfig = {
    ...BASE_CONFIG,
    mode: "elite",
    label: `Elite · ${def.name}`,
    duration: 150,
    sector: def.sector,
    scripted: false,
    intensity0: 0.35,
    spawnRate: 0.5,
    bosses: [boss],
    bossDelay: 3,
    bossHp: 1.6,
    endWhenBossesDown: true,
    rewardMult: 0.6,
  };
  for (const id of modifierIds) {
    const m = ELITE_MODIFIERS.find((x) => x.id === id);
    if (m) c = m.apply(c);
  }
  return c;
}

export function bossRushConfig(): RunConfig {
  return {
    ...BASE_CONFIG,
    mode: "rush",
    label: "Boss Rush",
    duration: 300,
    sector: 2,
    scripted: false,
    intensity0: 0.3,
    spawnRate: 0.45,
    bosses: ["titan", "ace", "warden"],
    bossDelay: 3,
    bossHp: 1.25,
    endWhenBossesDown: true,
    rewardMult: 0.8,
  };
}

/** Core rewards for boss modes. First clears pay most; repeats are capped per day. */
export const ELITE_FIRST_CLEAR_CORES = 20;
export const ELITE_REPEAT_CORES = 4;
export const RUSH_FIRST_CLEAR_CORES = 30;
export const RUSH_REPEAT_CORES = 8;
export const DAILY_BOSS_CORE_CAP = 24;

export function eliteReward(
  boss: BossKind | "rush",
  priorClears: number,
  modifierIds: readonly string[],
): Reward {
  const first = boss === "rush" ? RUSH_FIRST_CLEAR_CORES : ELITE_FIRST_CLEAR_CORES;
  const repeat = boss === "rush" ? RUSH_REPEAT_CORES : ELITE_REPEAT_CORES;
  const mod = modifierIds.reduce((s, id) => s + (ELITE_MODIFIERS.find((m) => m.id === id)?.bonusCores ?? 0), 0);
  return {
    cores: (priorClears === 0 ? first : repeat) + mod,
    credits: boss === "rush" ? 600 : 250,
  };
}

/** Apply the daily cap to repeat-clear cores. First clears always pay in full. */
export function capBossCores(cores: number, firstClear: boolean, usedToday: number): number {
  if (firstClear) return cores;
  return Math.max(0, Math.min(cores, DAILY_BOSS_CORE_CAP - usedToday));
}
