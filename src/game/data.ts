import type { GearItem, GearSlot, MechDef, MechId, PerkDef, PerkId, Rarity } from "./types";

export const MISSION_SECONDS = 300;
export const WORLD = 3400;

export const MECHS: MechDef[] = [
  {
    id: "aether",
    name: "Aether Wing",
    role: "Interceptor",
    blurb: "Twin beam rifles and a wing-mounted buster. Fragile, lethal at range.",
    unlockCost: 0,
    color: "#e8eef2",
    accent: "#5ec8e8",
    stats: { hp: 92, speed: 248, fireRate: 5.4, damage: 16, range: 520 },
    weapon: "beam",
    skill: {
      name: "Zero Buster",
      cooldown: 9,
      desc: "A wide dual-beam sweep that shreds everything in a cone.",
    },
    handling: { accel: 13, brake: 3.2 },
  },
  {
    id: "forge",
    name: "Heavy Forge",
    role: "Artillery",
    blurb: "Rotary cannon and missile racks. Slow, armored, saturates the field.",
    unlockCost: 800,
    color: "#c4453a",
    accent: "#e8dcc8",
    stats: { hp: 150, speed: 176, fireRate: 11, damage: 7, range: 430 },
    weapon: "gatling",
    skill: {
      name: "Cluster Storm",
      cooldown: 11,
      desc: "Launches a volley of homing cluster missiles.",
    },
    handling: { accel: 3.2, brake: 2.4 },
  },
  {
    id: "scythe",
    name: "Night Scythe",
    role: "Reaper",
    blurb: "Beam glaive and phantom dash. High burst, lives in the melee.",
    unlockCost: 1200,
    color: "#1a1c22",
    accent: "#c4a574",
    stats: { hp: 110, speed: 236, fireRate: 3.2, damage: 38, range: 150 },
    weapon: "melee",
    skill: {
      name: "Phantom Cut",
      cooldown: 7.5,
      desc: "Blink through the nearest pack, invulnerable, carving a line.",
    },
    handling: { accel: 22, brake: 18 },
  },
  {
    id: "dune",
    name: "Dune Shield",
    role: "Vanguard",
    blurb: "Heat scattergun and fortress plating. Holds the line, then pushes it.",
    unlockCost: 1500,
    color: "#d8c4a0",
    accent: "#b06040",
    stats: { hp: 168, speed: 188, fireRate: 2.4, damage: 22, range: 260 },
    weapon: "shotgun",
    skill: {
      name: "Bastion",
      cooldown: 12,
      desc: "Raises a kinetic barrier and knocks the horde back.",
    },
    handling: { accel: 6.5, brake: 11 },
  },
  {
    id: "serpent",
    name: "Jade Serpent",
    role: "Striker",
    blurb: "Dragon fang and coiling orbs. Flexible mid-range predator.",
    unlockCost: 2000,
    color: "#2d6b4a",
    accent: "#c4b07a",
    stats: { hp: 118, speed: 220, fireRate: 4.2, damage: 14, range: 380 },
    weapon: "fang",
    skill: {
      name: "Coil Burst",
      cooldown: 10,
      desc: "Spawns three orbiting fangs that shred nearby hulls.",
    },
    handling: { accel: 9, brake: 6, weave: 34 },
  },
  {
    id: "storm",
    name: "Storm Warden",
    role: "Support",
    blurb: "Chain-lightning zapper. Every bolt jumps to the next closest hull.",
    unlockCost: 2500,
    color: "#c8d8f0",
    accent: "#4ad8ff",
    stats: { hp: 104, speed: 214, fireRate: 3.8, damage: 11, range: 320 },
    weapon: "arc",
    skill: {
      name: "Overload Pulse",
      cooldown: 10,
      desc: "A discharge ring that damages nearby hulls and briefly overdrives you.",
    },
    handling: { accel: 10, brake: 7 },
  },
  {
    id: "vulture",
    name: "Iron Vulture",
    role: "Bomber",
    blurb: "Lobs slow mortar shells that always detonate. Punishes standing still.",
    unlockCost: 3200,
    color: "#5c5a48",
    accent: "#c46a2a",
    stats: { hp: 132, speed: 182, fireRate: 1.6, damage: 30, range: 420 },
    weapon: "mortar",
    skill: {
      name: "Payload Drop",
      cooldown: 12.5,
      desc: "Drops a five-shell spread that detonates in a wide arc.",
    },
    handling: { accel: 5, brake: 4 },
  },
  {
    id: "cross",
    name: "Solar Cross",
    role: "Paladin",
    blurb: "Piercing energy lance and a radiant ward. Holds ground, mends fast.",
    unlockCost: 4000,
    color: "#f0ece0",
    accent: "#e8c84a",
    stats: { hp: 128, speed: 200, fireRate: 2.8, damage: 24, range: 260 },
    weapon: "lance",
    skill: {
      name: "Radiant Ward",
      cooldown: 11,
      desc: "Shields, heals, and knocks back everything close.",
    },
    handling: { accel: 7, brake: 8 },
  },
];

export const MECH_MAP: Record<MechId, MechDef> = Object.fromEntries(
  MECHS.map((m) => [m.id, m]),
) as Record<MechId, MechDef>;

export const PERKS: PerkDef[] = [
  { id: "overclock", name: "Overclock", desc: "Fire rate +18%.", max: 5 },
  { id: "apcore", name: "AP Core", desc: "Weapon damage +22%.", max: 5 },
  { id: "afterburner", name: "Afterburner", desc: "Move speed +14%.", max: 4 },
  { id: "plating", name: "Reactive Plate", desc: "Max hull +28% and repair 15%.", max: 4 },
  { id: "magnet", name: "Salvage Magnet", desc: "Pickup radius +40%.", max: 4 },
  { id: "fork", name: "Split Fire", desc: "Fire one extra projectile.", max: 3 },
  { id: "pierce", name: "Linear Pierce", desc: "Shots pass through +1 target.", max: 3 },
  { id: "explosive", name: "Core Detonate", desc: "Kills burst in a small blast.", max: 3 },
  { id: "repair", name: "Nano Repair", desc: "Regenerate hull over time.", max: 3 },
  { id: "crit", name: "Optic Lock", desc: "Critical chance +12%, crits deal 2.2x.", max: 4 },
  { id: "drone", name: "Wing Drone", desc: "An orbiting drone fires with you.", max: 2 },
  { id: "vampire", name: "Siphon Coil", desc: "Kills restore a sliver of hull.", max: 3 },
  { id: "range", name: "Long Lens", desc: "Weapon range +20%.", max: 3 },
  { id: "haste", name: "Coolant Loop", desc: "Skill cooldown −16%.", max: 3 },
  { id: "spread", name: "Wide Pattern", desc: "Projectile spread / melee arc +15%.", max: 3 },
  { id: "thermal", name: "Thermal Lock", desc: "Damage vs bosses +15%.", max: 3 },
  { id: "barrier", name: "Kinetic Barrier", desc: "Incoming damage −1.4, flat.", max: 4 },
  { id: "momentum", name: "Momentum Drive", desc: "Kills grant a burst of speed.", max: 3 },
  { id: "echo", name: "Echo Rounds", desc: "Kills have a chance to detonate nearby hulls.", max: 3 },
  { id: "static", name: "Static Field", desc: "A damaging aura pulses around you.", max: 3 },
  { id: "salvage", name: "Scrap Reclaimer", desc: "Credit drops from kills, better and more often.", max: 3 },
];

export const PERK_MAP: Record<PerkId, PerkDef> = Object.fromEntries(
  PERKS.map((p) => [p.id, p]),
) as Record<PerkId, PerkDef>;

const WEAPON_NAMES: Record<Rarity, string[]> = {
  common: ["Issue Rifle", "Field Blade", "Stock Scatter", "Wire Coil"],
  rare: ["Aegis Barrel", "Ion Glaive", "Pulse Rack", "Seeker Pod"],
  epic: ["Zero Lens", "Phantom Edge", "Siege Rotary", "Dragon Fang"],
  legendary: ["Buster Core", "Reaper Halo", "Judgment Rack", "Serpent Heart"],
};

const ARMOR_NAMES: Record<Rarity, string[]> = {
  common: ["Plate Vest", "Field Skirt", "Ablative Wrap"],
  rare: ["Reactive Mail", "Wing Binder", "Heat Sink Coat"],
  epic: ["Gundam Weave", "Phantom Cloak", "Bastion Shell"],
  legendary: ["Zero Frame", "Titan Hide", "Heir Plate"],
};

const SYSTEM_NAMES: Record<Rarity, string[]> = {
  common: ["Scout Optic", "Coolant Tap", "Mag Clamp"],
  rare: ["Target Uplink", "Nano Drip", "Boost Coil"],
  epic: ["Predictive Lock", "Phase Shift", "Overvolt Bus"],
  legendary: ["Oracle Suite", "Ghost Drive", "Core Overflow"],
};

const RARITY_WEIGHT = [
  { r: "common" as const, w: 54 },
  { r: "rare" as const, w: 28 },
  { r: "epic" as const, w: 13 },
  { r: "legendary" as const, w: 5 },
];

export function rollRarity(rng: () => number, floor?: Rarity): Rarity {
  const min =
    floor === "legendary" ? 3 : floor === "epic" ? 2 : floor === "rare" ? 1 : 0;
  const pool = RARITY_WEIGHT.filter((_, i) => i >= min);
  const total = pool.reduce((s, p) => s + p.w, 0);
  let t = rng() * total;
  for (const p of pool) {
    t -= p.w;
    if (t <= 0) return p.r;
  }
  return pool[pool.length - 1]!.r;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length]!;
}

let gearSeq = 1;

export function rollGear(rng: () => number, floor?: Rarity): GearItem {
  const rarity = rollRarity(rng, floor);
  const slot: GearSlot = pick(rng, ["weapon", "armor", "system"]);
  const names =
    slot === "weapon" ? WEAPON_NAMES : slot === "armor" ? ARMOR_NAMES : SYSTEM_NAMES;
  const name = pick(rng, names[rarity]);
  const power =
    rarity === "common" ? 1 : rarity === "rare" ? 1.7 : rarity === "epic" ? 2.6 : 4;
  const mods: GearItem["mods"] = {};
  const rolls = rarity === "legendary" ? 3 : rarity === "epic" ? 2 : 1;
  const keys: (keyof GearItem["mods"])[] =
    slot === "weapon"
      ? ["damage", "fireRate", "crit", "range"]
      : slot === "armor"
        ? ["hp", "speed", "magnet"]
        : ["skillHaste", "magnet", "crit", "fireRate"];
  for (let i = 0; i < rolls; i++) {
    const k = pick(rng, keys);
    const amt =
      k === "hp"
        ? Math.round(12 * power + rng() * 8 * power)
        : k === "damage"
          ? Math.round((0.1 * power + rng() * 0.08 * power) * 100) / 100
          : Math.round((0.08 * power + rng() * 0.07 * power) * 100) / 100;
    mods[k] = (mods[k] ?? 0) + amt;
  }
  return {
    id: `g${Date.now().toString(36)}${gearSeq++}`,
    name,
    slot,
    rarity,
    mods,
  };
}

export function xpForLevel(level: number): number {
  return Math.round(10 + level * 7 + level * level * 0.35);
}

export function formatMod(key: string, value: number): string {
  if (key === "hp") return `Hull +${value}`;
  if (key === "damage") return `Damage +${Math.round(value * 100)}%`;
  if (key === "fireRate") return `Fire rate +${Math.round(value * 100)}%`;
  if (key === "speed") return `Speed +${Math.round(value * 100)}%`;
  if (key === "magnet") return `Magnet +${Math.round(value * 100)}%`;
  if (key === "skillHaste") return `Skill haste +${Math.round(value * 100)}%`;
  if (key === "crit") return `Crit +${Math.round(value * 100)}%`;
  if (key === "range") return `Range +${Math.round(value * 100)}%`;
  return `${key} +${value}`;
}

export const CHESTS = [
  { id: "supply", name: "Supply Crate", keys: 1, floor: undefined as Rarity | undefined },
  { id: "command", name: "Command Cache", keys: 2, floor: "rare" as Rarity },
  { id: "ace", name: "Ace Vault", keys: 3, floor: "epic" as Rarity },
] as const;
