/**
 * Tower roguelike: climb floors, pick one of three rooms between floors, stack
 * buffs, difficulty climbs every floor and every 5th floor is a boss. Pure.
 */
import type { GearMods } from "../types";
import { BASE_CONFIG, addMods, type BossKind, type RunConfig } from "./modes.ts";

export type RoomKind = "fight" | "elite" | "repair" | "cache" | "boss";

export interface Room {
  kind: RoomKind;
  name: string;
  desc: string;
}

export const ROOMS: Record<RoomKind, Room> = {
  fight: { kind: "fight", name: "Patrol Deck", desc: "Standard floor. +50% credits." },
  elite: { kind: "elite", name: "Elite Hangar", desc: "Tougher hostiles. Win a rare buff." },
  repair: { kind: "repair", name: "Repair Bay", desc: "Restore 40% hull. Easier floor." },
  cache: { kind: "cache", name: "Supply Cache", desc: "Random buff, normal floor." },
  boss: { kind: "boss", name: "Guardian Floor", desc: "A boss holds this floor." },
};

export interface TowerBuff {
  id: string;
  name: string;
  desc: string;
  mods: GearMods;
  rare?: boolean;
}

export const TOWER_BUFFS: TowerBuff[] = [
  { id: "edge", name: "Honed Edge", desc: "Damage +12%", mods: { damage: 0.12 } },
  { id: "cycle", name: "Fast Cycle", desc: "Fire rate +12%", mods: { fireRate: 0.12 } },
  { id: "plate", name: "Spare Plate", desc: "Hull +20", mods: { hp: 20 } },
  { id: "jets", name: "Tuned Jets", desc: "Speed +8%", mods: { speed: 0.08 } },
  { id: "pull", name: "Wide Pull", desc: "Magnet +25%", mods: { magnet: 0.25 } },
  { id: "eye", name: "Keen Eye", desc: "Crit +6%", mods: { crit: 0.06 } },
  { id: "overdrive", name: "Overdrive Core", desc: "Damage +20%, fire rate +10%", mods: { damage: 0.2, fireRate: 0.1 }, rare: true },
  { id: "aegis", name: "Aegis Lattice", desc: "Hull +45", mods: { hp: 45 }, rare: true },
  { id: "flux", name: "Flux Coolant", desc: "Skill haste +20%", mods: { skillHaste: 0.2 }, rare: true },
];

export const BOSS_EVERY = 5;
const BOSS_CYCLE: BossKind[] = ["titan", "ace", "warden"];

export function isBossFloor(floor: number): boolean {
  return floor % BOSS_EVERY === 0;
}

/** Three distinct room choices for the next floor (boss floors offer only the boss). */
export function roomChoices(floor: number, rng: () => number): Room[] {
  if (isBossFloor(floor)) return [ROOMS.boss];
  const pool: RoomKind[] = ["fight", "elite", "repair", "cache"];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, 3).map((k) => ROOMS[k]);
}

export function rollBuff(rng: () => number, rare: boolean): TowerBuff {
  const pool = TOWER_BUFFS.filter((b) => !!b.rare === rare);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
}

/** Enemy toughness multiplier for a floor: +12% per floor. */
export function floorScale(floor: number): number {
  return 1 + 0.12 * (floor - 1);
}

export function buffMods(buffs: readonly TowerBuff[]): GearMods {
  return buffs.reduce<GearMods>((acc, b) => addMods(acc, b.mods), {});
}

export function towerFloorConfig(floor: number, room: RoomKind, buffs: readonly TowerBuff[], hpFrac: number): RunConfig {
  const scale = floorScale(floor);
  const boss = room === "boss";
  const tough = room === "elite" ? 1.35 : room === "repair" ? 0.85 : 1;
  return {
    ...BASE_CONFIG,
    mode: "tower",
    label: `Tower · Floor ${floor}`,
    duration: boss ? 150 : 45,
    sector: Math.floor((floor - 1) / BOSS_EVERY) % 3,
    scripted: false,
    enemyHp: scale * tough,
    enemyDmg: Math.sqrt(scale) * (room === "elite" ? 1.15 : 1),
    spawnRate: 1 + Math.min(1, floor * 0.05),
    intensity0: Math.min(0.75, 0.1 + floor * 0.04),
    bosses: boss ? [BOSS_CYCLE[(floor / BOSS_EVERY - 1) % 3]!] : [],
    bossDelay: 3,
    bossHp: boss ? 0.7 + floor * 0.06 : 1,
    endWhenBossesDown: boss,
    playerMods: buffMods(buffs),
    startHpFrac: Math.min(1, room === "repair" ? hpFrac + 0.4 : hpFrac),
    rewardMult: room === "fight" ? 0.75 : 0.5,
  };
}

/** Credits for clearing a floor (paid at the end of the climb). */
export function floorCredits(floor: number): number {
  return 40 + 10 * floor;
}

/** Cores for reaching a new milestone floor (every 5th floor, first time only). */
export const TOWER_MILESTONE_CORES = 10;
export function towerMilestoneCores(floorReached: number, prevPaidFloor: number): { cores: number; paidFloor: number } {
  let cores = 0;
  let paid = prevPaidFloor;
  for (let f = prevPaidFloor + 1; f <= floorReached; f++) {
    if (isBossFloor(f)) {
      cores += TOWER_MILESTONE_CORES;
      paid = f;
    }
  }
  return { cores, paidFloor: Math.max(paid, prevPaidFloor) };
}
