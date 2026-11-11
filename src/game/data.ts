import type { GearItem, MechDef, MechId, PerkDef, PerkId, Rarity } from "./types";
import { makeItem, pickTemplate } from "./meta/gear.ts";

export { formatMod } from "./meta/gear.ts";

export const MISSION_SECONDS = 300;
export const WORLD = 3400;

export const MECHS: MechDef[] = [
  {
    id: "aether",
    name: "Aether Wing",
    role: "Interceptor",
    blurb: "Needle frame and twin spinal lances. Fragile, and exact at long range.",
    unlockCost: 0,
    color: "#e8eef2",
    accent: "#5ec8e8",
    stats: { hp: 124, speed: 248, fireRate: 5.4, damage: 16, range: 520 },
    weapon: "beam",
    skill: {
      name: "Needle Lance",
      cooldown: 8.5,
      desc: "Fires one thin beam down your aim line. It pierces the whole pack and does not splash.",
    },
    passive: {
      name: "Glass Optics",
      desc: "Weapon yield +12%. After 1.6s without a hit, hull repairs at 2.8% per second.",
    },
    handling: { accel: 13, brake: 3.2 },
  },
  {
    id: "forge",
    name: "Heavy Forge",
    role: "Artillery",
    blurb: "Slab hull, shoulder racks, and a rotary snout. Plants and saturates a lane.",
    unlockCost: 800,
    color: "#c4453a",
    accent: "#e8dcc8",
    stats: { hp: 150, speed: 176, fireRate: 11, damage: 7, range: 430 },
    weapon: "gatling",
    skill: {
      name: "Anchor Barrage",
      cooldown: 12,
      desc: "Roots you for 1.4s, braces the cab, and dumps six heavy shells in a forward fan.",
    },
    passive: {
      name: "Plated Cab",
      desc: "Incoming damage −12%.",
    },
    handling: { accel: 3.2, brake: 2.4 },
  },
  {
    id: "scythe",
    name: "Night Scythe",
    role: "Reaper",
    blurb: "Crescent hull and a single glaive. Lives in the melee and leaves on a kill.",
    unlockCost: 1200,
    color: "#1a1c22",
    accent: "#3aff7a",
    stats: { hp: 110, speed: 236, fireRate: 3.2, damage: 38, range: 150 },
    weapon: "melee",
    skill: {
      name: "Phase Step",
      cooldown: 6.5,
      desc: "Dashes along your aim. Invulnerable only during the step, and the cut is a thin trail.",
    },
    passive: {
      name: "Blood Tempo",
      desc: "A kill grants 0.55s of +28% move speed.",
    },
    handling: { accel: 22, brake: 18 },
  },
  {
    id: "dune",
    name: "Dune Shield",
    role: "Vanguard",
    blurb: "Forward disc shield with a scattergun through the boss. Holds a lane.",
    unlockCost: 1500,
    color: "#d8c4a0",
    accent: "#b06040",
    stats: { hp: 168, speed: 188, fireRate: 2.4, damage: 22, range: 260 },
    weapon: "shotgun",
    skill: {
      name: "Aegis Arc",
      cooldown: 13,
      desc: "For 3s, shots coming in from the front are deleted. Nearby hulls are shoved. Your back stays open.",
    },
    passive: {
      name: "Bulwark",
      desc: "The first hit every 7s is halved.",
    },
    handling: { accel: 6.5, brake: 11 },
  },
  {
    id: "serpent",
    name: "Jade Serpent",
    role: "Striker",
    blurb: "Segmented hull and twin fangs. Marks a target, then stays on it.",
    unlockCost: 2000,
    color: "#2d6b4a",
    accent: "#8ae0ff",
    stats: { hp: 118, speed: 220, fireRate: 4.2, damage: 14, range: 380 },
    weapon: "fang",
    skill: {
      name: "Fang Orbit",
      cooldown: 10,
      desc: "Three blades circle you for 4.2s and cut anything that steps in.",
    },
    passive: {
      name: "Venom",
      desc: "Hits leave a poison that ticks for 2s.",
    },
    handling: { accel: 9, brake: 6, weave: 34 },
  },
  {
    id: "storm",
    name: "Storm Warden",
    role: "Support",
    blurb: "Coil masts on a round core. Chains a shot, then pins a pack in place.",
    unlockCost: 2500,
    color: "#c8d8f0",
    accent: "#ff3a7a",
    stats: { hp: 132, speed: 214, fireRate: 3.8, damage: 11, range: 320 },
    weapon: "arc",
    skill: {
      name: "Static Net",
      cooldown: 8,
      desc: "Drops a wide field ahead. Hulls inside move at half speed for 4.4s. While that field is up you take 32% less damage, even after you step out of it.",
    },
    passive: {
      name: "Capacitor",
      desc: "Every 5th hit jumps to a nearby hull and restores 4 hull. A 22-point coil absorbs chip and refills after 1.6s untouched.",
    },
    handling: { accel: 10, brake: 7 },
  },
  {
    id: "vulture",
    name: "Iron Vulture",
    role: "Bomber",
    blurb: "A single flying wing with an open bay. Mortars the ground, then the crater.",
    unlockCost: 3200,
    color: "#5c5a48",
    accent: "#7ae070",
    stats: { hp: 132, speed: 182, fireRate: 1.6, damage: 30, range: 420 },
    weapon: "mortar",
    skill: {
      name: "Mine Fan",
      cooldown: 12,
      desc: "Lays three mines along your aim. They arm, then burst when a hull steps on them.",
    },
    passive: {
      name: "Crater",
      desc: "Your large blasts leave a short scorch on the ground.",
    },
    handling: { accel: 5, brake: 4 },
  },
  {
    id: "cross",
    name: "Solar Cross",
    role: "Paladin",
    blurb: "Cruciform armor and a long lance. Holds ground and mends if you make space.",
    unlockCost: 4000,
    color: "#f0ece0",
    accent: "#5ae0ff",
    stats: { hp: 128, speed: 200, fireRate: 2.8, damage: 24, range: 260 },
    weapon: "lance",
    skill: {
      name: "Sanctum",
      cooldown: 14,
      desc: "A 3.2s personal ward: damage taken −28%, and 12% hull restored over that time. No knockback.",
    },
    passive: {
      name: "Field Mend",
      desc: "Below half hull, you repair slowly once you have not been hit for 2s.",
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
    blurb: "Four separate wing panels and a lantern core. Herds a pack, then steps out of it.",
    unlockCost: 0,
    color: "#e8dcc0",
    accent: "#ffb347",
    stats: { hp: 104, speed: 222, fireRate: 2.6, damage: 13, range: 400 },
    weapon: "mote",
    skill: {
      name: "Lure Lamp",
      cooldown: 11,
      desc: "Hangs a lamp ahead. Non-boss hulls are pulled in for 2.6s, then it bursts in a small radius.",
    },
    passive: {
      name: "Dust Wake",
      desc: "Hulls in the wake behind you move slower.",
    },
    handling: { accel: 8, brake: 5, weave: 18 },
  },
  {
    id: "kiln",
    name: "Kiln Tortoise",
    role: "Juggernaut",
    premium: true,
    pilot: { callsign: "Cinder", bio: "Ex-foundry crane operator. Never retreats, only roasts." },
    blurb: "Low furnace dome on four stub legs. Walks into the pack and cooks it.",
    unlockCost: 0,
    color: "#7a4a2e",
    accent: "#ff7a2a",
    stats: { hp: 196, speed: 162, fireRate: 3.2, damage: 9, range: 230 },
    weapon: "ember",
    skill: {
      name: "Kiln Seal",
      cooldown: 13,
      desc: "2.1s invulnerable and a close scorch. You move at 62% speed while sealed.",
    },
    passive: {
      name: "Thorns",
      desc: "A slice of the damage you take splashes to nearby hulls.",
    },
    handling: { accel: 4, brake: 6 },
  },
  {
    id: "kite",
    name: "Tether Kite",
    role: "Skirmisher",
    premium: true,
    pilot: { callsign: "Vesper", bio: "Courier racer who flies the storm lanes on a string." },
    blurb: "Diamond sail, cross spars, and a long ribbon. Fastest when it is already moving.",
    unlockCost: 0,
    color: "#3a6ea8",
    accent: "#ff5a8a",
    stats: { hp: 136, speed: 262, fireRate: 2.2, damage: 18, range: 340 },
    weapon: "tether",
    skill: {
      name: "Ribbon Line",
      cooldown: 8,
      desc: "Dashes along your aim and leaves a damaging ribbon between the start and the end for 2.2s.",
    },
    passive: {
      name: "Slipstream",
      desc: "While moving, fire interval −14% and incoming damage −36%. The first hit each few seconds is cut by 12 more. Stop, and both drop.",
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
