/**
 * Top-down player suits. Each body plan is different (needle, slab, crescent,
 * disc, serpent, mast, flying wing, cross, four-wing, dome, diamond).
 * Facing +x. Hangar portraits and the combat sprite both call `drawLineup`.
 */
import type { MechId } from "./types";

type Pt = readonly [number, number];

export const LINEUP_PORTS: Record<MechId, readonly Pt[]> = {
  aether: [[-22, 0]],
  forge: [[-20, -7], [-20, 7]],
  scythe: [[-18, 0]],
  dune: [[-20, 0]],
  serpent: [[-26, 2]],
  storm: [[-16, 0]],
  vulture: [[-8, 0]],
  cross: [[-12, 0]],
  moth: [[-24, -5], [-24, 5]],
  kiln: [[-22, -7], [-22, 7]],
  kite: [[-14, 0]],
};

function poly(ctx: CanvasRenderingContext2D, pts: readonly Pt[], fill: string, stroke = "#12141c", lw = 1.7) {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function gradPoly(ctx: CanvasRenderingContext2D, pts: readonly Pt[], a: string, b: string, stroke = "#12141c", lw = 1.7) {
  let minX = 99, minY = 99, maxX = -99, maxY = -99;
  for (const p of pts) {
    minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
  }
  const g = ctx.createLinearGradient(minX, minY, maxX, maxY);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  poly(ctx, pts, a, stroke, lw);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke = "#12141c", lw = 1.6) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, core: string, color: string) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function rivet(ctx: CanvasRenderingContext2D, x: number, y: number) {
  disc(ctx, x, y, 1.15, "#1a1c22", "#1a1c22", 0.4);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(x - 0.7, y - 0.7, 0.8, 0.8);
}

function nozzle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  poly(ctx, [[x + 4, y - 3.2], [x, y - 2.4], [x, y + 2.4], [x + 4, y + 3.2]], "#2a3140");
  glow(ctx, x - 1, y, 1.6, "#fff6e8", color);
}

function canopy(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, eye: string) {
  gradPoly(ctx, [[x, y - h], [x + w, y - h * 0.6], [x + w, y + h * 0.6], [x, y + h]], "#243044", "#101820", "#0c1016", 1.3);
  glow(ctx, x + w * 0.62, y, Math.min(2.2, h * 0.7), "#f4fbff", eye);
}

export function drawLineup(ctx: CanvasRenderingContext2D, id: MechId) {
  switch (id) {
    case "aether": drawAether(ctx); break;
    case "forge": drawForge(ctx); break;
    case "scythe": drawScythe(ctx); break;
    case "dune": drawDune(ctx); break;
    case "serpent": drawSerpent(ctx); break;
    case "storm": drawStorm(ctx); break;
    case "vulture": drawVulture(ctx); break;
    case "cross": drawCross(ctx); break;
    case "moth": drawMoth(ctx); break;
    case "kiln": drawKiln(ctx); break;
    case "kite": drawKite(ctx); break;
  }
}

function drawAether(ctx: CanvasRenderingContext2D) {
  const ice = "#e7f3fb";
  const iceD = "#8ea8bc";
  const cyan = "#5ec8e8";
  // high swept wings, drawn first
  gradPoly(ctx, [[-6, -4], [-2, -30], [8, -16], [6, -5]], ice, iceD);
  gradPoly(ctx, [[-6, 4], [-2, 30], [8, 16], [6, 5]], ice, iceD);
  glow(ctx, 0, -26, 1.3, "#f4fdff", cyan);
  glow(ctx, 0, 26, 1.3, "#f4fdff", cyan);
  // needle fuselage
  gradPoly(ctx, [[-20, -4], [14, -5], [22, 0], [14, 5], [-20, 4]], ice, "#b7c8d6");
  // twin spinal lances
  poly(ctx, [[12, -5], [36, -3.2], [36, -1.2], [12, -2.4]], "#243240");
  poly(ctx, [[12, 5], [36, 3.2], [36, 1.2], [12, 2.4]], "#243240");
  glow(ctx, 36, -2.2, 1.5, "#f4fdff", cyan);
  glow(ctx, 36, 2.2, 1.5, "#f4fdff", cyan);
  canopy(ctx, -2, 0, 10, 3.2, cyan);
  nozzle(ctx, -22, 0, "#ff8a4a");
  rivet(ctx, -8, -2.2);
  rivet(ctx, -8, 2.2);
}

function drawForge(ctx: CanvasRenderingContext2D) {
  const red = "#d45348";
  const redD = "#7a2c26";
  const bone = "#efe4d2";
  // shoulder missile racks, tall and boxy
  for (const sy of [-1, 1]) {
    gradPoly(ctx, [[-10, sy * 12], [8, sy * 12], [8, sy * 22], [-10, sy * 22]], "#8a847c", "#4e4a44");
    ctx.fillStyle = "#1a1412";
    for (let i = 0; i < 3; i++) ctx.fillRect(-7 + i * 4, sy * 14, 2.2, sy * 6);
  }
  gradPoly(ctx, [[-16, -14], [12, -14], [16, -8], [16, 8], [12, 14], [-16, 14]], red, redD);
  gradPoly(ctx, [[-8, -8], [6, -8], [6, 8], [-8, 8]], bone, "#c4b49a", "#3a241c", 1.2);
  // rotary snout
  gradPoly(ctx, [[10, -7], [28, -7], [30, 0], [28, 7], [10, 7]], "#a33e36", "#5c221c");
  disc(ctx, 26, -3.2, 2.4, "#2a1612");
  disc(ctx, 26, 3.2, 2.4, "#2a1612");
  glow(ctx, 0, 0, 2.4, "#ffe7a8", "#ff9a3a");
  nozzle(ctx, -20, -7, "#ff9a3a");
  nozzle(ctx, -20, 7, "#ff9a3a");
  for (const [x, y] of [[-12, -10], [8, -10], [-12, 10], [8, 10]] as const) rivet(ctx, x, y);
}

function drawScythe(ctx: CanvasRenderingContext2D) {
  const edge = "#3aff7a";
  // trailing cloak, one side longer
  poly(ctx, [[-8, -6], [-22, -16], [-16, -2]], "#14181e");
  poly(ctx, [[-6, 4], [-20, 14], [-14, 2]], "#10141a");
  // crescent hull
  gradPoly(ctx, [[-16, -3], [4, -14], [12, -4], [8, 2], [2, 12], [-14, 6]], "#2a313c", "#12161c", edge, 1.5);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-10, -1);
  ctx.quadraticCurveTo(2, -8, 8, -2);
  ctx.stroke();
  // single glaive on the upper side
  ctx.save();
  ctx.shadowColor = edge;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(6, -2);
  ctx.quadraticCurveTo(24, -6, 30, -20);
  ctx.quadraticCurveTo(22, -8, 10, 1);
  ctx.stroke();
  ctx.restore();
  glow(ctx, 8, -1, 1.5, "#e8ffe8", edge);
  poly(ctx, [[-4, -1.2], [6, -1.2], [6, 1.2], [-4, 1.2]], "#e8c84a", "#1a1408", 0.8);
  nozzle(ctx, -18, 0, edge);
}

function drawDune(ctx: CanvasRenderingContext2D) {
  const sand = "#e7d3ae";
  const sandD = "#b3966c";
  const copper = "#b06040";
  // short body behind the shield
  gradPoly(ctx, [[-16, -9], [2, -8], [4, 0], [2, 8], [-16, 9]], sand, sandD);
  // big forward disc
  ctx.beginPath();
  ctx.arc(8, 0, 16, -1.15, 1.15);
  ctx.lineTo(4, 0);
  ctx.closePath();
  const g = ctx.createRadialGradient(4, -4, 2, 8, 0, 16);
  g.addColorStop(0, "#f3e6cc");
  g.addColorStop(1, sandD);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = copper;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = "#12141c";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // scattergun through the boss of the shield
  poly(ctx, [[14, -3], [32, -7], [32, 7], [14, 3]], copper);
  ctx.fillStyle = "#3a2418";
  for (const y of [-3.5, 0, 3.5]) disc(ctx, 29, y, 1.35, "#3a2418", "#1a100c", 0.6);
  canopy(ctx, -8, 0, 8, 3.4, "#ffcf8a");
  nozzle(ctx, -20, 0, "#5eb6ff");
  rivet(ctx, -10, -5);
  rivet(ctx, -10, 5);
}

function drawSerpent(ctx: CanvasRenderingContext2D) {
  const jade = "#2f9a68";
  const jadeD = "#145c38";
  const gold = "#e4c56a";
  const segs: Pt[] = [[-22, 3], [-12, -5], [-2, 4], [8, -3], [16, 2]];
  segs.forEach(([x, y], i) => {
    const r = 7.2 - i * 0.35;
    gradPoly(ctx, [[x - r, y - r * 0.7], [x + r * 0.8, y - r * 0.45], [x + r, y], [x + r * 0.8, y + r * 0.45], [x - r, y + r * 0.7]], i % 2 ? jade : "#3aaf78", jadeD, "#0e2418", 1.4);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, -0.8, 0.8);
    ctx.stroke();
  });
  // twin fangs
  poly(ctx, [[16, -2], [30, -8], [28, -5], [16, 0]], "#d8fff0", "#0e2418", 1.1);
  poly(ctx, [[16, 2], [30, 8], [28, 5], [16, 0]], "#d8fff0", "#0e2418", 1.1);
  glow(ctx, 28, -6.2, 1.2, "#f4fffb", "#8ae0ff");
  glow(ctx, 28, 6.2, 1.2, "#f4fffb", "#8ae0ff");
  glow(ctx, 16, 2, 1.8, "#e8fff4", "#8ae0ff");
  nozzle(ctx, -26, 3, "#8ae0ff");
}

function drawStorm(ctx: CanvasRenderingContext2D) {
  const body = "#d5e4f6";
  const bodyD = "#7e96b4";
  const mag = "#ff3a7a";
  // three coil masts: up, down, back
  const masts: Pt[] = [[-2, -28], [-2, 28], [-22, 0]];
  for (const [x, y] of masts) {
    ctx.strokeStyle = "#3a4c62";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.strokeStyle = mag;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(x * 0.55, y * 0.55, 3.2, 0, Math.PI * 1.4);
    ctx.stroke();
    glow(ctx, x, y, 2, "#ffe4ef", mag);
  }
  disc(ctx, 0, 0, 11, body, "#12141c", 1.8);
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0.2, Math.PI);
  ctx.strokeStyle = bodyD;
  ctx.lineWidth = 4;
  ctx.stroke();
  // short arc projector
  poly(ctx, [[8, -3], [24, -2.2], [24, 2.2], [8, 3]], "#3a4c62");
  glow(ctx, 24, 0, 1.7, "#f4fdff", "#7ad8ff");
  glow(ctx, 2, 0, 2.2, "#fff", mag);
}

function drawVulture(ctx: CanvasRenderingContext2D) {
  const wing = "#7d8450";
  const wingD = "#3e4228";
  const amber = "#e7a23a";
  // one flying wing — a single chevron, not a fuselage with flaps
  gradPoly(ctx, [[18, 0], [-2, -32], [-14, -18], [-6, 0], [-14, 18], [-2, 32]], wing, wingD);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, 0); ctx.lineTo(-4, -22);
  ctx.moveTo(10, 0); ctx.lineTo(-4, 22);
  ctx.stroke();
  // open bay
  poly(ctx, [[-2, -6], [8, -5], [8, 5], [-2, 6]], "#1c1e14");
  for (const y of [-3, 0, 3]) disc(ctx, 3, y, 1.3, amber, "#1c1e14", 0.5);
  glow(ctx, 14, 0, 1.8, "#f4ffe4", "#7ae070");
  nozzle(ctx, -8, 0, "#7ae070");
  rivet(ctx, -2, -14);
  rivet(ctx, -2, 14);
}

function drawCross(ctx: CanvasRenderingContext2D) {
  const ivory = "#f4efe4";
  const ivoryD = "#c8bfa8";
  const gold = "#e6c15a";
  const cyan = "#5ae0ff";
  // halo behind the cross
  ctx.beginPath();
  ctx.arc(-2, 0, 16, 0.4, Math.PI * 2 - 0.4);
  ctx.strokeStyle = "rgba(90,224,255,0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // vertical bar of the cross
  gradPoly(ctx, [[-6, -24], [4, -24], [4, 24], [-6, 24]], ivory, ivoryD);
  // horizontal bar
  gradPoly(ctx, [[-10, -6], [16, -6], [16, 6], [-10, 6]], ivory, ivoryD);
  poly(ctx, [[-1.4, -16], [1.4, -16], [1.4, 16], [-1.4, 16]], gold, "#3a3014", 0.6);
  poly(ctx, [[-8, -1.4], [12, -1.4], [12, 1.4], [-8, 1.4]], gold, "#3a3014", 0.6);
  // long lance
  poly(ctx, [[14, -1.6], [36, -1.1], [36, 1.1], [14, 1.6]], "#8a8270");
  glow(ctx, 36, 0, 1.7, "#f4fdff", cyan);
  canopy(ctx, -2, 0, 8, 3, cyan);
  nozzle(ctx, -12, 0, cyan);
}

function drawMoth(ctx: CanvasRenderingContext2D) {
  const wing = "#efe2c4";
  const wingD = "#b7a27a";
  const frame = "#6a5a8a";
  const amber = "#ffb347";
  // four separate wing panels, not one pair
  const panels: readonly [number, number, number, number][] = [
    [-4, -8, 16, -0.15],
    [-4, 8, 16, 0.15],
    [-14, -6, 12, -0.9],
    [-14, 6, 12, 0.9],
  ];
  for (const [rx, ry, len, ang] of panels) {
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(Math.sign(ry) * Math.abs(ang) + (ry < 0 ? -0.4 : 0.4));
    gradPoly(ctx, [[0, 0], [6, Math.sign(ry) * len * 0.35], [0, Math.sign(ry) * len], [-7, Math.sign(ry) * len * 0.4]], wing, wingD);
    glow(ctx, -1, Math.sign(ry) * len * 0.62, 1.6, "#fff6e0", amber);
    ctx.restore();
  }
  // lantern abdomen
  glow(ctx, -18, 0, 5, "#fff1c8", amber);
  disc(ctx, -18, 0, 5, amber, "#12141c", 1.4);
  ctx.fillStyle = "#1a140c";
  ctx.fillRect(-21, -4, 1.2, 8);
  ctx.fillRect(-17, -4.5, 1.2, 9);
  gradPoly(ctx, [[-8, -6], [10, -5], [12, 0], [10, 5], [-8, 6]], frame, "#3a3050");
  // antennae
  ctx.strokeStyle = "#12141c";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(10, -2); ctx.quadraticCurveTo(20, -6, 26, -14);
  ctx.moveTo(10, 2); ctx.quadraticCurveTo(20, 6, 26, 14);
  ctx.stroke();
  glow(ctx, 6, 0, 1.6, "#e8fff8", "#7af0e0");
  nozzle(ctx, -24, -5, amber);
  nozzle(ctx, -24, 5, amber);
}

function drawKiln(ctx: CanvasRenderingContext2D) {
  const brick = "#8d4e30";
  const brickD = "#4a2818";
  const ash = "#c8c2b8";
  const fire = "#ff7a2a";
  // four stub legs splayed
  for (const [x, y] of [[6, -1], [6, 1], [-12, -1], [-12, 1]] as const) {
    const s = y;
    poly(ctx, [[x, s * 8], [x + 8, s * 18], [x + 14, s * 16], [x + 4, s * 7]], brickD);
  }
  // low dome
  ctx.beginPath();
  ctx.ellipse(-2, 0, 20, 13, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(-22, -13, 18, 13);
  g.addColorStop(0, "#c46a42");
  g.addColorStop(1, brickD);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#12141c";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // ash plates
  poly(ctx, [[-14, -6], [-4, -8], [-2, 0], [-4, 8], [-14, 6]], ash, "#12141c", 1.1);
  // chimney
  poly(ctx, [[-8, -13], [-2, -13], [-2, -20], [-8, -20]], brick);
  glow(ctx, -5, -20, 1.5, "#ffe0a0", fire);
  // grate snout
  poly(ctx, [[10, -5], [24, -4], [26, 0], [24, 4], [10, 5]], "#2a1c16");
  ctx.strokeStyle = fire;
  ctx.lineWidth = 1.2;
  for (const y of [-2.2, 0, 2.2]) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(22, y);
    ctx.stroke();
  }
  glow(ctx, 16, 0, 1.6, "#ffe7c0", fire);
  nozzle(ctx, -22, -7, fire);
  nozzle(ctx, -22, 7, fire);
}

function drawKite(ctx: CanvasRenderingContext2D) {
  const sail = "#3a78c4";
  const sailD = "#1c3e72";
  const rose = "#ff5a8a";
  const spar = "#f2efe8";
  // long ribbon tail first
  ctx.strokeStyle = rose;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  for (let i = 1; i <= 5; i++) ctx.lineTo(-12 - i * 5, Math.sin(i * 1.3) * 5);
  ctx.stroke();
  for (const i of [2, 4]) {
    const x = -12 - i * 5;
    const y = Math.sin(i * 1.3) * 5;
    poly(ctx, [[x, y], [x - 4, y - 3], [x + 1, y]], rose, "#12141c", 0.8);
  }
  // diamond sail, two tones
  gradPoly(ctx, [[22, 0], [0, -26], [-14, 0]], sail, "#8eb6e4");
  gradPoly(ctx, [[22, 0], [-14, 0], [0, 26]], sailD, sail);
  // cross spars
  ctx.strokeStyle = spar;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(22, 0); ctx.lineTo(-14, 0);
  ctx.moveTo(0, -26); ctx.lineTo(0, 26);
  ctx.stroke();
  // wingtip blades on tethers
  for (const s of [-1, 1]) {
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, s * 26);
    ctx.lineTo(10, s * 30);
    ctx.stroke();
    poly(ctx, [[8, s * 28], [18, s * 30], [12, s * 33]], rose);
  }
  gradPoly(ctx, [[-2, -4], [10, -3.2], [12, 0], [10, 3.2], [-2, 4]], "#1e2a44", "#121826", rose, 1.2);
  glow(ctx, 8, 0, 1.7, "#ffe4ee", rose);
  nozzle(ctx, -14, 0, rose);
}
