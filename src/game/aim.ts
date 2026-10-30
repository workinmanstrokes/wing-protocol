/**
 * Aim assist. Aiming is player-driven (mouse, right thumb stick, gamepad);
 * "light" only nudges a shot toward an enemy already inside a small cone
 * in front of where the player is aiming. It never picks targets on its own.
 */

export type AimAssistPref = "off" | "light";

const AKEY = "wing-protocol-aim-assist";

/** Cone half-angle (radians) and range (world px) for light assist. */
export const ASSIST_CONE = (10 * Math.PI) / 180;
export const ASSIST_RANGE = 520;
/** Fraction of the angle gap closed toward the target (never a full snap). */
export const ASSIST_PULL = 0.45;

export function defaultAimAssist(): AimAssistPref {
  try {
    if (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches) return "light";
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
    if (v === "off" || v === "light") return (cached = v);
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
  return found ? aim + best * ASSIST_PULL : aim;
}
