export type MechId = "aether" | "forge" | "scythe" | "dune" | "serpent" | "storm" | "vulture" | "cross";
export type EnemyId = "drone" | "walker" | "crawler" | "titan" | "ace";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type GearSlot = "weapon" | "armor" | "system";
export type PerkId =
  | "overclock"
  | "apcore"
  | "afterburner"
  | "plating"
  | "magnet"
  | "fork"
  | "pierce"
  | "explosive"
  | "repair"
  | "crit"
  | "drone"
  | "vampire"
  | "range"
  | "haste"
  | "spread"
  | "thermal"
  | "barrier"
  | "momentum"
  | "echo"
  | "static"
  | "salvage";

export type WeaponKind = "beam" | "gatling" | "melee" | "shotgun" | "fang" | "arc" | "mortar" | "lance";

export interface MechDef {
  id: MechId;
  name: string;
  role: string;
  blurb: string;
  unlockCost: number;
  color: string;
  accent: string;
  stats: {
    hp: number;
    speed: number;
    fireRate: number;
    damage: number;
    range: number;
  };
  weapon: WeaponKind;
  skill: { name: string; cooldown: number; desc: string };
  handling: { accel: number; brake: number; weave?: number };
}

export interface PerkDef {
  id: PerkId;
  name: string;
  desc: string;
  max: number;
}

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  mods: {
    damage?: number;
    fireRate?: number;
    hp?: number;
    speed?: number;
    magnet?: number;
    skillHaste?: number;
    crit?: number;
    range?: number;
  };
}

export interface SaveData {
  version: number;
  credits: number;
  keys: number;
  unlocked: MechId[];
  selected: MechId;
  inventory: GearItem[];
  equipped: Partial<Record<GearSlot, string>>;
  highKills: number;
  bestTime: number;
  sorties: number;
}

export interface RunResult {
  survived: boolean;
  time: number;
  kills: number;
  xp: number;
  level: number;
  credits: number;
  keys: number;
  loot: GearItem[];
  bosses: number;
}

export interface HudState {
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
  level: number;
  timeLeft: number;
  kills: number;
  skillCd: number;
  skillMax: number;
  paused: boolean;
  leveling: boolean;
  combo: number;
  overdrive: number;
}
