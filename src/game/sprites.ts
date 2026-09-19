import type { MechId } from "./types";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function plate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | CanvasGradient,
  stroke: string,
  r = 2,
) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function poly(
  ctx: CanvasRenderingContext2D,
  pts: number[][],
  fill: string | CanvasGradient,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
}

/** Diagonal light-to-dark shading gradient, used to give flat plates a sense of form. */
function shade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  light: string,
  dark: string,
) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  return g;
}

function polyGrad(
  ctx: CanvasRenderingContext2D,
  pts: number[][],
  light: string,
  dark: string,
  stroke?: string,
) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p[1]! < minY) minY = p[1]!;
    if (p[1]! > maxY) maxY = p[1]!;
  }
  poly(ctx, pts, shade(ctx, 0, minY, 0, maxY - minY || 1, light, dark), stroke);
}

function plateGrad(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  light: string,
  dark: string,
  stroke: string,
  r = 2,
) {
  plate(ctx, x, y, w, h, shade(ctx, x, y, w, h, light, dark), stroke, r);
}

/** Small emissive dot — cockpit lights, eyes, thruster nozzles. */
function glowDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  core: string,
  glow: string,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  g.addColorStop(0, core);
  g.addColorStop(0.55, glow);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Energy-blade stroke: a soft outer glow under a crisp bright core line. */
function energyStroke(
  ctx: CanvasRenderingContext2D,
  build: (c: CanvasRenderingContext2D) => void,
  core: string,
  glow: string,
) {
  ctx.save();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.4;
  build(ctx);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = core;
  ctx.lineWidth = 1.6;
  build(ctx);
  ctx.restore();
}

const INK = "#14141a";

export function drawMechTop(ctx: CanvasRenderingContext2D, id: MechId, flash = 0) {
  ctx.save();
  if (flash > 0) ctx.globalCompositeOperation = "lighter";
  switch (id) {
    case "aether":
      drawAether(ctx);
      break;
    case "forge":
      drawForge(ctx);
      break;
    case "scythe":
      drawScythe(ctx);
      break;
    case "dune":
      drawDune(ctx);
      break;
    case "serpent":
      drawSerpent(ctx);
      break;
  }
  ctx.restore();
}

function drawAether(ctx: CanvasRenderingContext2D) {
  const w = "#f2f6fa";
  const wDim = "#a8b6c4";
  const a = "#5ec8e8";
  const d = "#212a36";
  // swept wings, top & bottom, drawn first so the fuselage overlaps them
  polyGrad(ctx, [[-18, -22], [-6, -28], [4, -18], [4, -8]], w, wDim, d);
  polyGrad(ctx, [[-18, 22], [-6, 28], [4, 18], [4, 8]], w, wDim, d);
  glowDot(ctx, -6, -27, 1, "#eafcff", a);
  glowDot(ctx, -6, 27, 1, "#eafcff", a);
  // main delta body
  polyGrad(ctx, [[-18, -22], [8, -16], [8, 16], [-18, 22]], "#dbe4ec", "#aab6c2", d);
  plateGrad(ctx, -10, -8, 22, 16, "#fafcfe", "#c7d1da", d, 3);
  plateGrad(ctx, 8, -4, 18, 8, "#eef3f7", "#c2cdd8", d, 2);
  // twin beam rifles, glowing tips
  ctx.fillStyle = "#3a4552";
  ctx.fillRect(20, -6.5, 12, 2.4);
  ctx.fillRect(20, 4.1, 12, 2.4);
  ctx.fillStyle = a;
  ctx.fillRect(24, -2.5, 14, 5);
  glowDot(ctx, 33, -5.3, 1.3, "#dafffc", a);
  glowDot(ctx, 33, 5.3, 1.3, "#dafffc", a);
  // cockpit canopy
  plateGrad(ctx, -4, -5, 10, 10, "#26313f", "#141b24", d, 2);
  glowDot(ctx, 1, 0, 2, "#c8f2ff", a);
}

function drawForge(ctx: CanvasRenderingContext2D) {
  const r = "#d8564a";
  const rDark = "#7a2620";
  const c = "#e8dcc8";
  const cDark = "#b8a888";
  const d = "#2c1c18";
  // shoulder missile pod
  plateGrad(ctx, -14, -24, 10, 6, "#8a8078", "#5a5248", d, 1);
  ctx.fillStyle = "#1c1210";
  ctx.fillRect(-12, -23, 2, 4);
  ctx.fillRect(-9, -23, 2, 4);
  ctx.fillRect(-6, -23, 2, 4);
  // main armored hull
  plateGrad(ctx, -16, -14, 28, 28, r, rDark, d, 4);
  plateGrad(ctx, -8, -22, 16, 10, c, cDark, d, 2);
  plateGrad(ctx, -8, 12, 16, 10, c, cDark, d, 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (const [rx, ry] of [
    [-13, -11],
    [9, -11],
    [-13, 11],
    [9, 11],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // rotary cannon housing + twin barrels
  plateGrad(ctx, 6, -8, 20, 16, "#a8433a", "#6e2420", d, 3);
  ctx.strokeStyle = "#5a3a30";
  ctx.lineWidth = 1;
  for (const cy of [-3, 3]) {
    ctx.beginPath();
    ctx.arc(26, cy, 3.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(26, cy, 1.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#241612";
  for (let i = 0; i < 5; i++) ctx.fillRect(24, -8 + i * 3.2, 10 + (i % 2), 2.2);
  // furnace core, glowing
  plate(ctx, -6, -6, 12, 12, "#241612", d, 2);
  glowDot(ctx, 0, 0, 2.6, "#ffe27a", "#e8842a");
}

function drawScythe(ctx: CanvasRenderingContext2D) {
  const a = "#c4a574";
  const glow = "#e0c88a";
  const d = "#0a0b10";
  // trailing cloak panels
  poly(ctx, [[-16, -18], [-24, -9], [-14, -6]], "#0d0e13", d);
  poly(ctx, [[-16, 18], [-24, 9], [-14, 6]], "#0d0e13", d);
  // angular stealth body
  polyGrad(ctx, [[-16, -18], [4, -10], [4, 10], [-16, 18]], "#1c1f27", "#0c0d12", d);
  plateGrad(ctx, -10, -7, 20, 14, "#22262f", "#121319", a, 3);
  ctx.strokeStyle = "rgba(196,165,116,0.4)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-9, -3);
  ctx.lineTo(9, -3);
  ctx.moveTo(-9, 3);
  ctx.lineTo(9, 3);
  ctx.stroke();
  // energy glaive
  energyStroke(
    ctx,
    (c) => {
      c.beginPath();
      c.moveTo(10, 4);
      c.quadraticCurveTo(28, 18, 22, -16);
      c.quadraticCurveTo(18, 6, 10, 2);
      c.stroke();
    },
    a,
    glow,
  );
  // gold visor slit
  ctx.fillStyle = "#e8c84a";
  ctx.fillRect(-6, -1.3, 9, 2.6);
  glowDot(ctx, 2, 0, 1.8, "#fff3cf", "#e8c84a");
}

function drawDune(ctx: CanvasRenderingContext2D) {
  const c = "#e0cfae";
  const cDark = "#a88f68";
  const t = "#b06040";
  const d = "#3a2c20";
  // rear stabilizer fins
  poly(ctx, [[-14, -12], [-22, -16], [-18, -6]], cDark, d);
  poly(ctx, [[-14, 12], [-22, 16], [-18, 6]], cDark, d);
  // rounded armored shell
  plateGrad(ctx, -12, -10, 22, 20, c, cDark, d, 6);
  // glowing shield-generator arc
  ctx.save();
  ctx.beginPath();
  ctx.arc(-6, 0, 14, -1.2, 1.2);
  ctx.strokeStyle = "rgba(224,140,90,0.35)";
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = t;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  plateGrad(ctx, 8, -5, 16, 10, "#d4bc94", "#a8916c", d, 2);
  // heat-scattergun, three barrels
  poly(ctx, [[22, -2], [34, -8], [34, 8], [22, 2]], t, d);
  ctx.fillStyle = "#5a3020";
  for (const by of [-4.5, 0, 4.5]) {
    ctx.beginPath();
    ctx.arc(31, by, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  // cockpit viewport
  plateGrad(ctx, -4, -5, 10, 10, "#3a2f22", "#211a13", d, 2);
  glowDot(ctx, -1, 0, 1.8, "#ffcf8a", "#e8a060");
}

function drawSerpent(ctx: CanvasRenderingContext2D) {
  const g = "#3a8259";
  const gDark = "#1c4a30";
  const gold = "#c4b07a";
  const glow = "#7ae0a0";
  const d = "#0f1f15";
  // tail vent glow
  glowDot(ctx, -16, 0, 2, "#a8ffd0", glow);
  polyGrad(ctx, [[-14, -16], [6, -8], [6, 8], [-14, 16]], "#347a52", gDark, d);
  // scale segments along the body
  ctx.strokeStyle = "rgba(20,40,28,0.5)";
  ctx.lineWidth = 1;
  for (const sx of [-9, -4, 1]) {
    ctx.beginPath();
    ctx.arc(sx, 0, 8, -0.9, 0.9);
    ctx.stroke();
  }
  plateGrad(ctx, -8, -7, 20, 14, g, gDark, gold, 4);
  poly(ctx, [[-6, -16], [8, -20], [10, -10]], gold, d);
  poly(ctx, [[-6, 16], [8, 20], [10, 10]], gold, d);
  // curved fang blades, energy glow
  energyStroke(
    ctx,
    (c) => {
      c.beginPath();
      c.moveTo(12, 0);
      c.lineTo(28, 0);
      c.moveTo(24, 0);
      c.quadraticCurveTo(30, -8, 35, -7);
      c.moveTo(24, 0);
      c.quadraticCurveTo(30, 8, 35, 7);
      c.stroke();
    },
    "#8ef0b8",
    glow,
  );
  glowDot(ctx, 2, 0, 2, "#c8ffe0", glow);
}

export function drawEnemyTop(ctx: CanvasRenderingContext2D, id: string, flash = 0) {
  ctx.save();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, flash)})`;
  }
  switch (id) {
    case "drone":
      plate(ctx, -8, -6, 16, 12, "#6a4a38", INK, 3);
      ctx.fillStyle = "#e04030";
      ctx.beginPath();
      ctx.arc(4, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4a3830";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-2, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "walker":
      plate(ctx, -10, -8, 20, 16, "#4a5340", INK, 3);
      plate(ctx, 4, -4, 14, 8, "#3a3834", INK, 2);
      ctx.fillStyle = "#e04030";
      ctx.fillRect(-2, -3, 6, 6);
      plate(ctx, -12, -14, 6, 8, "#3a3834", INK, 1);
      plate(ctx, -12, 6, 6, 8, "#3a3834", INK, 1);
      break;
    case "crawler":
      plate(ctx, -16, -10, 32, 20, "#5a4034", INK, 4);
      plate(ctx, 8, -5, 18, 10, "#3a3028", INK, 2);
      ctx.fillStyle = "#c45c4a";
      ctx.fillRect(24, -2, 10, 4);
      for (const y of [-12, 8]) plate(ctx, -10, y, 8, 6, "#3a3028", INK, 1);
      break;
    case "titan":
      plate(ctx, -18, -16, 36, 32, "#2a2420", "#8a4030", 5);
      plate(ctx, -8, -8, 22, 16, "#3a3028", INK, 3);
      ctx.fillStyle = "#e04030";
      ctx.fillRect(0, -4, 12, 8);
      plate(ctx, -22, -22, 10, 12, "#4a3830", INK, 2);
      plate(ctx, -22, 10, 10, 12, "#4a3830", INK, 2);
      plate(ctx, 16, -20, 14, 10, "#4a3830", INK, 2);
      plate(ctx, 16, 10, 14, 10, "#4a3830", INK, 2);
      break;
    case "ace":
      poly(ctx, [[-16, -14], [18, -6], [18, 6], [-16, 14]], "#1a1014", "#c4453a");
      plate(ctx, -6, -6, 18, 12, "#2a1418", "#c4453a", 2);
      ctx.strokeStyle = "#e8c8c8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, -8);
      ctx.lineTo(28, -16);
      ctx.moveTo(12, 8);
      ctx.lineTo(28, 16);
      ctx.stroke();
      ctx.fillStyle = "#e04030";
      ctx.beginPath();
      ctx.arc(4, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      plate(ctx, -8, -8, 16, 16, "#666", INK, 2);
  }
  if (flash > 0) {
    ctx.globalAlpha = Math.min(0.7, flash);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-20, -20, 40, 40);
  }
  ctx.restore();
}

export function drawPortrait(ctx: CanvasRenderingContext2D, id: MechId, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#18181f");
  g.addColorStop(1, "#0c0c10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w * 0.5, h * 0.58);
  ctx.scale(w / 90, w / 90);
  ctx.rotate(-0.5);
  drawMechTop(ctx, id);
  ctx.restore();
  ctx.strokeStyle = "rgba(236,236,232,0.08)";
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

export function drawPickup(ctx: CanvasRenderingContext2D, kind: string) {
  ctx.save();
  if (kind === "xp") {
    ctx.fillStyle = "#7aa3b8";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c5e0ee";
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "hp") {
    ctx.fillStyle = "#c45c4a";
    ctx.fillRect(-5, -2, 10, 4);
    ctx.fillRect(-2, -5, 4, 10);
  } else if (kind === "key") {
    ctx.strokeStyle = "#d4c4a0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-3, 0, 3.5, 0, Math.PI * 2);
    ctx.moveTo(0, 0);
    ctx.lineTo(8, 0);
    ctx.moveTo(5, 0);
    ctx.lineTo(5, 3);
    ctx.stroke();
  } else if (kind === "credit") {
    ctx.fillStyle = "#c5cdd6";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5.5, -3);
    ctx.lineTo(5.5, 3);
    ctx.lineTo(0, 6);
    ctx.lineTo(-5.5, 3);
    ctx.lineTo(-5.5, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#131318";
    ctx.font = "bold 7px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("C", 0, 0.5);
  } else if (kind === "chest") {
    plate(ctx, -8, -6, 16, 12, "#6a5038", INK, 2);
    ctx.fillStyle = "#d4c4a0";
    ctx.fillRect(-8, -1, 16, 2);
    ctx.fillRect(-2, -3, 4, 4);
  }
  ctx.restore();
}

export function drawWreck(ctx: CanvasRenderingContext2D, seed: number) {
  ctx.save();
  ctx.rotate(seed);
  plate(ctx, -16, -10, 28, 18, "#3a3834", "#1a1a1c", 3);
  plate(ctx, -4, -16, 12, 10, "#4a4038", "#1a1a1c", 2);
  ctx.restore();
}
