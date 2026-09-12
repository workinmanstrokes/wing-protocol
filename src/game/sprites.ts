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
  fill: string,
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

function poly(ctx: CanvasRenderingContext2D, pts: number[][], fill: string, stroke?: string) {
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
  const w = "#e8eef2";
  const a = "#5ec8e8";
  const d = "#2a3340";
  poly(ctx, [[-18, -22], [8, -16], [8, 16], [-18, 22]], "#c5d0dc", d);
  poly(ctx, [[-18, -22], [-6, -28], [4, -18], [4, -8]], w, d);
  poly(ctx, [[-18, 22], [-6, 28], [4, 18], [4, 8]], w, d);
  plate(ctx, -10, -8, 22, 16, w, d, 3);
  plate(ctx, 8, -4, 18, 8, "#dfe7ee", d, 2);
  ctx.fillStyle = a;
  ctx.fillRect(24, -2.5, 14, 5);
  ctx.fillRect(24, -6.5, 10, 2);
  ctx.fillRect(24, 4.5, 10, 2);
  plate(ctx, -4, -5, 10, 10, "#1c2833", d, 2);
  ctx.fillStyle = a;
  ctx.beginPath();
  ctx.arc(1, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawForge(ctx: CanvasRenderingContext2D) {
  const r = "#c4453a";
  const c = "#e8dcc8";
  const d = "#3a2420";
  plate(ctx, -16, -14, 28, 28, r, d, 4);
  plate(ctx, -8, -22, 16, 10, c, d, 2);
  plate(ctx, -8, 12, 16, 10, c, d, 2);
  plate(ctx, 6, -8, 20, 16, "#9a3530", d, 3);
  ctx.fillStyle = "#2a1c18";
  for (let i = 0; i < 5; i++) ctx.fillRect(24, -8 + i * 3.2, 10 + (i % 2), 2.2);
  plate(ctx, -6, -6, 12, 12, "#2a1c18", d, 2);
  ctx.fillStyle = "#e8c84a";
  ctx.fillRect(-2, -2, 6, 4);
}

function drawScythe(ctx: CanvasRenderingContext2D) {
  const b = "#1a1c22";
  const a = "#c4a574";
  const d = "#0a0b10";
  poly(ctx, [[-16, -18], [4, -10], [4, 10], [-16, 18]], "#12141a", d);
  plate(ctx, -10, -7, 20, 14, b, a, 3);
  ctx.strokeStyle = a;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, 4);
  ctx.quadraticCurveTo(28, 18, 22, -16);
  ctx.quadraticCurveTo(18, 6, 10, 2);
  ctx.stroke();
  ctx.fillStyle = "#e8c84a";
  ctx.beginPath();
  ctx.arc(2, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawDune(ctx: CanvasRenderingContext2D) {
  const c = "#d8c4a0";
  const t = "#b06040";
  const d = "#3a2c20";
  plate(ctx, -12, -10, 22, 20, c, d, 4);
  ctx.beginPath();
  ctx.arc(-6, 0, 14, -1.2, 1.2);
  ctx.strokeStyle = t;
  ctx.lineWidth = 4;
  ctx.stroke();
  plate(ctx, 8, -5, 16, 10, "#c4a878", d, 2);
  poly(ctx, [[22, -2], [34, -8], [34, 8], [22, 2]], t, d);
  plate(ctx, -4, -5, 10, 10, "#2a2218", d, 2);
  ctx.fillStyle = "#e8a060";
  ctx.fillRect(-1, -2, 5, 4);
}

function drawSerpent(ctx: CanvasRenderingContext2D) {
  const g = "#2d6b4a";
  const gold = "#c4b07a";
  const d = "#14281c";
  poly(ctx, [[-14, -16], [6, -8], [6, 8], [-14, 16]], "#24583c", d);
  plate(ctx, -8, -7, 20, 14, g, gold, 4);
  poly(ctx, [[-6, -16], [8, -20], [10, -10]], gold, d);
  poly(ctx, [[-6, 16], [8, 20], [10, 10]], gold, d);
  ctx.strokeStyle = "#7ae0a0";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(32, 0);
  ctx.moveTo(28, 0);
  ctx.lineTo(34, -6);
  ctx.moveTo(28, 0);
  ctx.lineTo(34, 6);
  ctx.stroke();
  ctx.fillStyle = "#7ae0a0";
  ctx.beginPath();
  ctx.arc(2, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
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
