/**
 * Rendering helpers for the Canvas2D renderer: quality tiers, an FPS governor,
 * cached sprites (no per-frame gradients), procedural floor textures and a
 * cheap downsampled bloom layer that works on every browser (no ctx.filter).
 */

export type QualityPref = "auto" | "high" | "low";
export type Quality = "high" | "low";

const QKEY = "wing-protocol-quality";

export function getQualityPref(): QualityPref {
  try {
    const v = localStorage.getItem(QKEY);
    if (v === "high" || v === "low" || v === "auto") return v;
  } catch {
    /* storage blocked */
  }
  return "auto";
}

export function setQualityPref(v: QualityPref) {
  try {
    localStorage.setItem(QKEY, v);
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new CustomEvent("wp-quality", { detail: v }));
}

export interface QualityProfile {
  dprCap: number;
  bloom: boolean;
  shadows: boolean;
  smoke: boolean;
  trails: boolean;
  grade: boolean;
  maxFx: number;
  sparkMul: number;
}

export const PROFILES: Record<Quality, QualityProfile> = {
  high: { dprCap: 2, bloom: true, shadows: true, smoke: true, trails: true, grade: true, maxFx: 900, sparkMul: 1 },
  low: { dprCap: 1, bloom: false, shadows: false, smoke: false, trails: false, grade: false, maxFx: 260, sparkMul: 0.45 },
};

/** Rolling FPS monitor. With pref "auto", drops HIGH -> LOW after ~2.5s below 45 fps. */
export class FpsGovernor {
  fps = 60;
  private frames = 0;
  private acc = 0;
  private lowWindows = 0;
  private grace = 2.5;
  constructor(private onDrop: () => void) {}
  tick(dt: number, quality: Quality, pref: QualityPref) {
    this.grace -= dt;
    this.frames += 1;
    this.acc += dt;
    if (this.acc < 0.5) return;
    this.fps = this.frames / this.acc;
    this.frames = 0;
    this.acc = 0;
    if (this.grace > 0 || pref !== "auto" || quality === "low") {
      this.lowWindows = 0;
      return;
    }
    this.lowWindows = this.fps < 45 ? this.lowWindows + 1 : 0;
    if (this.lowWindows >= 5) {
      this.lowWindows = 0;
      this.onDrop();
    }
  }
  resetGrace(s = 2.5) {
    this.grace = s;
    this.lowWindows = 0;
  }
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export type Sprite = { c: HTMLCanvasElement; half: number; scale: number };

const spriteCache = new Map<string, Sprite>();

/** Rasterises a vector draw call once (centered, `size` css px box) and reuses it. */
export function cachedSprite(key: string, size: number, draw: (ctx: CanvasRenderingContext2D) => void, scale = 2): Sprite {
  let s = spriteCache.get(key);
  if (s) return s;
  const c = makeCanvas(size * scale, size * scale);
  const ctx = c.getContext("2d")!;
  ctx.translate((size * scale) / 2, (size * scale) / 2);
  ctx.scale(scale, scale);
  draw(ctx);
  s = { c, half: size / 2, scale };
  spriteCache.set(key, s);
  return s;
}

export function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, rot = 0, k = 1) {
  if (rot === 0 && k === 1) {
    ctx.drawImage(s.c, x - s.half, y - s.half, s.half * 2, s.half * 2);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (k !== 1) ctx.scale(k, k);
  ctx.drawImage(s.c, -s.half, -s.half, s.half * 2, s.half * 2);
  ctx.restore();
}

/** Soft radial glow: white-hot core fading through `color`. Size is the diameter. */
export function glowSprite(color: string, hot = true): Sprite {
  return cachedSprite(`glow:${color}:${hot}`, 64, (ctx) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
    if (hot) g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(hot ? 0.18 : 0, color);
    g.addColorStop(0.45, withAlpha(color, 0.35));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-32, -32, 64, 64);
  }, 1);
}

export function softSprite(color: string): Sprite {
  return cachedSprite(`soft:${color}`, 64, (ctx) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
    g.addColorStop(0, withAlpha(color, 0.55));
    g.addColorStop(0.6, withAlpha(color, 0.18));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-32, -32, 64, 64);
  }, 1);
}

export function shadowSprite(): Sprite {
  return cachedSprite("shadow", 64, (ctx) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.6, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-32, -32, 64, 64);
  }, 1);
}

const alphaCache = new Map<string, string>();
export function withAlpha(color: string, a: number): string {
  const key = color + a;
  const hit = alphaCache.get(key);
  if (hit) return hit;
  let r = 255;
  let g = 255;
  let b = 255;
  if (color.startsWith("#")) {
    const h = color.length === 4 ? color.slice(1).split("").map((c) => c + c).join("") : color.slice(1, 7);
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  const out = `rgba(${r},${g},${b},${a})`;
  alphaCache.set(key, out);
  return out;
}

/** Deterministic value noise for textures. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface FloorStyle {
  base: string;
  panel: string;
  line: string;
  accent: string;
  seed: number;
}

/** 256px seamless floor tile: plates, seams, rivets, scuffs, grime and lit strips. */
export function floorTile(style: FloorStyle): HTMLCanvasElement {
  const key = `floor:${style.seed}`;
  const hit = floorCache.get(key);
  if (hit) return hit;
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext("2d")!;
  const r = rng(style.seed);
  ctx.fillStyle = style.base;
  ctx.fillRect(0, 0, S, S);
  // speckle grime
  for (let i = 0; i < 900; i++) {
    const v = r();
    ctx.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.05 + r() * 0.08})` : `rgba(255,255,255,${0.015 + r() * 0.025})`;
    ctx.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
  }
  // plates (2x2 per tile) with bevel
  const P = S / 2;
  for (let py = 0; py < 2; py++) {
    for (let px = 0; px < 2; px++) {
      const x = px * P;
      const y = py * P;
      const g = ctx.createLinearGradient(x, y, x + P, y + P);
      g.addColorStop(0, withAlpha(style.panel, 0.55 + r() * 0.2));
      g.addColorStop(1, withAlpha(style.panel, 0.25 + r() * 0.15));
      ctx.fillStyle = g;
      ctx.fillRect(x + 3, y + 3, P - 6, P - 6);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 3.5, y + P - 3.5);
      ctx.lineTo(x + 3.5, y + 3.5);
      ctx.lineTo(x + P - 3.5, y + 3.5);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.moveTo(x + P - 3.5, y + 3.5);
      ctx.lineTo(x + P - 3.5, y + P - 3.5);
      ctx.lineTo(x + 3.5, y + P - 3.5);
      ctx.stroke();
      // rivets
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      for (const [rx, ry] of [[10, 10], [P - 10, 10], [10, P - 10], [P - 10, P - 10]] as const) {
        ctx.beginPath();
        ctx.arc(x + rx, y + ry, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x + rx - 1.5, y + ry - 1.5, 1.5, 1.5);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
      }
      // detail: vents / hatches / scuffs
      const kind = Math.floor(r() * 4);
      if (kind === 0) {
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(x + 30, y + 34 + i * 9, P - 60, 4);
        }
      } else if (kind === 1) {
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 26, y + 26, P - 52, P - 52);
      } else if (kind === 2) {
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 7; i++) {
          const sx = x + 12 + r() * (P - 24);
          const sy = y + 12 + r() * (P - 24);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + (r() - 0.5) * 40, sy + (r() - 0.5) * 12);
          ctx.stroke();
        }
      }
    }
  }
  // seams
  ctx.fillStyle = style.line;
  ctx.fillRect(0, 0, S, 2);
  ctx.fillRect(0, 0, 2, S);
  ctx.fillRect(0, P - 1, S, 2);
  ctx.fillRect(P - 1, 0, 2, S);
  // emissive accent strip in one seam
  ctx.fillStyle = withAlpha(style.accent, 0.35);
  ctx.fillRect(P - 1, 20, 2, 40);
  ctx.fillRect(20, P - 1, 30, 2);
  floorCache.set(key, c);
  return c;
}
const floorCache = new Map<string, HTMLCanvasElement>();

/** Low-res additive layer, upscaled with bilinear filtering = cheap bloom. */
export class BloomLayer {
  readonly c: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly half: HTMLCanvasElement;
  private hctx: CanvasRenderingContext2D;
  w = 1;
  h = 1;
  readonly k = 0.25;
  wide = false;
  constructor() {
    this.c = makeCanvas(1, 1);
    this.ctx = this.c.getContext("2d")!;
    this.half = makeCanvas(1, 1);
    this.hctx = this.half.getContext("2d")!;
  }
  resize(cssW: number, cssH: number) {
    this.w = cssW;
    this.h = cssH;
    this.c.width = Math.max(1, Math.ceil(cssW * this.k));
    this.c.height = Math.max(1, Math.ceil(cssH * this.k));
    this.half.width = Math.max(1, Math.ceil(this.c.width / 2));
    this.half.height = Math.max(1, Math.ceil(this.c.height / 2));
  }
  begin(camX: number, camY: number) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, this.c.width, this.c.height);
    ctx.setTransform(this.k, 0, 0, this.k, (this.w / 2 - camX) * this.k, (this.h / 2 - camY) * this.k);
    ctx.globalCompositeOperation = "lighter";
  }
  light(x: number, y: number, r: number, color: string, a = 1) {
    const s = glowSprite(color, false);
    this.ctx.globalAlpha = Math.min(1, a);
    this.ctx.drawImage(s.c, x - r, y - r, r * 2, r * 2);
  }
  composite(target: CanvasRenderingContext2D, strength: number) {
    // optional second, wider pass: downsample again for a soft halo
    if (this.wide) this.hctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.wide) {
      this.hctx.clearRect(0, 0, this.half.width, this.half.height);
      this.hctx.drawImage(this.c, 0, 0, this.half.width, this.half.height);
    }
    target.save();
    target.setTransform(1, 0, 0, 1, 0, 0);
    const W = target.canvas.width;
    const H = target.canvas.height;
    target.imageSmoothingEnabled = true;
    target.globalCompositeOperation = "lighter";
    target.globalAlpha = strength;
    target.drawImage(this.c, 0, 0, W, H);
    if (this.wide) {
      target.globalAlpha = strength * 0.7;
      target.drawImage(this.half, 0, 0, W, H);
    }
    target.restore();
  }
}

/** Screen-space vignette + optional film grain, cached per size. */
let vigCache: { key: string; c: HTMLCanvasElement } | null = null;
/** Vignette + sector colour grade + faint scanlines baked into one overlay (1 drawImage/frame). */
export function vignette(w: number, h: number, tint = "", scan = true): HTMLCanvasElement {
  const key = `${w}x${h}:${tint}:${scan}`;
  if (vigCache && vigCache.key === key) return vigCache.c;
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d")!;
  if (tint) {
    // edge-weighted tint: centre stays neutral for readability
    const t = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    t.addColorStop(0, "rgba(0,0,0,0)");
    t.addColorStop(1, tint);
    ctx.fillStyle = t;
    ctx.fillRect(0, 0, w, h);
  }
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // faint scanlines for CRT/cockpit feel
  if (scan) {
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  }
  vigCache = { key, c };
  return c;
}
