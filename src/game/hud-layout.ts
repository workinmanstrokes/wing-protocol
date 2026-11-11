/**
 * Screen-space safe zones for combat chrome. The canvas chevrons and the DOM
 * combo popup both use this so they stay off the hull readout, the timer,
 * the minimap, and the two-thumb sticks.
 */

export type Rect = { x: number; y: number; w: number; h: number };

export const MINIMAP = { size: 100, margin: 14, topOffset: 82 } as const;

export function minimapCenter(w: number): { cx: number; cy: number; r: number } {
  const { size, margin, topOffset } = MINIMAP;
  return { cx: w - size / 2 - margin, cy: size / 2 + margin + topOffset, r: size / 2 };
}

export function isLandscape(w: number, h: number): boolean {
  return w > h;
}

/**
 * Screen-space band reserved for the nameplate and the timer. Enemy centers
 * are held at or below this line so they are not drawn through the readout.
 */
export function readoutBand(w: number, h: number): number {
  return isLandscape(w, h) ? 96 : 120;
}

/** Hull name, bars, and the "Hull N · Lv · kills" line. */
export function hullReadoutRect(w: number, h: number): Rect {
  const landscape = isLandscape(w, h);
  return { x: 12, y: 8, w: Math.min(240, w * 0.52), h: landscape ? 76 : 84 };
}

/** Countdown block at the top right, left of the mute / pause buttons. */
export function timerRect(w: number, h: number): Rect {
  const landscape = isLandscape(w, h);
  const width = landscape ? 108 : 96;
  return { x: w - 12 - 112 - width, y: 8, w: width, h: landscape ? 78 : 72 };
}

/**
 * Combo callout. Anchored in the open gap under the top HUD, clear of the
 * hull line and the timer. Landscape shifts left so it misses the minimap.
 */
export function comboPopupRect(w: number, h: number): Rect {
  const landscape = isLandscape(w, h);
  const width = 124;
  const height = 30;
  const top = landscape ? 132 : 164;
  const cx = landscape ? w * 0.4 : w * 0.5;
  return { x: cx - width / 2, y: top, w: width, h: height };
}

/** Visible MOVE / AIM sticks plus the catch band they travel in. */
export function stickBandRect(w: number, h: number): Rect {
  const top = h * 0.54;
  return { x: 0, y: top, w, h: h - top };
}

/** Skill button, matching the touch-pad classes in game-app. */
export function skillButtonRect(w: number, h: number): Rect {
  const size = 64;
  if (isLandscape(w, h)) {
    const right = 192;
    const bottom = 104;
    return { x: w - right - size, y: h - bottom - size, w: size, h: size };
  }
  const right = 20;
  const bottom = h * 0.46 + 12;
  return { x: w - right - size, y: h - bottom - size, w: size, h: size };
}

export function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

export function pointInRect(x: number, y: number, r: Rect, pad = 0): boolean {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
}

/**
 * Frame threat marks are allowed to occupy. Excludes the top readout, the
 * timer, and the stick catch band.
 */
export function threatSafeRect(w: number, h: number): Rect {
  const landscape = isLandscape(w, h);
  const top = landscape ? 100 : 120;
  const stickTop = h * 0.54;
  const bottom = stickTop - (landscape ? 12 : 16);
  return {
    x: 16,
    y: top,
    w: Math.max(40, w - 32),
    h: Math.max(36, bottom - top),
  };
}

function clampToRect(x: number, y: number, r: Rect): { x: number; y: number } {
  return {
    x: Math.max(r.x, Math.min(r.x + r.w, x)),
    y: Math.max(r.y, Math.min(r.y + r.h, y)),
  };
}

/**
 * Move an edge-threat mark onto the safe frame. Off-screen and near-HUD
 * marks land on the frame edge, outside the minimap disc and the skill button.
 */
export function clampThreatMark(sx: number, sy: number, w: number, h: number): { x: number; y: number } {
  const safe = threatSafeRect(w, h);
  let p = clampToRect(sx, sy, safe);
  const mm = minimapCenter(w);
  const minR = mm.r + 18;
  if (Math.hypot(p.x - mm.cx, p.y - mm.cy) < minR) {
    const dy = Math.max(-minR, Math.min(minR, p.y - mm.cy));
    const room = Math.sqrt(Math.max(0, minR * minR - dy * dy));
    let nx = mm.cx - room;
    let ny = mm.cy + dy;
    if (nx < safe.x) {
      ny = Math.min(safe.y + safe.h, mm.cy + minR + 4);
      nx = Math.min(safe.x + safe.w, mm.cx - minR);
    }
    p = clampToRect(nx, ny, safe);
  }
  const skill = skillButtonRect(w, h);
  if (pointInRect(p.x, p.y, skill, 10)) {
    p = clampToRect(p.x, skill.y - 14, safe);
  }
  const sticks = stickBandRect(w, h);
  if (pointInRect(p.x, p.y, sticks, 0)) {
    p = clampToRect(p.x, sticks.y - 8, safe);
  }
  return p;
}
