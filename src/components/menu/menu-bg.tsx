import { useEffect, useRef } from "react";
import { drawMechTop } from "@/game/sprites";
import { MECH_BOOSTERS } from "@/game/mecha";
import type { MechId } from "@/game/types";

/**
 * Live hangar backdrop: scrolling perspective deck grid, drifting sparks, a
 * slow searchlight and the selected mech hovering with its booster glow.
 * Cheap (one 2D canvas, ~60 sparks), pauses when hidden, static if the
 * player prefers reduced motion.
 */
export function MenuBackground({ mech }: { mech: MechId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mechRef = useRef(mech);
  mechRef.current = mech;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf = 0;
    let w = 0;
    let h = 0;
    const sparks = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.3 + Math.random() * 0.7,
      s: 0.5 + Math.random() * 1.5,
    }));
    const sprite = document.createElement("canvas");
    let spriteFor = "";
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.max(1, Math.floor(w * dpr));
      c.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const frame = (tMs: number) => {
      const t = reduced ? 0 : tMs / 1000;
      ctx.clearRect(0, 0, w, h);
      // backdrop gradient
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0c0e14");
      g.addColorStop(0.55, "#0a0a0e");
      g.addColorStop(1, "#060608");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // perspective deck grid (bottom 55%)
      const horizon = h * 0.3;
      ctx.strokeStyle = "rgba(94,200,232,0.10)";
      ctx.lineWidth = 1;
      const cx = w / 2;
      for (let i = -12; i <= 12; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 18, horizon);
        ctx.lineTo(cx + i * w * 0.22, h);
        ctx.stroke();
      }
      const scroll = (t * 0.35) % 1;
      for (let j = 0; j < 14; j++) {
        const p = (j + scroll) / 14;
        const y = horizon + (h - horizon) * p * p;
        ctx.globalAlpha = 0.25 + p * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // searchlight sweep
      const sweep = Math.sin(t * 0.4) * 0.5;
      const lg = ctx.createRadialGradient(cx + sweep * w * 0.6, horizon - 40, 10, cx + sweep * w * 0.6, horizon - 40, w * 0.6);
      lg.addColorStop(0, "rgba(197,205,214,0.10)");
      lg.addColorStop(1, "rgba(197,205,214,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);

      // sparks drifting up
      for (const s of sparks) {
        const y = (((s.y - t * 0.03 * s.z) % 1) + 1) % 1;
        ctx.fillStyle = `rgba(255,${170 + Math.floor(s.z * 60)},120,${0.25 + s.z * 0.5})`;
        ctx.fillRect(s.x * w, y * h, s.s * s.z * 1.6, s.s * s.z * 1.6);
      }

      // hovering mech
      const id = mechRef.current;
      const size = Math.min(w * 0.42, h * 0.24);
      if (spriteFor !== `${id}:${Math.round(size)}`) {
        spriteFor = `${id}:${Math.round(size)}`;
        sprite.width = sprite.height = Math.max(2, Math.round(size * 1.4));
        const sc = sprite.getContext("2d");
        if (sc) {
          sc.clearRect(0, 0, sprite.width, sprite.height);
          sc.translate(sprite.width / 2, sprite.height / 2);
          sc.scale(size / 92, size / 92);
          sc.rotate(-Math.PI / 2);
          drawMechTop(sc, id);
        }
      }
      const bob = Math.sin(t * 1.6) * 6;
      const mx = cx;
      const my = h * 0.2 + bob;
      // booster glow beneath
      const boost = MECH_BOOSTERS[id];
      const flick = 0.75 + 0.25 * Math.sin(t * 20);
      const bg = ctx.createRadialGradient(mx, my + size * 0.36, 2, mx, my + size * 0.36, size * 0.45);
      bg.addColorStop(0, boost.core);
      bg.addColorStop(0.25, boost.color);
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.45 * flick;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = bg;
      ctx.fillRect(mx - size, my - size * 0.2, size * 2, size * 1.2);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      // ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(mx, h * 0.2 + size * 0.55, size * 0.32 - bob, size * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(sprite, mx - sprite.width / 2, my - sprite.height / 2);

      // vignette
      const v = ctx.createRadialGradient(cx, h * 0.45, Math.min(w, h) * 0.2, cx, h * 0.45, Math.max(w, h) * 0.75);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);

      if (!reduced && !document.hidden) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mech]);

  return <canvas ref={ref} aria-hidden data-testid="menu-bg" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
