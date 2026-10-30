import { useEffect, useRef, useState } from "react";
import { Pause, Play, PlayCircle, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Combat } from "@/game/combat";
import { MECH_MAP, PERK_MAP } from "@/game/data";
import { GameAudio } from "@/game/audio";
import { GameInput } from "@/game/input";
import {
  doubleExtractLoot,
  extractAdsLeftToday,
  getSave,
  settleBossFight,
  settleSortie,
  settleTower,
  settleTowerFloor,
  type RunPayout,
} from "@/game/save";
import { bossRushConfig, eliteConfig, sortieConfig, type RunConfig } from "@/game/meta/modes";
import { canDoubleExtract } from "@/game/meta/extract";
import { showRewardedAd } from "@/game/meta/ads";
import { portalCommercialBreak, portalGameplay, portalLoadingFinished } from "@/game/portal";
import {
  isBossFloor,
  rollBuff,
  roomChoices,
  towerFloorConfig,
  type Room,
  type RoomKind,
  type TowerBuff,
} from "@/game/meta/tower";
import type { HudState, MechId, PerkId, RunResult } from "@/game/types";
import { MainMenu, type MenuTab } from "@/components/menu/main-menu";
import { MenuBackground } from "@/components/menu/menu-bg";
import type { StartSpec } from "@/components/menu/play-tab";
import { AimAssistToggle, GraphicsToggle } from "@/components/menu/settings";
import { Eyebrow, RewardLine, rarityClass, useSave } from "@/components/menu/shared";

type Screen = "menu" | "combat" | "results" | "tower";

interface TowerRun {
  floor: number;
  room: RoomKind;
  buffs: TowerBuff[];
  hpFrac: number;
  cleared: number;
  gained: TowerBuff | null;
  choices: Room[];
}

interface Run {
  spec: StartSpec;
  cfg: RunConfig;
  tower?: TowerRun;
}

interface Outcome {
  result: RunResult;
  payout: RunPayout;
  label: string;
  tower?: { cleared: number; best: boolean };
}

function configFor(spec: StartSpec): RunConfig {
  if (spec.kind === "elite") return eliteConfig(spec.boss, spec.mods);
  if (spec.kind === "rush") return bossRushConfig();
  if (spec.kind === "tower") return towerFloorConfig(1, "fight", [], 1);
  return sortieConfig();
}

export function GameApp() {
  const save = useSave();
  const [screen, setScreen] = useState<Screen>("menu");
  const [tab, setTab] = useState<MenuTab>("play");
  const [hud, setHud] = useState<HudState | null>(null);
  const [choices, setChoices] = useState<PerkId[] | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [muted, setMuted] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [runId, setRunId] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const combatRef = useRef<Combat | null>(null);
  const inputRef = useRef(new GameInput());
  const audioRef = useRef(new GameAudio());
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    audioRef.current.setMuted(muted);
  }, [muted]);

  // Web portals (no-op elsewhere): loading done once the menu is up; gameplay = live, unpaused combat.
  useEffect(() => {
    void portalLoadingFinished();
  }, []);
  const live = screen === "combat" && !hud?.paused && !choices;
  useEffect(() => {
    void portalGameplay(live);
  }, [live]);

  const bankTower = (t: TowerRun) => {
    const p = settleTower(t.cleared);
    setOutcome({
      result: { survived: t.cleared > 0, time: 0, kills: 0, xp: 0, level: 0, credits: p.credits, keys: 0, loot: [], bosses: 0 },
      payout: p,
      label: "Tower climb",
      tower: { cleared: t.cleared, best: p.best },
    });
    setScreen("results");
  };

  // Android hardware back: pause in combat, back to menu elsewhere, exit from the menu.
  const screenRef = useRef(screen);
  screenRef.current = screen;
  useEffect(() => {
    let remove: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || cancelled) return;
      const { App } = await import("@capacitor/app");
      const h = await App.addListener("backButton", () => {
        const sc = screenRef.current;
        if (sc === "combat") combatRef.current?.pause(true);
        else if (sc === "tower" && runRef.current?.tower) bankTower(runRef.current.tower);
        else if (sc === "results") setScreen("menu");
        else void App.exitApp();
      });
      remove = () => void h.remove();
      if (cancelled) remove();
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  const onOver = (r: RunResult) => {
    const cur = runRef.current;
    if (!cur) return;
    const spec = cur.spec;
    if (spec.kind === "tower" && cur.tower) {
      const t = cur.tower;
      settleTowerFloor(r);
      if (!r.survived) {
        bankTower(t);
        return;
      }
      const gained =
        t.room === "elite" || t.room === "boss" ? rollBuff(Math.random, true) : t.room === "cache" ? rollBuff(Math.random, false) : null;
      const next: TowerRun = {
        ...t,
        cleared: t.floor,
        hpFrac: r.hpFrac ?? t.hpFrac,
        buffs: gained ? [...t.buffs, gained] : t.buffs,
        gained,
        choices: roomChoices(t.floor + 1, Math.random),
      };
      setRun({ ...cur, tower: next });
      setScreen("tower");
      return;
    }
    let payout: RunPayout;
    if (spec.kind === "elite") payout = settleBossFight(r, spec.boss, spec.mods);
    else if (spec.kind === "rush") payout = settleBossFight(r, "rush", []);
    else payout = settleSortie(r);
    setOutcome({ result: r, payout, label: cur.cfg.label });
    setScreen("results");
  };
  const onOverRef = useRef(onOver);
  onOverRef.current = onOver;

  useEffect(() => {
    if (screen !== "combat") {
      combatRef.current?.destroy();
      combatRef.current = null;
      inputRef.current.detach();
      return;
    }
    const canvas = canvasRef.current;
    const cfg = runRef.current?.cfg;
    if (!canvas || !cfg) return;
    const input = inputRef.current;
    input.attach(canvas);
    const combat = new Combat(
      canvas,
      input,
      audioRef.current,
      getSave(),
      {
        onHud: setHud,
        onLevelUp: (c) => setChoices(c),
        onOver: (r) => onOverRef.current(r),
      },
      cfg,
    );
    combatRef.current = combat;
    return () => {
      combat.destroy();
      input.detach();
    };
  }, [screen, runId]);

  const launch = (next: Run) => {
    audioRef.current.unlock();
    setHud(null);
    setChoices(null);
    setOutcome(null);
    setRun(next);
    setRunId((n) => n + 1);
    setScreen("combat");
  };

  const start = (spec: StartSpec) => {
    const cfg = configFor(spec);
    const tower: TowerRun | undefined =
      spec.kind === "tower"
        ? { floor: 1, room: "fight", buffs: [], hpFrac: 1, cleared: 0, gained: null, choices: [] }
        : undefined;
    launch({ spec, cfg, tower });
  };

  const pickRoom = (room: Room) => {
    const cur = runRef.current;
    if (!cur?.tower) return;
    const t = cur.tower;
    const floor = t.floor + 1;
    const cfg = towerFloorConfig(floor, room.kind, t.buffs, t.hpFrac);
    launch({ ...cur, cfg, tower: { ...t, floor, room: room.kind, gained: null } });
  };

  return (
    <div className="safe-area relative h-dvh w-full overflow-hidden bg-bg font-sans text-fg">
      {screen === "menu" && <MainMenu tab={tab} setTab={setTab} muted={muted} setMuted={setMuted} onStart={start} />}
      {screen === "combat" && (
        <div
          className="relative h-full w-full select-none"
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
          data-testid="combat"
          data-mode={run?.cfg.mode}
        >
          <canvas ref={canvasRef} className="block h-full w-full touch-none" style={{ touchAction: "none" }} />
          <HudOverlay
            hud={hud}
            mechId={save.selected}
            label={run?.cfg.label ?? ""}
            bossMode={!!run?.cfg.endWhenBossesDown}
            muted={muted}
            onMute={() => setMuted((m) => !m)}
            onPause={() => combatRef.current?.pause(!(hud?.paused ?? false))}
          />
          <TouchPad input={inputRef.current} />
          {choices && (
            <LevelUp
              choices={choices}
              onPick={(id) => {
                // clear first: choosePerk may immediately queue the next level-up
                setChoices(null);
                combatRef.current?.choosePerk(id);
              }}
            />
          )}
          {hud?.paused && !choices && (
            <PauseMenu
              onResume={() => combatRef.current?.pause(false)}
              onQuit={() => {
                combatRef.current?.destroy();
                const t = runRef.current?.tower;
                if (t) bankTower(t);
                else setScreen("menu");
              }}
            />
          )}
        </div>
      )}
      {screen === "tower" && run?.tower && (
        <TowerRooms tower={run.tower} onPick={pickRoom} onBank={() => bankTower(run.tower!)} />
      )}
      {screen === "results" && outcome && (
        <Results
          outcome={outcome}
          onMenu={() => setScreen("menu")}
          onAgain={async () => {
            // Natural break between runs: a portal may show a commercial break here (never mid-run).
            await portalCommercialBreak();
            if (run) start(run.spec);
          }}
        />
      )}
    </div>
  );
}

function TowerRooms({ tower, onPick, onBank }: { tower: TowerRun; onPick: (r: Room) => void; onBank: () => void }) {
  const save = useSave();
  const next = tower.floor + 1;
  return (
    <div className="relative flex h-full flex-col overflow-y-auto p-4" data-testid="tower-rooms">
      <MenuBackground mech={save.selected} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-bg/60" />
      <div className="relative mx-auto w-full max-w-lg pt-[18vh]">
        <Eyebrow>Tower · best floor {Math.max(save.towerBest, tower.cleared)}</Eyebrow>
        <h2 className="font-display text-3xl font-semibold">Floor {tower.floor} cleared</h2>
        {tower.gained && (
          <p className="mt-1 text-sm">
            Buff gained: <span className={tower.gained.rare ? "text-legend" : "text-rare"}>{tower.gained.name}</span>{" "}
            <span className="text-muted">({tower.gained.desc})</span>
          </p>
        )}
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wider text-muted">Hull {Math.round(tower.hpFrac * 100)}%</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-elevated">
            <div className="h-full bg-hp" style={{ width: `${tower.hpFrac * 100}%` }} />
          </div>
        </div>
        {tower.buffs.length > 0 && (
          <p className="mt-2 text-xs text-muted">Buffs: {tower.buffs.map((b) => b.name).join(", ")}</p>
        )}
        <Eyebrow className="mt-5">{isBossFloor(next) ? `Floor ${next} · guardian` : `Choose floor ${next}`}</Eyebrow>
        <div className="mt-2 grid gap-2">
          {tower.choices.map((r) => (
            <button
              key={r.kind}
              type="button"
              data-room={r.kind}
              onClick={() => onPick(r)}
              className={cn(
                "min-h-16 rounded-xl border bg-surface/90 p-4 text-left backdrop-blur-sm hover:border-accent",
                r.kind === "boss" ? "border-danger/60" : "border-border",
              )}
            >
              <p className="font-display text-xl font-semibold">{r.name}</p>
              <p className="text-sm text-muted">{r.desc}</p>
            </button>
          ))}
        </div>
        <Button variant="secondary" className="mt-5 w-full" onClick={onBank} data-testid="tower-bank">
          Bank rewards &amp; return
        </Button>
      </div>
    </div>
  );
}

function HudOverlay({
  hud,
  mechId,
  label,
  bossMode,
  muted,
  onMute,
  onPause,
}: {
  hud: HudState | null;
  mechId: MechId;
  label: string;
  bossMode: boolean;
  muted: boolean;
  onMute: () => void;
  onPause: () => void;
}) {
  const mech = MECH_MAP[mechId];
  const hp = hud ? hud.hp / hud.maxHp : 1;
  const xp = hud ? hud.xp / hud.xpNext : 0;
  const t = hud ? Math.max(0, Math.ceil(hud.timeLeft)) : 0;
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
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">{bossMode ? "time limit" : "until extract"}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-subtle">{label}</p>
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
            "grid size-16 place-items-center rounded-full border px-2 text-center font-display text-[11px] font-semibold uppercase tracking-wider",
            skillReady ? "border-accent text-fg" : "border-border text-muted",
          )}
        >
          {skillReady ? "Skill" : `${hud?.skillCd.toFixed(1)}s`}
        </div>
      </div>
    </div>
  );
}

function TouchStick({
  side,
  onMove,
  label,
}: {
  side: "left" | "right";
  onMove: (x: number, y: number) => void;
  label: string;
}) {
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const RADIUS = 40;
  const REACH = side === "left" ? 56 : 48;

  const setKnob = (nx: number, ny: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${nx * RADIUS}px, ${ny * RADIUS}px)`;
    }
  };
  const release = () => {
    origin.current = null;
    onMove(0, 0);
    setKnob(0, 0);
  };

  return (
    <>
      {/* Generous invisible catch-zone: thumb can land anywhere here, not just on the graphic. */}
      <div
        data-testid={`touch-${side}`}
        className={cn("absolute bottom-0 h-[42%] w-[48%] touch-none sm:hidden", side === "left" ? "left-0" : "right-0")}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        }}
        onPointerMove={(e) => {
          if (!origin.current || origin.current.id !== e.pointerId) return;
          let nx = (e.clientX - origin.current.x) / REACH;
          let ny = (e.clientY - origin.current.y) / REACH;
          const m = Math.hypot(nx, ny);
          if (m > 1) {
            nx /= m;
            ny /= m;
          }
          onMove(nx, ny);
          setKnob(nx, ny);
        }}
        onPointerUp={release}
        onPointerCancel={release}
      />
      {/* Visible joystick: a fixed anchor showing current stick direction. */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-7 grid size-24 place-items-center rounded-full border border-border/60 bg-surface/35 sm:hidden",
          side === "left" ? "left-7" : "right-7",
        )}
        aria-hidden="true"
      >
        <div className="pointer-events-none absolute size-2 rounded-full bg-muted/50" />
        <span className="pointer-events-none absolute -top-5 font-display text-[10px] font-semibold uppercase tracking-wider text-muted/80">
          {label}
        </span>
        <div
          ref={knobRef}
          className={cn(
            "pointer-events-none size-11 rounded-full border bg-elevated/90 shadow-lg",
            side === "left" ? "border-accent/70" : "border-legend/70",
          )}
        />
      </div>
    </>
  );
}

function TouchPad({ input }: { input: GameInput }) {
  return (
    <>
      <TouchStick side="left" label="Move" onMove={(x, y) => input.setLeftStick(x, y)} />
      <TouchStick side="right" label="Aim" onMove={(x, y) => input.setRightStick(x, y)} />
      <button
        type="button"
        className="absolute bottom-[calc(42%+0.5rem)] right-5 grid size-16 place-items-center rounded-full border border-border bg-surface/80 font-display text-[11px] font-semibold uppercase tracking-wider sm:hidden"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
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
                data-perk={id}
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
        <p className="mt-2 text-sm text-muted">The horde holds. Aborting ends this run.</p>
        <GraphicsToggle className="mt-5" />
        <AimAssistToggle className="mt-4" />
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={onResume}>Resume</Button>
          <Button variant="secondary" onClick={onQuit}>
            Abort run
          </Button>
        </div>
      </div>
    </div>
  );
}

function Results({ outcome, onMenu, onAgain }: { outcome: Outcome; onMenu: () => void; onAgain: () => void }) {
  const { result, payout, tower } = outcome;
  const t = Math.floor(result.time);
  const [ad, setAd] = useState<"idle" | "playing" | "failed">("idle");
  const [bonus, setBonus] = useState<RunPayout | null>(null);
  const adsLeft = extractAdsLeftToday();
  const offer2x = !tower && canDoubleExtract(result) && !bonus;
  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto p-5" data-testid="results">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">{outcome.label}</p>
        {tower ? (
          <h2 className="mt-1 font-display text-3xl font-semibold">
            {tower.cleared} floor{tower.cleared === 1 ? "" : "s"} cleared{tower.best ? " · new best" : ""}
          </h2>
        ) : (
          <h2 className="mt-1 font-display text-3xl font-semibold">{result.survived ? "Mission complete" : "Mission failed"}</h2>
        )}
        {!tower && (
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Time" value={`${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`} />
            <Stat label="Kills" value={`${result.kills}`} />
            <Stat label="Level" value={`${result.level}`} />
            <Stat label="Bosses down" value={`${result.bossKills ?? 0}`} />
            {result.mode === "sortie" && <Stat label="Sector" value={`${result.sector ?? 1}/3`} />}
            {result.mode === "sortie" && <Stat label="Uplinks" value={`${result.uplinks ?? 0}/3`} />}
          </dl>
        )}
        <div className="mt-4 rounded-lg border border-border bg-elevated p-3 text-sm" data-testid="payout">
          <p className="text-[11px] uppercase tracking-wider text-muted">Rewards</p>
          <p className="mt-1">
            <RewardLine reward={{ credits: payout.credits, cores: payout.cores, shards: payout.shards, keys: payout.keys }} />
          </p>
          {bonus && (
            <p className="mt-1 text-legend" data-testid="extract-bonus">
              2× extract bonus: <RewardLine reward={{ credits: bonus.credits, shards: bonus.shards, keys: bonus.keys }} />
            </p>
          )}
        </div>
        {offer2x && (
          <div className="mt-3 rounded-lg border border-legend/50 bg-elevated p-3">
            <button
              type="button"
              data-testid="extract-2x"
              disabled={adsLeft <= 0 || ad === "playing"}
              onClick={async () => {
                setAd("playing");
                const ok = await showRewardedAd(3);
                const extra = ok ? doubleExtractLoot(result) : null;
                setBonus(extra);
                setAd(extra ? "idle" : "failed");
              }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-legend/90 px-3 text-sm font-semibold text-bg disabled:opacity-40"
            >
              <PlayCircle className="size-4" />
              {ad === "playing" ? "Ad playing…" : adsLeft > 0 ? "Watch ad: extract with 2× loot" : "2× extract back tomorrow"}
            </button>
            <p className="mt-1 text-center text-[11px] text-muted">
              Optional. Doubles credits, keys and salvage (not cores). {adsLeft}/3 left today.
              {ad === "failed" ? " No reward this time." : ""}
            </p>
          </div>
        )}
        {result.evolutions && result.evolutions.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            Evolved: <span className="text-fg">{result.evolutions.join(", ")}</span>
          </p>
        )}
        {result.loot.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wider text-muted">Salvage (duplicates became shards)</p>
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
          <Button className="flex-1" onClick={onAgain} data-testid="again">
            Play again
          </Button>
          <Button className="flex-1" variant="secondary" onClick={onMenu} data-testid="to-menu">
            Main menu
          </Button>
        </div>
      </div>
    </div>
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
