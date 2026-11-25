/**
 * Aim assist. Three settings:
 * - "auto" (phone default): when you are not aiming yourself, the guns lock
 *   onto the nearest threat (bosses and elites first) so one thumb can play.
 *   Drag the aim stick and you take over; let go and auto picks up again.
 *   While you steer with the stick, a thumb-sized assist cone (THUMB_ASSIST)
 *   settles the guns onto the enemy you are already pointing at.
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

/**
 * Thumb assist: used when aim assist is "auto" (the phone default) and you are
 * steering the guns yourself with the aim stick. A thumb on a small stick is
 * only accurate to roughly ten degrees, so the guns settle onto an enemy that
 * sits inside a wider cone. Full pull in the inner half of the cone, fading to
 * zero at the edge, so it never snaps as an enemy drifts in or out, and it
 * never picks a target you are not already pointing at.
 */
export type AssistShape = { cone: number; pull: number; inner: number };
export const LIGHT_ASSIST: AssistShape = { cone: ASSIST_CONE, pull: ASSIST_PULL, inner: 0 };
export const THUMB_ASSIST: AssistShape = { cone: (14 * Math.PI) / 180, pull: 0.85, inner: 0.5 };

/**
 * Fraction of `diff` that assist closes. Light: fades linearly from the centre
 * to 0 at the cone edge. Thumb: full `pull` inside `inner` of the cone, then
 * fades linearly to 0 at the edge.
 */
export function assistPull(diff: number, shape: AssistShape = LIGHT_ASSIST): number {
  const a = Math.abs(diff);
  if (a >= shape.cone) return 0;
  const start = shape.cone * shape.inner;
  if (a <= start) return shape.pull;
  return shape.pull * (1 - (a - start) / (shape.cone - start));
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
export function applyAimAssist(
  aim: number,
  px: number,
  py: number,
  targets: Iterable<Target>,
  shape: AssistShape = LIGHT_ASSIST,
): number {
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
    if (Math.abs(diff) > shape.cone) continue;
    // prefer what is closest to the crosshair line, then nearer
    const score = Math.abs(diff) + Math.sqrt(d2) / ASSIST_RANGE * 0.05;
    if (score < bestScore) {
      bestScore = score;
      best = diff;
      found = true;
    }
  }
  return found ? aim + best * assistPull(best, shape) : aim;
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
