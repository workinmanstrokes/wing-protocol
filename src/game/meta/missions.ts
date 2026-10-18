/**
 * Daily and weekly missions. Deterministic per day / week (seeded by the date
 * key) so every player sees the same board, and pure for unit tests.
 */
import type { Mission, MissionKind, MissionState, Reward } from "../types";

interface MissionTpl {
  kind: MissionKind;
  target: number;
  label: (n: number) => string;
  reward: Reward;
}

const DAILY: MissionTpl[] = [
  { kind: "kills", target: 400, label: (n) => `Destroy ${n} hostiles`, reward: { credits: 250, cores: 5 } },
  { kind: "bosses", target: 2, label: (n) => `Defeat ${n} bosses`, reward: { credits: 200, cores: 6 } },
  { kind: "sortie_wins", target: 1, label: () => "Extract from a full sortie", reward: { credits: 300, cores: 5 } },
  { kind: "tower_floor", target: 5, label: (n) => `Reach tower floor ${n}`, reward: { credits: 200, cores: 6 } },
  { kind: "crates", target: 2, label: (n) => `Open ${n} crates`, reward: { shards: 20, cores: 4 } },
  { kind: "upgrades", target: 2, label: (n) => `Upgrade gear ${n} times`, reward: { credits: 200, cores: 4 } },
  { kind: "elite_wins", target: 1, label: () => "Win an elite boss fight", reward: { credits: 250, cores: 6 } },
  { kind: "uplinks", target: 2, label: (n) => `Hold ${n} uplinks`, reward: { credits: 200, cores: 5 } },
  { kind: "runs", target: 3, label: (n) => `Play ${n} runs in any mode`, reward: { credits: 150, cores: 4 } },
];

const WEEKLY: MissionTpl[] = [
  { kind: "kills", target: 5000, label: (n) => `Destroy ${n} hostiles`, reward: { credits: 1500, cores: 35 } },
  { kind: "bosses", target: 15, label: (n) => `Defeat ${n} bosses`, reward: { credits: 1200, cores: 35 } },
  { kind: "sortie_wins", target: 5, label: (n) => `Extract from ${n} sorties`, reward: { credits: 1500, cores: 30 } },
  { kind: "tower_floor", target: 15, label: (n) => `Reach tower floor ${n}`, reward: { credits: 1200, cores: 40 } },
  { kind: "elite_wins", target: 5, label: (n) => `Win ${n} elite boss fights`, reward: { credits: 1200, cores: 40 } },
  { kind: "upgrades", target: 10, label: (n) => `Upgrade gear ${n} times`, reward: { shards: 120, cores: 30 } },
];

export const DAILY_COUNT = 3;
export const WEEKLY_COUNT = 3;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local-time day key, e.g. "2026-10-18". */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Week key = local date of that week's Monday. */
export function weekKey(d: Date): string {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (m.getDay() + 6) % 7; // Monday = 0
  m.setDate(m.getDate() - dow);
  return dayKey(m);
}

function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  let s = h >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function board(key: string, pool: MissionTpl[], n: number, prefix: string): Mission[] {
  const rng = seeded(`${prefix}:${key}`);
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  return idx.slice(0, n).map((i) => {
    const t = pool[i]!;
    return {
      id: `${prefix}-${key}-${t.kind}`,
      kind: t.kind,
      label: t.label(t.target),
      target: t.target,
      progress: 0,
      claimed: false,
      reward: { ...t.reward },
    };
  });
}

export function newMissionState(now: Date): MissionState {
  const dk = dayKey(now);
  const wk = weekKey(now);
  return { dayKey: dk, weekKey: wk, daily: board(dk, DAILY, DAILY_COUNT, "d"), weekly: board(wk, WEEKLY, WEEKLY_COUNT, "w") };
}

/** Roll over the daily and/or weekly board when the day or week changed. */
export function refreshMissions(state: MissionState | undefined, now: Date): MissionState {
  const fresh = newMissionState(now);
  if (!state) return fresh;
  return {
    dayKey: fresh.dayKey,
    weekKey: fresh.weekKey,
    daily: state.dayKey === fresh.dayKey ? state.daily : fresh.daily,
    weekly: state.weekKey === fresh.weekKey ? state.weekly : fresh.weekly,
  };
}

export type MissionEvent = { kind: MissionKind; amount: number };

/** Apply progress. `tower_floor` tracks the best floor reached; everything else accumulates. */
export function applyMissionEvents(state: MissionState, events: readonly MissionEvent[]): MissionState {
  const bump = (m: Mission): Mission => {
    if (m.claimed) return m;
    let p = m.progress;
    for (const e of events) {
      if (e.kind !== m.kind || e.amount <= 0) continue;
      p = m.kind === "tower_floor" ? Math.max(p, e.amount) : p + e.amount;
    }
    return p === m.progress ? m : { ...m, progress: Math.min(m.target, p) };
  };
  return { ...state, daily: state.daily.map(bump), weekly: state.weekly.map(bump) };
}

export function isComplete(m: Mission): boolean {
  return m.progress >= m.target;
}

export function claimMission(state: MissionState, id: string): { state: MissionState; reward: Reward | null } {
  let reward: Reward | null = null;
  const claim = (m: Mission): Mission => {
    if (m.id !== id || m.claimed || !isComplete(m)) return m;
    reward = m.reward;
    return { ...m, claimed: true };
  };
  const next = { ...state, daily: state.daily.map(claim), weekly: state.weekly.map(claim) };
  return { state: reward ? next : state, reward };
}
