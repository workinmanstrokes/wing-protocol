import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MECHS, MECH_MAP } from "@/game/data";
import { selectMech, unlockMech } from "@/game/save";
import type { MechId } from "@/game/types";
import { Eyebrow, MechPortrait, useSave } from "./shared";

export function PilotsTab({ onVault }: { onVault: () => void }) {
  const save = useSave();
  const [view, setView] = useState<MechId>(save.selected);
  const m = MECH_MAP[view];
  const owned = save.unlocked.includes(view);

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-2">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="overflow-hidden rounded-xl border border-border bg-surface/95" data-testid="pilot-detail">
          <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
            <MechPortrait id={m.id} className="h-44 sm:h-full sm:min-h-[220px]" />
            <div className="p-4">
              <div className="flex items-center gap-2">
                <Eyebrow>{m.role}</Eyebrow>
                {m.premium && (
                  <span className="flex items-center gap-1 rounded bg-legend/20 px-1.5 text-[10px] font-semibold uppercase text-legend">
                    <Sparkles className="size-3" /> Vault
                  </span>
                )}
              </div>
              <h2 className="font-display text-3xl font-semibold leading-tight">{m.name}</h2>
              {m.pilot && (
                <p className="text-xs text-muted">
                  Pilot <span className="text-fg">{m.pilot.callsign}</span> · {m.pilot.bio}
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.blurb}</p>
              <p className="mt-2 text-sm">
                <span className="font-semibold">{m.skill.name}.</span> <span className="text-muted">{m.skill.desc}</span>
              </p>
              <dl className="mt-3 grid grid-cols-5 gap-2 text-xs">
                {(
                  [
                    ["Hull", m.stats.hp],
                    ["Thrust", m.stats.speed],
                    ["Rate", m.stats.fireRate.toFixed(1)],
                    ["Yield", m.stats.damage],
                    ["Reach", m.stats.range],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] uppercase tracking-wider text-muted">{k}</dt>
                    <dd className="font-display text-base font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4">
                {owned ? (
                  <button
                    type="button"
                    data-testid="select-mech"
                    disabled={save.selected === m.id}
                    onClick={() => selectMech(m.id)}
                    className="min-h-12 w-full rounded-lg bg-accent font-bold uppercase text-accent-fg disabled:bg-elevated disabled:text-muted"
                  >
                    {save.selected === m.id ? "Selected" : "Select"}
                  </button>
                ) : m.premium ? (
                  <button type="button" onClick={onVault} className="min-h-12 w-full rounded-lg border border-legend/60 font-semibold text-legend">
                    Find it in the Prism Vault
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={save.credits < m.unlockCost}
                    onClick={() => unlockMech(m.id, m.unlockCost)}
                    className="min-h-12 w-full rounded-lg bg-accent font-bold text-accent-fg disabled:bg-elevated disabled:text-muted"
                  >
                    Unlock · {m.unlockCost} credits
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Roster">
          <Eyebrow className="mb-2">
            Roster · {save.unlocked.length}/{MECHS.length}
          </Eyebrow>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {MECHS.map((x) => {
              const locked = !save.unlocked.includes(x.id);
              return (
                <button
                  key={x.id}
                  type="button"
                  data-mech={x.id}
                  onClick={() => {
                    setView(x.id);
                    if (!locked) selectMech(x.id);
                  }}
                  className={cn(
                    "overflow-hidden rounded-lg border text-left",
                    view === x.id ? "border-accent" : x.premium ? "border-legend/40" : "border-border",
                    locked && "opacity-60",
                  )}
                >
                  <MechPortrait id={x.id} className="h-20" />
                  <div className="px-2 py-1.5">
                    <p className="truncate font-display text-sm font-semibold leading-tight">{x.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted">
                      {locked ? (x.premium ? "Vault" : `${x.unlockCost} cr`) : save.selected === x.id ? "Active" : x.role}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
