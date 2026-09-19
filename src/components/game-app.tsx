import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { KeyRound, Pause, Play, Volume2, VolumeX, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Combat } from "@/game/combat";
import { CHESTS, MECHS, MECH_MAP, PERK_MAP, formatMod, rollGear } from "@/game/data";
import { GameAudio } from "@/game/audio";
import { GameInput } from "@/game/input";
import { drawPortrait } from "@/game/sprites";
import {
  addItem,
  addLoot,
  equipItem,
  getSave,
  recordRun,
  selectMech,
  spendKeys,
  subscribeSave,
  unequipSlot,
  unlockMech,
} from "@/game/save";
import type { GearItem, HudState, MechId, PerkId, RunResult } from "@/game/types";

function useSave() {
  return useSyncExternalStore(subscribeSave, getSave, getSave);
}

type Screen = "hangar" | "combat" | "results";
type Tab = "bay" | "armory" | "vault";

export function GameApp() {
  const save = useSave();
  const [screen, setScreen] = useState<Screen>("hangar");
  const [tab, setTab] = useState<Tab>("bay");
  const [hud, setHud] = useState<HudState | null>(null);
  const [choices, setChoices] = useState<PerkId[] | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [muted, setMuted] = useState(false);
  const [lootFlash, setLootFlash] = useState<GearItem | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const combatRef = useRef<Combat | null>(null);
  const inputRef = useRef(new GameInput());
  const audioRef = useRef(new GameAudio());

  useEffect(() => {
    audioRef.current.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (screen !== "combat") {
      combatRef.current?.destroy();
      combatRef.current = null;
      inputRef.current.detach();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const input = inputRef.current;
    input.attach(canvas);
    const combat = new Combat(canvas, input, audioRef.current, getSave(), {
      onHud: setHud,
      onLevelUp: (c) => setChoices(c),
      onOver: (r) => {
        setResult(r);
        setScreen("results");
        addLoot(r.credits, r.keys, r.loot);
        recordRun(r.kills, r.time);
      },
    });
    combatRef.current = combat;
    return () => {
      combat.destroy();
      input.detach();
    };
  }, [screen]);

  const deploy = () => {
    audioRef.current.unlock();
    setHud(null);
    setChoices(null);
    setResult(null);
    setScreen("combat");
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg font-sans text-fg">
      {screen === "hangar" && (
        <Hangar
          tab={tab}
          setTab={setTab}
          muted={muted}
          setMuted={setMuted}
          onDeploy={deploy}
          lootFlash={lootFlash}
          setLootFlash={setLootFlash}
        />
      )}
      {screen === "combat" && (
        <div className="relative h-full w-full">
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none"
            style={{ touchAction: "none" }}
          />
          <HudOverlay
            hud={hud}
            mechId={save.selected}
            muted={muted}
            onMute={() => setMuted((m) => !m)}
            onPause={() => combatRef.current?.pause(!(hud?.paused ?? false))}
          />
          <TouchPad input={inputRef.current} />
          {choices && (
            <LevelUp
              choices={choices}
              onPick={(id) => {
                combatRef.current?.choosePerk(id);
                setChoices(null);
              }}
            />
          )}
          {hud?.paused && !choices && (
            <PauseMenu
              onResume={() => combatRef.current?.pause(false)}
              onQuit={() => {
                combatRef.current?.destroy();
                setScreen("hangar");
              }}
            />
          )}
        </div>
      )}
      {screen === "results" && result && (
        <Results
          result={result}
          onHangar={() => {
            setScreen("hangar");
            setTab("bay");
          }}
          onAgain={deploy}
        />
      )}
    </div>
  );
}

function Hangar({
  tab,
  setTab,
  muted,
  setMuted,
  onDeploy,
  lootFlash,
  setLootFlash,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
  onDeploy: () => void;
  lootFlash: GearItem | null;
  setLootFlash: (g: GearItem | null) => void;
}) {
  const save = useSave();
  const mech = MECH_MAP[save.selected];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
            Sortie bay
          </p>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            Wing Protocol
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <StatChip icon={<Wallet className="size-3.5" />} label={`${save.credits}`} hint="credits" />
          <StatChip icon={<KeyRound className="size-3.5" />} label={`${save.keys}`} hint="keys" />
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md border border-border bg-elevated text-muted"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </header>

      <nav className="flex gap-1 px-4 pt-3 sm:px-6">
        {(["bay", "armory", "vault"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "min-h-11 rounded-md px-4 font-display text-sm font-semibold uppercase tracking-[0.16em]",
              tab === t ? "bg-elevated text-fg" : "text-muted hover:text-fg",
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {tab === "bay" && <Bay onDeploy={onDeploy} />}
        {tab === "armory" && <Armory />}
        {tab === "vault" && <Vault onLoot={setLootFlash} />}
      </div>

      {tab === "bay" && (
        <div className="border-t border-border bg-surface px-4 py-3 sm:hidden">
          <Button className="w-full" onClick={onDeploy}>
            Deploy {mech.name}
          </Button>
        </div>
      )}

      {lootFlash && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-bg/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Salvage acquired
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold">{lootFlash.name}</h3>
            <p className={cn("mt-1 text-sm capitalize", rarityClass(lootFlash.rarity))}>
              {lootFlash.rarity} {lootFlash.slot}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {Object.entries(lootFlash.mods).map(([k, v]) => (
                <li key={k}>{formatMod(k, v as number)}</li>
              ))}
            </ul>
            <Button className="mt-5 w-full" onClick={() => setLootFlash(null)}>
              Stash
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Bay({ onDeploy }: { onDeploy: () => void }) {
  const save = useSave();
  const [view, setView] = useState<MechId>(save.selected);
  const selected = MECH_MAP[view];
  const owned = save.unlocked.includes(view);
  const equipped = (["weapon", "armor", "system"] as const).map((slot) => ({
    slot,
    item: save.inventory.find((g) => g.id === save.equipped[slot]),
  }));

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {MECHS.map((m) => {
            const locked = !save.unlocked.includes(m.id);
            const on = view === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setView(m.id);
                  if (!locked) selectMech(m.id);
                }}
                className={cn(
                  "w-[7.5rem] shrink-0 rounded-lg border p-2 text-left",
                  on ? "border-accent bg-elevated" : "border-border bg-surface",
                  locked && "opacity-55",
                )}
              >
                <MechPortrait id={m.id} />
                <p className="mt-2 font-display text-sm font-semibold leading-tight">{m.name}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  {locked ? `${m.unlockCost} cr` : m.role}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="grid gap-0 sm:grid-cols-[220px_minmax(0,1fr)]">
            <div className="border-b border-border sm:border-b-0 sm:border-r">
              <MechPortrait id={selected.id} large />
            </div>
            <div className="p-5">
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                {selected.role}
              </p>
              <h2 className="font-display text-3xl font-semibold tracking-tight">{selected.name}</h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{selected.blurb}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <Stat label="Hull" value={`${selected.stats.hp}`} />
                <Stat label="Thrust" value={`${selected.stats.speed}`} />
                <Stat label="Rate" value={`${selected.stats.fireRate.toFixed(1)}/s`} />
                <Stat label="Yield" value={`${selected.stats.damage}`} />
                <Stat label="Reach" value={`${selected.stats.range}m`} />
                <Stat label="Skill" value={selected.skill.name} />
              </dl>
              <p className="mt-4 text-sm text-muted">
                <span className="text-fg">{selected.skill.name}.</span> {selected.skill.desc}
              </p>
              {!owned ? (
                <Button
                  className="mt-5"
                  onClick={() => unlockMech(selected.id, selected.unlockCost)}
                  disabled={save.credits < selected.unlockCost}
                >
                  Unlock — {selected.unlockCost} credits
                </Button>
              ) : (
                <Button className="mt-5 hidden sm:inline-flex" onClick={onDeploy}>
                  Deploy {selected.name}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="rounded-xl border border-border bg-surface p-4">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          Loadout
        </p>
        <div className="mt-3 space-y-2">
          {equipped.map(({ slot, item }) => (
            <div key={slot} className="rounded-md border border-border bg-elevated p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted">{slot}</p>
              {item ? (
                <>
                  <p className="font-display font-semibold">{item.name}</p>
                  <p className={cn("text-xs capitalize", rarityClass(item.rarity))}>{item.rarity}</p>
                </>
              ) : (
                <p className="text-sm text-muted">Empty — visit armory</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          WASD move. Mouse aims. Auto-fire. Space for skill. Survive five minutes.
        </p>
        <p className="mt-2 text-xs text-subtle">
          Sorties {save.sorties} · Best kills {save.highKills}
        </p>
      </aside>
    </div>
  );
}

function Armory() {
  const save = useSave();
  if (save.inventory.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-surface p-8 text-center">
        <h2 className="font-display text-2xl font-semibold">Armory empty</h2>
        <p className="mt-2 text-sm text-muted">
          Open vault crates or extract from a sortie. Mini-bosses drop epic and legendary frames.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {save.inventory.map((g) => {
        const on = save.equipped[g.slot] === g.id;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => (on ? unequipSlot(g.slot) : equipItem(g.id))}
            className={cn(
              "rounded-lg border p-4 text-left",
              on ? "border-accent bg-elevated" : "border-border bg-surface",
            )}
          >
            <p className="text-[11px] uppercase tracking-wider text-muted">{g.slot}</p>
            <p className="font-display text-lg font-semibold">{g.name}</p>
            <p className={cn("text-xs capitalize", rarityClass(g.rarity))}>{g.rarity}</p>
            <ul className="mt-2 space-y-0.5 text-sm text-muted">
              {Object.entries(g.mods).map(([k, v]) => (
                <li key={k}>{formatMod(k, v as number)}</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] uppercase tracking-wider text-accent">
              {on ? "Equipped — tap to remove" : "Tap to equip"}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function Vault({ onLoot }: { onLoot: (g: GearItem) => void }) {
  const save = useSave();
  return (
    <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
      {CHESTS.map((c) => (
        <div key={c.id} className="rounded-xl border border-border bg-surface p-5">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            {c.keys} key{c.keys > 1 ? "s" : ""}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">{c.name}</h3>
          <p className="mt-2 text-sm text-muted">
            {c.floor ? `Guaranteed ${c.floor}+` : "Weighted common to legendary"}
          </p>
          <Button
            className="mt-5 w-full"
            variant="secondary"
            disabled={save.keys < c.keys}
            onClick={() => {
              if (!spendKeys(c.keys)) return;
              const item = rollGear(Math.random, c.floor);
              addItem(item);
              onLoot(item);
            }}
          >
            Open
          </Button>
        </div>
      ))}
    </div>
  );
}

function HudOverlay({
  hud,
  mechId,
  muted,
  onMute,
  onPause,
}: {
  hud: HudState | null;
  mechId: MechId;
  muted: boolean;
  onMute: () => void;
  onPause: () => void;
}) {
  const mech = MECH_MAP[mechId];
  const hp = hud ? hud.hp / hud.maxHp : 1;
  const xp = hud ? hud.xp / hud.xpNext : 0;
  const t = hud ? Math.max(0, Math.ceil(hud.timeLeft)) : 300;
  const mm = Math.floor(t / 60);
  const ss = String(t % 60).padStart(2, "0");
  const skillReady = (hud?.skillCd ?? 0) <= 0;
  return (
    <div className="pointer-events-none absolute inset-0 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3 pr-28">
        <div className="min-w-0 max-w-sm flex-1">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            {mech.name}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-elevated">
            <div className="h-full bg-hp" style={{ width: `${Math.max(0, hp) * 100}%` }} />
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
            <div className="h-full bg-xp" style={{ width: `${Math.max(0, xp) * 100}%` }} />
          </div>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted">
            Hull {Math.ceil(hud?.hp ?? 0)} · Lv {hud?.level ?? 1} · {hud?.kills ?? 0} down
          </p>
          {(hud?.combo ?? 0) >= 3 && (
            <p className="mt-1 font-display text-xs font-semibold uppercase tracking-wider text-accent">
              {hud?.combo}x combo
            </p>
          )}
          {(hud?.overdrive ?? 0) > 0 && (
            <p
              className="mt-1 animate-pulse font-display text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: "#e8c84a" }}
            >
              Overdrive {hud?.overdrive.toFixed(1)}s
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-semibold tabular-nums leading-none">
            {mm}:{ss}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">until extract</p>
        </div>
      </div>
      <div className="pointer-events-auto absolute right-3 top-3 flex gap-2 sm:right-4">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md border border-border bg-surface/90"
          onClick={onMute}
          aria-label="Mute"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md border border-border bg-surface/90"
          onClick={onPause}
          aria-label="Pause"
        >
          {hud?.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
      </div>
      <div className="absolute bottom-6 right-24 hidden sm:block">
        <div
          className={cn(
            "grid size-16 place-items-center rounded-full border px-2 text-center font-display text-[10px] font-semibold uppercase tracking-wider",
            skillReady ? "border-accent text-fg" : "border-border text-muted",
          )}
        >
          {skillReady ? "Skill" : `${hud?.skillCd.toFixed(1)}s`}
        </div>
      </div>
    </div>
  );
}

function TouchPad({ input }: { input: GameInput }) {
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const RADIUS = 40;

  const setKnob = (nx: number, ny: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${nx * RADIUS}px, ${ny * RADIUS}px)`;
    }
  };

  return (
    <>
      {/* Generous invisible catch-zone: thumb can land anywhere here, not just on the graphic. */}
      <div
        className="absolute bottom-0 left-0 h-[42%] w-[48%] touch-none sm:hidden"
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        }}
        onPointerMove={(e) => {
          if (!origin.current || origin.current.id !== e.pointerId) return;
          const dx = (e.clientX - origin.current.x) / 56;
          const dy = (e.clientY - origin.current.y) / 56;
          const nx = Math.max(-1, Math.min(1, dx));
          const ny = Math.max(-1, Math.min(1, dy));
          input.setLeftStick(nx, ny);
          setKnob(nx, ny);
        }}
        onPointerUp={() => {
          origin.current = null;
          input.setLeftStick(0, 0);
          setKnob(0, 0);
        }}
        onPointerCancel={() => {
          origin.current = null;
          input.setLeftStick(0, 0);
          setKnob(0, 0);
        }}
      />
      {/* Visible joystick — a fixed anchor showing current stick direction. */}
      <div
        className="pointer-events-none absolute bottom-7 left-7 grid size-24 place-items-center rounded-full border border-border/60 bg-surface/35 sm:hidden"
        aria-hidden="true"
      >
        <div className="pointer-events-none absolute size-2 rounded-full bg-muted/50" />
        <div
          ref={knobRef}
          className="pointer-events-none size-11 rounded-full border border-accent/70 bg-elevated/90 shadow-lg"
        />
      </div>
      <button
        type="button"
        className="absolute bottom-6 right-5 grid size-16 place-items-center rounded-full border border-border bg-surface/80 font-display text-[10px] font-semibold uppercase tracking-wider sm:hidden"
        onPointerDown={(e) => {
          e.preventDefault();
          input.skillTap = true;
        }}
      >
        Skill
      </button>
    </>
  );
}

function LevelUp({ choices, onPick }: { choices: PerkId[]; onPick: (id: PerkId) => void }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-bg/70 p-4">
      <div className="w-full max-w-3xl">
        <p className="text-center font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
          Protocol upgrade
        </p>
        <h2 className="mb-4 text-center font-display text-3xl font-semibold">Choose a perk</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {choices.map((id) => {
            const p = PERK_MAP[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPick(id)}
                className="min-h-28 rounded-xl border border-border bg-surface p-5 text-left hover:border-accent"
              >
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PauseMenu({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-bg/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-2xl font-semibold">Paused</h2>
        <p className="mt-2 text-sm text-muted">The horde holds. Extract only from the hangar.</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={onResume}>Resume</Button>
          <Button variant="secondary" onClick={onQuit}>
            Abort to hangar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Results({
  result,
  onHangar,
  onAgain,
}: {
  result: RunResult;
  onHangar: () => void;
  onAgain: () => void;
}) {
  const t = Math.floor(result.time);
  return (
    <div className="flex h-full flex-col items-center justify-center p-5">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
          {result.survived ? "Extract complete" : "Frame lost"}
        </p>
        <h2 className="mt-1 font-display text-3xl font-semibold">
          {result.survived ? "You held the line" : "Mission failed"}
        </h2>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Time" value={`${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`} />
          <Stat label="Kills" value={`${result.kills}`} />
          <Stat label="Level" value={`${result.level}`} />
          <Stat label="Bosses" value={`${result.bosses}`} />
          <Stat label="Credits" value={`+${result.credits}`} />
          <Stat label="Keys" value={`+${result.keys}`} />
        </dl>
        {result.loot.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wider text-muted">Salvage</p>
            <ul className="mt-1 space-y-1 text-sm">
              {result.loot.map((g) => (
                <li key={g.id}>
                  <span className={rarityClass(g.rarity)}>{g.name}</span>
                  <span className="text-muted"> · {g.slot}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={onAgain}>
            Deploy again
          </Button>
          <Button className="flex-1" variant="secondary" onClick={onHangar}>
            Hangar
          </Button>
        </div>
      </div>
    </div>
  );
}

function MechPortrait({ id, large }: { id: MechId; large?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = Math.max(1, Math.floor(w * dpr));
    c.height = Math.max(1, Math.floor(h * dpr));
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPortrait(ctx, id, w, h);
  }, [id, large]);
  return (
    <canvas
      ref={ref}
      className={cn("block w-full bg-elevated", large ? "h-56 sm:h-full sm:min-h-[260px]" : "h-24")}
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="font-display text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function StatChip({ icon, label, hint }: { icon: ReactNode; label: string; hint: string }) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-elevated px-3">
      <span className="text-muted">{icon}</span>
      <span className="font-display text-base font-semibold tabular-nums">{label}</span>
      <span className="hidden text-[11px] uppercase tracking-wider text-muted sm:inline">{hint}</span>
    </div>
  );
}

function rarityClass(r: string) {
  if (r === "legendary") return "text-legend";
  if (r === "epic") return "text-epic";
  if (r === "rare") return "text-rare";
  return "text-muted";
}
