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
    case "storm":
      drawStorm(ctx);
      break;
    case "vulture":
      drawVulture(ctx);
      break;
    case "cross":
      drawCross(ctx);
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

function drawStorm(ctx: CanvasRenderingContext2D) {
  const body = "#c8d8f0";
  const bodyDark = "#7a8ca8";
  const a = "#4ad8ff";
  const d = "#1c2838";
  ctx.strokeStyle = "#3a4a5c";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, -10);
  ctx.lineTo(-16, -22);
  ctx.moveTo(-4, 10);
  ctx.lineTo(-16, 22);
  ctx.stroke();
  glowDot(ctx, -16, -22, 1.6, "#eafcff", a);
  glowDot(ctx, -16, 22, 1.6, "#eafcff", a);
  ctx.strokeStyle = "rgba(74,216,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-16, -22);
  ctx.lineTo(-8, -6);
  ctx.lineTo(-16, 22);
  ctx.stroke();
  polyGrad(ctx, [[-14, 0], [0, -16], [22, 0], [0, 16]], body, bodyDark, d);
  plateGrad(ctx, -6, -6, 16, 12, "#e4ecfa", "#a8b8ce", d, 3);
  ctx.fillStyle = "#3a4a5c";
  ctx.fillRect(20, -2, 12, 4);
  glowDot(ctx, 33, 0, 1.6, "#eafcff", a);
  glowDot(ctx, 4, 0, 2.4, "#eafcff", a);
}

function drawVulture(ctx: CanvasRenderingContext2D) {
  const c = "#5c5a48";
  const cDark = "#2e2c22";
  const a = "#c46a2a";
  const d = "#201e16";
  poly(ctx, [[-14, -10], [-26, -18], [-20, -4]], "#3a3828", d);
  poly(ctx, [[-14, 10], [-26, 18], [-20, 4]], "#3a3828", d);
  plateGrad(ctx, -14, -12, 26, 24, c, cDark, d, 5);
  plateGrad(ctx, -6, -6, 14, 12, "#4a483a", "#242216", "#141210", 2);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  for (const [rx, ry] of [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  plateGrad(ctx, 10, -6, 18, 12, "#4a483a", "#242216", d, 2);
  ctx.fillStyle = "#1a1812";
  ctx.beginPath();
  ctx.arc(26, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  glowDot(ctx, 26, 0, 1.6, "#ffb070", a);
  glowDot(ctx, -2, 0, 2, "#ffcf9a", a);
}

function drawCross(ctx: CanvasRenderingContext2D) {
  const c = "#f0ece0";
  const cDark = "#c0b8a0";
  const a = "#e8c84a";
  const d = "#3a3424";
  ctx.strokeStyle = "rgba(232,200,74,0.5)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-6, 0, 15, 0.3, Math.PI * 2 - 0.3);
  ctx.stroke();
  plateGrad(ctx, -12, -11, 24, 22, c, cDark, d, 6);
  ctx.fillStyle = a;
  ctx.fillRect(-2.5, -9, 5, 18);
  ctx.fillRect(-9, -2.5, 18, 5);
  ctx.fillStyle = "#8a8270";
  ctx.fillRect(14, -2, 18, 4);
  energyStroke(
    ctx,
    (c2) => {
      c2.beginPath();
      c2.moveTo(32, 0);
      c2.lineTo(38, 0);
      c2.stroke();
    },
    "#fff6d8",
    a,
  );
  glowDot(ctx, 36, 0, 1.6, "#fff6d8", a);
  plateGrad(ctx, -4, -5, 10, 10, "#3a3424", "#201c14", d, 2);
  glowDot(ctx, 1, 0, 2, "#fff6d8", a);
}

export function drawEnemyTop(ctx: CanvasRenderingContext2D, id: string, flash = 0) {
  ctx.save();
  switch (id) {
    case "drone":
      ctx.strokeStyle = "rgba(74,56,48,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-2, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      plateGrad(ctx, -8, -6, 16, 12, "#8a6248", "#4a3428", "#2a1c14", 3);
      glowDot(ctx, 4, 0, 2, "#ff8a5c", "#e04030");
      break;
    case "walker":
      plateGrad(ctx, -12, -14, 6, 8, "#4a5340", "#2c332a", INK, 1);
      plateGrad(ctx, -12, 6, 6, 8, "#4a5340", "#2c332a", INK, 1);
      plateGrad(ctx, -10, -8, 20, 16, "#5c684e", "#33392c", INK, 3);
      plateGrad(ctx, 4, -4, 14, 8, "#4a4640", "#26241f", INK, 2);
      glowDot(ctx, 1, 0, 2, "#ff8a5c", "#e04030");
      break;
    case "crawler":
      for (const y of [-12, 8]) plateGrad(ctx, -10, y, 8, 6, "#4a3a2e", "#241a14", INK, 1);
      plateGrad(ctx, -16, -10, 32, 20, "#6e5038", "#3a281c", INK, 4);
      plateGrad(ctx, 8, -5, 18, 10, "#4a3c30", "#241c16", INK, 2);
      glowDot(ctx, 26, 0, 2.6, "#ffa070", "#c45c4a");
      break;
    case "titan":
      plateGrad(ctx, -22, -22, 10, 12, "#5a4230", "#2a1e14", INK, 2);
      plateGrad(ctx, -22, 10, 10, 12, "#5a4230", "#2a1e14", INK, 2);
      plateGrad(ctx, 16, -20, 14, 10, "#5a4230", "#2a1e14", INK, 2);
      plateGrad(ctx, 16, 10, 14, 10, "#5a4230", "#2a1e14", INK, 2);
      plateGrad(ctx, -18, -16, 36, 32, "#38302a", "#181310", "#a85838", 5);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-18, -16, 36, 32);
      ctx.clip();
      ctx.strokeStyle = "rgba(232,180,74,0.28)";
      ctx.lineWidth = 4;
      for (let x = -34; x < 20; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, 18);
        ctx.lineTo(x + 18, -18);
        ctx.stroke();
      }
      ctx.restore();
      plateGrad(ctx, -8, -8, 22, 16, "#4a4038", "#221c16", INK, 3);
      glowDot(ctx, 5, 0, 3.4, "#ffb070", "#e04030");
      break;
    case "ace":
      poly(ctx, [[-16, -14], [18, -6], [18, 6], [-16, 14]], "#1a1014", "#c4453a");
      ctx.strokeStyle = "#e8c8c8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, -8);
      ctx.lineTo(28, -16);
      ctx.moveTo(12, 8);
      ctx.lineTo(28, 16);
      ctx.stroke();
      glowDot(ctx, 27, -16, 0.9, "#ffdada", "#c4453a");
      glowDot(ctx, 27, 16, 0.9, "#ffdada", "#c4453a");
      plateGrad(ctx, -6, -6, 18, 12, "#3a2024", "#180d0f", "#c4453a", 2);
      glowDot(ctx, 4, 0, 2.4, "#ffb0a8", "#e04030");
      break;
    default:
      plate(ctx, -8, -8, 16, 16, "#666", INK, 2);
  }
  if (flash > 0) {
    ctx.globalAlpha = Math.min(0.7, flash);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-24, -24, 48, 48);
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
    glowDot(ctx, 0, 0, 2, "#eaf6fb", "#7aa3b8");
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
    ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "hp") {
    glowDot(ctx, 0, 0, 2.4, "#ffb0a0", "#c45c4a");
    ctx.fillStyle = "#c45c4a";
    ctx.fillRect(-5, -2, 10, 4);
    ctx.fillRect(-2, -5, 4, 10);
  } else if (kind === "key") {
    glowDot(ctx, 0, 0, 2, "#fff2d8", "#d4c4a0");
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
    glowDot(ctx, 0, 0, 2, "#f2f6fa", "#c5cdd6");
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
    plateGrad(ctx, -8, -6, 16, 12, "#8a6a48", "#4a3624", INK, 2);
    ctx.fillStyle = "#e8d8ac";
    ctx.fillRect(-8, -1, 16, 2);
    glowDot(ctx, 0, -1, 2, "#fff2c8", "#e8c84a");
  }
  ctx.restore();
}

export function drawWreck(ctx: CanvasRenderingContext2D, seed: number) {
  ctx.save();
  ctx.rotate(seed);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(2, 2, 15, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();
  plateGrad(ctx, -16, -10, 28, 18, "#48443c", "#201f1a", "#0e0e0d", 3);
  plateGrad(ctx, -4, -16, 12, 10, "#544c40", "#201f1a", "#0e0e0d", 2);
  glowDot(ctx, -8, 3, 1.4, "#ff9a5c", "#7a3018");
  ctx.restore();
}
