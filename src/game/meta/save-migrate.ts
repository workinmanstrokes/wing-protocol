/**
 * Save schema + migration. v1 (the pre-meta save) had three gear slots
 * (weapon / armor / system), no levels or templates and no meta currencies.
 * v2 keeps every v1 item and all balances and adds the new fields.
 */
import type { GearItem, GearSlot, MechId, SaveData } from "../types";
import { GEAR_CATALOG, MAX_LEVEL } from "./gear.ts";
import { newMissionState, refreshMissions } from "./missions.ts";

export const SAVE_VERSION = 2;
export const INVENTORY_CAP = 150;

const ALL_MECHS: readonly MechId[] = [
  "aether", "forge", "scythe", "dune", "serpent", "storm", "vulture", "cross", "moth", "kiln", "kite",
];
const SLOT_SET: readonly GearSlot[] = ["weapon", "secondary", "frame", "thrusters", "core"];
/** v1 slot -> v2 slot. */
const LEGACY_SLOT: Record<string, GearSlot> = { weapon: "weapon", armor: "frame", system: "core" };
/** Trademarked / unsafe v1 gear names that are renamed on migration. */
const RENAMED: Record<string, string> = { "Gundam Weave": "Mirror Weave" };
const RARITY = new Set(["common", "rare", "epic", "legendary"]);

export function defaultSave(now = new Date()): SaveData {
  return {
    version: SAVE_VERSION,
    credits: 520,
    keys: 3,
    cores: 20,
    shards: 30,
    unlocked: ["aether"],
    selected: "aether",
    inventory: [],
    equipped: {},
    highKills: 0,
    bestTime: 0,
    sorties: 0,
    freeCrateAt: 0,
    adCrates: { day: "", n: 0 },
    adExtract: { day: "", n: 0 },
    premiumPity: 0,
    premiumOpened: 0,
    towerBest: 0,
    towerCoreFloor: 0,
    eliteClears: {},
    eliteCores: { day: "", n: 0 },
    rushClears: 0,
    missions: newMissionState(now),
    stats: { crates: 0, upgrades: 0, bossKills: 0 },
  };
}

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

function migrateItem(raw: unknown): GearItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  const slot = SLOT_SET.includes(r.slot as GearSlot) ? (r.slot as GearSlot) : LEGACY_SLOT[String(r.slot)];
  if (!slot) return null;
  const rarity = RARITY.has(String(r.rarity)) ? (r.rarity as GearItem["rarity"]) : "common";
  const name = RENAMED[r.name] ?? r.name;
  const tpl =
    typeof r.tpl === "string"
      ? r.tpl
      : (GEAR_CATALOG.find((t) => t.name === name && t.slot === slot && t.rarity === rarity)?.id ?? `legacy:${name}`);
  const level = Math.max(1, Math.min(MAX_LEVEL[rarity], Math.floor(num(r.level, 1))));
  const mods = r.mods && typeof r.mods === "object" ? (r.mods as GearItem["mods"]) : {};
  return { id: r.id, tpl, level, name, slot, rarity, mods };
}

export function migrateSave(raw: unknown, now = new Date()): SaveData {
  const base = defaultSave(now);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  const inventory = (Array.isArray(r.inventory) ? r.inventory : [])
    .map(migrateItem)
    .filter((g): g is GearItem => !!g)
    .slice(-INVENTORY_CAP);

  const equipped: SaveData["equipped"] = {};
  const rawEq = r.equipped && typeof r.equipped === "object" ? (r.equipped as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(rawEq)) {
    const slot = SLOT_SET.includes(k as GearSlot) ? (k as GearSlot) : LEGACY_SLOT[k];
    const item = inventory.find((g) => g.id === v);
    if (slot && item && item.slot === slot) equipped[slot] = item.id;
  }

  let unlocked = (Array.isArray(r.unlocked) ? r.unlocked : []).filter((m): m is MechId =>
    ALL_MECHS.includes(m as MechId),
  );
  unlocked = [...new Set<MechId>(["aether", ...unlocked])];
  const selected = unlocked.includes(r.selected as MechId) ? (r.selected as MechId) : "aether";

  const rec = (v: unknown) =>
    v && typeof v === "object" && typeof (v as { day?: unknown }).day === "string"
      ? { day: (v as { day: string }).day, n: num((v as { n?: unknown }).n, 0) }
      : { day: "", n: 0 };
  const stats = (r.stats && typeof r.stats === "object" ? r.stats : {}) as Record<string, unknown>;

  return {
    ...base,
    version: SAVE_VERSION,
    credits: Math.max(0, num(r.credits, base.credits)),
    keys: Math.max(0, num(r.keys, base.keys)),
    // v1 players get the same starter Cores as new players
    cores: Math.max(0, num(r.cores, base.cores)),
    // v1 players get the same starter shards as new players
    shards: Math.max(0, num(r.shards, base.shards)),
    unlocked,
    selected,
    inventory,
    equipped,
    highKills: num(r.highKills, 0),
    bestTime: num(r.bestTime, 0),
    sorties: num(r.sorties, 0),
    freeCrateAt: num(r.freeCrateAt, 0),
    adCrates: rec(r.adCrates),
    adExtract: rec(r.adExtract),
    premiumPity: num(r.premiumPity, 0),
    premiumOpened: num(r.premiumOpened, 0),
    towerBest: num(r.towerBest, 0),
    towerCoreFloor: num(r.towerCoreFloor, 0),
    eliteClears:
      r.eliteClears && typeof r.eliteClears === "object" ? (r.eliteClears as Record<string, number>) : {},
    eliteCores: rec(r.eliteCores),
    rushClears: num(r.rushClears, 0),
    missions: refreshMissions(
      r.missions && typeof r.missions === "object" ? (r.missions as SaveData["missions"]) : undefined,
      now,
    ),
    stats: {
      crates: num(stats.crates, 0),
      upgrades: num(stats.upgrades, 0),
      bossKills: num(stats.bossKills, 0),
    },
  };
}
