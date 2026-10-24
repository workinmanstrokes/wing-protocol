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
};

type Head = "vfin" | "crest" | "horn" | "cross" | "visor";
const HEADS: Record<MechId, Head> = {
  aether: "vfin", forge: "visor", scythe: "horn", dune: "crest", serpent: "vfin", storm: "vfin", vulture: "horn", cross: "cross",
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

/** Player mech, roughly ±30px, facing +x. */
export function drawMecha(ctx: CanvasRenderingContext2D, id: MechId, weaponKind: WeaponKind) {
  const p = MECH_PALETTES[id];
  const heavy = id === "forge" || id === "dune" || id === "vulture";
  const winged = id === "storm" || id === "aether" || id === "cross";
  ctx.save();
  // backpack + thrusters (behind)
  if (winged) {
    both(ctx, [[-14, -6], [-30, -26], [-24, -28], [-8, -10]], p.armor, 1.8);
    both(ctx, [[-20, -14], [-28, -24], [-25, -25], [-17, -15]], p.frame, 1);
  }
  plate(ctx, [[-20, -9], [-8, -11], [-8, 11], [-20, 9]], heavy ? p.frame : "#5a6070", 2);
  thruster(ctx, -26, -5, 7, 6, p.glow);
  thruster(ctx, -26, 5, 7, 6, p.glow);
  // legs / skirt peeking out behind the torso
  both(ctx, [[-12, -4], [-4, -6], [-4, -2], [-12, -1]], p.armor, 1.6);
  // shoulders
  const sh = heavy ? 24 : 20;
  both(ctx, [[-8, -sh + 6], [6, -sh + 6], [8, -sh], [-2, -sh - 4], [-10, -sh + 1]], p.armor, 2);
  both(ctx, [[-2, -sh - 3], [6, -sh + 1], [4, -sh + 4], [-4, -sh]], p.trim, 1.2);
  // forearm on weapon side
  plate(ctx, [[0, 7], [12, 7], [12, 16], [0, 16]], p.armor, 1.8);
  plate(ctx, [[8, 7], [12, 7], [12, 16], [8, 16]], p.trim, 1.2);
  weapon(ctx, weaponKind, p);
  // torso: armour shell + coloured chest block + vents
  plate(ctx, [[-10, -12], [6, -13], [12, -6], [12, 6], [6, 13], [-10, 12]], p.armor, 2.2);
  plate(ctx, [[-4, -10], [8, -9], [10, -4], [10, 4], [8, 9], [-4, 10]], p.frame, 1.6);
  ctx.fillStyle = p.crest;
  for (const y of [-6, 3]) ctx.fillRect(4, y, 4, 3); // chest vents
  plate(ctx, [[-2, -3], [3, -3], [3, 3], [-2, 3]], p.trim, 1.2); // cockpit hatch
  // head on top
  ctx.translate(2, 0);
  head(ctx, HEADS[id], p);
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
      grunt(ctx, GRUNT.crawler!, { heavy: true, weapon: "cannon" });
      return true;
    case "charger":
      grunt(ctx, GRUNT.charger!, { weapon: "axe" });
      return true;
    case "sniper":
      grunt(ctx, GRUNT.sniper!, { weapon: "rifle" });
      return true;
    case "shielder":
      grunt(ctx, GRUNT.shielder!, { weapon: "shield" });
      return true;
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
