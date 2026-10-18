/**
 * Original top-down "real robot" mecha sprites: bold ink outlines, two-tone cel
 * shading (hard shadow on the +y side, light from the top-left), angular armour,
 * fin crests, mono-eye grunts and big mobile-armour bosses. All shapes are drawn
 * in code here — no external art. Sprites face +x (the aim direction).
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
  armor: string; // main armour (white in the hero scheme)
  frame: string; // inner frame / chest
  trim: string; // red trim
  crest: string; // yellow fin / crest
  eye: string;
  glow: string; // thruster colour
}

export const MECH_PALETTES: Record<MechId, MechaPalette> = {
  aether: { armor: "#eef1f6", frame: "#2f5fd0", trim: "#d8323a", crest: "#f5c518", eye: "#5ef0ff", glow: "#7ad8f0" },
  forge: { armor: "#5d6b7e", frame: "#2b3442", trim: "#e0782a", crest: "#f5c518", eye: "#ffd166", glow: "#ffb070" },
  scythe: { armor: "#2a2433", frame: "#6b3fa0", trim: "#c9a227", crest: "#e8c84a", eye: "#ff4a8a", glow: "#c890ff" },
  dune: { armor: "#d9c49a", frame: "#7a5a32", trim: "#c4452e", crest: "#f0f0f0", eye: "#7af0a0", glow: "#ffcf8a" },
  serpent: { armor: "#e9f2ec", frame: "#2f8f5a", trim: "#d8323a", crest: "#f5c518", eye: "#9cffd0", glow: "#7ae0a0" },
  storm: { armor: "#f2f4fa", frame: "#1f3f9a", trim: "#f5c518", crest: "#f5c518", eye: "#8fd0ff", glow: "#8fd0ff" },
  vulture: { armor: "#3a1c20", frame: "#191a20", trim: "#c4342e", crest: "#d9d9d9", eye: "#ff6a4a", glow: "#ff8a5c" },
  cross: { armor: "#f4f1e8", frame: "#b88a1e", trim: "#c4302a", crest: "#f5c518", eye: "#9fe8ff", glow: "#fff0c0" },
  moth: { armor: "#e8dcc0", frame: "#6a5a8a", trim: "#b0742e", crest: "#ffb347", eye: "#7af0e0", glow: "#ffd08a" },
  kiln: { armor: "#7a4a2e", frame: "#3a2a22", trim: "#c4c0b8", crest: "#ff7a2a", eye: "#ffd04a", glow: "#ff8a3a" },
  kite: { armor: "#3a6ea8", frame: "#1e2a44", trim: "#ff5a8a", crest: "#f0ece0", eye: "#ff8ab0", glow: "#ff8ab0" },
};

type Head = "vfin" | "crest" | "horn" | "cross" | "visor";
const HEADS: Record<MechId, Head> = {
  aether: "vfin", forge: "visor", scythe: "horn", dune: "crest", serpent: "vfin", storm: "vfin", vulture: "horn", cross: "cross",
  moth: "visor", kiln: "visor", kite: "visor",
};

function weapon(ctx: CanvasRenderingContext2D, kind: WeaponKind, p: MechaPalette) {
  switch (kind) {
    case "beam":
      plate(ctx, [[8, 10], [34, 9], [36, 12], [34, 15], [8, 15]], "#4a4f5c", 1.8);
      plate(ctx, [[16, 8], [24, 7], [24, 10], [16, 10]], p.frame, 1.2);
      lens(ctx, 35, 12, 1.4, p.eye);
      break;
    case "gatling":
      plate(ctx, [[6, 7], [30, 8], [30, 17], [6, 17]], "#4a4f5c", 1.8);
      for (const y of [9.5, 12.5, 15.5]) plate(ctx, [[30, y - 1.2], [38, y - 1.2], [38, y + 1.2], [30, y + 1.2]], "#2b2f38", 1);
      // shoulder missile pod
      plate(ctx, [[-10, -24], [6, -24], [6, -14], [-10, -14]], p.frame, 1.8);
      ctx.fillStyle = p.trim;
      for (let i = 0; i < 3; i++) ctx.fillRect(-7 + i * 5, -21, 3, 4);
      break;
    case "melee":
      plate(ctx, [[6, 10], [20, 10], [20, 13], [6, 13]], "#4a4f5c", 1.6);
      ctx.save();
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 6;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(20, 11.5);
      ctx.quadraticCurveTo(38, 4, 40, -14);
      ctx.stroke();
      ctx.strokeStyle = p.glow;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
      break;
    case "shotgun":
      plate(ctx, [[8, 8], [28, 8], [32, 11], [32, 15], [8, 15]], "#4a4f5c", 1.8);
      // big kite shield on the off arm
      plate(ctx, [[0, -26], [18, -22], [22, -14], [12, -10], [0, -12]], p.armor, 2);
      plate(ctx, [[6, -21], [14, -19], [12, -15], [6, -15]], p.trim, 1.2);
      break;
    case "fang":
      plate(ctx, [[8, 9], [26, 9], [32, 12], [26, 15], [8, 15]], "#4a4f5c", 1.8);
      plate(ctx, [[26, 9], [36, 6], [32, 12], [36, 18], [26, 15]], p.frame, 1.4);
      break;
    case "arc":
      plate(ctx, [[8, 9], [28, 9], [28, 15], [8, 15]], "#4a4f5c", 1.8);
      lens(ctx, 30, 12, 2.4, p.glow);
      break;
    case "mortar":
      plate(ctx, [[-14, -22], [16, -20], [18, -14], [-14, -14]], "#4a4f5c", 2);
      plate(ctx, [[16, -21], [22, -21], [22, -13], [16, -13]], "#2b2f38", 1.4);
      plate(ctx, [[8, 9], [22, 9], [22, 14], [8, 14]], "#4a4f5c", 1.6);
      break;
    case "lance":
      plate(ctx, [[2, 9], [42, 10], [48, 12], [42, 14], [2, 15]], p.armor, 1.8);
      plate(ctx, [[2, 8], [12, 6], [12, 18], [2, 16]], p.trim, 1.6);
      break;
    case "mote":
    case "ember":
    case "tether":
      break; // drawn as part of each vault mech's body plan
  }
}

function head(ctx: CanvasRenderingContext2D, kind: Head, p: MechaPalette) {
  // helmet
  plate(ctx, [[-5, -6], [4, -6], [8, -3], [8, 3], [4, 6], [-5, 6]], p.armor, 1.8);
  // face / visor
  if (kind === "visor") {
    plate(ctx, [[3, -5], [8, -3], [8, 3], [3, 5]], INK, 1);
    ctx.fillStyle = p.eye;
    ctx.fillRect(5, -3.5, 2, 7);
  } else {
    plate(ctx, [[4, -3.2], [8.5, -2], [8.5, 2], [4, 3.2]], "#e6e9ef", 1);
    ctx.fillStyle = p.eye;
    ctx.fillRect(5.2, -2.6, 2.4, 1.6);
    ctx.fillRect(5.2, 1, 2.4, 1.6);
    ctx.fillStyle = p.trim;
    ctx.fillRect(7.6, -0.8, 1.2, 1.6); // chin vent
  }
  // crest
  if (kind === "vfin") {
    plate(ctx, [[5, -1], [16, -12], [14, -13], [3, -3]], p.crest, 1.4);
    plate(ctx, [[5, 1], [16, 12], [14, 13], [3, 3]], p.crest, 1.4);
    plate(ctx, [[2, -2], [6, -2], [6, 2], [2, 2]], p.trim, 1);
  } else if (kind === "crest") {
    plate(ctx, [[-2, -1.4], [14, -1], [14, 1], [-2, 1.4]], p.crest, 1.4);
  } else if (kind === "horn") {
    plate(ctx, [[2, -1.5], [18, 0], [2, 1.5]], p.crest, 1.4);
    plate(ctx, [[-2, -5], [6, -11], [4, -5]], p.crest, 1.2);
    plate(ctx, [[-2, 5], [4, 5], [6, 11]], p.crest, 1.2);
  } else if (kind === "cross") {
    plate(ctx, [[1, -1.4], [14, -1.4], [14, 1.4], [1, 1.4]], p.crest, 1.4);
    plate(ctx, [[8, -7], [11, -7], [11, 7], [8, 7]], p.crest, 1.4);
  } else {
    plate(ctx, [[-4, -7], [2, -9], [2, -6]], p.crest, 1.2);
    plate(ctx, [[-4, 7], [2, 6], [2, 9]], p.crest, 1.2);
  }
}

/** Booster ports (sprite-local, facing +x) + flame style per mech, used by the combat renderer. */
export interface BoosterSpec {
  ports: readonly Pt[];
  color: string;
  core: string;
  size: number; // flame radius scale
  pattern: "steady" | "pulse" | "flicker" | "stagger";
}
export const MECH_BOOSTERS: Record<MechId, BoosterSpec> = {
  aether: { ports: [[-27, -5], [-27, 5]], color: "#4aa8ff", core: "#e8f6ff", size: 1, pattern: "steady" },
  forge: { ports: [[-30, -14], [-30, -5], [-30, 5], [-30, 14]], color: "#ff8a2a", core: "#ffe0a0", size: 0.75, pattern: "stagger" },
  scythe: { ports: [[-30, 0]], color: "#b05aff", core: "#f0d8ff", size: 1.5, pattern: "flicker" },
  dune: { ports: [[-24, -11], [-24, 11]], color: "#ffb84a", core: "#fff0c0", size: 1.2, pattern: "pulse" },
  serpent: { ports: [[-40, 0]], color: "#4aff9a", core: "#e0ffe8", size: 1.1, pattern: "flicker" },
  storm: { ports: [[-20, -24], [-24, -12], [-24, 12], [-20, 24]], color: "#5ae8ff", core: "#ffffff", size: 0.7, pattern: "stagger" },
  vulture: { ports: [[-26, -9], [-26, 9]], color: "#ff4a3a", core: "#ffd0b0", size: 1.15, pattern: "pulse" },
  cross: { ports: [[-30, 0], [-22, -10], [-22, 10], [-14, 0]], color: "#ffd84a", core: "#fffbe0", size: 0.9, pattern: "steady" },
  moth: { ports: [[-14, -4], [-14, 4]], color: "#ffd08a", core: "#fff6e0", size: 0.8, pattern: "pulse" },
  kiln: { ports: [[-24, -6], [-24, 6]], color: "#ff6a1a", core: "#ffe0a0", size: 1.3, pattern: "flicker" },
  kite: { ports: [[-22, 0]], color: "#ff5a8a", core: "#ffe0ec", size: 1.1, pattern: "stagger" },
};

function torso(ctx: CanvasRenderingContext2D, p: MechaPalette, w: number, h: number) {
  // armour shell + coloured chest + vents + cockpit, sized per mech
  plate(ctx, [[-w * 0.8, -h], [w * 0.5, -h], [w, -h * 0.5], [w, h * 0.5], [w * 0.5, h], [-w * 0.8, h]], p.armor, 2.2);
  plate(ctx, [[-w * 0.35, -h * 0.75], [w * 0.65, -h * 0.7], [w * 0.85, -h * 0.3], [w * 0.85, h * 0.3], [w * 0.65, h * 0.7], [-w * 0.35, h * 0.75]], p.frame, 1.6);
  ctx.fillStyle = p.crest;
  ctx.fillRect(w * 0.35, -h * 0.5, w * 0.3, h * 0.22);
  ctx.fillRect(w * 0.35, h * 0.28, w * 0.3, h * 0.22);
  plate(ctx, [[-w * 0.15, -h * 0.22], [w * 0.25, -h * 0.22], [w * 0.25, h * 0.22], [-w * 0.15, h * 0.22]], p.trim, 1.2);
}

function nozzles(ctx: CanvasRenderingContext2D, id: MechId) {
  const b = MECH_BOOSTERS[id];
  for (const [x, y] of b.ports) thruster(ctx, x, y, 6, 5 * Math.max(0.8, b.size), b.color);
}

/** Player mech, roughly ±32px, facing +x. Each mech has its own body plan. */
export function drawMecha(ctx: CanvasRenderingContext2D, id: MechId, weaponKind: WeaponKind) {
  const p = MECH_PALETTES[id];
  ctx.save();
  switch (id) {
    case "aether": {
      // slim interceptor: long swept V-wings, narrow shoulders, long beam rifle
      both(ctx, [[-10, -6], [-32, -30], [-26, -32], [-4, -10]], p.armor, 1.8);
      both(ctx, [[-22, -20], [-30, -29], [-27, -30], [-19, -21]], p.frame, 1);
      plate(ctx, [[-20, -7], [-8, -9], [-8, 9], [-20, 7]], "#5a6070", 2);
      nozzles(ctx, id);
      both(ctx, [[-6, -14], [4, -14], [6, -18], [-4, -20]], p.armor, 1.8);
      plate(ctx, [[0, 7], [12, 7], [12, 14], [0, 14]], p.armor, 1.6);
      weapon(ctx, "beam", p);
      torso(ctx, p, 10, 11);
      ctx.translate(2, 0);
      head(ctx, "vfin", p);
      break;
    }
    case "forge": {
      // squat heavy artillery: wide tread skirt, twin box missile pods, rotary cannon
      both(ctx, [[-26, -22], [-6, -22], [-6, -12], [-26, -12]], "#2b2f38", 2); // treads
      ctx.fillStyle = "#4a4f5c";
      for (let i = 0; i < 5; i++) for (const sg of [-1, 1]) ctx.fillRect(-25 + i * 4, sg * 17 - 4, 2, 8);
      plate(ctx, [[-24, -11], [-10, -12], [-10, 12], [-24, 11]], p.frame, 2);
      nozzles(ctx, id);
      both(ctx, [[-12, -14], [10, -14], [12, -30], [-12, -30]], p.armor, 2.2); // huge pods
      for (const sg of [-1, 1]) {
        ctx.fillStyle = INK;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) ctx.fillRect(-9 + i * 5, sg * (18 + j * 6) - 2, 3.5, 4);
      }
      weapon(ctx, "gatling", p);
      torso(ctx, p, 13, 13);
      ctx.translate(4, 0);
      head(ctx, "visor", p);
      break;
    }
    case "scythe": {
      // tall slim reaper: trailing blade-cloak fins, single central booster, huge glaive arc
      both(ctx, [[-6, -6], [-30, -18], [-36, -10], [-14, -2]], p.frame, 1.6);
      both(ctx, [[-8, -8], [-26, -26], [-30, -22], [-12, -6]], p.armor, 1.6);
      nozzles(ctx, id);
      plate(ctx, [[-16, -5], [-6, -7], [-6, 7], [-16, 5]], "#3a3045", 1.8);
      plate(ctx, [[0, 6], [14, 6], [14, 12], [0, 12]], p.armor, 1.6);
      weapon(ctx, "melee", p);
      plate(ctx, [[-8, -9], [8, -8], [14, -3], [14, 3], [8, 8], [-8, 9]], p.armor, 2); // narrow long torso
      plate(ctx, [[-2, -6], [9, -5], [12, 0], [9, 5], [-2, 6]], p.frame, 1.4);
      ctx.translate(5, 0);
      head(ctx, "horn", p);
      break;
    }
    case "dune": {
      // round hover-tank: circular skirt, big tower shield in front, stubby shotgun
      ctx.fillStyle = shade(p.frame, -0.1);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(-6, 0, 18, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      nozzles(ctx, id);
      both(ctx, [[-10, -12], [8, -12], [10, -22], [-8, -24]], p.armor, 2);
      plate(ctx, [[8, 8], [26, 8], [30, 11], [30, 15], [8, 15]], "#4a4f5c", 1.8);
      torso(ctx, p, 11, 12);
      plate(ctx, [[14, -26], [24, -20], [26, 0], [24, 4], [14, 2]], p.armor, 2.4); // tower shield
      plate(ctx, [[17, -20], [22, -16], [22, -6], [17, -8]], p.trim, 1.2);
      ctx.translate(0, 0);
      head(ctx, "crest", p);
      break;
    }
    case "serpent": {
      // long segmented predator: tail segments trailing, claw fangs forward, no wings
      for (let i = 3; i >= 1; i--) {
        const x = -10 - i * 8;
        const r = 7 - i;
        plate(ctx, [[x - r, -r], [x + r, -r - 1], [x + r + 2, 0], [x + r, r + 1], [x - r, r]], i % 2 ? p.armor : p.frame, 1.6);
      }
      nozzles(ctx, id);
      both(ctx, [[2, -10], [20, -14], [26, -8], [10, -6]], p.armor, 1.8); // claw arms
      both(ctx, [[20, -14], [30, -12], [26, -8]], "#d8f0e0", 1.2);
      plate(ctx, [[-12, -9], [6, -10], [12, -4], [12, 4], [6, 10], [-12, 9]], p.armor, 2);
      plate(ctx, [[-6, -6], [8, -6], [10, 0], [8, 6], [-6, 6]], p.frame, 1.4);
      weapon(ctx, "fang", p);
      ctx.translate(3, 0);
      head(ctx, "vfin", p);
      break;
    }
    case "storm": {
      // delta-wing caster: broad triangular wings, 4 floating bits, edge boosters
      both(ctx, [[-4, -8], [-24, -32], [-18, -8]], p.armor, 2);
      both(ctx, [[-10, -12], [-20, -26], [-16, -12]], p.frame, 1.2);
      for (const [x, y] of [[8, -28], [8, 28], [-4, -36], [-4, 36]] as const) {
        plate(ctx, [[x - 4, y - 2], [x + 4, y - 3], [x + 6, y], [x + 4, y + 3], [x - 4, y + 2]], p.crest, 1.4);
        lens(ctx, x + 3, y, 1.2, p.eye);
      }
      nozzles(ctx, id);
      plate(ctx, [[-14, -6], [-6, -8], [-6, 8], [-14, 6]], "#5a6070", 1.8);
      weapon(ctx, "arc", p);
      torso(ctx, p, 10, 10);
      ctx.translate(2, 0);
      head(ctx, "vfin", p);
      break;
    }
    case "vulture": {
      // hunched gunship: folded forward talon-wings, spine-length mortar cannon
      both(ctx, [[-14, -10], [6, -26], [12, -22], [-6, -8]], p.frame, 1.8);
      both(ctx, [[6, -26], [16, -26], [12, -22]], "#d9d9d9", 1.2);
      plate(ctx, [[-22, -10], [-10, -12], [-10, 12], [-22, 10]], p.frame, 2);
      nozzles(ctx, id);
      torso(ctx, p, 12, 12);
      plate(ctx, [[-24, -4], [24, -3], [28, 0], [24, 3], [-24, 4]], "#4a4f5c", 2); // spine cannon
      plate(ctx, [[24, -5], [32, -5], [32, 5], [24, 5]], "#2b2f38", 1.6);
      ctx.fillStyle = p.trim;
      ctx.fillRect(-4, -2, 10, 4);
      ctx.translate(-2, 9);
      ctx.scale(0.85, 0.85);
      head(ctx, "horn", p);
      break;
    }
    case "cross": {
      // tall knight: cross-shaped booster frame, long tabard panels, giant lance
      plate(ctx, [[-30, -3], [-8, -3], [-8, 3], [-30, 3]], p.frame, 1.8); // cross spine
      plate(ctx, [[-23, -14], [-19, -14], [-19, 14], [-23, 14]], p.frame, 1.8); // cross bar
      both(ctx, [[-4, -12], [-24, -18], [-26, -14], [-6, -8]], p.armor, 1.6); // tabard panels
      nozzles(ctx, id);
      both(ctx, [[-8, -12], [8, -12], [10, -20], [-6, -24]], p.armor, 2);
      both(ctx, [[-4, -22], [6, -19], [4, -16], [-6, -18]], p.crest, 1.2);
      weapon(ctx, "lance", p);
      torso(ctx, p, 11, 12);
      ctx.translate(3, 0);
      head(ctx, "cross", p);
      break;
    }
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
          lens(ctx, 0, sg * len * 0.7, Math.max(1.6, width * 0.16), p.crest);
          ctx.restore();
        }
      };
      wing(-10, 20, 13, 0.75, p.frame); // hind wings swept back
      wing(-2, 26, 16, 0.2, p.armor); // fore wings
      nozzles(ctx, id);
      // lantern abdomen (segmented, glowing)
      ctx.save();
      ctx.shadowColor = p.crest;
      ctx.shadowBlur = 10;
      plate(ctx, [[-26, -5], [-14, -7], [-10, 0], [-14, 7], [-26, 5], [-30, 0]], p.crest, 1.8);
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
      ctx.shadowColor = p.crest;
      ctx.shadowBlur = 8;
      lens(ctx, -3, 0, 3.4, p.crest);
      ctx.restore();
      // chimney stack (offset, smoking)
      plate(ctx, [[-16, -6], [-8, -6], [-8, -1], [-16, -1]], p.trim, 1.6);
      ctx.fillStyle = INK;
      ctx.fillRect(-14.5, -5, 5, 3);
      // ember grate snout
      plate(ctx, [[16, -7], [26, -5], [28, 0], [26, 5], [16, 7]], p.frame, 2);
      ctx.fillStyle = p.crest;
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
        plate(ctx, [[x, y], [x - 3, y - 4], [x + 3, y - 4]], p.crest, 1);
        plate(ctx, [[x, y], [x + 3, y + 4], [x - 3, y + 4]], p.crest, 1);
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
  ace: { armor: "#c42e2e", dark: "#701818", eye: "#ff9ad0" },
  titan: { armor: "#5a4a3c", dark: "#2e241c", eye: "#ff4a2a" },
};

function monoHead(ctx: CanvasRenderingContext2D, s: GruntStyle, r = 6, horn = false) {
  ctx.fillStyle = s.armor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = s.dark;
  ctx.fillRect(-r, r * 0.15, r * 2, r);
  ctx.restore();
  ctx.stroke();
  // mono-eye rail + eye
  ctx.fillStyle = INK;
  ctx.fillRect(r * 0.3, -r * 0.7, r * 0.6, r * 1.4);
  lens(ctx, r * 0.65, 0, r * 0.28, s.eye);
  if (horn) plate(ctx, [[0, -2], [r + 9, -1], [r + 9, 1], [0, 2]], "#f2d24a", 1.2);
}

function grunt(ctx: CanvasRenderingContext2D, s: GruntStyle, opts: { heavy?: boolean; horn?: boolean; weapon?: "mg" | "rifle" | "axe" | "shield" | "cannon" }) {
  const k = opts.heavy ? 1.25 : 1;
  ctx.save();
  ctx.scale(k, k);
  plate(ctx, [[-16, -8], [-8, -10], [-8, 10], [-16, 8]], s.dark, 1.8); // backpack
  thruster(ctx, -21, 0, 6, 8, "#ff8a5c");
  // rounded shoulders, spiked on the left
  both(ctx, [[-8, -10], [4, -10], [6, -16], [-2, -19], [-10, -15]], s.armor, 1.8);
  if (opts.horn || opts.weapon === "axe") {
    for (const [x, y] of [[-6, -19], [0, -20]] as const) plate(ctx, [[x - 2, y + 2], [x, y - 5], [x + 2, y + 2]], "#d8d8d8", 1);
  }
  // body
  plate(ctx, [[-10, -10], [6, -10], [10, -4], [10, 4], [6, 10], [-10, 10]], s.armor, 2);
  // hoses (signature grunt detail)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) ctx.arc(-2 + i * 2.5, sgn * 6, 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }
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
  monoHead(ctx, s, 6, opts.horn);
  ctx.restore();
}

/** Enemy sprites by kind, facing +x. */
export function drawMechaEnemy(ctx: CanvasRenderingContext2D, kind: string): boolean {
  switch (kind) {
    case "drone": {
      // spherical mono-eye pod with stub fins
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
      ctx.fillStyle = INK;
      ctx.fillRect(2, -4, 4, 8);
      lens(ctx, 4.5, 0, 2, "#ff3a4a");
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
      // commander custom: sleeker, horned, twin thrusters
      grunt(ctx, GRUNT.ace!, { horn: true, weapon: "rifle" });
      thruster(ctx, -26, -6, 5, 5, "#ff9ad0");
      thruster(ctx, -26, 6, 5, 5, "#ff9ad0");
      return true;
    case "titan": {
      // mobile armour: wide hull, claw arms, big mono-eye
      const s = GRUNT.titan!;
      both(ctx, [[-4, -14], [16, -24], [26, -18], [22, -12], [8, -10]], s.dark, 2); // claw arm
      both(ctx, [[20, -20], [30, -16], [24, -14]], "#d8d8d8", 1.2); // claw tips
      plate(ctx, [[-26, -16], [4, -20], [18, -10], [18, 10], [4, 20], [-26, 16]], s.armor, 2.4);
      plate(ctx, [[-20, -10], [0, -12], [8, -6], [8, 6], [0, 12], [-20, 10]], s.dark, 1.6);
      thruster(ctx, -32, -9, 7, 8, "#ff8a5c");
      thruster(ctx, -32, 9, 7, 8, "#ff8a5c");
      ctx.fillStyle = INK;
      ctx.fillRect(8, -7, 6, 14);
      lens(ctx, 11, 0, 3.4, s.eye);
      return true;
    }
    case "warden": {
      // fortress mobile armour: hexagonal core ringed by weapon pods
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
