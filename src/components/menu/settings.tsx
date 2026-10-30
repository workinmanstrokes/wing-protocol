import { useEffect, useState } from "react";
import { getQualityPref, setQualityPref, type QualityPref } from "@/game/render";
import { getAimAssistPref, setAimAssistPref, type AimAssistPref } from "@/game/aim";
import { Volume2, VolumeX } from "lucide-react";
import { gameAudio } from "@/game/audio";
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

function VolumeSlider({ label, id, value, onChange, disabled }: { label: string; id: string; value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <label className={cn("mt-2 flex items-center gap-3", disabled && "opacity-50")} htmlFor={id}>
      <span className="w-12 shrink-0 text-sm">{label}</span>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        disabled={disabled}
        data-volume={id}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-10 w-full cursor-pointer accent-[var(--color-accent,#7fd1ff)]"
      />
      <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-muted">{Math.round(value * 100)}</span>
    </label>
  );
}

/** Mute + music / SFX volume, saved locally. Shared by the main-menu settings and the pause menu. */
export function AudioSettings({ muted, setMuted, className }: { muted: boolean; setMuted: (v: boolean) => void; className?: string }) {
  const [music, setMusic] = useState(0.7);
  const [sfx, setSfx] = useState(0.85);
  useEffect(() => {
    const p = gameAudio.getPrefs();
    setMusic(p.music);
    setSfx(p.sfx);
  }, []);
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted">Audio</p>
        <button
          type="button"
          role="switch"
          aria-checked={!muted}
          aria-label="Sound"
          data-sfx="none"
          onClick={() => setMuted(!muted)}
          className={cn(
            "flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold",
            muted ? "border-border text-muted" : "border-accent text-fg",
          )}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          {muted ? "Muted" : "On"}
        </button>
      </div>
      <VolumeSlider
        label="Music"
        id="music"
        value={music}
        disabled={muted}
        onChange={(v) => {
          setMusic(v);
          gameAudio.setPrefs({ music: v });
        }}
      />
      <VolumeSlider
        label="SFX"
        id="sfx"
        value={sfx}
        disabled={muted}
        onChange={(v) => {
          setSfx(v);
          gameAudio.setPrefs({ sfx: v });
          gameAudio.ui("click");
        }}
      />
    </div>
  );
}
