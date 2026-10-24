import type { GearItem, GearSlot, MechId, Reward, RunResult, SaveData } from "./types";
import { INVENTORY_CAP, defaultSave, migrateSave } from "./meta/save-migrate";
import { upgradeCost } from "./meta/gear";
import {
  AD_CRATES_PER_DAY,
  CRATES,
  FREE_CRATE_COOLDOWN_MS,
  VAULT_COST,
  adCratesLeft,
  openGearCrate,
  openVault,
  type CrateDef,
  type GearDrop,
  type VaultResult,
} from "./meta/crates";
import { applyMissionEvents, claimMission, dayKey, refreshMissions, type MissionEvent } from "./meta/missions";
import { capBossCores, eliteReward, type BossKind } from "./meta/modes";
import { floorCredits, towerMilestoneCores } from "./meta/tower";
import { MECH_MAP } from "./data";

/** Same storage key as v1 so existing saves are found and migrated in place. */
const KEY = "wing-protocol-save-v1";

/** Stable snapshot for SSR + the hydration pass (see getServerSave). */
const SERVER_SAVE: SaveData = defaultSave(new Date(2026, 0, 5));

function read(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return migrateSave(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

let state: SaveData = typeof localStorage === "undefined" ? SERVER_SAVE : read();

const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

function emit() {
  persist();
  for (const l of listeners) l();
}

function set(next: SaveData) {
  state = next;
  emit();
}

export function getSave(): SaveData {
  return state;
}

/**
 * useSyncExternalStore's getServerSnapshot. The server has no localStorage,
 * so it always renders the default save — this must return the exact same
 * object on the client's hydration pass, or React logs a hydration mismatch
 * for every returning player. React swaps in getSave() right after hydration.
 */
export function getServerSave(): SaveData {
  return SERVER_SAVE;
}

export function subscribeSave(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function patchSave(partial: Partial<SaveData>) {
  set({ ...state, ...partial });
}

/** Test / debug helper: replace the whole save (runs migration). */
export function loadSave(raw: unknown) {
  set(migrateSave(raw));
}

function ownedTpls(s: SaveData = state): Set<string> {
  return new Set(s.inventory.map((g) => g.tpl));
}

function pushItems(s: SaveData, items: GearItem[]): SaveData {
  return { ...s, inventory: [...s.inventory, ...items].slice(-INVENTORY_CAP) };
}

function withMissions(s: SaveData, events: MissionEvent[]): SaveData {
  const fresh = refreshMissions(s.missions, new Date());
  return { ...s, missions: applyMissionEvents(fresh, events) };
}

function grant(s: SaveData, r: Reward): SaveData {
  return {
    ...s,
    credits: s.credits + (r.credits ?? 0),
    cores: s.cores + (r.cores ?? 0),
    shards: s.shards + (r.shards ?? 0),
  };
}

/** Ensure the daily/weekly boards are current (call on menu open). */
export function touchMissions() {
  const m = refreshMissions(state.missions, new Date());
  if (m.dayKey !== state.missions.dayKey || m.weekKey !== state.missions.weekKey) set({ ...state, missions: m });
}

export function selectMech(id: MechId) {
  if (!state.unlocked.includes(id)) return;
  set({ ...state, selected: id });
}

export function unlockMech(id: MechId, cost: number): boolean {
  if (MECH_MAP[id]?.premium) return false; // vault only
  if (state.unlocked.includes(id) || state.credits < cost) return false;
  set({ ...state, credits: state.credits - cost, unlocked: [...state.unlocked, id], selected: id });
  return true;
}

/** Add run loot. Duplicate parts (already owned template) convert to shards. */
export function addLoot(credits: number, keys: number, loot: GearItem[]): number {
  const owned = ownedTpls();
  let shards = 0;
  const keep: GearItem[] = [];
  for (const g of loot) {
    if (owned.has(g.tpl)) shards += dupShards(g);
    else {
      owned.add(g.tpl);
      keep.push(g);
    }
  }
  set(pushItems({ ...state, credits: state.credits + credits, keys: state.keys + keys, shards: state.shards + shards }, keep));
  return shards;
}

function dupShards(g: GearItem) {
  return g.rarity === "legendary" ? 100 : g.rarity === "epic" ? 40 : g.rarity === "rare" ? 15 : 5;
}

export function spendKeys(n: number): boolean {
  if (state.keys < n) return false;
  set({ ...state, keys: state.keys - n });
  return true;
}

export function addItem(item: GearItem) {
  set(pushItems(state, [item]));
}

export function equipItem(id: string) {
  const item = state.inventory.find((g) => g.id === id);
  if (!item) return;
  set({ ...state, equipped: { ...state.equipped, [item.slot]: id } });
}

export function unequipSlot(slot: GearSlot) {
  const next = { ...state.equipped };
  delete next[slot];
  set({ ...state, equipped: next });
}

export function upgradeItem(id: string): boolean {
  const item = state.inventory.find((g) => g.id === id);
  if (!item) return false;
  const cost = upgradeCost(item);
  if (!cost || state.credits < cost.credits || state.shards < cost.shards) return false;
  const inventory = state.inventory.map((g) => (g.id === id ? { ...g, level: g.level + 1 } : g));
  set(
    withMissions(
      {
        ...state,
        inventory,
        credits: state.credits - cost.credits,
        shards: state.shards - cost.shards,
        stats: { ...state.stats, upgrades: state.stats.upgrades + 1 },
      },
      [{ kind: "upgrades", amount: 1 }],
    ),
  );
  return true;
}

export type CratePay = "credits" | "keys" | "free" | "ad";

export function canOpenCrate(id: CrateDef["id"], pay: CratePay, now = Date.now()): boolean {
  const c = CRATES[id];
  if (pay === "credits") return c.credits > 0 && state.credits >= c.credits;
  if (pay === "keys") return c.keys > 0 && state.keys >= c.keys;
  if (pay === "free") return id === "free" && now >= state.freeCrateAt;
  if (pay === "ad") return id === "ad" && adCratesLeft(dayKey(new Date(now)), state.adCrates) > 0;
  return false;
}

export function openCrate(id: CrateDef["id"], pay: CratePay, rng: () => number = Math.random, now = Date.now()): GearDrop | null {
  if (!canOpenCrate(id, pay, now)) return null;
  const c = CRATES[id];
  let s: SaveData = { ...state };
  if (pay === "credits") s.credits -= c.credits;
  if (pay === "keys") s.keys -= c.keys;
  if (pay === "free") s.freeCrateAt = now + FREE_CRATE_COOLDOWN_MS;
  if (pay === "ad") {
    const today = dayKey(new Date(now));
    const n = s.adCrates.day === today ? s.adCrates.n : 0;
    s.adCrates = { day: today, n: Math.min(AD_CRATES_PER_DAY, n + 1) };
  }
  const drop = openGearCrate(id, rng, ownedTpls(s));
  s = drop.duplicate ? { ...s, shards: s.shards + drop.shards } : pushItems(s, [drop.item]);
  s = { ...s, stats: { ...s.stats, crates: s.stats.crates + 1 } };
  set(withMissions(s, [{ kind: "crates", amount: 1 }]));
  return drop;
}

export function openPrismVault(rng: () => number = Math.random): VaultResult | null {
  if (state.cores < VAULT_COST) return null;
  const res = openVault(rng, { pity: state.premiumPity, ownedMechs: state.unlocked, ownedTpls: ownedTpls() });
  let s: SaveData = { ...state, cores: state.cores - VAULT_COST, premiumPity: res.pity, premiumOpened: state.premiumOpened + 1 };
  if (res.kind === "mech") s = { ...s, unlocked: [...s.unlocked, res.mech] };
  else {
    const d = res.drop;
    s = d.duplicate ? { ...s, shards: s.shards + d.shards } : pushItems(s, [d.item]);
    s = { ...s, shards: s.shards + res.bonusShards };
  }
  s = { ...s, stats: { ...s.stats, crates: s.stats.crates + 1 } };
  set(withMissions(s, [{ kind: "crates", amount: 1 }]));
  return res;
}

export function claimMissionReward(id: string): Reward | null {
  const { state: m, reward } = claimMission(refreshMissions(state.missions, new Date()), id);
  if (!reward) return null;
  set(grant({ ...state, missions: m }, reward));
  return reward;
}

export interface RunPayout {
  credits: number;
  keys: number;
  cores: number;
  shards: number;
  newItems: number;
}

function runEvents(r: RunResult): MissionEvent[] {
  return [
    { kind: "kills", amount: r.kills },
    { kind: "bosses", amount: r.bossKills ?? 0 },
    { kind: "uplinks", amount: r.uplinks ?? 0 },
    { kind: "runs", amount: 1 },
  ];
}

/** Settle a finished sortie. */
export function settleSortie(r: RunResult): RunPayout {
  const dupShards = addLoot(r.credits, r.keys, r.loot);
  const cores = (r.survived ? 3 : 0) + (r.bossKills ?? 0);
  const earned = 5 * (r.bossKills ?? 0) + (r.survived ? 10 : 0);
  const shards = dupShards + earned;
  const ev = runEvents(r);
  if (r.survived) ev.push({ kind: "sortie_wins", amount: 1 });
  set(
    withMissions(
      {
        ...state,
        cores: state.cores + cores,
        shards: state.shards + earned,
        highKills: Math.max(state.highKills, r.kills),
        bestTime: Math.max(state.bestTime, r.time),
        sorties: state.sorties + 1,
        stats: { ...state.stats, bossKills: state.stats.bossKills + (r.bossKills ?? 0) },
      },
      ev,
    ),
  );
  return { credits: r.credits, keys: r.keys, cores, shards, newItems: r.loot.length };
}

/** Settle an elite fight or boss rush. */
export function settleBossFight(r: RunResult, boss: BossKind | "rush", mods: readonly string[]): RunPayout {
  const shards = addLoot(r.credits, r.keys, r.loot);
  let cores = 0;
  let bonusCredits = 0;
  let s: SaveData = { ...state };
  const ev = runEvents(r);
  if (r.survived) {
    const prior = boss === "rush" ? s.rushClears : (s.eliteClears[boss] ?? 0);
    const rw = eliteReward(boss, prior, mods);
    const today = dayKey(new Date());
    const used = s.eliteCores.day === today ? s.eliteCores.n : 0;
    cores = capBossCores(rw.cores ?? 0, prior === 0, used);
    bonusCredits = rw.credits ?? 0;
    s = {
      ...s,
      cores: s.cores + cores,
      credits: s.credits + bonusCredits,
      eliteCores: { day: today, n: prior === 0 ? used : used + cores },
      rushClears: boss === "rush" ? s.rushClears + 1 : s.rushClears,
      eliteClears: boss === "rush" ? s.eliteClears : { ...s.eliteClears, [boss]: prior + 1 },
    };
    ev.push({ kind: "elite_wins", amount: 1 });
  }
  s = { ...s, stats: { ...s.stats, bossKills: s.stats.bossKills + (r.bossKills ?? 0) } };
  set(withMissions(s, ev));
  return { credits: r.credits + bonusCredits, keys: r.keys, cores, shards, newItems: r.loot.length };
}

/** Settle one tower floor (loot + mission kills). Credits for floors are paid in settleTower. */
export function settleTowerFloor(r: RunResult): number {
  const shards = addLoot(Math.round(r.credits), r.keys, r.loot);
  set(withMissions({ ...state, stats: { ...state.stats, bossKills: state.stats.bossKills + (r.bossKills ?? 0) } }, runEvents(r).filter((e) => e.kind !== "runs")));
  return shards;
}

/** Settle a finished tower climb. `cleared` = floors cleared this climb. */
export function settleTower(cleared: number): RunPayout & { best: boolean } {
  let credits = 0;
  for (let f = 1; f <= cleared; f++) credits += floorCredits(f);
  const ms = towerMilestoneCores(cleared, state.towerCoreFloor);
  const best = cleared > state.towerBest;
  set(
    withMissions(
      {
        ...state,
        credits: state.credits + credits,
        cores: state.cores + ms.cores,
        towerBest: Math.max(state.towerBest, cleared),
        towerCoreFloor: ms.paidFloor,
      },
      [
        { kind: "tower_floor", amount: cleared },
        { kind: "runs", amount: 1 },
      ],
    ),
  );
  return { credits, keys: 0, cores: ms.cores, shards: 0, newItems: 0, best };
}

/** Kept for compatibility with older callers. */
export function recordRun(kills: number, time: number) {
  set({
    ...state,
    highKills: Math.max(state.highKills, kills),
    bestTime: Math.max(state.bestTime, time),
    sorties: state.sorties + 1,
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });
  window.addEventListener("pagehide", persist);
}
