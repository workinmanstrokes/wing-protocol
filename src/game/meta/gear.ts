/**
 * Gear catalog, levels and stat application. Pure (no DOM / storage) so it is
 * unit tested directly with `node --test`.
 *
 * Five mech part slots. Every part is a fixed catalog template, so a second
 * copy of the same part is a duplicate and converts to upgrade shards.
 */
import type { GearItem, GearMods, GearSlot, Rarity } from "../types";

export const SLOTS: readonly GearSlot[] = ["weapon", "secondary", "frame", "thrusters", "core"];

export const SLOT_LABEL: Record<GearSlot, string> = {
  weapon: "Primary",
  secondary: "Secondary",
  frame: "Frame",
  thrusters: "Thrusters",
  core: "Core",
};

export const RARITIES: readonly Rarity[] = ["common", "rare", "epic", "legendary"];

/** Max upgrade level per rarity. */
export const MAX_LEVEL: Record<Rarity, number> = { common: 5, rare: 10, epic: 15, legendary: 20 };

/** Shards granted when a duplicate part converts. */
export const SHARD_VALUE: Record<Rarity, number> = { common: 5, rare: 15, epic: 40, legendary: 100 };

const RARITY_MULT: Record<Rarity, number> = { common: 1, rare: 2, epic: 4, legendary: 8 };

/** Each level above 1 adds 8% of the part's base stats. */
export const LEVEL_STEP = 0.08;

export interface GearTemplate {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  mods: GearMods;
}

const T = (id: string, name: string, slot: GearSlot, rarity: Rarity, mods: GearMods): GearTemplate => ({
  id,
  name,
  slot,
  rarity,
  mods,
});

/** 40 original parts: 5 slots x 4 rarities x 2. */
export const GEAR_CATALOG: readonly GearTemplate[] = [
  // primary weapon: damage / fire rate / crit / range
  T("w-issue-rifle", "Issue Rifle", "weapon", "common", { damage: 0.08 }),
  T("w-stock-scatter", "Stock Scatter", "weapon", "common", { fireRate: 0.07 }),
  T("w-ion-barrel", "Ion Barrel", "weapon", "rare", { damage: 0.14, range: 0.06 }),
  T("w-pulse-rack", "Pulse Rack", "weapon", "rare", { fireRate: 0.12, crit: 0.03 }),
  T("w-glass-lens", "Glasswork Lens", "weapon", "epic", { damage: 0.22, crit: 0.06 }),
  T("w-siege-rotary", "Siege Rotary", "weapon", "epic", { fireRate: 0.2, damage: 0.1 }),
  T("w-sunforge", "Sunforge Barrel", "weapon", "legendary", { damage: 0.32, fireRate: 0.12, crit: 0.06 }),
  T("w-verdict", "Verdict Array", "weapon", "legendary", { damage: 0.26, range: 0.18, crit: 0.08 }),
  // secondary: crit / skill haste / range
  T("s-flare-pod", "Flare Pod", "secondary", "common", { crit: 0.03 }),
  T("s-micro-rack", "Micro Rack", "secondary", "common", { skillHaste: 0.05 }),
  T("s-seeker-pod", "Seeker Pod", "secondary", "rare", { crit: 0.05, range: 0.06 }),
  T("s-chaff-launcher", "Chaff Launcher", "secondary", "rare", { skillHaste: 0.09, magnet: 0.08 }),
  T("s-hornet-nest", "Hornet Nest", "secondary", "epic", { crit: 0.08, damage: 0.08 }),
  T("s-arc-spool", "Arc Spool", "secondary", "epic", { skillHaste: 0.14, fireRate: 0.08 }),
  T("s-meteor-cradle", "Meteor Cradle", "secondary", "legendary", { crit: 0.12, damage: 0.14, range: 0.1 }),
  T("s-halo-swarm", "Halo Swarm", "secondary", "legendary", { skillHaste: 0.2, crit: 0.08, fireRate: 0.08 }),
  // frame: hull / magnet
  T("f-plate-vest", "Plate Vest", "frame", "common", { hp: 14 }),
  T("f-ablative-wrap", "Ablative Wrap", "frame", "common", { hp: 10, magnet: 0.05 }),
  T("f-reactive-mail", "Reactive Mail", "frame", "rare", { hp: 26 }),
  T("f-heatsink-coat", "Heat Sink Coat", "frame", "rare", { hp: 18, magnet: 0.1 }),
  T("f-bastion-shell", "Bastion Shell", "frame", "epic", { hp: 44, speed: -0.03 }),
  T("f-mirror-weave", "Mirror Weave", "frame", "epic", { hp: 30, crit: 0.04 }),
  T("f-tortoise-hide", "Tortoise Hide", "frame", "legendary", { hp: 70, magnet: 0.12 }),
  T("f-dawn-plate", "Dawn Plate", "frame", "legendary", { hp: 56, damage: 0.1 }),
  // thrusters: speed / magnet
  T("t-scout-jets", "Scout Jets", "thrusters", "common", { speed: 0.05 }),
  T("t-mag-clamp", "Mag Clamp Jets", "thrusters", "common", { magnet: 0.1 }),
  T("t-boost-coil", "Boost Coil", "thrusters", "rare", { speed: 0.09 }),
  T("t-glide-fins", "Glide Fins", "thrusters", "rare", { speed: 0.06, magnet: 0.12 }),
  T("t-phase-skates", "Phase Skates", "thrusters", "epic", { speed: 0.13, skillHaste: 0.05 }),
  T("t-comet-tail", "Comet Tail", "thrusters", "epic", { speed: 0.1, magnet: 0.2 }),
  T("t-ghost-drive", "Ghost Drive", "thrusters", "legendary", { speed: 0.18, magnet: 0.2, skillHaste: 0.06 }),
  T("t-starwake", "Starwake Engine", "thrusters", "legendary", { speed: 0.15, fireRate: 0.1, magnet: 0.15 }),
  // core: skill haste / fire rate / mixed
  T("c-coolant-tap", "Coolant Tap", "core", "common", { skillHaste: 0.06 }),
  T("c-spare-cell", "Spare Cell", "core", "common", { hp: 8, fireRate: 0.03 }),
  T("c-nano-drip", "Nano Drip", "core", "rare", { skillHaste: 0.1, hp: 8 }),
  T("c-overvolt-bus", "Overvolt Bus", "core", "rare", { fireRate: 0.08, damage: 0.05 }),
  T("c-predictive", "Predictive Lock", "core", "epic", { crit: 0.06, skillHaste: 0.1 }),
  T("c-twin-reactor", "Twin Reactor", "core", "epic", { fireRate: 0.12, hp: 16 }),
  T("c-oracle", "Oracle Suite", "core", "legendary", { skillHaste: 0.22, crit: 0.08, damage: 0.08 }),
  T("c-overflow", "Core Overflow", "core", "legendary", { fireRate: 0.18, damage: 0.12, hp: 20 }),
];

export const GEAR_BY_ID: Record<string, GearTemplate> = Object.fromEntries(GEAR_CATALOG.map((g) => [g.id, g]));

export function templatesOf(rarity: Rarity, slot?: GearSlot): GearTemplate[] {
  return GEAR_CATALOG.filter((g) => g.rarity === rarity && (!slot || g.slot === slot));
}

let seq = 1;
export function newGearId(): string {
  return `g${Date.now().toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export function makeItem(t: GearTemplate, id = newGearId()): GearItem {
  return { id, tpl: t.id, level: 1, name: t.name, slot: t.slot, rarity: t.rarity, mods: { ...t.mods } };
}

export function pickTemplate(rarity: Rarity, rng: () => number, slot?: GearSlot): GearTemplate {
  const pool = templatesOf(rarity, slot);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
}

/** Item mods scaled by its level. Hull rounds to whole numbers. */
export function effectiveMods(item: Pick<GearItem, "mods" | "level">): GearMods {
  const k = 1 + LEVEL_STEP * (Math.max(1, item.level) - 1);
  const out: GearMods = {};
  for (const [key, v] of Object.entries(item.mods) as [keyof GearMods, number][]) {
    out[key] = key === "hp" ? Math.round(v * k) : Math.round(v * k * 1000) / 1000;
  }
  return out;
}

export function upgradeCost(item: Pick<GearItem, "rarity" | "level">): { credits: number; shards: number } | null {
  if (item.level >= MAX_LEVEL[item.rarity]) return null;
  const m = RARITY_MULT[item.rarity];
  return { credits: 50 * m * item.level, shards: Math.ceil(item.level * m * 1.5) };
}

export interface CoreStats {
  hp: number;
  speed: number;
  fire: number;
  dmg: number;
  range: number;
  magnet: number;
  skillHaste: number;
  crit: number;
}

/** Base mech stats -> stats with equipped gear applied (same rules the combat loop uses). */
export function applyGear(base: CoreStats, items: readonly Pick<GearItem, "mods" | "level">[]): CoreStats {
  const s = { ...base };
  for (const g of items) {
    const m = effectiveMods(g);
    s.hp += m.hp ?? 0;
    s.speed *= 1 + (m.speed ?? 0);
    s.fire *= 1 + (m.fireRate ?? 0);
    s.dmg *= 1 + (m.damage ?? 0);
    s.range *= 1 + (m.range ?? 0);
    s.magnet *= 1 + (m.magnet ?? 0);
    s.skillHaste *= 1 + (m.skillHaste ?? 0);
    s.crit += m.crit ?? 0;
  }
  return s;
}

/** Rough single-number power rating for UI sorting. */
export function gearPower(item: Pick<GearItem, "mods" | "level">): number {
  const m = effectiveMods(item);
  return Math.round(
    (m.damage ?? 0) * 400 +
      (m.fireRate ?? 0) * 360 +
      (m.crit ?? 0) * 500 +
      (m.range ?? 0) * 200 +
      (m.hp ?? 0) * 2 +
      (m.speed ?? 0) * 300 +
      (m.magnet ?? 0) * 120 +
      (m.skillHaste ?? 0) * 300,
  );
}

export function formatMod(key: string, value: number): string {
  const pct = `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
  if (key === "hp") return `Hull ${value >= 0 ? "+" : ""}${value}`;
  if (key === "damage") return `Damage ${pct}`;
  if (key === "fireRate") return `Fire rate ${pct}`;
  if (key === "speed") return `Speed ${pct}`;
  if (key === "magnet") return `Magnet ${pct}`;
  if (key === "skillHaste") return `Skill haste ${pct}`;
  if (key === "crit") return `Crit ${pct}`;
  if (key === "range") return `Range ${pct}`;
  return `${key} +${value}`;
}
