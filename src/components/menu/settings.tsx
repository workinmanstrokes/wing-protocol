import { useEffect, useState } from "react";
import { getQualityPref, setQualityPref, type QualityPref } from "@/game/render";
import { getAimAssistPref, setAimAssistPref, type AimAssistPref } from "@/game/aim";
import { cn } from "@/lib/utils";

export function GraphicsToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<QualityPref>("auto");
  useEffect(() => setPref(getQualityPref()), []);
  const opts: { id: QualityPref; label: string }[] = [
    { id: "auto", label: "Auto" },
    { id: "high", label: "High" },
    { id: "low", label: "Low" },
  ];
  return (
    <div className={className}>
      <p className="text-[11px] uppercase tracking-wider text-muted">Graphics</p>
      <div
        role="radiogroup"
        aria-label="Graphics quality"
        className="mt-1 grid grid-cols-3 gap-1 rounded-lg border border-border bg-elevated p-1"
      >
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={pref === o.id}
            data-quality={o.id}
            onClick={() => {
              setPref(o.id);
              setQualityPref(o.id);
            }}
            className={cn("min-h-10 rounded-md text-sm font-semibold", pref === o.id ? "bg-accent text-accent-fg" : "text-muted")}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted">Auto starts on High and drops to Low if the frame rate dips.</p>
    </div>
  );
}

export function AimAssistToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<AimAssistPref>("off");
  useEffect(() => setPref(getAimAssistPref()), []);
  const opts: { id: AimAssistPref; label: string }[] = [
    { id: "off", label: "Off" },
    { id: "light", label: "Light" },
  ];
  return (
    <div className={className}>
      <p className="text-[11px] uppercase tracking-wider text-muted">Aim assist</p>
      <div
        role="radiogroup"
        aria-label="Aim assist"
        className="mt-1 grid grid-cols-2 gap-1 rounded-lg border border-border bg-elevated p-1"
      >
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={pref === o.id}
            data-aim-assist={o.id}
            onClick={() => {
              setPref(o.id);
              setAimAssistPref(o.id);
            }}
            className={cn("min-h-10 rounded-md text-sm font-semibold", pref === o.id ? "bg-accent text-accent-fg" : "text-muted")}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted">You aim. Light gently bends shots toward an enemy already near your crosshair.</p>
    </div>
  );
}
