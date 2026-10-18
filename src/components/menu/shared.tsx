import { useEffect, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { drawPortrait } from "@/game/sprites";
import { getSave, getServerSave, subscribeSave } from "@/game/save";
import { SLOT_LABEL, effectiveMods, formatMod } from "@/game/meta/gear";
import type { GearItem, MechId, Rarity, Reward } from "@/game/types";

export function useSave() {
  return useSyncExternalStore(subscribeSave, getSave, getServerSave);
}

export function rarityClass(r: string) {
  if (r === "legendary") return "text-legend";
  if (r === "epic") return "text-epic";
  if (r === "rare") return "text-rare";
  return "text-muted";
}

export const RARITY_BORDER: Record<Rarity, string> = {
  common: "border-border",
  rare: "border-rare/50",
  epic: "border-epic/60",
  legendary: "border-legend/70",
};

export function MechPortrait({ id, className }: { id: MechId; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = c.clientWidth;
      const h = c.clientHeight;
      c.width = Math.max(1, Math.floor(w * dpr));
      c.height = Math.max(1, Math.floor(h * dpr));
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPortrait(ctx, id, w, h);
    };
    draw();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(draw) : null;
    ro?.observe(c);
    return () => ro?.disconnect();
  }, [id]);
  return <canvas ref={ref} className={cn("block w-full bg-elevated", className ?? "h-24")} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-muted", className)}>
      {children}
    </p>
  );
}

export function GearMods({ item }: { item: Pick<GearItem, "mods" | "level"> }) {
  return (
    <ul className="space-y-0.5 text-xs text-muted">
      {Object.entries(effectiveMods(item)).map(([k, v]) => (
        <li key={k}>{formatMod(k, v as number)}</li>
      ))}
    </ul>
  );
}

export function GearCard({
  item,
  active,
  onClick,
  footer,
  testId,
}: {
  item: GearItem;
  active?: boolean;
  onClick?: () => void;
  footer?: ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "min-h-11 w-full rounded-lg border p-3 text-left transition-colors",
        active ? "border-accent bg-elevated" : cn("bg-surface", RARITY_BORDER[item.rarity]),
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted">{SLOT_LABEL[item.slot]}</p>
        <p className="font-mono text-[10px] text-muted">Lv {item.level}</p>
      </div>
      <p className="font-display text-base font-semibold leading-tight">{item.name}</p>
      <p className={cn("mb-1 text-[11px] capitalize", rarityClass(item.rarity))}>{item.rarity}</p>
      <GearMods item={item} />
      {footer}
    </button>
  );
}

export function RewardLine({ reward }: { reward: Reward & { keys?: number } }) {
  const parts: string[] = [];
  if (reward.credits) parts.push(`+${reward.credits} credits`);
  if (reward.cores) parts.push(`+${reward.cores} cores`);
  if (reward.shards) parts.push(`+${reward.shards} shards`);
  if (reward.keys) parts.push(`+${reward.keys} keys`);
  return <span>{parts.join(" · ") || "—"}</span>;
}

/** Full-screen modal card used for crate reveals and confirmations. */
export function Modal({ children, onClose, label }: { children: ReactNode; onClose?: () => void; label: string }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="absolute inset-0 z-30 grid place-items-center bg-bg/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl">{children}</div>
    </div>
  );
}
