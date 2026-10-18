export type MechId =
  | "aether"
  | "forge"
  | "scythe"
  | "dune"
  | "serpent"
  | "storm"
  | "vulture"
  | "cross"
  // premium (Prism Vault) mechs
  | "moth"
  | "kiln"
  | "kite";
export type EnemyId = "drone" | "walker" | "crawler" | "titan" | "ace";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type GearSlot = "weapon" | "secondary" | "frame" | "thrusters" | "core";
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

export type WeaponKind =
  | "beam"
  | "gatling"
  | "melee"
  | "shotgun"
  | "fang"
  | "arc"
  | "mortar"
  | "lance"
  | "mote"
  | "ember"
  | "tether";

export interface MechDef {
  id: MechId;
  name: string;
  role: string;
  blurb: string;
  unlockCost: number;
  /** Premium mechs come from the Prism Vault only (earned with Cores in play). */
  premium?: boolean;
  pilot?: { callsign: string; bio: string };
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

export interface GearMods {
  damage?: number;
  fireRate?: number;
  hp?: number;
  speed?: number;
  magnet?: number;
  skillHaste?: number;
  crit?: number;
  range?: number;
}

export interface GearItem {
  id: string;
  /** Catalog template id (duplicates are detected by this). Legacy items: "legacy:<name>". */
  tpl: string;
  level: number;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  mods: GearMods;
}

export type MissionKind =
  | "kills"
  | "bosses"
  | "sortie_wins"
  | "tower_floor"
  | "crates"
  | "upgrades"
  | "elite_wins"
  | "uplinks"
  | "runs";

export interface Reward {
  credits?: number;
  cores?: number;
  shards?: number;
}

export interface Mission {
  id: string;
  kind: MissionKind;
  label: string;
  target: number;
  progress: number;
  claimed: boolean;
  reward: Reward;
}

export interface MissionState {
  dayKey: string;
  weekKey: string;
  daily: Mission[];
  weekly: Mission[];
}

export interface SaveData {
  version: number;
  credits: number;
  keys: number;
  /** Premium currency, earned slowly from missions, elite bosses and tower milestones. */
  cores: number;
  /** Upgrade shards, from duplicate gear. */
  shards: number;
  unlocked: MechId[];
  selected: MechId;
  inventory: GearItem[];
  equipped: Partial<Record<GearSlot, string>>;
  highKills: number;
  bestTime: number;
  sorties: number;
  freeCrateAt: number;
  adCrates: { day: string; n: number };
  premiumPity: number;
  premiumOpened: number;
  towerBest: number;
  towerCoreFloor: number;
  eliteClears: Record<string, number>;
  eliteCores: { day: string; n: number };
  rushClears: number;
  missions: MissionState;
  stats: { crates: number; upgrades: number; bossKills: number };
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
  sector?: number;
  uplinks?: number;
  evolutions?: string[];
  mode?: string;
  bossKills?: number;
  hpFrac?: number;
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
