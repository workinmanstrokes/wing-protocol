import { useEffect, useState, type ReactNode } from "react";
import { Gem, KeyRound, Puzzle, Settings, Volume2, VolumeX, Wallet, Wrench, Store, Users, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { touchMissions } from "@/game/save";
import { isComplete } from "@/game/meta/missions";
import { MenuBackground } from "./menu-bg";
import { PlayTab, type StartSpec } from "./play-tab";
import { HangarTab } from "./hangar-tab";
import { StoreTab } from "./store-tab";
import { PilotsTab } from "./pilots-tab";
import { GraphicsToggle } from "./settings";
import { Modal, useSave } from "./shared";

export type MenuTab = "play" | "hangar" | "store" | "pilots";

const TABS: { id: MenuTab; label: string; icon: typeof Rocket }[] = [
  { id: "play", label: "Play", icon: Rocket },
  { id: "hangar", label: "Hangar", icon: Wrench },
  { id: "store", label: "Store", icon: Store },
  { id: "pilots", label: "Pilots", icon: Users },
];

export function MainMenu({
  tab,
  setTab,
  muted,
  setMuted,
  onStart,
}: {
  tab: MenuTab;
  setTab: (t: MenuTab) => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
  onStart: (s: StartSpec) => void;
}) {
  const save = useSave();
  const [settings, setSettings] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    touchMissions();
    setReady(true); // marks the menu interactive (hydrated) for tests
  }, []);
  const missionsReady = [...save.missions.daily, ...save.missions.weekly].some((m) => isComplete(m) && !m.claimed);

  return (
    <div className="relative flex h-full flex-col overflow-hidden" data-testid="main-menu" data-ready={ready ? "1" : undefined}>
      <MenuBackground mech={save.selected} />
      {/* the live backdrop stays vivid on Play and dims behind the busier tabs */}
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 bg-bg transition-opacity duration-300", tab === "play" ? "opacity-0" : "opacity-75")} />
      <header className="relative z-10 flex items-center justify-between gap-2 px-3 pt-2">
        <h1 className="font-display text-lg font-bold uppercase leading-none tracking-[0.18em] sm:text-2xl">
          Wing<span className="text-muted"> Protocol</span>
        </h1>
        <div className="flex items-center gap-1.5">
          <Chip icon={<Wallet className="size-3" />} value={save.credits} label="credits" />
          <Chip icon={<Gem className="size-3 text-legend" />} value={save.cores} label="cores" />
          <Chip icon={<Puzzle className="size-3 text-rare" />} value={save.shards} label="shards" className="hidden min-[400px]:flex" />
          <Chip icon={<KeyRound className="size-3" />} value={save.keys} label="keys" className="hidden sm:flex" />
          <button
            type="button"
            aria-label="Settings"
            onClick={() => setSettings(true)}
            className="grid size-10 place-items-center rounded-md border border-border bg-surface/80 text-muted"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </header>

      <main className="relative z-10 min-h-0 flex-1">
        {tab === "play" && <PlayTab onStart={onStart} />}
        {tab === "hangar" && <HangarTab />}
        {tab === "store" && <StoreTab />}
        {tab === "pilots" && <PilotsTab onVault={() => setTab("store")} />}
      </main>

      <nav className="relative z-10 grid grid-cols-4 border-t border-border bg-bg/95" aria-label="Main menu">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              data-tab={t.id}
              aria-current={on ? "page" : undefined}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold uppercase tracking-wider",
                on ? "text-fg" : "text-muted",
              )}
            >
              {on && <span className="absolute inset-x-6 top-0 h-0.5 rounded bg-accent" />}
              <Icon className="size-5" />
              {t.label}
              {t.id === "play" && missionsReady && <span className="absolute right-[30%] top-2 size-2 rounded-full bg-danger" />}
            </button>
          );
        })}
      </nav>

      {settings && (
        <Modal label="Settings" onClose={() => setSettings(false)}>
          <h2 className="font-display text-xl font-semibold">Settings</h2>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="mt-4 flex min-h-11 w-full items-center gap-2 rounded-lg border border-border px-3 text-sm"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            Sound {muted ? "off" : "on"}
          </button>
          <GraphicsToggle className="mt-4" />
          <p className="mt-4 text-xs text-muted">
            Desktop: WASD move, mouse aims, auto-fire, Space for skill. Phone: left thumb moves, Skill button bottom right.
          </p>
          <button type="button" onClick={() => setSettings(false)} className="mt-4 min-h-11 w-full rounded-lg bg-accent font-bold text-accent-fg">
            Done
          </button>
        </Modal>
      )}
    </div>
  );
}

function Chip({ icon, value, label, className }: { icon: ReactNode; value: number; label: string; className?: string }) {
  return (
    <div
      className={cn("flex min-h-8 items-center gap-1 rounded-md border border-border bg-surface/80 px-2", className)}
      title={label}
      data-currency={label}
    >
      {icon}
      <span className="font-display text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
