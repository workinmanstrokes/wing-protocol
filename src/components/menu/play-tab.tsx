import { useState } from "react";
import { Crown, Flame, Layers, Swords, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { MECH_MAP } from "@/game/data";
import { claimMissionReward } from "@/game/save";
import { ELITE_BOSSES, ELITE_MODIFIERS, ELITE_FIRST_CLEAR_CORES, RUSH_FIRST_CLEAR_CORES, type BossKind } from "@/game/meta/modes";
import { isComplete } from "@/game/meta/missions";
import type { Mission } from "@/game/types";
import { Eyebrow, RewardLine, useSave } from "./shared";

export type StartSpec =
  | { kind: "sortie" }
  | { kind: "tower" }
  | { kind: "elite"; boss: BossKind; mods: string[] }
  | { kind: "rush" };

type ModeKey = StartSpec["kind"];

const MODES: { id: ModeKey; name: string; tag: string; icon: typeof Swords }[] = [
  { id: "sortie", name: "Sortie", tag: "5-min run · 3 sectors", icon: Swords },
  { id: "tower", name: "Tower", tag: "Roguelike climb", icon: Layers },
  { id: "elite", name: "Elite Boss", tag: "Duel + modifiers", icon: Crown },
  { id: "rush", name: "Boss Rush", tag: "All three, back to back", icon: Flame },
];

export function PlayTab({ onStart }: { onStart: (s: StartSpec) => void }) {
  const save = useSave();
  const [mode, setMode] = useState<ModeKey>("sortie");
  const [boss, setBoss] = useState<BossKind>("titan");
  const [mods, setMods] = useState<string[]>([]);
  const mech = MECH_MAP[save.selected];

  const start = () => {
    if (mode === "elite") onStart({ kind: "elite", boss, mods });
    else onStart({ kind: mode } as StartSpec);
  };
  const missionsReady = [...save.missions.daily, ...save.missions.weekly].filter((m) => isComplete(m) && !m.claimed).length;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {/* spacer lets the live hangar backdrop show the mech */}
        <div className="h-[25vh] min-h-24" aria-hidden />
        <div className="mx-auto max-w-xl space-y-4">
          <section aria-label="Mode select">
            <Eyebrow className="mb-2">Mode</Eyebrow>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => {
                const on = mode === m.id;
                const Icon = m.icon;
                const extra =
                  m.id === "tower"
                    ? `Best floor ${save.towerBest}`
                    : m.id === "elite"
                      ? `${Object.values(save.eliteClears).filter(Boolean).length}/3 cleared`
                      : m.id === "rush"
                        ? save.rushClears
                          ? `${save.rushClears} clears`
                          : `First clear +${RUSH_FIRST_CLEAR_CORES} cores`
                        : `Best ${save.highKills} kills`;
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-mode={m.id}
                    aria-pressed={on}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "min-h-20 rounded-xl border p-3 text-left backdrop-blur-sm transition-colors",
                      on ? "border-accent bg-elevated/90" : "border-border bg-surface/80",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-4", on ? "text-fg" : "text-muted")} />
                      <span className="font-display text-lg font-semibold leading-none">{m.name}</span>
                    </div>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">{m.tag}</p>
                    <p className="mt-0.5 text-[11px] text-subtle">{extra}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {mode === "elite" && (
            <section aria-label="Elite boss setup" className="rounded-xl border border-border bg-surface/90 p-3">
              <Eyebrow>Choose a boss</Eyebrow>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {ELITE_BOSSES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    data-boss={b.id}
                    aria-pressed={boss === b.id}
                    onClick={() => setBoss(b.id)}
                    className={cn(
                      "min-h-14 rounded-lg border px-2 py-2 text-left",
                      boss === b.id ? "border-accent bg-elevated" : "border-border",
                    )}
                  >
                    <p className="font-display text-sm font-semibold leading-tight">{b.name}</p>
                    <p className="text-[10px] text-muted">
                      {save.eliteClears[b.id] ? `Cleared ×${save.eliteClears[b.id]}` : `+${ELITE_FIRST_CLEAR_CORES} cores`}
                    </p>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{ELITE_BOSSES.find((b) => b.id === boss)?.blurb}</p>
              <Eyebrow className="mt-3">Modifiers · +2 cores each</Eyebrow>
              <div className="mt-2 flex flex-wrap gap-2">
                {ELITE_MODIFIERS.map((m) => {
                  const on = mods.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={on}
                      title={m.desc}
                      onClick={() => setMods(on ? mods.filter((x) => x !== m.id) : [...mods, m.id])}
                      className={cn(
                        "min-h-11 rounded-full border px-3 text-xs font-semibold",
                        on ? "border-danger bg-danger/20 text-fg" : "border-border text-muted",
                      )}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
              {mods.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-[11px] text-muted">
                  {mods.map((id) => (
                    <li key={id}>{ELITE_MODIFIERS.find((m) => m.id === id)?.desc}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {mode === "tower" && (
            <p className="rounded-xl border border-border bg-surface/90 p-3 text-xs leading-relaxed text-muted">
              Clear a floor, then pick the next room: patrol, elite, repair or cache. Buffs stack for the climb, hull
              carries over and every 5th floor is a guardian boss. Milestones pay 10 cores the first time.
            </p>
          )}

          <MissionsBoard ready={missionsReady} />
        </div>
      </div>

      {/* thumb zone: one tap to deploy */}
      <div className="border-t border-border bg-surface/95 px-4 pb-3 pt-3 backdrop-blur">
        <button
          type="button"
          data-testid="deploy"
          onClick={start}
          className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-between rounded-xl bg-accent px-5 text-accent-fg active:scale-[0.99]"
        >
          <span className="font-display text-xl font-bold uppercase tracking-[0.14em]">Deploy</span>
          <span className="text-right text-xs font-semibold leading-tight">
            {MODES.find((m) => m.id === mode)?.name}
            <br />
            <span className="opacity-70">{mech.name}</span>
          </span>
        </button>
      </div>
    </div>
  );
}

function MissionsBoard({ ready }: { ready: number }) {
  const save = useSave();
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const list = tab === "daily" ? save.missions.daily : save.missions.weekly;
  return (
    <section aria-label="Missions" className="rounded-xl border border-border bg-surface/90 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-muted" />
          <Eyebrow>Missions {ready > 0 && <span className="ml-1 rounded bg-accent px-1.5 text-accent-fg">{ready}</span>}</Eyebrow>
        </div>
        <div className="flex gap-1">
          {(["daily", "weekly"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "min-h-9 rounded-md px-3 text-xs font-semibold uppercase tracking-wider",
                tab === t ? "bg-elevated text-fg" : "text-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-2 space-y-2">
        {list.map((m) => (
          <MissionRow key={m.id} m={m} />
        ))}
      </ul>
    </section>
  );
}

function MissionRow({ m }: { m: Mission }) {
  const done = isComplete(m);
  return (
    <li className="rounded-lg border border-border bg-elevated/60 p-2.5" data-mission={m.kind}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{m.label}</p>
          <p className="text-[11px] text-muted">
            <RewardLine reward={m.reward} />
          </p>
        </div>
        {m.claimed ? (
          <span className="text-[11px] uppercase tracking-wider text-ok">Claimed</span>
        ) : done ? (
          <button
            type="button"
            onClick={() => claimMissionReward(m.id)}
            className="min-h-10 rounded-md bg-accent px-3 text-xs font-bold uppercase text-accent-fg"
          >
            Claim
          </button>
        ) : (
          <span className="font-mono text-xs tabular-nums text-muted">
            {m.progress}/{m.target}
          </span>
        )}
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-bg">
        <div className="h-full bg-xp" style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }} />
      </div>
    </li>
  );
}
