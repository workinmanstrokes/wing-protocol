/**
 * Wingmen and squad commands: the game's one differentiator (build sheet,
 * BUILD-PLAN.md fix #3). Two escort frames fly with the player and obey one
 * of three orders, switched with one tap (or 1 / 2 / 3, or X / Y / B on a pad):
 *
 * - Focus Fire: tight V behind the guns; both wingmen hammer the same target,
 *   the toughest enemy near the crosshair (bosses and elites first).
 * - Spread: wingmen swing out wide and each clears its own nearest enemy.
 * - Regroup: wingmen tuck in close, shoot down enemy bullets that reach them
 *   and cut the damage the player takes.
 *
 * Pure helpers only (no canvas, no DOM) so the rules are unit-tested.
 */
import { angleDiff } from "./aim.ts";

export type SquadOrder = "focus" | "spread" | "regroup";

export const SQUAD_ORDERS: readonly {
  id: SquadOrder;
  name: string;
  key: string;
  pad: string;
  desc: string;
}[] = [
  {
    id: "focus",
    name: "Focus",
    key: "1",
    pad: "X",
    desc: "Both wingmen hit the toughest enemy near your crosshair.",
  },
  {
    id: "spread",
    name: "Spread",
    key: "2",
    pad: "Y",
    desc: "Wingmen swing wide and each clears its own targets.",
  },
  {
    id: "regroup",
    name: "Regroup",
    key: "3",
    pad: "B",
    desc: "Wingmen tuck in, shoot down bullets and soak damage.",
  },
];

export const WINGMEN = 2;

/**
 * Tuning per order. `share` is each wingman's damage per second as a fraction
 * of the player's own (damage x fire rate), so wingmen scale with gear and perks
 * without ever out-shooting the player.
 */
export const SQUAD = {
  focus: { share: 0.17, interval: 0.26, range: 620 },
  spread: { share: 0.14, interval: 0.32, range: 460 },
  regroup: { share: 0.08, interval: 0.5, range: 520 },
  /** Regroup: incoming damage multiplier and bullet-intercept radius per wingman. */
  guardMul: 0.78,
  interceptR: 30,
  /** Seconds the HUD keeps pulsing the buttons if no order has been given. */
  hintFor: 30,
  shotSpeed: 660,
} as const;

/** Damage of one wingman shot under `order`, given the player's damage per second. */
export function wingmanShotDamage(order: SquadOrder, playerDps: number): number {
  const o = SQUAD[order];
  return Math.max(1, playerDps * o.share * o.interval);
}

/** World position wingman `i` of `n` is flying toward. `aim` is the player's gun angle. */
export function slotFor(
  order: SquadOrder,
  i: number,
  n: number,
  px: number,
  py: number,
  aim: number,
  time: number,
): { x: number; y: number } {
  const side = i % 2 === 0 ? -1 : 1;
  const rank = Math.floor(i / 2) + 1;
  const fx = Math.cos(aim);
  const fy = Math.sin(aim);
  // perpendicular (to the player's right of the aim line)
  const rx = -fy;
  const ry = fx;
  if (order === "spread") {
    const a = time * 1.15 + (i * Math.PI * 2) / Math.max(1, n);
    const r = 128 + 10 * Math.sin(time * 2.1 + i);
    return { x: px + Math.cos(a) * r, y: py + Math.sin(a) * r };
  }
  const lat = order === "focus" ? 50 * rank : 32 * rank;
  const back = order === "focus" ? 22 * rank : 8 * rank;
  return { x: px + rx * lat * side - fx * back, y: py + ry * lat * side - fy * back };
}

type Target = { alive: boolean; x: number; y: number; boss?: boolean; elite?: string };

/**
 * Focus target: the enemy that best fits "what the player is shooting at",
 * weighted toward bosses and elites. Keeps the current target while it is
 * still alive and in range unless something clearly better turns up, so the
 * pair does not flicker between two enemies.
 */
export function pickFocusTarget<T extends Target>(
  px: number,
  py: number,
  aim: number,
  targets: Iterable<T>,
  current: T | null,
  range: number = SQUAD.focus.range,
): T | null {
  const score = (t: T) => {
    const dx = t.x - px;
    const dy = t.y - py;
    const d = Math.hypot(dx, dy);
    if (d > range || d < 1) return Infinity;
    const off = Math.abs(angleDiff(aim, Math.atan2(dy, dx)));
    return off + (d / range) * 0.7 - (t.boss ? 0.9 : t.elite ? 0.45 : 0);
  };
  let best: T | null = null;
  let bestScore = Infinity;
  for (const t of targets) {
    if (!t.alive) continue;
    const s = score(t);
    if (s < bestScore) {
      bestScore = s;
      best = t;
    }
  }
  if (current && current.alive) {
    const cs = score(current);
    if (cs < Infinity && cs <= bestScore + 0.35) return current;
  }
  return best;
}

/** Nearest live target to (x, y) within `range`, or null. */
export function nearestTarget<T extends Target>(
  x: number,
  y: number,
  targets: Iterable<T>,
  range: number,
): T | null {
  let best: T | null = null;
  let bd = range * range;
  for (const t of targets) {
    if (!t.alive) continue;
    const dx = t.x - x;
    const dy = t.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bd) {
      bd = d2;
      best = t;
    }
  }
  return best;
}

/** Map a key code / gamepad button index to an order, or null. */
export function orderForKey(code: string): SquadOrder | null {
  if (code === "Digit1" || code === "Numpad1") return "focus";
  if (code === "Digit2" || code === "Numpad2") return "spread";
  if (code === "Digit3" || code === "Numpad3") return "regroup";
  return null;
}

export function orderForPadButton(index: number): SquadOrder | null {
  if (index === 2) return "focus";
  if (index === 3) return "spread";
  if (index === 1) return "regroup";
  return null;
}
