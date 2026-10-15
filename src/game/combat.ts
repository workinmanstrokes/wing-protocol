import { MISSION_SECONDS, MECH_MAP, PERKS, PERK_MAP, WORLD, xpForLevel, rollGear } from "./data";
import { GameAudio } from "./audio";
import { GameInput } from "./input";
import { drawEnemyTop, drawMechTop, drawPickup, drawWreck } from "./sprites";
import { MECH_BOOSTERS } from "./mecha";
import type { GearItem, HudState, MechId, PerkId, RunResult } from "./types";
import type { SaveData } from "./types";

import {
  BloomLayer, FpsGovernor, PROFILES, cachedSprite, drawSprite, floorTile, getQualityPref, glowSprite,
  setQualityPref, shadowSprite, softSprite, vignette, withAlpha,
  type Quality, type QualityPref,
} from "./render";

const STEP = 1 / 60;
const MAX_ENEMY = 360;
const MAX_BULLET = 720;
const MAX_PICK = 420;
const MAX_FX = 900;
const MAX_FLOAT = 64;
const MAX_RING = 48;
const COMBO_WINDOW = 2.4;
const COMBO_TRIGGER = 8;
const OVERDRIVE_TIME = 5.5;
const TITAN_TELEGRAPH = 0.9;
const ACE_DASH_TIME = 0.38;
const CELL = 96;

type Bullet = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  pierce: number;
  friendly: boolean;
  homing: number;
  explode: number;
  color: string;
  crit: boolean;
  chain: number;
};

type Mob = {
  alive: boolean;
  kind: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  dmg: number;
  xp: number;
  fireCd: number;
  flash: number;
  boss: boolean;
  touchCd: number;
  special: number;
  telegraph: number;
  dashT: number;
  dashDX: number;
  dashDY: number;
  elite: string;
  phase: number;
  shieldHp: number;
  shieldMax: number;
  aimX: number;
  aimY: number;
};

type Hazard = { alive: boolean; x: number; y: number; r: number; t: number; max: number; dmg: number; color: string };
type Uplink = { active: boolean; x: number; y: number; r: number; progress: number; need: number; timeLeft: number };

export const SECTORS = [
  { name: "SECTOR 1 · OUTER YARD", floor: "#14151a", grid: "94,200,232", hazard: 0, gradeTint: "rgba(70,140,170,0.18)",
    tex: { base: "#15171c", panel: "#262a33", line: "#0b0c0f", accent: "#5ec8e8", seed: 11 } },
  { name: "SECTOR 2 · ION STORM", floor: "#141822", grid: "143,208,255", hazard: 2.0, gradeTint: "rgba(90,120,220,0.22)",
    tex: { base: "#131826", panel: "#243049", line: "#090c14", accent: "#8fd0ff", seed: 23 } },
  { name: "SECTOR 3 · REACTOR CORE", floor: "#1c1414", grid: "232,120,90", hazard: 1.5, gradeTint: "rgba(220,90,50,0.22)",
    tex: { base: "#1c1412", panel: "#3a2420", line: "#0e0807", accent: "#ff7a4a", seed: 37 } },
] as const;
const SECTOR_LEN = 100;
/** Tight raster boxes per enemy sprite: smaller boxes = less overdraw on phones. */
const MOB_BOX: Record<string, number> = {
  swarm: 22, drone: 32, walker: 48, charger: 52, sniper: 66, shielder: 48, crawler: 64, titan: 84, ace: 66, warden: 84,
};
const BOSS_TIMES = [88, 188, 270];
const UPLINK_TIMES = [40, 140, 228];
const ELITE_MODS = ["swift", "armored", "volatile", "regen", "splitter"] as const;
export const EVOLUTIONS = [
  { id: "railstorm", name: "Railstorm", need: { pierce: 2, fork: 2 }, desc: "Shots pierce +2 and hit 25% harder." },
  { id: "nova", name: "Nova Rounds", need: { explosive: 2, crit: 2 }, desc: "Crits detonate in a wide blast." },
  { id: "hive", name: "Hive Swarm", need: { drone: 2, overclock: 2 }, desc: "+2 drones with homing fire." },
  { id: "bloodline", name: "Bloodline Reactor", need: { vampire: 2, repair: 2 }, desc: "Siphon x2, kills drop repair cells." },
  { id: "tempest", name: "Tempest Field", need: { static: 2, haste: 2 }, desc: "Static field doubles in size and power." },
] as const;

type Pick = {
  alive: boolean;
  kind: "xp" | "hp" | "key" | "credit" | "chest";
  x: number;
  y: number;
  r: number;
  value: number;
  floor?: "epic" | "legendary";
};

type Fx = {
  alive: boolean;
  kind: number; // 0 spark, 1 ember, 2 smoke, 3 debris
  rot: number;
  vr: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

type Ring = {
  alive: boolean;
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  max: number;
  color: string;
  width: number;
};

type Float = {
  alive: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  crit: boolean;
};

type Wreck = { x: number; y: number; r: number; seed: number };

export type CombatHooks = {
  onHud: (h: HudState) => void;
  onLevelUp: (choices: PerkId[]) => void;
  onOver: (r: RunResult) => void;
  onQuality?: (q: Quality) => void;
};

function pool<T>(n: number, make: () => T): T[] {
  return Array.from({ length: n }, make);
}

function hash(x: number, y: number) {
  return (Math.floor(x / CELL) * 73856093) ^ (Math.floor(y / CELL) * 19349663);
}

export class Combat {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: GameInput;
  private audio: GameAudio;
  private hooks: CombatHooks;
  private mechId: MechId;
  private gear: GearItem[];
  private raf = 0;
  private acc = 0;
  private last = 0;
  private running = true;
  private paused = false;
  private leveling = false;
  private over = false;
  private time = 0;
  private kills = 0;
  private bosses = 0;
  private xp = 0;
  private level = 1;
  private perks: Record<string, number> = {};
  private loot: GearItem[] = [];
  private creditsGot = 0;
  private keysGot = 0;
  private hitstop = 0;
  private trauma = 0;
  private invuln = 0;
  private shield = 0;
  private coils = 0;
  private fireCd = 0;
  private skillCd = 0;
  private skillMax = 9;
  private px = WORLD / 2;
  private py = WORLD / 2;
  private pvx = 0;
  private pvy = 0;
  private aim = 0;
  private lastYaw = 0;
  private hp = 100;
  private maxHp = 100;
  private base: {
    hp: number;
    speed: number;
    fire: number;
    dmg: number;
    range: number;
    magnet: number;
    skillHaste: number;
    crit: number;
  } | null = null;
  private camX = WORLD / 2;
  private camY = WORLD / 2;
  private hudT = 0;
  private spawnAcc = 0;
  private nextBossAt = 48;
  private reduced = false;
  private wrecks: Wreck[] = [];
  private bullets = pool(MAX_BULLET, () => ({
    alive: false, x: 0, y: 0, vx: 0, vy: 0, r: 4, dmg: 1, life: 1, pierce: 0,
    friendly: true, homing: 0, explode: 0, color: "#9fd", crit: false, chain: 0,
  }));
  private mobs = pool(MAX_ENEMY, () => ({
    alive: false, kind: "drone", x: 0, y: 0, vx: 0, vy: 0, r: 14, hp: 1, maxHp: 1,
    speed: 40, baseSpeed: 40, dmg: 8, xp: 1, fireCd: 0, flash: 0, boss: false, touchCd: 0,
    special: 0, telegraph: 0, dashT: 0, dashDX: 0, dashDY: 0,
    elite: "", phase: 0, shieldHp: 0, shieldMax: 0, aimX: 0, aimY: 0,
  }));
  private picks: Pick[] = pool(MAX_PICK, () => ({
    alive: false,
    kind: "xp",
    x: 0,
    y: 0,
    r: 10,
    value: 1,
  }));
  private fx = pool(MAX_FX, () => ({
    alive: false, kind: 0, rot: 0, vr: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: "#fff",
  }));
  private fxCursor = 0;
  private qualityPref: QualityPref = "auto";
  private quality: Quality = "high";
  private gov = new FpsGovernor(() => this.setQuality("low", true));
  private bloom: BloomLayer | null = null;
  private flashT = 0;
  private flashColor = "#ffffff";
  private hurtT = 0;
  private floorPat: (CanvasPattern | null)[] = [null, null, null];
  /** Auto-pause when the app is backgrounded (phone home button, tab switch). */
  private onVisibility = () => {
    if (document.hidden && !this.over && !this.leveling) this.pause(true);
    this.last = performance.now();
  };
  private onQuality = (e: Event) => {
    const v = (e as CustomEvent<QualityPref>).detail;
    this.qualityPref = v;
    try {
      sessionStorage.removeItem("wp-auto-low");
    } catch {
      /* ignore */
    }
    this.setQuality(v === "low" ? "low" : "high", false);
  };
  private rings = pool(MAX_RING, () => ({
    alive: false, x: 0, y: 0, r: 0, maxR: 40, life: 0, max: 1, color: "#fff", width: 3,
  }));
  private floats = pool(MAX_FLOAT, () => ({
    alive: false, x: 0, y: 0, vy: -30, life: 0, max: 1, text: "", color: "#fff", crit: false,
  }));
  private comboCount = 0;
  private comboTimer = 0;
  private overdriveT = 0;
  private announceText = "";
  private announceT = 0;
  private momentumT = 0;
  private staticT = 0;
  private sector = 0;
  private hazardT = 4;
  private hazards: Hazard[] = pool(40, () => ({ alive: false, x: 0, y: 0, r: 60, t: 0, max: 1, dmg: 10, color: "#8fd0ff" }));
  private uplink: Uplink = { active: false, x: 0, y: 0, r: 90, progress: 0, need: 6, timeLeft: 0 };
  private uplinkIdx = 0;
  private uplinksWon = 0;
  private bossIdx = 0;
  private evo = new Set<string>();

  constructor(
    canvas: HTMLCanvasElement,
    input: GameInput,
    audio: GameAudio,
    save: SaveData,
    hooks: CombatHooks,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.input = input;
    this.audio = audio;
    this.hooks = hooks;
    this.mechId = save.selected;
    const inv = save.inventory;
    this.gear = (["weapon", "armor", "system"] as const)
      .map((s) => inv.find((g) => g.id === save.equipped[s]))
      .filter((g): g is GearItem => !!g);
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.qualityPref = getQualityPref();
    let autoLow = false;
    try {
      autoLow = sessionStorage.getItem("wp-auto-low") === "1";
    } catch {
      /* ignore */
    }
    this.quality = this.qualityPref === "low" || (this.qualityPref === "auto" && autoLow) ? "low" : "high";
    this.bloom = new BloomLayer();
    window.addEventListener("wp-quality", this.onQuality);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.base = this.computeBase();
    this.maxHp = this.base.hp;
    this.hp = this.maxHp;
    this.skillMax = MECH_MAP[this.mechId].skill.cooldown / this.base.skillHaste;
    this.skillCd = 0;
    this.seedWrecks();
    this.resize();
    this.camX = this.px;
    this.camY = this.py;
    this.bindProbe();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    window.addEventListener("resize", this.resize);
    this.pushHud();
  }

  private computeBase() {
    const m = MECH_MAP[this.mechId];
    let hp = m.stats.hp;
    let speed = m.stats.speed;
    let fire = m.stats.fireRate;
    let dmg = m.stats.damage;
    let range = m.stats.range;
    let magnet = 88;
    let skillHaste = 1;
    let crit = 0.06;
    for (const g of this.gear) {
      hp += g.mods.hp ?? 0;
      speed *= 1 + (g.mods.speed ?? 0);
      fire *= 1 + (g.mods.fireRate ?? 0);
      dmg *= 1 + (g.mods.damage ?? 0);
      range *= 1 + (g.mods.range ?? 0);
      magnet *= 1 + (g.mods.magnet ?? 0);
      skillHaste *= 1 + (g.mods.skillHaste ?? 0);
      crit += g.mods.crit ?? 0;
    }
    const pk = this.perks;
    fire *= 1 + 0.18 * (pk.overclock ?? 0);
    dmg *= 1 + 0.22 * (pk.apcore ?? 0);
    speed *= 1 + 0.14 * (pk.afterburner ?? 0);
    hp *= 1 + 0.28 * (pk.plating ?? 0);
    magnet *= 1 + 0.4 * (pk.magnet ?? 0);
    range *= 1 + 0.2 * (pk.range ?? 0);
    skillHaste *= 1 + 0.16 * (pk.haste ?? 0);
    crit += 0.12 * (pk.crit ?? 0);
    return { hp, speed, fire, dmg, range, magnet, skillHaste, crit };
  }

  private seedWrecks() {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const d = 380 + (i * 137) % 900;
      const x = WORLD / 2 + Math.cos(a) * d + ((i * 91) % 140) - 70;
      const y = WORLD / 2 + Math.sin(a) * d + ((i * 53) % 140) - 70;
      this.wrecks.push({ x, y, r: 28, seed: i * 0.7 });
    }
  }

  private resize = () => {
    const dpr = Math.min(PROFILES[this.quality].dprCap, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.bloom?.resize(w, h);
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("wp-quality", this.onQuality);
    document.removeEventListener("visibilitychange", this.onVisibility);
    if (window.__controlsTest) delete window.__controlsTest;
  }

  private setQuality(q: Quality, auto: boolean) {
    if (q === this.quality) return;
    this.quality = q;
    this.resize();
    this.gov.resetGrace(3);
    if (auto) {
      try {
        sessionStorage.setItem("wp-auto-low", "1");
      } catch {
        /* ignore */
      }
      this.announce("GRAPHICS · LOW (AUTO)", 1.6);
      this.hooks.onQuality?.(q);
    }
  }

  get currentQuality() {
    return this.quality;
  }

  pause(v: boolean) {
    this.paused = v;
    this.pushHud();
  }

  choosePerk(id: PerkId) {
    this.perks[id] = (this.perks[id] ?? 0) + 1;
    if (id === "plating") {
      const b = this.computeBase();
      const heal = b.hp * 0.15;
      this.maxHp = b.hp;
      this.hp = Math.min(this.maxHp, this.hp + heal);
    }
    this.base = this.computeBase();
    this.maxHp = this.base.hp;
    this.hp = Math.min(this.hp, this.maxHp);
    this.skillMax = MECH_MAP[this.mechId].skill.cooldown / this.base.skillHaste;
    for (const e of EVOLUTIONS) {
      if (this.evo.has(e.id)) continue;
      if (Object.entries(e.need).every(([k, v]) => (this.perks[k] ?? 0) >= v)) {
        this.evo.add(e.id);
        this.announce(`EVOLVED · ${e.name.toUpperCase()}`, 2.6);
        this.spawnRing(this.px, this.py, 160, 0.7, "#ffd166", 5);
        this.screenFlash("#ffd166", 0.3);
        this.audio.overdrive();
      }
    }
    this.leveling = false;
    this.checkLevel();
    this.pushHud();
  }

  private bindProbe() {
    window.__controlsTest = {
      getYaw: () => this.lastYaw,
      getSpeed: () => Math.hypot(this.pvx, this.pvy),
      setKeys: (codes: string[]) => this.input.setKeys(codes),
      state: () => ({
        time: this.time, hp: this.hp, kills: this.kills, level: this.level, sector: this.sector,
        mobs: this.mobs.filter((m) => m.alive).length, bosses: this.bosses, evo: [...this.evo],
        uplinks: this.uplinksWon, over: this.over, quality: this.quality, fps: Math.round(this.gov.fps), leveling: this.leveling, paused: this.paused, hitstop: this.hitstop,
      }),
      setQuality: (v: QualityPref) => setQualityPref(v),
    };
    // cheat hooks only in dev builds or with ?debug in the URL
    if (!(import.meta.env.DEV || location.search.includes("debug"))) return;
    Object.assign(window.__controlsTest, {
      spawn: (n: number) => { for (let i = 0; i < n; i++) this.spawnMob(false); },
      skipTo: (t: number) => { this.time = t; },
      god: (v: boolean) => { this.godMode = v; },
    });
  }
  private godMode = false;

  private announceMax = 2.4;
  private announce(text: string, t = 2.4) {
    this.announceText = text;
    this.announceT = t;
    this.announceMax = t;
  }

  private frame = (t: number) => {
    if (!this.running) return;
    const rawDt = (t - this.last) / 1000;
    const dt = Math.min(0.1, rawDt);
    this.last = t;
    if (!this.paused && !this.leveling && !this.over) this.gov.tick(Math.min(0.25, rawDt), this.quality, this.qualityPref);
    if (!this.paused && !this.leveling && !this.over) {
      if (this.hitstop > 0) this.hitstop -= dt;
      else {
        this.acc += dt;
        while (this.acc >= STEP) {
          this.step(STEP);
          this.acc -= STEP;
        }
      }
    } else {
      this.input.sample();
    }
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private step(dt: number) {
    const act = this.input.sample();
    if (act.pause) this.paused = !this.paused;
    if (this.paused) return;

    const stats = this.base!;
    this.time += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.coils = Math.max(0, this.coils - dt);
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.overdriveT = Math.max(0, this.overdriveT - dt);
    this.announceT = Math.max(0, this.announceT - dt);
    this.momentumT = Math.max(0, this.momentumT - dt);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    if ((this.perks.static ?? 0) > 0) {
      this.staticT -= dt;
      if (this.staticT <= 0) {
        this.staticT = 0.6;
        const tem = this.evo.has("tempest") ? 2 : 1;
        this.hurtCircle(this.px, this.py, 70 * tem, (2 + 2 * (this.perks.static ?? 0)) * tem, false);
        this.spawnRing(this.px, this.py, 70 * tem, 0.3, "#8fd0ff", 2);
      }
    }

    const odMult = this.overdriveT > 0 ? 1.32 : 1;
    const momMult = this.momentumT > 0 ? 1 + 0.1 * (this.perks.momentum ?? 0) : 1;
    const hd = MECH_MAP[this.mechId].handling;
    const targetVX = act.moveX * stats.speed * odMult * momMult;
    const targetVY = act.moveY * stats.speed * odMult * momMult;
    const inputMag = Math.hypot(act.moveX, act.moveY);
    const accelK = 1 - Math.exp(-(inputMag > 0.05 ? hd.accel : hd.brake) * dt);
    this.pvx += (targetVX - this.pvx) * accelK;
    this.pvy += (targetVY - this.pvy) * accelK;
    if (hd.weave && inputMag > 0.05) {
      const speedMag = Math.hypot(this.pvx, this.pvy) || 1;
      const perpAng = Math.atan2(this.pvy, this.pvx) + Math.PI / 2;
      const w = Math.sin(this.time * 7) * hd.weave * Math.min(1, speedMag / stats.speed);
      this.pvx += Math.cos(perpAng) * w;
      this.pvy += Math.sin(perpAng) * w;
    }
    this.px += this.pvx * dt;
    this.py += this.pvy * dt;
    this.px = Math.max(40, Math.min(WORLD - 40, this.px));
    this.py = Math.max(40, Math.min(WORLD - 40, this.py));
    this.resolvePlayerWrecks();

    const spd = Math.hypot(this.pvx, this.pvy);
    if (spd > 8) this.lastYaw = Math.atan2(-this.pvx, -this.pvy);

    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    let aimX = Math.cos(this.aim);
    let aimY = Math.sin(this.aim);
    if (act.hasAim) {
      if (Math.hypot(this.input.rightStick.x, this.input.rightStick.y) > 0.05) {
        aimX = this.input.rightStick.x;
        aimY = this.input.rightStick.y;
      } else {
        const wx = this.camX + (act.aimX - cssW / 2);
        const wy = this.camY + (act.aimY - cssH / 2);
        aimX = wx - this.px;
        aimY = wy - this.py;
      }
      const am = Math.hypot(aimX, aimY) || 1;
      aimX /= am;
      aimY /= am;
      this.aim = Math.atan2(aimY, aimX);
    } else {
      const n = this.nearestMob();
      if (n) {
        aimX = n.x - this.px;
        aimY = n.y - this.py;
        const am = Math.hypot(aimX, aimY) || 1;
        aimX /= am;
        aimY /= am;
        this.aim = Math.atan2(aimY, aimX);
      }
    }

    const look = 70;
    const tx = this.px + aimX * look;
    const ty = this.py + aimY * look;
    const k = 1 - Math.exp(-6 * dt);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;

    if (this.fireCd <= 0) {
      this.shoot(aimX, aimY);
      this.fireCd = 1 / (stats.fire * (this.overdriveT > 0 ? 1.4 : 1));
    }
    if (act.skill && this.skillCd <= 0) this.castSkill(aimX, aimY);

    if ((this.perks.repair ?? 0) > 0) {
      this.hp = Math.min(this.maxHp, this.hp + dt * 3.2 * (this.perks.repair ?? 0));
    }

    this.spawnAcc += dt;
    const intensity = Math.min(1, this.time / MISSION_SECONDS);
    const interval = Math.max(0.12, 0.85 - intensity * 0.68);
    while (this.spawnAcc >= interval) {
      this.spawnAcc -= interval;
      const n = 1 + (intensity > 0.4 ? 1 : 0) + (intensity > 0.75 ? 1 : 0);
      for (let i = 0; i < n; i++) this.spawnMob(false);
    }
    if (this.bossIdx < BOSS_TIMES.length && this.time >= BOSS_TIMES[this.bossIdx]!) {
      this.bossIdx += 1;
      this.spawnMob(true);
    }
    const sec = Math.min(2, Math.floor(this.time / SECTOR_LEN));
    if (sec !== this.sector) {
      this.sector = sec;
      this.announce(SECTORS[sec]!.name, 2.8);
      this.audio.bossAlert();
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1);
    }
    this.updateHazards(dt);
    this.updateUplink(dt);

    this.updateMobs(dt, aimX, aimY);
    void this.nextBossAt;
    this.updateBullets(dt);
    this.flushNova();
    this.updatePicks(dt, stats.magnet);
    this.updateFx(dt);
    this.updateRings(dt);
    this.updateFloats(dt);

    this.hudT += dt;
    if (this.hudT > 0.08) {
      this.hudT = 0;
      this.pushHud();
    }
    this.audio.tickMusic(dt, intensity);

    if (this.hp <= 0 || this.time >= MISSION_SECONDS) this.finish(this.hp > 0);
  }

  private resolvePlayerWrecks() {
    for (const w of this.wrecks) {
      const dx = this.px - w.x;
      const dy = this.py - w.y;
      const d = Math.hypot(dx, dy);
      const min = 18 + w.r;
      if (d < min && d > 0.001) {
        const p = (min - d) / d;
        this.px += dx * p;
        this.py += dy * p;
      }
    }
  }

  private nearestMob(): Mob | null {
    let best: Mob | null = null;
    let bd = 1e12;
    for (const m of this.mobs) {
      if (!m.alive) continue;
      const d = (m.x - this.px) ** 2 + (m.y - this.py) ** 2;
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }

  /** Nearest alive mob other than `exclude`, within `maxDist` of (x, y) — arc-weapon chain targeting. */
  private nearestMobExcept(exclude: Mob, x: number, y: number, maxDist: number): Mob | null {
    let best: Mob | null = null;
    let bd = maxDist * maxDist;
    for (const m of this.mobs) {
      if (!m.alive || m === exclude) continue;
      const d = (m.x - x) ** 2 + (m.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }

  private shoot(ax: number, ay: number) {
    const stats = this.base!;
    const mech = MECH_MAP[this.mechId];
    const forks = 1 + (this.perks.fork ?? 0);
    const pierce = this.perks.pierce ?? 0;
    const spreadN = 1 + 0.15 * (this.perks.spread ?? 0);
    const colors: Record<string, string> = {
      beam: "#7ad8f0",
      gatling: "#e8c4a0",
      melee: "#e8d090",
      shotgun: "#e0a878",
      fang: "#7ae0a0",
      arc: "#8fd0ff",
      mortar: "#c9a25a",
      lance: "#fff0c0",
    };
    const fireOne = (ang: number, speed: number, r: number, life: number, extra = 0, forceExplode = 0) => {
      const b = this.bullets.find((x) => !x.alive);
      if (!b) return;
      b.alive = true;
      b.x = this.px + Math.cos(ang) * 22;
      b.y = this.py + Math.sin(ang) * 22;
      b.vx = Math.cos(ang) * speed;
      b.vy = Math.sin(ang) * speed;
      const isCrit = Math.random() < stats.crit;
      b.r = r;
      b.dmg = stats.dmg * (isCrit ? 2.2 : 1) + extra;
      b.life = life;
      b.pierce = pierce + (mech.weapon === "lance" ? 3 : 0) + (this.evo.has("railstorm") ? 2 : 0);
      if (this.evo.has("railstorm")) b.dmg *= 1.25;
      b.friendly = true;
      b.homing = mech.weapon === "fang" ? 2.4 : 0;
      b.explode =
        forceExplode + ((this.perks.explosive ?? 0) > 0 ? 18 + 10 * (this.perks.explosive ?? 0) : 0);
      b.color = colors[mech.weapon] ?? "#9fd";
      b.crit = isCrit;
      b.chain = mech.weapon === "arc" ? 2 + pierce : 0;
    };
    const baseAng = Math.atan2(ay, ax);
    if (mech.weapon === "beam") {
      for (let i = 0; i < forks; i++) {
        const o = (i - (forks - 1) / 2) * 0.12;
        fireOne(baseAng + o, 720, 4.5, stats.range / 720);
        fireOne(baseAng + o + 0.05, 700, 3.5, stats.range / 700);
      }
    } else if (mech.weapon === "gatling") {
      for (let i = 0; i < forks; i++) {
        const o = (Math.random() - 0.5) * 0.22 * spreadN + (i - (forks - 1) / 2) * 0.1;
        fireOne(baseAng + o, 820, 3.2, stats.range / 820);
      }
    } else if (mech.weapon === "melee") {
      const arc = 0.7 * spreadN;
      const n = 5 + forks;
      for (let i = 0; i < n; i++) {
        const o = -arc + (arc * 2 * i) / (n - 1);
        fireOne(baseAng + o, 420, 10, 0.16, stats.dmg * 0.2);
      }
    } else if (mech.weapon === "shotgun") {
      const pellets = 5 + forks;
      for (let i = 0; i < pellets; i++) {
        const o = (i - (pellets - 1) / 2) * 0.16 * spreadN;
        fireOne(baseAng + o, 640, 4, stats.range / 640);
      }
    } else if (mech.weapon === "arc") {
      for (let i = 0; i < forks; i++) {
        const o = (i - (forks - 1) / 2) * 0.1;
        fireOne(baseAng + o, 640, 3.5, stats.range / 640);
      }
    } else if (mech.weapon === "mortar") {
      for (let i = 0; i < forks; i++) {
        const o = (i - (forks - 1) / 2) * 0.08 + (Math.random() - 0.5) * 0.05;
        fireOne(baseAng + o, 300, 6, 0.9, 0, 34);
      }
    } else if (mech.weapon === "lance") {
      for (let i = 0; i < forks; i++) {
        const o = (i - (forks - 1) / 2) * 0.06;
        fireOne(baseAng + o, 780, 5, stats.range / 780);
      }
    } else {
      for (let i = 0; i < forks; i++) {
        const o = (i - (forks - 1) / 2) * 0.14;
        fireOne(baseAng + o, 560, 5, stats.range / 560);
      }
    }
    const drones = (this.perks.drone ?? 0) + (this.evo.has("hive") ? 2 : 0);
    for (let d = 0; d < drones; d++) {
      const a = this.time * 2.4 + (d * Math.PI * 2) / drones;
      const ox = this.px + Math.cos(a) * 42;
      const oy = this.py + Math.sin(a) * 42;
      const b = this.bullets.find((x) => !x.alive);
      if (!b) continue;
      b.alive = true;
      b.x = ox;
      b.y = oy;
      b.vx = ax * 520;
      b.vy = ay * 520;
      b.r = 3.5;
      b.dmg = stats.dmg * 0.45;
      b.life = 0.7;
      b.pierce = 0;
      b.friendly = true;
      b.homing = this.evo.has("hive") ? 3 : 0;
      b.explode = 0;
      b.color = "#c5cdd6";
      b.crit = false;
      b.chain = 0;
    }
    if (this.coils > 0) {
      for (let i = 0; i < 3; i++) {
        const a = this.time * 4 + (i * Math.PI * 2) / 3;
        this.hurtCircle(this.px + Math.cos(a) * 50, this.py + Math.sin(a) * 50, 22, stats.dmg * 0.35, false);
      }
    }
    this.spawnRing(
      this.px + Math.cos(baseAng) * 24,
      this.py + Math.sin(baseAng) * 24,
      13,
      0.1,
      colors[mech.weapon] ?? "#9fd",
      2,
    );
    this.audio.fire(mech.weapon);
  }

  private castSkill(ax: number, ay: number) {
    const stats = this.base!;
    const id = this.mechId;
    this.skillCd = this.skillMax;
    this.audio.skill();
    this.trauma = Math.min(1, this.trauma + 0.35);
    if (id === "aether") {
      const base = Math.atan2(ay, ax);
      for (let i = -4; i <= 4; i++) {
        const ang = base + i * 0.1;
        const b = this.bullets.find((x) => !x.alive);
        if (!b) continue;
        b.alive = true;
        b.x = this.px;
        b.y = this.py;
        b.vx = Math.cos(ang) * 900;
        b.vy = Math.sin(ang) * 900;
        b.r = 7;
        b.dmg = stats.dmg * 3.2;
        b.life = 0.55;
        b.pierce = 8;
        b.friendly = true;
        b.homing = 0;
        b.explode = 24;
        b.color = "#b8f0ff";
        b.crit = false;
        b.chain = 0;
      }
      this.spawnRing(this.px, this.py, 130, 0.32, "#b8f0ff", 4);
    } else if (id === "forge") {
      for (let i = 0; i < 10; i++) {
        const ang = Math.atan2(ay, ax) + (Math.random() - 0.5) * 0.8;
        const b = this.bullets.find((x) => !x.alive);
        if (!b) continue;
        b.alive = true;
        b.x = this.px;
        b.y = this.py;
        b.vx = Math.cos(ang) * (340 + Math.random() * 80);
        b.vy = Math.sin(ang) * (340 + Math.random() * 80);
        b.r = 6;
        b.dmg = stats.dmg * 2.4;
        b.life = 1.6;
        b.pierce = 0;
        b.friendly = true;
        b.homing = 5.5;
        b.explode = 36;
        b.color = "#e8a070";
        b.crit = false;
        b.chain = 0;
      }
      this.spawnRing(this.px, this.py, 60, 0.3, "#e8a070", 3);
    } else if (id === "scythe") {
      const fromX = this.px;
      const fromY = this.py;
      this.invuln = 0.4;
      this.px += ax * 240;
      this.py += ay * 240;
      this.px = Math.max(40, Math.min(WORLD - 40, this.px));
      this.py = Math.max(40, Math.min(WORLD - 40, this.py));
      for (let i = 0; i < 8; i++) {
        const t2 = i / 7;
        this.burst(fromX + (this.px - fromX) * t2, fromY + (this.py - fromY) * t2, 2, "#c4a574");
      }
      this.hurtCircle(this.px, this.py, 70, stats.dmg * 4.5, true);
      this.spawnRing(this.px, this.py, 80, 0.28, "#c4a574", 3);
    } else if (id === "dune") {
      this.shield = 2.6;
      this.invuln = 0.25;
      this.spawnRing(this.px, this.py, 165, 0.4, "#e8a060", 4);
      for (const m of this.mobs) {
        if (!m.alive) continue;
        const dx = m.x - this.px;
        const dy = m.y - this.py;
        const d = Math.hypot(dx, dy);
        if (d < 160 && d > 0.1) {
          m.x += (dx / d) * 90;
          m.y += (dy / d) * 90;
          m.hp -= stats.dmg * 1.4;
          m.flash = 0.12;
        }
      }
    } else if (id === "serpent") {
      this.coils = 5.2;
      this.spawnRing(this.px, this.py, 55, 0.24, "#7ae0a0", 2);
    } else if (id === "storm") {
      this.overdriveT = Math.max(this.overdriveT, 3.2);
      this.hurtCircle(this.px, this.py, 130, stats.dmg * 2.2, true);
      this.spawnRing(this.px, this.py, 130, 0.4, "#8fd0ff", 4);
    } else if (id === "vulture") {
      const base = Math.atan2(ay, ax);
      for (let i = -2; i <= 2; i++) {
        const ang = base + i * 0.32;
        const b = this.bullets.find((x) => !x.alive);
        if (!b) continue;
        b.alive = true;
        b.x = this.px;
        b.y = this.py;
        b.vx = Math.cos(ang) * 180;
        b.vy = Math.sin(ang) * 180;
        b.r = 6;
        b.dmg = stats.dmg * 2;
        b.life = 0.8;
        b.pierce = 0;
        b.friendly = true;
        b.homing = 0;
        b.explode = 40;
        b.color = "#c9a25a";
        b.crit = false;
        b.chain = 0;
      }
      this.spawnRing(this.px, this.py, 40, 0.24, "#c9a25a", 3);
    } else if (id === "cross") {
      this.shield = 3.2;
      this.invuln = 0.3;
      this.hp = Math.min(this.maxHp, this.hp + stats.hp * 0.22);
      this.hurtCircle(this.px, this.py, 110, stats.dmg * 1.6, true);
      this.spawnRing(this.px, this.py, 110, 0.35, "#ffe8a0", 4);
    }
  }

  private spawnMob(boss: boolean, kindOverride?: string, at?: { x: number; y: number }) {
    const m = this.mobs.find((x) => !x.alive);
    if (!m) return;
    const ang = Math.random() * Math.PI * 2;
    const dist = 520 + Math.random() * 180;
    m.x = at ? at.x : this.px + Math.cos(ang) * dist;
    m.y = at ? at.y : this.py + Math.sin(ang) * dist;
    m.x = Math.max(30, Math.min(WORLD - 30, m.x));
    m.y = Math.max(30, Math.min(WORLD - 30, m.y));
    const t = this.time / MISSION_SECONDS;
    const scale = 1 + t * 1.9;
    m.elite = "";
    m.phase = 0;
    m.shieldHp = 0;
    m.shieldMax = 0;
    m.boss = boss;
    if (boss) {
      const kind = (["titan", "ace", "warden"] as const)[Math.min(2, this.bosses)]!;
      m.kind = kind;
      m.r = kind === "warden" ? 40 : kind === "ace" ? 28 : 36;
      m.hp = (kind === "warden" ? 1500 : kind === "ace" ? 620 : 600) * scale;
      m.speed = kind === "ace" ? 150 : kind === "warden" ? 52 : 88;
      m.dmg = kind === "warden" ? 24 : kind === "ace" ? 22 : 26;
      m.xp = kind === "warden" ? 90 : 48;
      m.fireCd = 1.2;
      m.special = kind === "ace" ? 3.2 : 4;
      this.bosses += 1;
      this.announce(kind === "warden" ? "CORE WARDEN AWAKENS" : kind === "ace" ? "ACE INBOUND" : "TITAN BREACH");
      this.audio.bossAlert();
    } else {
      let kind = kindOverride;
      if (!kind) {
        const r = Math.random();
        const sec = this.sector;
        if (sec === 0) kind = t > 0.12 && r < 0.18 ? "swarm" : t > 0.2 && r < 0.42 ? "walker" : r < 0.5 && t > 0.25 ? "charger" : "drone";
        else if (sec === 1) kind = r < 0.16 ? "swarm" : r < 0.3 ? "charger" : r < 0.42 ? "sniper" : r < 0.6 ? "walker" : r < 0.68 ? "shielder" : "drone";
        else kind = r < 0.14 ? "swarm" : r < 0.26 ? "charger" : r < 0.38 ? "sniper" : r < 0.5 ? "shielder" : r < 0.66 ? "crawler" : r < 0.8 ? "walker" : "drone";
        if (kind === "swarm") {
          for (let i = 0; i < 5; i++) this.spawnMob(false, "swarm", { x: m.x + (Math.random() - 0.5) * 60, y: m.y + (Math.random() - 0.5) * 60 });
        }
      }
      m.kind = kind;
      const S: Record<string, [number, number, number, number, number, number]> = {
        // r, hp, speed, dmg, xp, fireCd
        drone: [12, 14, 118 + t * 40, 8, 1, 99],
        walker: [16, 32, 86, 12, 3, 1.8],
        crawler: [22, 70, 58, 18, 8, 2.4],
        swarm: [8, 6, 168 + t * 30, 5, 1, 99],
        charger: [15, 40, 70, 16, 4, 99],
        sniper: [14, 26, 96, 10, 5, 2.6],
        shielder: [18, 46, 64, 14, 7, 99],
      };
      const d = S[kind] ?? S.drone!;
      m.r = d[0]; m.hp = d[1] * scale; m.speed = d[2]; m.dmg = d[3] * (1 + t * 1.1); m.xp = d[4]; m.fireCd = d[5];
      if (kind === "charger") m.special = 1.5 + Math.random() * 2;
      if (kind === "shielder") { m.shieldMax = 50 * scale; m.shieldHp = m.shieldMax; }
      const eliteChance = t < 0.15 ? 0 : 0.05 + t * 0.14;
      if (kind !== "swarm" && Math.random() < eliteChance) {
        m.elite = ELITE_MODS[Math.floor(Math.random() * ELITE_MODS.length)]!;
        m.hp *= 3.2; m.r *= 1.25; m.xp *= 5; m.dmg *= 1.25;
        if (m.elite === "swift") m.speed *= 1.6;
      }
    }
    m.maxHp = m.hp;
    m.alive = true;
    m.vx = 0;
    m.vy = 0;
    m.flash = 0;
    m.touchCd = 0;
    m.baseSpeed = m.speed;
    m.telegraph = 0;
    m.dashT = 0;
    if (!boss && m.kind !== "charger") m.special = 0;
  }

  private enemyShot(x: number, y: number, ang: number, sp: number, r: number, dmg: number, homing = 0, color = "#e07060") {
    const b = this.bullets.find((q) => !q.alive);
    if (!b) return;
    b.alive = true; b.x = x; b.y = y;
    b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
    b.r = r; b.dmg = dmg; b.life = 2.6; b.pierce = 0; b.friendly = false;
    b.homing = homing; b.explode = 0; b.color = color; b.crit = false; b.chain = 0;
  }

  private bossPhase(m: Mob) {
    const frac = m.hp / m.maxHp;
    const want = m.kind === "warden" ? (frac < 0.3 ? 2 : frac < 0.65 ? 1 : 0) : frac < 0.5 ? 1 : 0;
    if (want > m.phase) {
      m.phase = want;
      this.announce(`${m.kind.toUpperCase()} · PHASE ${want + 1}`, 1.8);
      this.spawnRing(m.x, m.y, 220, 0.6, "#ff5a4a", 5);
      this.screenFlash("#ff5a4a", 0.25);
      this.explodeFx(m.x, m.y, 90, "#ff5a4a");
      this.trauma = Math.min(1, this.trauma + 0.5);
      this.audio.bossAlert();
      for (let i = 0; i < 16; i++) this.enemyShot(m.x, m.y, (i / 16) * Math.PI * 2, 200, 6, m.dmg * 0.6);
      if (m.kind === "warden") for (let i = 0; i < 2 + want; i++) this.spawnMob(false, "shielder", { x: m.x + (i - 1) * 70, y: m.y + 80 });
      if (m.kind === "ace") m.baseSpeed *= 1.2;
    }
  }

  private spawnHazard(x: number, y: number, r: number, delay: number, dmg: number, color: string) {
    const h = this.hazards.find((q) => !q.alive);
    if (!h) return;
    h.alive = true; h.x = x; h.y = y; h.r = r; h.t = delay; h.max = delay; h.dmg = dmg; h.color = color;
  }

  private updateHazards(dt: number) {
    const cfg = SECTORS[this.sector]!;
    if (cfg.hazard > 0) {
      this.hazardT -= dt;
      if (this.hazardT <= 0) {
        this.hazardT = cfg.hazard * (0.7 + Math.random() * 0.6);
        const n = this.sector === 2 ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = i === 0 ? Math.random() * 90 : 120 + Math.random() * 200;
          this.spawnHazard(this.px + Math.cos(a) * d + this.pvx * 0.6, this.py + Math.sin(a) * d + this.pvy * 0.6,
            this.sector === 2 ? 80 : 70, 1.15, 14 + this.sector * 5, this.sector === 2 ? "#ff7a4a" : "#8fd0ff");
        }
      }
    }
    for (const h of this.hazards) {
      if (!h.alive) continue;
      h.t -= dt;
      if (h.t <= 0) {
        h.alive = false;
        this.spawnRing(h.x, h.y, h.r, 0.35, h.color, 5);
        this.explodeFx(h.x, h.y, h.r, h.color);
        this.trauma = Math.min(1, this.trauma + 0.2);
        this.hurtCircle(h.x, h.y, h.r, h.dmg * 1.5, false);
        if (Math.hypot(this.px - h.x, this.py - h.y) < h.r + 12) this.damagePlayer(h.dmg);
      }
    }
  }

  private updateUplink(dt: number) {
    const u = this.uplink;
    if (!u.active && this.uplinkIdx < UPLINK_TIMES.length && this.time >= UPLINK_TIMES[this.uplinkIdx]!) {
      this.uplinkIdx += 1;
      const a = Math.random() * Math.PI * 2;
      u.active = true;
      u.x = Math.max(120, Math.min(WORLD - 120, this.px + Math.cos(a) * 420));
      u.y = Math.max(120, Math.min(WORLD - 120, this.py + Math.sin(a) * 420));
      u.progress = 0;
      u.need = 6 + this.uplinkIdx;
      u.timeLeft = 32;
      this.announce("UPLINK DETECTED · HOLD THE ZONE", 2.4);
      this.audio.level();
    }
    if (!u.active) return;
    u.timeLeft -= dt;
    if (Math.hypot(this.px - u.x, this.py - u.y) < u.r) u.progress += dt;
    if (u.progress >= u.need) {
      u.active = false;
      this.uplinksWon += 1;
      this.announce("UPLINK SECURED", 2);
      this.spawnRing(u.x, u.y, 180, 0.6, "#7ae0a0", 5);
      this.drop("chest", u.x, u.y, 1, this.uplinksWon >= 3 ? "legendary" : "epic");
      this.drop("credit", u.x + 18, u.y, 50 + 25 * this.uplinksWon);
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.25);
      this.hurtCircle(u.x, u.y, 260, 60 + this.time * 0.6, true);
    } else if (u.timeLeft <= 0) {
      u.active = false;
      this.announce("UPLINK LOST", 1.6);
    }
  }

  private updateMobs(dt: number, _ax: number, _ay: number) {
    const buckets = new Map<number, Mob[]>();
    for (const m of this.mobs) {
      if (!m.alive) continue;
      const k = hash(m.x, m.y);
      let b = buckets.get(k);
      if (!b) {
        b = [];
        buckets.set(k, b);
      }
      b.push(m);
    }
    for (const m of this.mobs) {
      if (!m.alive) continue;
      m.flash = Math.max(0, m.flash - dt * 6);
      m.touchCd = Math.max(0, m.touchCd - dt);
      m.fireCd = Math.max(0, m.fireCd - dt);
      let dx = this.px - m.x;
      let dy = this.py - m.y;
      const dist = Math.hypot(dx, dy) || 1;
      dx /= dist;
      dy /= dist;

      if (m.boss) m.special -= dt;
      let chaseSpeed = m.speed;

      if (m.kind === "titan") {
        if (m.telegraph > 0) {
          const was = m.telegraph;
          m.telegraph = Math.max(0, m.telegraph - dt);
          chaseSpeed = 0;
          if (was > 0 && m.telegraph === 0) {
            this.audio.slam();
            this.hitstop = 0.05;
            this.trauma = Math.min(1, this.trauma + 0.5);
            this.spawnRing(m.x, m.y, 200, 0.5, "#c45c4a", 5);
            const pdx = this.px - m.x;
            const pdy = this.py - m.y;
            const pd = Math.hypot(pdx, pdy);
            if (pd < 200 && this.invuln <= 0) {
              this.damagePlayer(m.dmg * 1.6);
              if (pd > 1) {
                this.px += (pdx / pd) * 60;
                this.py += (pdy / pd) * 60;
              }
            }
            m.special = 4 + Math.random() * 2.4;
          }
        } else if (m.special <= 0) {
          m.telegraph = TITAN_TELEGRAPH;
          m.special = 999;
          this.spawnRing(m.x, m.y, 200, TITAN_TELEGRAPH, "#c45c4a", 2);
        }
      } else if (m.kind === "ace") {
        if (m.dashT > 0) {
          m.dashT = Math.max(0, m.dashT - dt);
          if (m.dashT === 0) {
            m.speed = m.baseSpeed;
            m.special = 2.6 + Math.random() * 1.6;
          }
        } else if (m.special <= 0) {
          m.dashT = ACE_DASH_TIME;
          m.dashDX = dx;
          m.dashDY = dy;
          m.speed = m.baseSpeed * 3.2;
          m.special = 999;
          this.burst(m.x, m.y, 6, "#c4453a");
          if (m.phase > 0) {
            for (let i = 0; i < 2; i++) this.spawnMob(false, "swarm", { x: m.x, y: m.y });
          }
        }
      } else if (m.kind === "warden") {
        chaseSpeed = dist > 260 ? m.speed : 0;
        m.aimX += dt * (0.9 + m.phase * 0.5);
        if (m.fireCd <= 0) {
          m.fireCd = m.phase === 2 ? 0.16 : 0.24;
          const arms = 2 + m.phase;
          for (let i = 0; i < arms; i++) this.enemyShot(m.x, m.y, m.aimX + (i / arms) * Math.PI * 2, 170, 6, m.dmg * 0.55, 0, "#ff9a5a");
        }
        if (m.special <= 0) {
          m.special = 5 - m.phase;
          for (let i = 0; i < 3 + m.phase * 2; i++) {
            this.spawnHazard(this.px + (Math.random() - 0.5) * 260, this.py + (Math.random() - 0.5) * 260, 64, 1.1, 18, "#ff5a4a");
          }
        }
      } else if (m.kind === "charger") {
        m.special -= dt;
        if (m.dashT > 0) {
          m.dashT = Math.max(0, m.dashT - dt);
          if (m.dashT === 0) { m.speed = m.baseSpeed; m.special = 2.4 + Math.random() * 1.5; }
        } else if (m.telegraph > 0) {
          chaseSpeed = 0;
          m.telegraph = Math.max(0, m.telegraph - dt);
          if (m.telegraph === 0) {
            m.dashT = 0.5; m.dashDX = m.aimX; m.dashDY = m.aimY; m.speed = m.baseSpeed * 5.2;
          }
        } else if (m.special <= 0 && dist < 420) {
          m.telegraph = 0.6; m.aimX = dx; m.aimY = dy; m.special = 999;
        }
      } else if (m.kind === "sniper") {
        if (dist < 300) chaseSpeed = -m.speed * 0.8;
        else if (dist < 420) chaseSpeed = 0;
        if (m.telegraph > 0) {
          m.telegraph = Math.max(0, m.telegraph - dt);
          if (m.telegraph === 0) {
            this.enemyShot(m.x, m.y, Math.atan2(m.aimY, m.aimX), 640, 5, m.dmg * 1.4, 0, "#ff4a6a");
            m.fireCd = 2.8;
          } else { m.aimX = dx; m.aimY = dy; }
        } else if (m.fireCd <= 0 && dist < 640) {
          m.telegraph = 0.85; m.aimX = dx; m.aimY = dy;
        }
      } else if (m.kind === "shielder") {
        if (m.shieldHp < m.shieldMax) m.shieldHp = Math.min(m.shieldMax, m.shieldHp + dt * m.shieldMax * 0.12);
      }
      if (m.elite === "regen") m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.035 * dt);
      if (m.boss) this.bossPhase(m);
      if (m.kind === "titan" && m.phase > 0 && m.telegraph === 0 && m.special > 2.2) m.special = 2.2;

      let sx = 0;
      let sy = 0;
      const cx = Math.floor(m.x / CELL);
      const cy = Math.floor(m.y / CELL);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const list = buckets.get((cx + ox) * 73856093 ^ (cy + oy) * 19349663);
          if (!list) continue;
          for (const o of list) {
            if (o === m) continue;
            const ddx = m.x - o.x;
            const ddy = m.y - o.y;
            const d2 = ddx * ddx + ddy * ddy;
            const min = m.r + o.r;
            if (d2 < min * min && d2 > 0.01) {
              const d = Math.sqrt(d2);
              sx += (ddx / d) * (min - d);
              sy += (ddy / d) * (min - d);
            }
          }
        }
      }
      if (m.dashT > 0) {
        m.vx = m.dashDX * m.speed;
        m.vy = m.dashDY * m.speed;
      } else {
        m.vx = dx * chaseSpeed + sx * 18;
        m.vy = dy * chaseSpeed + sy * 18;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      for (const w of this.wrecks) {
        const wx = m.x - w.x;
        const wy = m.y - w.y;
        const wd = Math.hypot(wx, wy);
        const min = m.r + w.r;
        if (wd < min && wd > 0.001) {
          m.x += (wx / wd) * (min - wd);
          m.y += (wy / wd) * (min - wd);
        }
      }
      if (dist < m.r + 16 && m.touchCd <= 0 && this.invuln <= 0) {
        this.damagePlayer(m.dmg);
        m.touchCd = 0.55;
      }
      if (m.fireCd <= 0 && (m.kind === "walker" || m.kind === "crawler" || m.kind === "titan" || m.kind === "ace") && dist < 620) {
        m.fireCd = m.boss ? 1.05 : m.kind === "crawler" ? 2.2 : 1.7;
        const b = this.bullets.find((x) => !x.alive);
        if (b) {
          b.alive = true;
          b.x = m.x;
          b.y = m.y;
          const sp = m.boss ? 280 : 240;
          b.vx = dx * sp;
          b.vy = dy * sp;
          b.r = m.boss ? 7 : 5;
          b.dmg = m.dmg * 0.7;
          b.life = 2.2;
          b.pierce = 0;
          b.friendly = false;
          b.homing = m.kind === "ace" ? 1.6 : 0;
          b.explode = 0;
          b.color = "#e07060";
        }
      }
    }
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      if (b.homing > 0 && b.friendly) {
        const n = this.nearestMob();
        if (n) {
          const dx = n.x - b.x;
          const dy = n.y - b.y;
          const d = Math.hypot(dx, dy) || 1;
          b.vx += (dx / d) * b.homing * 180 * dt;
          b.vy += (dy / d) * b.homing * 180 * dt;
        }
      } else if (b.homing > 0 && !b.friendly) {
        const dx = this.px - b.x;
        const dy = this.py - b.y;
        const d = Math.hypot(dx, dy) || 1;
        b.vx += (dx / d) * b.homing * 90 * dt;
        b.vy += (dy / d) * b.homing * 90 * dt;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) {
        if (b.friendly && b.explode > 0) this.hurtCircle(b.x, b.y, b.explode, b.dmg * 0.6, false);
        b.alive = false;
        continue;
      }
      if (b.friendly) {
        for (const m of this.mobs) {
          if (!m.alive) continue;
          const dx = m.x - b.x;
          const dy = m.y - b.y;
          if (dx * dx + dy * dy < (m.r + b.r) * (m.r + b.r)) {
            this.hurtMob(m, b.dmg, b.explode, b.crit);
            if (b.chain > 0) {
              const next = this.nearestMobExcept(m, b.x, b.y, 260);
              b.chain -= 1;
              if (next) {
                const ddx = next.x - b.x;
                const ddy = next.y - b.y;
                const dd = Math.hypot(ddx, ddy) || 1;
                const spd = Math.hypot(b.vx, b.vy);
                b.vx = (ddx / dd) * spd;
                b.vy = (ddy / dd) * spd;
              } else {
                b.alive = false;
              }
              break;
            }
            b.pierce -= 1;
            if (b.pierce < 0) {
              b.alive = false;
              break;
            }
          }
        }
      } else if (this.invuln <= 0) {
        const dx = this.px - b.x;
        const dy = this.py - b.y;
        if (dx * dx + dy * dy < (16 + b.r) * (16 + b.r)) {
          this.damagePlayer(b.dmg);
          b.alive = false;
        }
      }
    }
  }

  private registerCombo() {
    this.comboCount += 1;
    this.comboTimer = COMBO_WINDOW;
    if ((this.perks.momentum ?? 0) > 0) this.momentumT = 1.4;
    if ((this.perks.echo ?? 0) > 0 && Math.random() < 0.12 * (this.perks.echo ?? 0)) {
      const n = this.nearestMob();
      if (n) this.hurtCircle(n.x, n.y, 42, (this.base?.dmg ?? 8) * 0.8, true);
    }
    if (this.comboCount > 0 && this.comboCount % COMBO_TRIGGER === 0) {
      this.overdriveT = OVERDRIVE_TIME;
      this.audio.overdrive();
      this.spawnRing(this.px, this.py, 64, 0.5, "#ffd166", 3);
      this.screenFlash("#ffd166", 0.18);
    }
  }

  private hurtMob(m: Mob, dmg: number, explode: number, crit = false, quiet = false) {
    dmg *= m.boss ? 1 + 0.15 * (this.perks.thermal ?? 0) : 1;
    if (m.elite === "armored") dmg *= 0.55;
    if (m.shieldHp > 0) {
      const absorbed = Math.min(m.shieldHp, dmg * 0.8);
      m.shieldHp -= absorbed;
      dmg -= absorbed;
      if (m.shieldHp <= 0) { this.spawnRing(m.x, m.y, m.r + 18, 0.3, "#8fd0ff", 3); m.shieldHp = -m.shieldMax * 0.6; }
    }
    m.hp -= dmg;
    m.flash = 0.16;
    if (!quiet) this.burst(m.x, m.y, m.boss ? 10 : 4, m.boss ? "#e8a070" : "#d8d0c4");
    this.spawnFloat(m.x, m.y, Math.round(dmg).toString(), crit ? "#ffd166" : quiet ? "#e8a070" : "#e8e0c8", crit);
    if (crit && this.evo.has("nova")) {
      this.spawnRing(m.x, m.y, 64, 0.25, "#ffd166", 3);
      this.novaQueue.push(m.x, m.y, dmg * 0.7, 64);
    }
    if (m.hp <= 0) this.killMob(m, explode, dmg);
    else if (!quiet) this.audio.hit();
  }

  private novaQueue: number[] = [];

  private killMob(m: Mob, explode: number, dmg: number) {
    m.alive = false;
    this.kills += 1;
    this.registerCombo();
    this.audio.death();
    this.dropFrom(m);
    const vamp = this.perks.vampire ?? 0;
    if (vamp > 0) {
      const k = this.evo.has("bloodline") ? 2 : 1;
      this.hp = Math.min(this.maxHp, this.hp + 1.6 * vamp * k * (m.boss ? 6 : 1));
      if (k === 2 && Math.random() < 0.06) this.drop("hp", m.x, m.y + 8, 10);
    }
    if (explode > 0) this.novaQueue.push(m.x, m.y, dmg * 0.6, explode);
    if (m.elite) {
      if (Math.random() < 0.1) this.drop("chest", m.x, m.y, 1);
      this.drop("credit", m.x + 10, m.y, 12);
      if (m.elite === "volatile") this.spawnHazard(m.x, m.y, 90, 0.6, m.dmg, "#ff7a4a");
      if (m.elite === "splitter") for (let i = 0; i < 4; i++) this.spawnMob(false, "swarm", { x: m.x + (i - 1.5) * 16, y: m.y });
    }
    if (m.boss) {
      this.trauma = Math.min(1, this.trauma + 0.55);
      this.hitstop = 0.07;
      this.spawnRing(m.x, m.y, 100, 0.65, "#ff8a5c", 4);
      this.explodeFx(m.x, m.y, 120, "#ff8a5c");
      this.screenFlash("#fff1dc", 0.35);
      this.announce(`${m.kind.toUpperCase()} DOWN`, 2);
      this.drop("chest", m.x, m.y, 1, Math.random() < 0.45 || m.kind === "warden" ? "legendary" : "epic");
      this.drop("key", m.x + 16, m.y, 1);
      this.drop("credit", m.x - 16, m.y, m.kind === "warden" ? 120 : 40);
      this.drop("hp", m.x, m.y + 18, 40);
      for (const q of this.picks) if (q.alive && q.kind === "xp") { this.xp += q.value; q.alive = false; }
    } else {
      this.spawnRing(m.x, m.y, m.elite ? 50 : 28, 0.32, m.elite ? "#ffd166" : "#d8d0c4", 2);
      this.explodeFx(m.x, m.y, m.r * 2.2, m.elite ? "#ffd166" : "#ff9a5c");
    }
    this.checkLevel();
  }

  private flushNova() {
    // queued area hits are resolved after the bullet loop to avoid recursive chain explosions
    let guard = 0;
    while (this.novaQueue.length && guard++ < 40) {
      const q = this.novaQueue.splice(0, 4);
      const [x, y, d, r] = q as [number, number, number, number];
      this.hurtCircle(x, y, r, d, false);
    }
    this.novaQueue.length = 0;
  }

  private hurtCircle(x: number, y: number, r: number, dmg: number, flash: boolean) {
    for (const m of this.mobs) {
      if (!m.alive) continue;
      const dx = m.x - x;
      const dy = m.y - y;
      if (dx * dx + dy * dy < (r + m.r) * (r + m.r)) this.hurtMob(m, dmg, 0, false, true);
    }
    if (flash) this.burst(x, y, 18, "#e8e0c8");
  }

  private dropFrom(m: Mob) {
    const salvage = this.perks.salvage ?? 0;
    this.drop("xp", m.x, m.y, m.xp);
    if (Math.random() < 0.04) this.drop("hp", m.x + 8, m.y, 18);
    if (Math.random() < 0.03 + 0.015 * salvage) {
      this.drop("credit", m.x - 8, m.y, 8 + Math.floor(Math.random() * 12) + 3 * salvage);
    }
    if (Math.random() < 0.012) this.drop("key", m.x, m.y + 10, 1);
  }

  private drop(kind: Pick["kind"], x: number, y: number, value: number, floor?: Pick["floor"]) {
    const p = this.picks.find((q) => !q.alive);
    if (!p && kind === "xp") {
      // pool full: fold into the farthest gem so XP is never lost
      let far: Pick | null = null;
      let fd = -1;
      for (const q of this.picks) {
        if (q.kind !== "xp") continue;
        const d = (q.x - this.px) ** 2 + (q.y - this.py) ** 2;
        if (d > fd) { fd = d; far = q; }
      }
      if (far) far.value += value;
      return;
    }
    if (!p) return;
    p.alive = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.r = kind === "chest" ? 14 : 9;
    p.value = value;
    p.floor = floor;
  }

  private updatePicks(dt: number, magnet: number) {
    for (const p of this.picks) {
      if (!p.alive) continue;
      const dx = this.px - p.x;
      const dy = this.py - p.y;
      const d = Math.hypot(dx, dy);
      const grab = p.kind === "xp" ? magnet : 42;
      if (d < grab && d > 1) {
        p.x += (dx / d) * 280 * dt * (grab / Math.max(40, d));
        p.y += (dy / d) * 280 * dt * (grab / Math.max(40, d));
      }
      if (d < 22) {
        p.alive = false;
        this.audio.pickup();
        if (p.kind === "xp") {
          this.xp += p.value;
          this.checkLevel();
        } else if (p.kind === "hp") this.hp = Math.min(this.maxHp, this.hp + p.value);
        else if (p.kind === "key") this.keysGot += p.value;
        else if (p.kind === "credit") this.creditsGot += p.value;
        else if (p.kind === "chest") {
          const item = rollGear(Math.random, p.floor);
          this.loot.push(item);
        }
      }
    }
  }

  private checkLevel() {
    if (this.leveling || this.over) return;
    const next = xpForLevel(this.level);
    if (this.xp >= next && this.level < 24) {
      this.xp -= next;
      this.level += 1;
      this.audio.level();
      this.leveling = true;
      this.hooks.onLevelUp(this.rollPerks());
      this.pushHud();
    }
  }

  private rollPerks(): PerkId[] {
    const pool = PERKS.filter((p) => (this.perks[p.id] ?? 0) < p.max);
    const out: PerkId[] = [];
    const copy = [...pool];
    while (out.length < 3 && copy.length) {
      const i = Math.floor(Math.random() * copy.length);
      out.push(copy[i]!.id);
      copy.splice(i, 1);
    }
    return out;
  }

  private damagePlayer(raw: number) {
    if (this.invuln > 0 || this.godMode) return;
    let dmg = Math.max(0.5, raw - 1.4 * (this.perks.barrier ?? 0));
    if (this.shield > 0) dmg *= 0.2;
    this.hp -= dmg;
    this.invuln = 0.45;
    this.trauma = Math.min(1, this.trauma + 0.4);
    this.audio.hurt();
    this.hurtT = 0.35;
    this.burst(this.px, this.py, 10, "#ff6a5c");
    this.spawnFloat(this.px, this.py, `-${Math.round(dmg)}`, "#ff6a5c");
    if (this.hp <= 0) this.hp = 0;
  }

  private allocFx(): Fx | null {
    // ring allocator over the active part of the pool; bounded scan keeps it O(1)-ish when saturated
    const n = PROFILES[this.quality].maxFx;
    for (let i = 0; i < 48; i++) {
      const idx = (this.fxCursor + i) % n;
      const p = this.fx[idx]!;
      if (!p.alive) {
        this.fxCursor = (idx + 1) % n;
        return p;
      }
    }
    this.fxCursor = (this.fxCursor + 48) % n;
    return null;
  }

  /** Hit sparks: velocity-stretched streaks plus a few glowing embers. */
  private burst(x: number, y: number, n: number, color: string) {
    const count = Math.max(1, Math.round(n * PROFILES[this.quality].sparkMul));
    for (let i = 0; i < count; i++) {
      const p = this.allocFx();
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 220;
      p.alive = true;
      p.kind = i % 4 === 3 ? 1 : 0;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = p.kind === 1 ? 0.5 + Math.random() * 0.4 : 0.18 + Math.random() * 0.25;
      p.max = p.life;
      p.size = p.kind === 1 ? 2 + Math.random() * 2 : 1.2 + Math.random() * 1.4;
      p.color = color;
    }
  }

  /** Death/explosion: flash light, sparks, tumbling debris and (HIGH) smoke. */
  private explodeFx(x: number, y: number, size: number, color: string) {
    const prof = PROFILES[this.quality];
    this.burst(x, y, 6 + size * 0.5, color);
    const debris = Math.round((2 + size * 0.15) * prof.sparkMul);
    for (let i = 0; i < debris; i++) {
      const p = this.allocFx();
      if (!p) break;
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      p.alive = true; p.kind = 3; p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.rot = Math.random() * 6; p.vr = (Math.random() - 0.5) * 14;
      p.life = 0.5 + Math.random() * 0.5; p.max = p.life;
      p.size = 2 + Math.random() * 3; p.color = "#4a4440";
    }
    if (prof.smoke) {
      for (let i = 0; i < 2 + size * 0.08; i++) {
        const p = this.allocFx();
        if (!p) break;
        p.alive = true; p.kind = 2;
        p.x = x + (Math.random() - 0.5) * size * 0.5; p.y = y + (Math.random() - 0.5) * size * 0.5;
        p.vx = (Math.random() - 0.5) * 30; p.vy = (Math.random() - 0.5) * 30 - 10;
        p.life = 0.7 + Math.random() * 0.6; p.max = p.life;
        p.size = size * (0.5 + Math.random() * 0.4); p.color = "#2a2826";
      }
    }
    // flash light ember (big, short) feeds bloom
    const f = this.allocFx();
    if (f) {
      f.alive = true; f.kind = 1; f.x = x; f.y = y; f.vx = 0; f.vy = 0;
      f.life = 0.14; f.max = 0.14; f.size = size * 0.9; f.color = color;
    }
  }

  private screenFlash(color: string, t: number) {
    if (this.reduced) return;
    this.flashColor = color;
    this.flashT = Math.max(this.flashT, t);
  }

  private updateFx(dt: number) {
    const drag = Math.exp(-3.2 * dt);
    for (const p of this.fx) {
      if (!p.alive) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind !== 2) {
        p.vx *= drag;
        p.vy *= drag;
      }
      if (p.kind === 3) p.rot += p.vr * dt;
      if (p.kind === 2) p.size += dt * 18;
      p.life -= dt;
      if (p.life <= 0) p.alive = false;
    }
    this.flashT = Math.max(0, this.flashT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
  }

  private spawnRing(x: number, y: number, maxR: number, life: number, color: string, width = 3) {
    const r = this.rings.find((q) => !q.alive);
    if (!r) return;
    r.alive = true;
    r.x = x;
    r.y = y;
    r.r = maxR * 0.15;
    r.maxR = maxR;
    r.life = life;
    r.max = life;
    r.color = color;
    r.width = width;
  }

  private updateRings(dt: number) {
    for (const r of this.rings) {
      if (!r.alive) continue;
      r.life -= dt;
      const t = 1 - Math.max(0, r.life) / r.max;
      r.r = r.maxR * (0.15 + 0.85 * t);
      if (r.life <= 0) r.alive = false;
    }
  }

  private spawnFloat(x: number, y: number, text: string, color: string, crit = false) {
    const f = this.floats.find((q) => !q.alive);
    if (!f) return;
    f.alive = true;
    f.x = x + (Math.random() - 0.5) * 10;
    f.y = y - 12;
    f.vy = -(46 + Math.random() * 26);
    f.life = crit ? 0.85 : 0.6;
    f.max = f.life;
    f.text = text;
    f.color = color;
    f.crit = crit;
  }

  private updateFloats(dt: number) {
    for (const f of this.floats) {
      if (!f.alive) continue;
      f.y += f.vy * dt;
      f.vy *= 1 - dt * 1.4;
      f.life -= dt;
      if (f.life <= 0) f.alive = false;
    }
  }

  private finish(survived: boolean) {
    if (this.over) return;
    this.over = true;
    const credits =
      50 +
      this.kills * 2 +
      this.bosses * 90 +
      this.uplinksWon * 60 +
      this.creditsGot +
      (survived ? 220 : Math.floor(this.time * 0.4));
    const keys = this.keysGot + this.bosses + (survived ? 1 : 0);
    const result: RunResult = {
      survived,
      time: this.time,
      kills: this.kills,
      xp: this.xp,
      level: this.level,
      credits,
      keys,
      loot: this.loot,
      bosses: this.bosses,
      sector: this.sector + 1,
      uplinks: this.uplinksWon,
      evolutions: EVOLUTIONS.filter((e) => this.evo.has(e.id)).map((e) => e.name),
    };
    this.hooks.onOver(result);
    this.pushHud();
  }

  private pushHud() {
    this.hooks.onHud({
      hp: this.hp,
      maxHp: this.maxHp,
      xp: this.xp,
      xpNext: xpForLevel(this.level),
      level: this.level,
      timeLeft: Math.max(0, MISSION_SECONDS - this.time),
      kills: this.kills,
      skillCd: this.skillCd,
      skillMax: this.skillMax,
      paused: this.paused,
      leveling: this.leveling,
      combo: this.comboCount,
      overdrive: this.overdriveT,
    });
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const prof = PROFILES[this.quality];
    let sx = 0;
    let sy = 0;
    if (!this.reduced && this.trauma > 0) {
      const s = this.trauma * this.trauma;
      const tt = this.time * 60;
      // smooth, decaying shake (noise-ish) instead of white-noise jitter
      sx = (Math.sin(tt * 1.7) + Math.sin(tt * 2.9) * 0.5) * 12 * s;
      sy = (Math.cos(tt * 1.3) + Math.sin(tt * 3.7) * 0.5) * 12 * s;
    }
    const camX = this.camX + sx;
    const camY = this.camY + sy;
    // view bounds for culling
    const vx0 = camX - w / 2 - 60;
    const vx1 = camX + w / 2 + 60;
    const vy0 = camY - h / 2 - 60;
    const vy1 = camY + h / 2 + 60;
    const inView = (x: number, y: number, r = 0) => x + r > vx0 && x - r < vx1 && y + r > vy0 && y - r < vy1;

    const bl = prof.bloom ? this.bloom : null;
    bl?.begin(camX, camY);

    ctx.save();
    ctx.translate(w / 2 - camX, h / 2 - camY);
    this.drawGround(ctx, camX, camY, w, h);
    const shadow = prof.shadows ? shadowSprite() : null;
    for (let i = 0; i < this.wrecks.length; i++) {
      const wr = this.wrecks[i]!;
      if (!inView(wr.x, wr.y, 60)) continue;
      if (shadow) ctx.drawImage(shadow.c, wr.x - 38, wr.y - 30, 84, 76);
      const spr = cachedSprite(`wreck:${i}`, 96, (c) => drawWreck(c, wr.seed));
      drawSprite(ctx, spr, wr.x, wr.y);
    }
    this.drawObjectives(ctx);
    for (const hz of this.hazards) if (hz.alive && bl) bl.light(hz.x, hz.y, hz.r * 1.1, hz.color, 0.25 + 0.5 * (1 - hz.t / hz.max));
    if (this.uplink.active && bl) bl.light(this.uplink.x, this.uplink.y, this.uplink.r * 1.4, "#7ae0a0", 0.35);
    for (const p of this.picks) {
      if (!p.alive || !inView(p.x, p.y, 20)) continue;
      const bob = Math.sin(this.time * 4 + p.x * 0.05) * 1.5;
      const spr = cachedSprite(`pick:${p.kind}`, 40, (c) => drawPickup(c, p.kind));
      drawSprite(ctx, spr, p.x, p.y + bob);
      if (bl) bl.light(p.x, p.y, p.kind === "chest" ? 40 : 16, p.kind === "chest" ? "#ffd166" : p.kind === "hp" ? "#7ae0a0" : p.kind === "credit" ? "#e8c84a" : "#7ad8f0", 0.6);
    }
    // telegraphs under enemies
    for (const m of this.mobs) {
      if (!m.alive || !(m.telegraph > 0)) continue;
      if (m.kind === "sniper" || m.kind === "charger") {
        const len = m.kind === "sniper" ? 700 : 260;
        ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(this.time * 20));
        ctx.strokeStyle = m.kind === "sniper" ? "#ff4a6a" : "#ffb040";
        ctx.lineWidth = m.kind === "sniper" ? 1.5 : m.r * 1.6;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + m.aimX * len, m.y + m.aimY * len);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // shadows pass
    if (shadow) {
      ctx.globalAlpha = 0.8;
      for (const m of this.mobs) {
        if (!m.alive || !inView(m.x, m.y, m.r * 2)) continue;
        const r = m.r * (m.boss ? 1.9 : 1.5);
        ctx.drawImage(shadow.c, m.x - r + 5, m.y - r * 0.8 + 8, r * 2, r * 1.6);
      }
      ctx.drawImage(shadow.c, this.px - 24 + 6, this.py - 18 + 10, 48, 36);
      ctx.globalAlpha = 1;
    }
    for (const m of this.mobs) {
      if (!m.alive || !inView(m.x, m.y, m.r * 2)) continue;
      if (m.elite) {
        ctx.strokeStyle = m.elite === "volatile" ? "#ff7a4a" : m.elite === "regen" ? "#7ae0a0" : m.elite === "armored" ? "#c5cdd6" : m.elite === "swift" ? "#8fd0ff" : "#d090ff";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(this.time * 6);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (bl) bl.light(m.x, m.y, m.r * 2.4, ctx.strokeStyle as string, 0.35);
      }
      if (m.shieldHp > 0) {
        ctx.fillStyle = `rgba(143,208,255,${0.08 + 0.18 * (m.shieldHp / m.shieldMax)})`;
        ctx.strokeStyle = "rgba(143,208,255,0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r + 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (bl) bl.light(m.x, m.y, m.r + 20, "#8fd0ff", 0.3);
      }
      const sc = (m.boss ? (m.kind === "warden" ? 1.5 : 1.35) : m.kind === "crawler" ? 1.15 : 1) * (m.elite ? 1.25 : 1);
      const ang = Math.atan2(this.py - m.y, this.px - m.x);
      const box = MOB_BOX[m.kind] ?? 64;
      const spr = cachedSprite(`mob:${m.kind}`, box, (c) => drawEnemyTop(c, m.kind, 0));
      drawSprite(ctx, spr, m.x, m.y, ang, sc);
      if (m.flash > 0) {
        // additive white hit-flash (cached glow, no per-frame gradient)
        const g = glowSprite("#ffffff", true);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.min(0.6, m.flash * 4);
        const r = m.r * sc * 1.2;
        ctx.drawImage(g.c, m.x - r, m.y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      if (bl) {
        // eye/engine glow per enemy; bosses glow big
        bl.light(m.x + Math.cos(ang) * m.r * 0.4, m.y + Math.sin(ang) * m.r * 0.4, m.boss ? 46 : 12, m.boss ? "#ff5a3a" : "#ff7a4a", m.boss ? 0.9 : 0.55);
      }
      if (m.boss || m.hp < m.maxHp) {
        const bw = m.boss ? 60 : m.elite ? 32 : 22;
        ctx.fillStyle = "#1a1a1c";
        ctx.fillRect(m.x - bw / 2, m.y - m.r * sc - 10, bw, 3);
        ctx.fillStyle = m.boss ? "#ff6a4a" : m.elite ? "#ffd166" : "#9ab884";
        ctx.fillRect(m.x - bw / 2, m.y - m.r * sc - 10, bw * Math.max(0, m.hp / m.maxHp), 3);
      }
    }
    // bullets: streak + cached glow core (no per-bullet gradients)
    ctx.lineCap = "round";
    for (const b of this.bullets) {
      if (!b.alive || !inView(b.x, b.y, 30)) continue;
      const spd = Math.hypot(b.vx, b.vy) || 1;
      if (prof.trails) {
        const trailLen = Math.min(28, spd * 0.035);
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = b.friendly ? 0.55 : 0.6;
        ctx.lineWidth = b.r * 1.2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - (b.vx / spd) * trailLen, b.y - (b.vy / spd) * trailLen);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      const g = glowSprite(b.color, true);
      const r = b.r * (b.friendly ? 2.4 : 3);
      ctx.drawImage(g.c, b.x - r, b.y - r, r * 2, r * 2);
      if (!b.friendly) {
        // enemy shots get a dark rim so they read on bright floors
        ctx.strokeStyle = "rgba(20,0,0,0.6)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 1, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (bl) bl.light(b.x, b.y, b.r * (b.friendly ? 4.5 : 6), b.color, b.friendly ? 0.35 : 0.8);
    }
    for (const r of this.rings) {
      if (!r.alive) continue;
      const a = Math.max(0, r.life / r.max);
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (0.6 + a * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (bl && r.maxR > 40) {
        bl.ctx.globalAlpha = a * 0.6;
        bl.ctx.strokeStyle = r.color;
        bl.ctx.lineWidth = r.width * 3;
        bl.ctx.beginPath();
        bl.ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        bl.ctx.stroke();
      }
    }
    // particles
    for (const p of this.fx) {
      if (!p.alive || p.kind !== 2 || !inView(p.x, p.y, p.size)) continue;
      const s2 = softSprite(p.color);
      ctx.globalAlpha = (p.life / p.max) * 0.8;
      ctx.drawImage(s2.c, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    }
    ctx.globalAlpha = 1;
    for (const p of this.fx) {
      if (!p.alive || p.kind === 2 || !inView(p.x, p.y, 20)) continue;
      const a = p.life / p.max;
      if (p.kind === 0) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
      } else if (p.kind === 1) {
        const g = glowSprite(p.color, true);
        ctx.globalAlpha = a;
        const big = p.size > 12;
        const r = big ? Math.min(40, p.size * 0.6) : p.size * 2.2;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = a * (big ? 0.5 : 1);
        ctx.drawImage(g.c, p.x - r, p.y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = "source-over";
        if (bl) bl.light(p.x, p.y, big ? p.size * 1.4 : r * 2.2, p.color, a * (big ? 0.6 : 0.8));
      } else {
        ctx.globalAlpha = Math.min(1, a * 1.5);
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    // per-mech booster flames at the sprite's thruster ports (pattern + colour per mech)
    const accent = MECH_MAP[this.mechId].accent;
    const boost = MECH_BOOSTERS[this.mechId];
    const moveSpd = Math.hypot(this.pvx, this.pvy);
    const k = Math.min(1, moveSpd / 260);
    const ca = Math.cos(this.aim);
    const sa = Math.sin(this.aim);
    const flameCol = glowSprite(boost.color, false);
    const flameCore = glowSprite(boost.core, true);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < boost.ports.length; i++) {
      const [lx, ly] = boost.ports[i]!;
      const wx = this.px + lx * ca - ly * sa;
      const wy = this.py + lx * sa + ly * ca;
      let f = 1;
      if (boost.pattern === "pulse") f = 0.8 + 0.25 * Math.sin(this.time * 18);
      else if (boost.pattern === "flicker") f = 0.75 + Math.random() * 0.45;
      else if (boost.pattern === "stagger") f = 0.75 + 0.3 * Math.sin(this.time * 22 + i * 1.7);
      const r = (5 + k * 9) * boost.size * f;
      // flame tail trails opposite the aim (thrust out the back)
      const tx = wx - ca * r * 0.9;
      const ty = wy - sa * r * 0.9;
      ctx.globalAlpha = 0.55 + 0.35 * k;
      ctx.drawImage(flameCol.c, tx - r * 1.4, ty - r * 1.4, r * 2.8, r * 2.8);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(flameCore.c, wx - r * 0.5, wy - r * 0.5, r, r);
      if (bl) bl.light(tx, ty, r * 2.6, boost.color, 0.5 + 0.4 * k);
      if (prof.trails && moveSpd > 20 && Math.random() < 0.35) {
        const p = this.allocFx();
        if (p) {
          p.alive = true; p.kind = 1; p.x = tx; p.y = ty;
          p.vx = -ca * 90 + (Math.random() - 0.5) * 30; p.vy = -sa * 90 + (Math.random() - 0.5) * 30;
          p.life = 0.22; p.max = 0.22; p.size = 1.5 + k * 2 * boost.size; p.color = boost.color;
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (bl) {
      bl.light(this.px, this.py, 64, accent, 0.28);
      if (this.overdriveT > 0) bl.light(this.px, this.py, 110, "#ffd166", 0.5);
    }
    ctx.save();
    ctx.translate(this.px, this.py);
    ctx.rotate(this.aim);
    if (this.shield > 0) {
      ctx.strokeStyle = "rgba(197,205,214,0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.invuln > 0) ctx.globalAlpha = 0.55 + Math.sin(this.time * 30) * 0.2;
    // cached cel-shaded sprite (clip-heavy vector art is too slow to redraw every frame)
    const mechSpr = cachedSprite(`mech:${this.mechId}`, 104, (c) => drawMechTop(c, this.mechId, 0));
    ctx.drawImage(mechSpr.c, -mechSpr.half, -mechSpr.half, mechSpr.half * 2, mechSpr.half * 2);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (this.coils > 0) {
      for (let i = 0; i < 3; i++) {
        const a = this.time * 4 + (i * Math.PI * 2) / 3;
        const cx = this.px + Math.cos(a) * 50;
        const cy = this.py + Math.sin(a) * 50;
        const g = glowSprite("#7ae0a0", true);
        ctx.drawImage(g.c, cx - 12, cy - 12, 24, 24);
        if (bl) bl.light(cx, cy, 26, "#7ae0a0", 0.7);
      }
    }
    ctx.textAlign = "center";
    for (const f of this.floats) {
      if (!f.alive) continue;
      const a = Math.max(0, f.life / f.max);
      const pop = f.crit ? 1 + Math.max(0, (f.life / f.max - 0.75) * 2) : 1;
      ctx.globalAlpha = a;
      ctx.font = f.crit ? `bold ${Math.round(16 * pop)}px sans-serif` : "bold 12px sans-serif";
      ctx.fillStyle = "#0a0a0c";
      ctx.fillText(f.text, f.x + 1, f.y + 1.5);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ---- post-processing ----
    if (bl) bl.composite(ctx, 0.7);
    ctx.drawImage(vignette(w, h, prof.grade ? SECTORS[this.sector]!.gradeTint : "", prof.grade), 0, 0, w, h);
    if (this.hurtT > 0) {
      ctx.globalAlpha = this.hurtT * 1.2;
      ctx.strokeStyle = "#ff3a2a";
      ctx.lineWidth = 18;
      ctx.strokeRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    if (this.flashT > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(0.45, this.flashT * 1.4);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    this.drawUplinkHud(ctx, w, h);
    this.drawMinimap(ctx, w);
    this.drawAnnounce(ctx, w);
    this.drawVignette(ctx, w, h);
    if (this.paused && !this.leveling && !this.over) {
      ctx.fillStyle = "rgba(9,9,11,0.45)";
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawObjectives(ctx: CanvasRenderingContext2D) {
    for (const hz of this.hazards) {
      if (!hz.alive) continue;
      const k = 1 - hz.t / hz.max;
      ctx.globalAlpha = 0.12 + 0.25 * k;
      ctx.fillStyle = hz.color;
      ctx.beginPath();
      ctx.arc(hz.x, hz.y, hz.r * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = hz.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const u = this.uplink;
    if (!u.active) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 4);
    ctx.fillStyle = `rgba(122,224,160,${0.06 + pulse * 0.06})`;
    ctx.strokeStyle = "rgba(122,224,160,0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.r + 8, -Math.PI / 2, -Math.PI / 2 + (u.progress / u.need) * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#7ae0a0";
    ctx.fillRect(u.x - 6, u.y - 14, 12, 28);
    ctx.fillRect(u.x - 14, u.y - 4, 28, 8);
  }

  private drawUplinkHud(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const u = this.uplink;
    if (!u.active) return;
    const dx = u.x - this.camX;
    const dy = u.y - this.camY;
    if (Math.abs(dx) > w / 2 - 20 || Math.abs(dy) > h / 2 - 20) {
      const a = Math.atan2(dy, dx);
      const rx = w / 2 - 34;
      const ry = h / 2 - 140;
      const t = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
      ctx.save();
      ctx.translate(w / 2 + Math.cos(a) * t, h / 2 + Math.sin(a) * t);
      ctx.rotate(a);
      ctx.fillStyle = "#7ae0a0";
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, -9);
      ctx.lineTo(-8, 9);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#7ae0a0";
    ctx.fillText(`UPLINK ${Math.floor((u.progress / u.need) * 100)}% · ${Math.ceil(u.timeLeft)}s`, w / 2, h - 150);
    ctx.restore();
  }

  private drawMinimap(ctx: CanvasRenderingContext2D, w: number) {
    const size = 100;
    const margin = 14;
    const cx = w - size / 2 - margin;
    const cy = size / 2 + margin + 82;
    const range = 900;
    const scale = size / 2 / range;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(12,12,15,0.55)";
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    for (const m of this.mobs) {
      if (!m.alive) continue;
      const dx = m.x - this.px;
      const dy = m.y - this.py;
      const d = Math.hypot(dx, dy);
      if (d > range) continue;
      const mx = cx + dx * scale;
      const my = cy + dy * scale;
      ctx.fillStyle = m.boss ? "#ff5a4a" : m.elite ? "#ffd166" : "#8a9a78";
      const ms = m.boss ? 6 : m.elite ? 3.5 : 2.5;
      ctx.fillRect(mx - ms / 2, my - ms / 2, ms, ms);
    }
    for (const p of this.picks) {
      if (!p.alive || p.kind === "xp") continue;
      const dx = p.x - this.px;
      const dy = p.y - this.py;
      const d = Math.hypot(dx, dy);
      if (d > range) continue;
      ctx.fillStyle = p.kind === "chest" ? "#e8c84a" : "#5ec8e8";
      ctx.fillRect(cx + dx * scale - 1, cy + dy * scale - 1, 2, 2);
    }
    if (this.uplink.active) {
      const ux = Math.max(-range, Math.min(range, this.uplink.x - this.px)) * scale;
      const uy = Math.max(-range, Math.min(range, this.uplink.y - this.py)) * scale;
      ctx.fillStyle = "#7ae0a0";
      ctx.fillRect(cx + ux - 3, cy + uy - 3, 6, 6);
    }
    ctx.fillStyle = MECH_MAP[this.mechId].accent;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(236,236,232,0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawAnnounce(ctx: CanvasRenderingContext2D, w: number) {
    if (this.announceT <= 0) return;
    const since = this.announceMax - this.announceT;
    const a = Math.min(1, this.announceT / 0.4, since / 0.25);
    const pop = 1 + Math.max(0, 0.25 - since) * 0.8;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.textAlign = "center";
    let size = 26;
    ctx.font = `bold ${size}px sans-serif`;
    const tw = ctx.measureText(this.announceText).width;
    if (tw > w - 32) size = Math.floor((size * (w - 32)) / tw);
    size = Math.round(size * pop);
    ctx.font = `bold ${size}px sans-serif`;
    const y = 232;
    ctx.fillStyle = "rgba(10,10,12,0.75)";
    ctx.fillText(this.announceText, w / 2 + 1.5, y + 2);
    ctx.fillStyle = "#c45c4a";
    ctx.fillText(this.announceText, w / 2 + 1, y + 1);
    ctx.fillStyle = "#f2e8dc";
    ctx.fillText(this.announceText, w / 2, y);
    ctx.restore();
  }

  private drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const frac = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    if (frac >= 0.32) return;
    const pulse = 0.25 + Math.sin(this.time * 7) * 0.12 + (0.32 - frac) * 0.9;
    const g = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.28,
      w / 2, h / 2, Math.max(w, h) * 0.72,
    );
    g.addColorStop(0, "rgba(196,92,74,0)");
    g.addColorStop(1, `rgba(196,92,74,${Math.max(0, Math.min(0.55, pulse))})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  private drawGround(ctx: CanvasRenderingContext2D, camX: number, camY: number, w: number, h: number) {
    const pad = 80;
    const x0 = camX - w / 2 - pad;
    const y0 = camY - h / 2 - pad;
    const x1 = camX + w / 2 + pad;
    const y1 = camY + h / 2 + pad;
    const sec = SECTORS[this.sector]!;
    let pat = this.floorPat[this.sector];
    if (!pat) {
      pat = ctx.createPattern(floorTile(sec.tex), "repeat");
      this.floorPat[this.sector] = pat;
    }
    ctx.fillStyle = pat ?? sec.floor;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // slow pulsing energy grid over the plates
    const pulse = 0.03 + this.sector * 0.012 + Math.sin(this.time * 0.6) * 0.012;
    ctx.strokeStyle = `rgba(${sec.grid},${pulse})`;
    ctx.lineWidth = 1;
    const tile = 128;
    const sx = Math.floor(x0 / tile) * tile;
    const sy = Math.floor(y0 / tile) * tile;
    ctx.beginPath();
    for (let x = sx; x < x1; x += tile) {
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    }
    for (let y = sy; y < y1; y += tile) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
    // world-boundary danger perimeter
    ctx.strokeStyle = "rgba(196,92,74,0.14)";
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, WORLD - 40, WORLD - 40);
    ctx.strokeStyle = "rgba(224,140,90,0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, WORLD - 40, WORLD - 40);
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      state?: () => Record<string, unknown>;
      spawn?: (n: number) => void;
      skipTo?: (t: number) => void;
      god?: (v: boolean) => void;
      setQuality?: (v: "auto" | "high" | "low") => void;
    };
  }
}
