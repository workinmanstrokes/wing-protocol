import type { GearItem, MechDef, MechId, PerkDef, PerkId, Rarity } from "./types";
import { makeItem, pickTemplate } from "./meta/gear";

export { formatMod } from "./meta/gear";

export const MISSION_SECONDS = 300;
export const WORLD = 3400;

export const MECHS: MechDef[] = [
  {
    id: "aether",
    name: "Aether Skiff",
    role: "Interceptor",
    blurb: "Canopy skiff with a long beam rifle and a cone sweep. Fragile, lethal at range.",
    unlockCost: 0,
    color: "#e8eef2",
    accent: "#5ec8e8",
    stats: { hp: 92, speed: 248, fireRate: 5.4, damage: 16, range: 520 },
    weapon: "beam",
    skill: {
      name: "Prism Sweep",
      cooldown: 9,
      desc: "A wide dual-beam sweep that shreds everything in a cone.",
    },
    handling: { accel: 13, brake: 3.2 },
  },
  {
    id: "forge",
    name: "Forge Rampart",
    role: "Artillery",
    blurb: "Rotary cannon fed by twin ammo drums, plus cluster missiles. Slow, armored, saturates the field.",
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
    name: "Night Reaver",
    role: "Reaper",
    blurb: "Beetle-shelled reaper with a beam glaive and a phantom dash. High burst, lives in the melee.",
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
    name: "Jade Hammerhead",
    role: "Striker",
    blurb: "Forked emitter and coiling orbs. Flexible mid-range predator.",
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
  // ---- Prism Vault mechs (original designs, premium currency earned in play) ----
  {
    id: "moth",
    name: "Lantern Moth",
    role: "Controller",
    premium: true,
    pilot: { callsign: "Lumen", bio: "Night-shift salvage diver who herds hostiles with light." },
    blurb: "Broad dust-wings and a glowing lantern core. Drifting light motes seek targets.",
    unlockCost: 0,
    color: "#e8dcc0",
    accent: "#ffb347",
    stats: { hp: 104, speed: 222, fireRate: 2.6, damage: 13, range: 400 },
    weapon: "mote",
    skill: {
      name: "Lure Lamp",
      cooldown: 10,
      desc: "Hangs a lamp ahead that drags nearby hostiles in for 3s, then bursts.",
    },
    handling: { accel: 8, brake: 5, weave: 18 },
  },
  {
    id: "kiln",
    name: "Kiln Tortoise",
    role: "Juggernaut",
    premium: true,
    pilot: { callsign: "Cinder", bio: "Ex-foundry crane operator. Never retreats, only roasts." },
    blurb: "Domed furnace shell on four stub legs. Sprays embers at close range.",
    unlockCost: 0,
    color: "#7a4a2e",
    accent: "#ff7a2a",
    stats: { hp: 196, speed: 162, fireRate: 3.2, damage: 9, range: 230 },
    weapon: "ember",
    skill: {
      name: "Molten Shell",
      cooldown: 12,
      desc: "Seals the shell: 3.5s invulnerable while scorching everything close.",
    },
    handling: { accel: 4, brake: 6 },
  },
  {
    id: "kite",
    name: "Tether Kite",
    role: "Skirmisher",
    premium: true,
    pilot: { callsign: "Vesper", bio: "Courier racer who flies the storm lanes on a string." },
    blurb: "Diamond kite frame with ribbon tail. Throws tethered blades that fly back.",
    unlockCost: 0,
    color: "#3a6ea8",
    accent: "#ff5a8a",
    stats: { hp: 96, speed: 262, fireRate: 2.2, damage: 18, range: 340 },
    weapon: "tether",
    skill: {
      name: "Afterimage",
      cooldown: 9,
      desc: "Leaves three decoy images that keep firing for 4s.",
    },
    handling: { accel: 16, brake: 10 },
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

/** In-run loot: a catalog part of the rolled rarity (see meta/gear.ts). */
export function rollGear(rng: () => number, floor?: Rarity): GearItem {
  return makeItem(pickTemplate(rollRarity(rng, floor), rng));
}

export function xpForLevel(level: number): number {
  return Math.round(10 + level * 7 + level * level * 0.35);
}
