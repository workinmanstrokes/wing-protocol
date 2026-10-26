/**
 * Code-drawn mecha sprites in a cel style: bold ink outlines, two-tone shading
 * (hard shadow on the +y side, light from the top-left) and angular armour.
 * The 8 original player mechs use the shaded-metal SVG art in `mech-art.ts`.
 * This file draws the 3 Prism Vault mechs, the booster specs for every mech,
 * and the enemies (tri-eye drone walkers and the big war-machine bosses).
 * Sprites face +x (the aim direction).
 */
import type { MechId, WeaponKind } from "./types";

const INK = "#0b0d14";
type Pt = readonly [number, number];

function path(ctx: CanvasRenderingContext2D, pts: readonly Pt[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
}

function shade(hex: string, k: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Cel-shaded armour plate: flat base, hard shadow band below `split`, rim light, thick ink line. */
function plate(ctx: CanvasRenderingContext2D, pts: readonly Pt[], base: string, line = 2, split?: number) {
  let cy = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    cy += p[1];
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  cy /= pts.length;
  const sy = split ?? cy + (maxY - cy) * 0.15;
  path(ctx, pts);
  ctx.fillStyle = base;
  ctx.fill();
  ctx.save();
  path(ctx, pts);
  ctx.clip();
  ctx.fillStyle = shade(base, -0.32);
  ctx.fillRect(-200, sy, 400, 400);
  // top-left rim light
  ctx.fillStyle = shade(base, 0.35);
  ctx.fillRect(-200, minY - 1, 400, Math.max(1.2, (maxY - minY) * 0.12));
  ctx.restore();
  path(ctx, pts);
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.stroke();
}

function mirror(pts: readonly Pt[]): Pt[] {
  return pts.map(([x, y]) => [x, -y] as Pt).reverse();
}

function both(ctx: CanvasRenderingContext2D, pts: readonly Pt[], base: string, line = 2) {
  plate(ctx, pts, base, line);
  plate(ctx, mirror(pts), base, line);
}

function lens(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, r + 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function thruster(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, glow: string) {
  plate(ctx, [[x, y - h / 2], [x + w, y - h / 2 - 1], [x + w, y + h / 2 + 1], [x, y + h / 2]], "#3a3f4c", 1.6);
  ctx.fillStyle = glow;
  ctx.fillRect(x - 1.5, y - h / 2 + 1.5, 2, h - 3);
}

export interface MechaPalette {
  armor: string; // main armour
  frame: string; // inner frame / chest
  trim: string; // accent stripe
  accent: string; // secondary accent (wing tips, mandibles, rings)
  eye: string;
  glow: string; // thruster colour
}

// Palettes for the code-drawn vault mechs.
export const MECH_PALETTES: Partial<Record<MechId, MechaPalette>> = {
  moth: { armor: "#e8dcc0", frame: "#6a5a8a", trim: "#b0742e", accent: "#ffb347", eye: "#7af0e0", glow: "#ffd08a" },
  kiln: { armor: "#7a4a2e", frame: "#3a2a22", trim: "#c4c0b8", accent: "#ff7a2a", eye: "#ffd04a", glow: "#ff8a3a" },
  kite: { armor: "#3a6ea8", frame: "#1e2a44", trim: "#ff5a8a", accent: "#f0ece0", eye: "#ff8ab0", glow: "#ff8ab0" },
};

/** Booster ports (sprite-local, facing +x) + flame style per mech, used by the combat renderer. */
export interface BoosterSpec {
  ports: readonly Pt[];
  color: string;
  core: string;
  size: number; // flame radius scale
  pattern: "steady" | "pulse" | "flicker" | "stagger";
}
// Ports for the SVG mechs (all 11, vault mechs included) sit on each sprite's rear nozzle, scaled by MECH_ART_SCALE (0.75);
// flame colours match each sprite's glow (and the mech accent in data.ts where set).
export const MECH_BOOSTERS: Record<MechId, BoosterSpec> = {
  aether: { ports: [[-13.5, 0]], color: "#ff8a4a", core: "#fff0e0", size: 1.2, pattern: "steady" },
  forge: { ports: [[-17, -5], [-17, 5]], color: "#ff9a3a", core: "#ffe8b0", size: 0.95, pattern: "stagger" },
  scythe: { ports: [[-13, 0]], color: "#3aff7a", core: "#d0ffe0", size: 1.2, pattern: "flicker" },
  dune: { ports: [[-24, 0]], color: "#5ab8ff", core: "#e0f4ff", size: 1.1, pattern: "pulse" },
  serpent: { ports: [[-14, 0]], color: "#8ae0ff", core: "#eafcff", size: 1.1, pattern: "flicker" },
  storm: { ports: [[-10, 0]], color: "#ff3a7a", core: "#ffd8e6", size: 1, pattern: "stagger" },
  vulture: { ports: [[-12, 0]], color: "#7ae070", core: "#e0ffd8", size: 1.1, pattern: "pulse" },
  cross: { ports: [[-8, 0]], color: "#5ae0ff", core: "#e8fcff", size: 1.1, pattern: "steady" },
  moth: { ports: [[-24, -3], [-24, 3]], color: "#ffd08a", core: "#fff6e0", size: 0.8, pattern: "pulse" },
  kiln: { ports: [[-26, -6], [-26, 6]], color: "#ff6a1a", core: "#ffe0a0", size: 1.3, pattern: "flicker" },
  kite: { ports: [[-22, 0]], color: "#ff5a8a", core: "#ffe0ec", size: 1.1, pattern: "stagger" },
};

function nozzles(ctx: CanvasRenderingContext2D, id: MechId) {
  const b = MECH_BOOSTERS[id];
  for (const [x, y] of b.ports) thruster(ctx, x, y, 6, 5 * Math.max(0.8, b.size), b.color);
}

/** Vault mech, roughly ±32px, facing +x. The 8 original mechs come from `mech-art.ts`. */
export function drawMecha(ctx: CanvasRenderingContext2D, id: MechId, weaponKind: WeaponKind) {
  const p = MECH_PALETTES[id];
  if (!p) return;
  ctx.save();
  switch (id) {
    case "moth": {
      // Lantern Moth: two pairs of broad rounded dust-wings, feathery antennae, glowing lantern abdomen
      // teardrop wing: narrow root at the body, broad rounded tip
      const wing = (rootX: number, len: number, width: number, sweep: number, col: string) => {
        for (const sg of [-1, 1]) {
          ctx.save();
          ctx.translate(rootX, sg * 5);
          ctx.rotate(sg * sweep);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(width * 0.9, sg * len * 0.25, width * 0.8, sg * len, 0, sg * len);
          ctx.bezierCurveTo(-width * 0.8, sg * len, -width * 0.6, sg * len * 0.3, 0, 0);
          ctx.closePath();
          ctx.fillStyle = col;
          ctx.fill();
          ctx.save();
          ctx.clip();
          ctx.fillStyle = shade(col, -0.3);
          ctx.fillRect(-width, sg > 0 ? len * 0.62 : -len, width * 2, len * 0.38);
          // vein lines
          ctx.strokeStyle = shade(col, -0.45);
          ctx.lineWidth = 0.9;
          for (const f of [-0.4, 0, 0.4]) {
            ctx.beginPath();
            ctx.moveTo(0, sg * 2);
            ctx.quadraticCurveTo(width * f * 0.6, sg * len * 0.5, width * f, sg * len * 0.92);
            ctx.stroke();
          }
          ctx.restore();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2;
          ctx.stroke();
          // small eye-spot near the tip
          lens(ctx, 0, sg * len * 0.7, Math.max(1.6, width * 0.16), p.accent);
          ctx.restore();
        }
      };
      wing(-10, 20, 13, 0.75, p.frame); // hind wings swept back
      wing(-2, 26, 16, 0.2, p.armor); // fore wings
      nozzles(ctx, id);
      // lantern abdomen (segmented, glowing)
      ctx.save();
      ctx.shadowColor = p.accent;
      ctx.shadowBlur = 10;
      plate(ctx, [[-26, -5], [-14, -7], [-10, 0], [-14, 7], [-26, 5], [-30, 0]], p.accent, 1.8);
      ctx.restore();
      ctx.fillStyle = INK;
      ctx.fillRect(-22, -6, 1.4, 12);
      ctx.fillRect(-17, -6.5, 1.4, 13);
      // thorax
      plate(ctx, [[-10, -7], [6, -8], [10, 0], [6, 8], [-10, 7]], p.trim, 2);
      // feathery antennae
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      for (const sg of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(10, sg * 3);
        ctx.quadraticCurveTo(20, sg * 6, 24, sg * 16);
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const t = 0.35 + i * 0.18;
          const x = 10 + (24 - 10) * t;
          const y = sg * (3 + (16 - 3) * t * t);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 3, y - sg * 2);
          ctx.stroke();
        }
      }
      // round compound-eye head
      ctx.fillStyle = p.armor;
      ctx.beginPath();
      ctx.arc(10, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      lens(ctx, 12, -2.6, 1.6, p.eye);
      lens(ctx, 12, 2.6, 1.6, p.eye);
      break;
    }
    case "kiln": {
      // Kiln Tortoise: hex-plated furnace dome on four stub legs, chimney stack, ember grate in front
      for (const [lx, ly] of [[-14, -18], [8, -18], [-14, 18], [8, 18]] as const) {
        plate(ctx, [[lx - 5, ly - 4], [lx + 5, ly - 4], [lx + 6, ly + 4], [lx - 6, ly + 4]], p.frame, 1.8);
      }
      nozzles(ctx, id);
      ctx.fillStyle = p.armor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(-3, 0, 21, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = shade(p.armor, -0.3);
      ctx.fillRect(-30, 4, 60, 20);
      // hex shell plates
      ctx.strokeStyle = shade(p.armor, -0.55);
      ctx.lineWidth = 1.4;
      for (const [hx, hy] of [[-3, 0], [-14, -8], [-14, 8], [8, -8], [8, 8], [-3, -14], [-3, 14]] as const) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const x = hx + Math.cos(a) * 6;
          const y = hy + Math.sin(a) * 6;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(-3, 0, 21, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
      // glowing core in the centre plate
      ctx.save();
      ctx.shadowColor = p.accent;
      ctx.shadowBlur = 8;
      lens(ctx, -3, 0, 3.4, p.accent);
      ctx.restore();
      // chimney stack (offset, smoking)
      plate(ctx, [[-16, -6], [-8, -6], [-8, -1], [-16, -1]], p.trim, 1.6);
      ctx.fillStyle = INK;
      ctx.fillRect(-14.5, -5, 5, 3);
      // ember grate snout
      plate(ctx, [[16, -7], [26, -5], [28, 0], [26, 5], [16, 7]], p.frame, 2);
      ctx.fillStyle = p.accent;
      for (const y of [-3, 0, 3]) ctx.fillRect(20, y - 0.8, 6, 1.6);
      lens(ctx, 18, -5, 1.3, p.eye);
      lens(ctx, 18, 5, 1.3, p.eye);
      break;
    }
    case "kite": {
      // Tether Kite: diamond sail frame with cross spars, long ribbon tail with bows, two tethered blades
      ctx.strokeStyle = p.trim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      for (let i = 1; i <= 6; i++) ctx.lineTo(-14 - i * 4.5, Math.sin(i * 1.3) * 4);
      ctx.stroke();
      for (const i of [2, 4, 6]) {
        const x = -14 - i * 4.5;
        const y = Math.sin(i * 1.3) * 4;
        plate(ctx, [[x, y], [x - 3, y - 4], [x + 3, y - 4]], p.accent, 1);
        plate(ctx, [[x, y], [x + 3, y + 4], [x - 3, y + 4]], p.accent, 1);
      }
      nozzles(ctx, id);
      // diamond sail, two-tone halves
      plate(ctx, [[22, 0], [0, -24], [-14, 0]], p.armor, 2.2);
      plate(ctx, [[22, 0], [-14, 0], [0, 24]], shade(p.armor, -0.25), 2.2);
      // spars
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-14, 0);
      ctx.moveTo(0, -24);
      ctx.lineTo(0, 24);
      ctx.stroke();
      // tethered blades at the wingtips
      for (const sg of [-1, 1]) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, sg * 24);
        ctx.lineTo(12, sg * 27);
        ctx.stroke();
        plate(ctx, [[10, sg * 25], [20, sg * 26], [14, sg * 30]], p.trim, 1.3);
      }
      // pilot pod
      plate(ctx, [[-2, -5], [8, -5], [12, 0], [8, 5], [-2, 5]], p.frame, 1.8);
      lens(ctx, 7, 0, 2, p.eye);
      break;
    }
  }
  void weaponKind;
  ctx.restore();
}

/* ------------------------------ enemies ------------------------------ */

interface GruntStyle {
  armor: string;
  dark: string;
  eye: string;
}
const GRUNT: Record<string, GruntStyle> = {
  walker: { armor: "#5f7a4a", dark: "#38492c", eye: "#ff3a6a" },
  crawler: { armor: "#7a5a3a", dark: "#4a3422", eye: "#ff5a3a" },
  charger: { armor: "#c46a2a", dark: "#7a3c14", eye: "#ffd04a" },
  sniper: { armor: "#5a4a7a", dark: "#342a4c", eye: "#ff4a6a" },
  shielder: { armor: "#4a6a8a", dark: "#2a3e54", eye: "#ff4a6a" },
  ace: { armor: "#2c2c3a", dark: "#16161e", eye: "#ffcf4a" },
  titan: { armor: "#5a4a3c", dark: "#2e241c", eye: "#ff4a2a" },
};

/** Drone-pilot head: a hex shell with three eyes in a triangle. */
function triHead(ctx: CanvasRenderingContext2D, s: GruntStyle, r = 6, lead = false) {
  const hex: Pt[] = [];
  for (let i = 0; i < 6; i++) hex.push([Math.cos((i / 6) * Math.PI * 2 + Math.PI / 6) * r, Math.sin((i / 6) * Math.PI * 2 + Math.PI / 6) * r]);
  plate(ctx, hex, s.armor, 1.8);
  plate(ctx, [[r * 0.15, -r * 0.62], [r * 0.95, -r * 0.3], [r * 0.95, r * 0.3], [r * 0.15, r * 0.62]], INK, 1);
  lens(ctx, r * 0.72, 0, r * 0.2, s.eye);
  lens(ctx, r * 0.38, -r * 0.34, r * 0.16, s.eye);
  lens(ctx, r * 0.38, r * 0.34, r * 0.16, s.eye);
  // squad leader: a gold stripe across the crown and a rear sensor bar
  if (lead) {
    plate(ctx, [[-r * 0.9, -1.2], [r * 0.1, -1.2], [r * 0.1, 1.2], [-r * 0.9, 1.2]], "#e8b83a", 1);
    plate(ctx, [[-r - 4, -4], [-r + 1, -4], [-r + 1, 4], [-r - 4, 4]], s.dark, 1.2);
  }
}

function grunt(ctx: CanvasRenderingContext2D, s: GruntStyle, opts: { heavy?: boolean; lead?: boolean; weapon?: "mg" | "rifle" | "axe" | "shield" | "cannon" }) {
  const k = opts.heavy ? 1.25 : 1;
  ctx.save();
  ctx.scale(k, k);
  plate(ctx, [[-16, -8], [-8, -10], [-8, 10], [-16, 8]], s.dark, 1.8); // backpack
  thruster(ctx, -21, 0, 6, 8, "#ff8a5c");
  // squared, symmetric shoulder blocks
  both(ctx, [[-9, -10], [5, -10], [5, -17], [-9, -17]], s.armor, 1.8);
  both(ctx, [[-6, -15], [2, -15], [2, -17], [-6, -17]], s.dark, 1);
  // body
  plate(ctx, [[-10, -10], [6, -10], [10, -4], [10, 4], [6, 10], [-10, 10]], s.armor, 2);
  // armour ribs across the back plate
  ctx.fillStyle = s.dark;
  for (let i = 0; i < 3; i++) ctx.fillRect(-8 + i * 3, -7, 1.6, 14);
  // weapon
  const w = opts.weapon ?? "mg";
  if (w === "mg") plate(ctx, [[2, 8], [20, 8], [20, 13], [2, 13]], "#3a3f4c", 1.6);
  if (w === "rifle") {
    plate(ctx, [[0, 7], [30, 8], [30, 11], [0, 12]], "#2f3340", 1.6);
    lens(ctx, 12, 6, 1.6, s.eye);
  }
  if (w === "axe") {
    plate(ctx, [[4, 9], [16, 9], [16, 11], [4, 11]], "#3a3f4c", 1.2);
    plate(ctx, [[14, 4], [22, 6], [22, 14], [14, 16]], "#ffb040", 1.4);
  }
  if (w === "shield") plate(ctx, [[10, -16], [16, -14], [18, 0], [16, 14], [10, 16]], s.armor, 2);
  if (w === "cannon") {
    plate(ctx, [[-6, -22], [22, -20], [22, -14], [-6, -14]], "#3a3f4c", 1.8);
    plate(ctx, [[22, -21], [26, -21], [26, -13], [22, -13]], INK, 1);
  }
  ctx.translate(1, 0);
  triHead(ctx, s, 6, opts.lead);
  ctx.restore();
}

/** Enemy sprites by kind, facing +x. */
export function drawMechaEnemy(ctx: CanvasRenderingContext2D, kind: string): boolean {
  switch (kind) {
    case "drone": {
      // spherical scout pod with stub fins and a ring sensor
      both(ctx, [[-8, -4], [-14, -9], [-12, -3]], "#6a5a4a", 1.4);
      ctx.fillStyle = "#8a7258";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#4e3e30";
      ctx.fillRect(-8, 1.5, 16, 8);
      ctx.restore();
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(4, 0, 2.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#ff3a4a";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      return true;
    }
    case "swarm":
      plate(ctx, [[-6, -5], [8, 0], [-6, 5], [-3, 0]], "#b04a86", 1.4);
      lens(ctx, 2, 0, 1.3, "#ffc0e0");
      return true;
    case "walker":
      grunt(ctx, GRUNT.walker!, { weapon: "mg" });
      return true;
    case "crawler":
      // quad-legged artillery walker: four splayed legs read instantly
      for (const [x, y] of [[10, -1], [10, 1], [-14, -1], [-14, 1]] as const) {
        const sx = x > 0 ? 1 : -1;
        plate(ctx, [[x, y * 12], [x + sx * 12, y * 26], [x + sx * 16, y * 24], [x + sx * 4, y * 10]], "#3a2c20", 1.6);
      }
      grunt(ctx, GRUNT.crawler!, { heavy: true, weapon: "cannon" });
      return true;
    case "charger":
      // forward-leaning wedge with ram horns
      both(ctx, [[8, -8], [24, -14], [14, -4]], "#e8e0d0", 1.4);
      ctx.save();
      ctx.scale(1.15, 0.85);
      grunt(ctx, GRUNT.charger!, { weapon: "axe" });
      ctx.restore();
      return true;
    case "sniper":
      // slim, long-barrel, sensor mast trailing
      plate(ctx, [[-30, -1], [-12, -1.5], [-12, 1.5], [-30, 1]], "#2b2f38", 1);
      lens(ctx, -30, 0, 1.6, GRUNT.sniper!.eye);
      ctx.save();
      ctx.scale(1, 0.75);
      grunt(ctx, GRUNT.sniper!, { weapon: "rifle" });
      ctx.restore();
      plate(ctx, [[20, 7], [40, 7.5], [40, 9.5], [20, 10]], "#2f3340", 1.2);
      return true;
    case "shielder": {
      // squat wall: wide stance, big round riot shield
      ctx.save();
      ctx.scale(0.85, 1.15);
      grunt(ctx, GRUNT.shielder!, { weapon: "mg" });
      ctx.restore();
      ctx.fillStyle = GRUNT.shielder!.armor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(6, 0, 22, -0.9, 0.9);
      ctx.arc(6, 0, 16, 0.9, -0.9, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f2d24a";
      ctx.fillRect(24, -3, 4, 6);
      return true;
    }
    case "ace":
      // squad leader: black and gold, sensor bar, twin thrusters
      grunt(ctx, GRUNT.ace!, { lead: true, weapon: "rifle" });
      thruster(ctx, -26, -6, 5, 5, "#ffcf4a");
      thruster(ctx, -26, 6, 5, 5, "#ffcf4a");
      return true;
    case "titan": {
      // siege crab: wide hull, claw arms, triple sensor cluster
      const s = GRUNT.titan!;
      both(ctx, [[-4, -14], [16, -24], [26, -18], [22, -12], [8, -10]], s.dark, 2); // claw arm
      both(ctx, [[20, -20], [30, -16], [24, -14]], "#d8d8d8", 1.2); // claw tips
      plate(ctx, [[-26, -16], [4, -20], [18, -10], [18, 10], [4, 20], [-26, 16]], s.armor, 2.4);
      plate(ctx, [[-20, -10], [0, -12], [8, -6], [8, 6], [0, 12], [-20, 10]], s.dark, 1.6);
      thruster(ctx, -32, -9, 7, 8, "#ff8a5c");
      thruster(ctx, -32, 9, 7, 8, "#ff8a5c");
      plate(ctx, [[6, -8], [16, -6], [16, 6], [6, 8]], INK, 1.2);
      lens(ctx, 13, 0, 2.6, s.eye);
      lens(ctx, 9.5, -4, 1.7, s.eye);
      lens(ctx, 9.5, 4, 1.7, s.eye);
      return true;
    }
    case "warden": {
      // fortress war machine: hexagonal core ringed by weapon pods
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i / 6) * Math.PI * 2);
        plate(ctx, [[18, -6], [32, -5], [34, 0], [32, 5], [18, 6]], "#6a2a22", 1.8);
        lens(ctx, 31, 0, 1.6, "#ffb070");
        ctx.restore();
      }
      const hex: Pt[] = [];
      for (let i = 0; i < 6; i++) hex.push([Math.cos((i / 6) * Math.PI * 2) * 22, Math.sin((i / 6) * Math.PI * 2) * 22]);
      plate(ctx, hex, "#4a2420", 2.6);
      const inner: Pt[] = hex.map(([x, y]) => [x * 0.6, y * 0.6] as Pt);
      plate(ctx, inner, "#c4a03a", 1.8);
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      lens(ctx, 0, 0, 5, "#ff5a3a");
      return true;
    }
  }
  return false;
}
