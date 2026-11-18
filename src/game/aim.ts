/**
 * Aim assist. Three settings:
 * - "auto" (phone default): when you are not aiming yourself, the guns lock
 *   onto the nearest threat (bosses and elites first) so one thumb can play.
 *   Drag the aim stick and you take over; let go and auto picks up again.
 * - "light": you aim; shots get a small nudge toward an enemy already inside
 *   a narrow cone around the crosshair. Never picks targets on its own.
 * - "off": pure manual aim.
 */

export type AimAssistPref = "off" | "light" | "auto";

export const AIM_ASSIST_PREFS: readonly AimAssistPref[] = ["off", "light", "auto"];

const AKEY = "wing-protocol-aim-assist";

/** Cone half-angle (radians) and range (world px) for light assist. */
export const ASSIST_CONE = (6 * Math.PI) / 180;
export const ASSIST_RANGE = 520;
/**
 * Peak fraction of the angle gap closed toward the target. The pull fades to
 * zero at the cone edge, so the correction is continuous (no snap when an enemy
 * crosses into the cone) and never more than ~1 degree.
 */
export const ASSIST_PULL = 0.6;

/** Fraction of `diff` that light assist closes (fades linearly to 0 at the cone edge). */
export function assistPull(diff: number): number {
  const a = Math.abs(diff);
  if (a >= ASSIST_CONE) return 0;
  return ASSIST_PULL * (1 - a / ASSIST_CONE);
}

/**
 * Aim-stick smoothing: filters thumb tremor on small changes but follows big
 * flicks almost instantly (rate rises with the size of the change), so it
 * never feels laggy. Frame-rate independent.
 */
export function smoothAim(current: number, target: number, dt: number): number {
  const d = angleDiff(current, target);
  const rate = 30 + 900 * Math.abs(d);
  return current + d * (1 - Math.exp(-rate * dt));
}

export function defaultAimAssist(): AimAssistPref {
  try {
    if (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches) return "auto";
  } catch {
    /* no matchMedia */
  }
  return "off";
}

let cached: AimAssistPref | null = null;

export function getAimAssistPref(): AimAssistPref {
  if (cached) return cached;
  try {
    const v = localStorage.getItem(AKEY);
    if (v === "off" || v === "light" || v === "auto") return (cached = v);
  } catch {
    /* storage blocked */
  }
  return (cached = defaultAimAssist());
}

export function setAimAssistPref(v: AimAssistPref) {
  cached = v;
  try {
    localStorage.setItem(AKEY, v);
  } catch {
    /* storage blocked */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("wp-aim-assist", { detail: v }));
}

export function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

type Target = { x: number; y: number; alive: boolean };

/**
 * Returns `aim` nudged toward the enemy closest to the aim line, if one sits
 * within ASSIST_CONE and ASSIST_RANGE; otherwise `aim` unchanged.
 */
export function applyAimAssist(aim: number, px: number, py: number, targets: Iterable<Target>): number {
  let best = 0;
  let bestScore = Infinity;
  let found = false;
  const r2 = ASSIST_RANGE * ASSIST_RANGE;
  for (const t of targets) {
    if (!t.alive) continue;
    const dx = t.x - px;
    const dy = t.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2 || d2 < 1) continue;
    const diff = angleDiff(aim, Math.atan2(dy, dx));
    if (Math.abs(diff) > ASSIST_CONE) continue;
    // prefer what is closest to the crosshair line, then nearer
    const score = Math.abs(diff) + Math.sqrt(d2) / ASSIST_RANGE * 0.05;
    if (score < bestScore) {
      bestScore = score;
      best = diff;
      found = true;
    }
  }
  return found ? aim + best * assistPull(best) : aim;
}

type AutoTarget = Target & { boss?: boolean; elite?: string };

/** How hard auto aim turns the guns toward its target (per second, exponential). */
export const AUTO_TURN_RATE = 22;

/**
 * Auto aim target: the nearest threat within `range`, with bosses and elites
 * counted as a bit closer than they are. Sticks with `current` while it stays
 * alive and in range unless another target is clearly closer, so the guns do
 * not jitter between two enemies at similar distance.
 */
export function pickAutoTarget<T extends AutoTarget>(
  px: number,
  py: number,
  targets: Iterable<T>,
  range: number,
  current: T | null,
): T | null {
  const score = (t: T) => {
    const d = Math.hypot(t.x - px, t.y - py);
    if (d > range) return Infinity;
    return d / range - (t.boss ? 0.25 : t.elite ? 0.12 : 0);
  };
  let best: T | null = null;
  let bestScore = Infinity;
  for (const t of targets) {
    if (!t.alive) continue;
    const sc = score(t);
    if (sc < bestScore) {
      bestScore = sc;
      best = t;
    }
  }
  if (current && current.alive) {
    const cs = score(current);
    if (cs < Infinity && cs <= bestScore + 0.15) return current;
  }
  return best;
}
