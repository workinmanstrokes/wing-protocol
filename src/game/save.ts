import type { GearSlot, MechId, SaveData } from "./types";

const KEY = "wing-protocol-save-v1";
const SAVE_VERSION = 1;

const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  credits: 520,
  keys: 3,
  unlocked: ["aether"],
  selected: "aether",
  inventory: [],
  equipped: {},
  highKills: 0,
  bestTime: 0,
  sorties: 0,
};

function migrate(raw: SaveData): SaveData {
  const merged: SaveData = {
    ...DEFAULT_SAVE,
    ...raw,
    version: SAVE_VERSION,
    unlocked: Array.isArray(raw.unlocked) ? raw.unlocked : ["aether"],
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    equipped: raw.equipped ?? {},
  };
  if (!merged.unlocked.includes("aether")) merged.unlocked = ["aether", ...merged.unlocked];
  if (!merged.unlocked.includes(merged.selected)) merged.selected = "aether";
  return merged;
}

function read(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE, unlocked: [...DEFAULT_SAVE.unlocked] };
    return migrate(JSON.parse(raw) as SaveData);
  } catch {
    return { ...DEFAULT_SAVE, unlocked: [...DEFAULT_SAVE.unlocked] };
  }
}

let state: SaveData =
  typeof localStorage === "undefined"
    ? { ...DEFAULT_SAVE, unlocked: [...DEFAULT_SAVE.unlocked] }
    : read();

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

export function getSave(): SaveData {
  return state;
}

export function subscribeSave(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function patchSave(partial: Partial<SaveData>) {
  state = { ...state, ...partial };
  emit();
}

export function selectMech(id: MechId) {
  if (!state.unlocked.includes(id)) return;
  state = { ...state, selected: id };
  emit();
}

export function unlockMech(id: MechId, cost: number): boolean {
  if (state.unlocked.includes(id) || state.credits < cost) return false;
  state = {
    ...state,
    credits: state.credits - cost,
    unlocked: [...state.unlocked, id],
    selected: id,
  };
  emit();
  return true;
}

export function addLoot(credits: number, keys: number, loot: SaveData["inventory"]) {
  state = {
    ...state,
    credits: state.credits + credits,
    keys: state.keys + keys,
    inventory: [...state.inventory, ...loot].slice(-80),
  };
  emit();
}

export function spendKeys(n: number): boolean {
  if (state.keys < n) return false;
  state = { ...state, keys: state.keys - n };
  emit();
  return true;
}

export function addItem(item: SaveData["inventory"][number]) {
  state = { ...state, inventory: [...state.inventory, item].slice(-80) };
  emit();
}

export function equipItem(id: string) {
  const item = state.inventory.find((g) => g.id === id);
  if (!item) return;
  state = { ...state, equipped: { ...state.equipped, [item.slot]: id } };
  emit();
}

export function unequipSlot(slot: GearSlot) {
  const next = { ...state.equipped };
  delete next[slot];
  state = { ...state, equipped: next };
  emit();
}

export function recordRun(kills: number, time: number) {
  state = {
    ...state,
    highKills: Math.max(state.highKills, kills),
    bestTime: Math.max(state.bestTime, time),
    sorties: state.sorties + 1,
  };
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });
  window.addEventListener("pagehide", persist);
}
