/**
 * Store crates (soft currency), the free timed crate, the rewarded-ad crate and
 * the premium Prism Vault (Cores) with pity. Drop odds here are the single
 * source of truth: the Store UI and docs/META.md show exactly these numbers.
 */
import type { GearItem, MechId, Rarity } from "../types";
import { SHARD_VALUE, makeItem, pickTemplate } from "./gear.ts";

export type Odds = Record<Rarity, number>; // percentages, sum to 100

export interface CrateDef {
  id: "supply" | "command" | "free" | "ad";
  name: string;
  blurb: string;
  credits: number; // 0 = not sold for credits
  keys: number; // alternative key price, 0 = none
  odds: Odds;
}

export const SUPPLY_ODDS: Odds = { common: 60, rare: 28, epic: 10, legendary: 2 };
export const COMMAND_ODDS: Odds = { common: 0, rare: 70, epic: 24, legendary: 6 };

export const CRATES: Record<CrateDef["id"], CrateDef> = {
  supply: { id: "supply", name: "Supply Crate", blurb: "One mech part.", credits: 300, keys: 1, odds: SUPPLY_ODDS },
  command: { id: "command", name: "Command Crate", blurb: "One part, rare or better.", credits: 900, keys: 2, odds: COMMAND_ODDS },
  free: { id: "free", name: "Field Drop", blurb: "Free every 4 hours.", credits: 0, keys: 0, odds: SUPPLY_ODDS },
  ad: { id: "ad", name: "Sponsor Crate", blurb: "Watch a short ad. 3 a day.", credits: 0, keys: 0, odds: SUPPLY_ODDS },
};

export const FREE_CRATE_COOLDOWN_MS = 4 * 60 * 60 * 1000;
export const AD_CRATES_PER_DAY = 3;

/** Premium Prism Vault (Cores). */
export const VAULT_COST = 60;
/** The Nth vault without a new mech is guaranteed to give one. */
export const VAULT_PITY = 10;
export const VAULT_ODDS = { mech: 8, legendary: 32, epic: 60 } as const;
/** When every vault mech is owned, a mech roll pays a legendary part plus this many shards. */
export const VAULT_ALL_OWNED_SHARDS = 150;

/** Premium mechs that only come from the Prism Vault. */
export const VAULT_MECHS: readonly MechId[] = ["moth", "kiln", "kite"];

/**
 * Real-money Core packs. The purchase path is stubbed and SWITCHED OFF: no
 * billing SDK is wired. Turning it on needs a Play Console product + billing.
 */
export const CORE_PURCHASES_ENABLED = false;
export const CORE_PACKS = [
  { id: "cores_small", cores: 120, label: "Pouch of Cores" },
  { id: "cores_large", cores: 650, label: "Crate of Cores" },
] as const;

export function purchaseCores(_packId: string): { ok: false; reason: string } {
  return { ok: false, reason: CORE_PURCHASES_ENABLED ? "billing not connected" : "disabled" };
}

export function rollFromOdds(odds: Odds, rng: () => number): Rarity {
  const order: Rarity[] = ["common", "rare", "epic", "legendary"];
  const total = order.reduce((s, r) => s + odds[r], 0);
  let t = rng() * total;
  for (const r of order) {
    if (odds[r] <= 0) continue;
    t -= odds[r];
    if (t < 0) return r;
  }
  // float edge: return highest non-zero
  for (let i = order.length - 1; i >= 0; i--) if (odds[order[i]!] > 0) return order[i]!;
  return "common";
}

export interface GearDrop {
  item: GearItem;
  duplicate: boolean;
  shards: number;
}

/** A gear drop; duplicates (template already owned) become shards instead of an item. */
export function gearDrop(rarity: Rarity, rng: () => number, owned: ReadonlySet<string>): GearDrop {
  const t = pickTemplate(rarity, rng);
  const item = makeItem(t);
  const duplicate = owned.has(t.id);
  return { item, duplicate, shards: duplicate ? SHARD_VALUE[rarity] : 0 };
}

export function openGearCrate(id: CrateDef["id"], rng: () => number, owned: ReadonlySet<string>): GearDrop {
  return gearDrop(rollFromOdds(CRATES[id].odds, rng), rng, owned);
}

export function freeCrateReady(now: number, readyAt: number): boolean {
  return now >= readyAt;
}

export function adCratesLeft(today: string, rec: { day: string; n: number }): number {
  return rec.day === today ? Math.max(0, AD_CRATES_PER_DAY - rec.n) : AD_CRATES_PER_DAY;
}

export type VaultResult =
  | { kind: "mech"; mech: MechId; pity: number }
  | { kind: "gear"; drop: GearDrop; pity: number; bonusShards: number };

/**
 * Open one Prism Vault. `pity` is how many vaults in a row gave no mech.
 * Mech odds 8%, guaranteed on the VAULT_PITY-th opening. A mech roll gives a
 * random unowned vault mech; if all are owned it pays a legendary part + shards.
 */
export function openVault(
  rng: () => number,
  state: { pity: number; ownedMechs: readonly MechId[]; ownedTpls: ReadonlySet<string> },
): VaultResult {
  const unowned = VAULT_MECHS.filter((m) => !state.ownedMechs.includes(m));
  const forced = state.pity + 1 >= VAULT_PITY;
  const roll = rng() * 100;
  const mechHit = forced || roll < VAULT_ODDS.mech;
  if (mechHit && unowned.length > 0) {
    const mech = unowned[Math.min(unowned.length - 1, Math.floor(rng() * unowned.length))]!;
    return { kind: "mech", mech, pity: 0 };
  }
  if (mechHit) {
    return {
      kind: "gear",
      drop: gearDrop("legendary", rng, state.ownedTpls),
      pity: 0,
      bonusShards: VAULT_ALL_OWNED_SHARDS,
    };
  }
  const rarity: Rarity = roll < VAULT_ODDS.mech + VAULT_ODDS.legendary ? "legendary" : "epic";
  return { kind: "gear", drop: gearDrop(rarity, rng, state.ownedTpls), pity: state.pity + 1, bonusShards: 0 };
}

/** Odds rows for display ("Rare 28%"). */
export function oddsRows(odds: Odds): { rarity: Rarity; pct: number }[] {
  return (["legendary", "epic", "rare", "common"] as Rarity[])
    .filter((r) => odds[r] > 0)
    .map((r) => ({ rarity: r, pct: odds[r] }));
}
