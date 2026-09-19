import { MISSION_SECONDS, MECH_MAP, PERKS, PERK_MAP, WORLD, xpForLevel, rollGear } from "./data";
import { GameAudio } from "./audio";
import { GameInput } from "./input";
import { drawEnemyTop, drawMechTop, drawPickup, drawWreck } from "./sprites";
import type { GearItem, HudState, MechId, PerkId, RunResult } from "./types";
import type { SaveData } from "./types";

const STEP = 1 / 60;
const MAX_ENEMY = 360;
const MAX_BULLET = 720;
const MAX_PICK = 220;
const MAX_FX = 520;
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
};

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
    friendly: true, homing: 0, explode: 0, color: "#9fd", crit: false,
  }));
  private mobs = pool(MAX_ENEMY, () => ({
    alive: false, kind: "drone", x: 0, y: 0, vx: 0, vy: 0, r: 14, hp: 1, maxHp: 1,
    speed: 40, baseSpeed: 40, dmg: 8, xp: 1, fireCd: 0, flash: 0, boss: false, touchCd: 0,
    special: 0, telegraph: 0, dashT: 0, dashDX: 0, dashDY: 0,
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
    alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: "#fff",
  }));
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
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    if (window.__controlsTest) delete window.__controlsTest;
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
    this.leveling = false;
    this.checkLevel();
    this.pushHud();
  }

  private bindProbe() {
    window.__controlsTest = {
      getYaw: () => this.lastYaw,
      getSpeed: () => Math.hypot(this.pvx, this.pvy),
      setKeys: (codes: string[]) => this.input.setKeys(codes),
    };
  }

  private frame = (t: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
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
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    const odMult = this.overdriveT > 0 ? 1.32 : 1;
    this.pvx = act.moveX * stats.speed * odMult;
    this.pvy = act.moveY * stats.speed * odMult;
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
    if (this.time >= this.nextBossAt && this.time < MISSION_SECONDS - 8) {
      this.spawnMob(true);
      this.nextBossAt += 78;
    }

    this.updateMobs(dt, aimX, aimY);
    this.updateBullets(dt);
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
    };
    const fireOne = (ang: number, speed: number, r: number, life: number, extra = 0) => {
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
      b.pierce = pierce;
      b.friendly = true;
      b.homing = mech.weapon === "fang" ? 2.4 : 0;
      b.explode = (this.perks.explosive ?? 0) > 0 ? 18 + 10 * (this.perks.explosive ?? 0) : 0;
      b.color = colors[mech.weapon] ?? "#9fd";
      b.crit = isCrit;
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
    } else {
      for (let i = 0; i < forks; i++) {
        const o = (i - (forks - 1) / 2) * 0.14;
        fireOne(baseAng + o, 560, 5, stats.range / 560);
      }
    }
    const drones = this.perks.drone ?? 0;
    for (let d = 0; d < drones; d++) {
      const a = this.time * 2.4 + d * Math.PI;
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
      b.homing = 0;
      b.explode = 0;
      b.color = "#c5cdd6";
      b.crit = false;
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
    } else {
      this.coils = 5.2;
      this.spawnRing(this.px, this.py, 55, 0.24, "#7ae0a0", 2);
    }
  }

  private spawnMob(boss: boolean) {
    const m = this.mobs.find((x) => !x.alive);
    if (!m) return;
    const ang = Math.random() * Math.PI * 2;
    const dist = 520 + Math.random() * 180;
    m.x = this.px + Math.cos(ang) * dist;
    m.y = this.py + Math.sin(ang) * dist;
    m.x = Math.max(30, Math.min(WORLD - 30, m.x));
    m.y = Math.max(30, Math.min(WORLD - 30, m.y));
    const t = this.time / MISSION_SECONDS;
    const scale = 1 + t * 1.8;
    if (boss) {
      const ace = this.bosses % 2 === 1;
      m.kind = ace ? "ace" : "titan";
      m.r = ace ? 28 : 36;
      m.hp = (ace ? 420 : 520) * scale;
      m.speed = ace ? 150 : 88;
      m.dmg = ace ? 22 : 26;
      m.xp = ace ? 48 : 42;
      m.boss = true;
      m.fireCd = 1.2;
      m.special = ace ? 3.2 : 4;
      this.bosses += 1;
      this.announceText = ace ? "ACE INBOUND" : "TITAN BREACH";
      this.announceT = 2.4;
      this.audio.bossAlert();
    } else {
      const roll = Math.random();
      const kind = t > 0.55 && roll < 0.22 ? "crawler" : t > 0.22 && roll < 0.5 ? "walker" : "drone";
      m.kind = kind;
      m.boss = false;
      if (kind === "drone") {
        m.r = 12; m.hp = 14 * scale; m.speed = 118 + t * 40; m.dmg = 8; m.xp = 1; m.fireCd = 99;
      } else if (kind === "walker") {
        m.r = 16; m.hp = 32 * scale; m.speed = 86; m.dmg = 12; m.xp = 3; m.fireCd = 1.8;
      } else {
        m.r = 22; m.hp = 70 * scale; m.speed = 58; m.dmg = 18; m.xp = 8; m.fireCd = 2.4;
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
    if (!boss) m.special = 0;
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
        }
      }

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
      if (m.fireCd <= 0 && (m.kind === "walker" || m.kind === "crawler" || m.boss) && dist < 620) {
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
    if (this.comboCount > 0 && this.comboCount % COMBO_TRIGGER === 0) {
      this.overdriveT = OVERDRIVE_TIME;
      this.audio.overdrive();
      this.spawnRing(this.px, this.py, 64, 0.5, "#ffd166", 3);
    }
  }

  private hurtMob(m: Mob, dmg: number, explode: number, crit = false) {
    m.hp -= dmg;
    m.flash = 0.16;
    this.burst(m.x, m.y, m.boss ? 10 : 4, m.boss ? "#e8a070" : "#d8d0c4");
    this.spawnFloat(m.x, m.y, Math.round(dmg).toString(), crit ? "#ffd166" : "#e8e0c8", crit);
    if (m.hp <= 0) {
      m.alive = false;
      this.kills += 1;
      this.registerCombo();
      this.audio.death();
      this.dropFrom(m);
      if ((this.perks.vampire ?? 0) > 0) {
        this.hp = Math.min(this.maxHp, this.hp + 1.6 * (this.perks.vampire ?? 0) * (m.boss ? 6 : 1));
      }
      if (explode > 0) this.hurtCircle(m.x, m.y, explode, dmg * 0.6, false);
      if (m.boss) {
        this.trauma = Math.min(1, this.trauma + 0.55);
        this.hitstop = 0.07;
        this.spawnRing(m.x, m.y, 100, 0.65, "#ff8a5c", 4);
        this.drop("chest", m.x, m.y, 1, Math.random() < 0.45 ? "legendary" : "epic");
        this.drop("key", m.x + 16, m.y, 1);
        this.drop("credit", m.x - 16, m.y, 40);
      } else {
        this.spawnRing(m.x, m.y, 28, 0.32, "#d8d0c4", 2);
      }
      this.checkLevel();
    } else {
      this.audio.hit();
    }
  }

  private hurtCircle(x: number, y: number, r: number, dmg: number, flash: boolean) {
    for (const m of this.mobs) {
      if (!m.alive) continue;
      const dx = m.x - x;
      const dy = m.y - y;
      if (dx * dx + dy * dy < (r + m.r) * (r + m.r)) {
        m.hp -= dmg;
        m.flash = 0.14;
        this.spawnFloat(m.x, m.y, Math.round(dmg).toString(), "#e8a070");
        if (m.hp <= 0) {
          m.alive = false;
          this.kills += 1;
          this.registerCombo();
          this.dropFrom(m);
          this.spawnRing(m.x, m.y, m.boss ? 100 : 26, m.boss ? 0.65 : 0.3, "#e8a070", m.boss ? 4 : 2);
          this.checkLevel();
        }
      }
    }
    if (flash) this.burst(x, y, 18, "#e8e0c8");
  }

  private dropFrom(m: Mob) {
    this.drop("xp", m.x, m.y, m.xp);
    if (Math.random() < 0.04) this.drop("hp", m.x + 8, m.y, 18);
    if (Math.random() < 0.03) this.drop("credit", m.x - 8, m.y, 8 + Math.floor(Math.random() * 12));
    if (Math.random() < 0.012) this.drop("key", m.x, m.y + 10, 1);
  }

  private drop(kind: Pick["kind"], x: number, y: number, value: number, floor?: Pick["floor"]) {
    const p = this.picks.find((q) => !q.alive);
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
    if (this.invuln > 0) return;
    let dmg = raw;
    if (this.shield > 0) dmg *= 0.2;
    this.hp -= dmg;
    this.invuln = 0.45;
    this.trauma = Math.min(1, this.trauma + 0.4);
    this.audio.hurt();
    this.burst(this.px, this.py, 8, "#c45c4a");
    this.spawnFloat(this.px, this.py, `-${Math.round(dmg)}`, "#ff6a5c");
    if (this.hp <= 0) this.hp = 0;
  }

  private burst(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      const p = this.fx.find((f) => !f.alive);
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = 0.25 + Math.random() * 0.3;
      p.max = p.life;
      p.size = 2 + Math.random() * 3;
      p.color = color;
    }
  }

  private updateFx(dt: number) {
    for (const p of this.fx) {
      if (!p.alive) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) p.alive = false;
    }
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
    let sx = 0;
    let sy = 0;
    if (!this.reduced && this.trauma > 0) {
      const s = this.trauma * this.trauma;
      sx = (Math.random() - 0.5) * 18 * s;
      sy = (Math.random() - 0.5) * 18 * s;
    }
    const camX = this.camX + sx;
    const camY = this.camY + sy;
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 - camX, h / 2 - camY);
    this.drawGround(ctx, camX, camY, w, h);
    for (const wr of this.wrecks) {
      ctx.save();
      ctx.translate(wr.x, wr.y);
      drawWreck(ctx, wr.seed);
      ctx.restore();
    }
    for (const p of this.picks) {
      if (!p.alive) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      drawPickup(ctx, p.kind);
      ctx.restore();
    }
    for (const b of this.bullets) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.globalAlpha = b.friendly ? 1 : 0.9;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const m of this.mobs) {
      if (!m.alive) continue;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(Math.atan2(this.py - m.y, this.px - m.x));
      const sc = m.boss ? 1.35 : m.kind === "crawler" ? 1.15 : 1;
      ctx.scale(sc, sc);
      drawEnemyTop(ctx, m.kind, m.flash);
      ctx.restore();
      if (m.boss || m.hp < m.maxHp) {
        const bw = m.boss ? 46 : 22;
        ctx.fillStyle = "#1a1a1c";
        ctx.fillRect(m.x - bw / 2, m.y - m.r - 10, bw, 3);
        ctx.fillStyle = m.boss ? "#c45c4a" : "#8a9a78";
        ctx.fillRect(m.x - bw / 2, m.y - m.r - 10, bw * Math.max(0, m.hp / m.maxHp), 3);
      }
    }
    for (const r of this.rings) {
      if (!r.alive) continue;
      const a = Math.max(0, r.life / r.max);
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const p of this.fx) {
      if (!p.alive) continue;
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }
    const moveSpd = Math.hypot(this.pvx, this.pvy);
    if (moveSpd > 4) {
      const back = this.aim + Math.PI;
      const glowR = 14 + Math.min(1, moveSpd / 260) * 10;
      const gx = this.px + Math.cos(back) * 16;
      const gy = this.py + Math.sin(back) * 16;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, glowR);
      const accent = MECH_MAP[this.mechId].accent;
      grad.addColorStop(0, accent);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
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
    drawMechTop(ctx, this.mechId, this.invuln > 0 ? 0.3 : 0);
    ctx.restore();
    if (this.coils > 0) {
      for (let i = 0; i < 3; i++) {
        const a = this.time * 4 + (i * Math.PI * 2) / 3;
        ctx.fillStyle = "#7ae0a0";
        ctx.beginPath();
        ctx.arc(this.px + Math.cos(a) * 50, this.py + Math.sin(a) * 50, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const f of this.floats) {
      if (!f.alive) continue;
      const a = Math.max(0, f.life / f.max);
      ctx.globalAlpha = a;
      ctx.font = f.crit ? "bold 15px sans-serif" : "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#0a0a0c";
      ctx.fillText(f.text, f.x + 1, f.y + 1.5);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    this.drawMinimap(ctx, w);
    this.drawAnnounce(ctx, w);
    this.drawVignette(ctx, w, h);
    if (this.paused && !this.leveling && !this.over) {
      ctx.fillStyle = "rgba(9,9,11,0.45)";
      ctx.fillRect(0, 0, w, h);
    }
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
      ctx.fillStyle = m.boss ? "#ff5a4a" : "#8a9a78";
      ctx.beginPath();
      ctx.arc(mx, my, m.boss ? 3.4 : 1.7, 0, Math.PI * 2);
      ctx.fill();
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
    const a = Math.min(1, this.announceT / 0.4, this.announceT > 1.8 ? (2.4 - this.announceT) / 0.6 : 1);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.textAlign = "center";
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = "#c45c4a";
    ctx.fillText(this.announceText, w / 2 + 1, 75);
    ctx.fillStyle = "#f2e8dc";
    ctx.fillText(this.announceText, w / 2, 74);
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
    ctx.fillStyle = "#16161a";
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = "rgba(236,236,232,0.04)";
    ctx.lineWidth = 1;
    const tile = 96;
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
    ctx.fillStyle = "rgba(197,205,214,0.03)";
    for (let x = sx; x < x1; x += tile) {
      for (let y = sy; y < y1; y += tile) {
        const n = (x * 13 + y * 29) & 7;
        if (n === 0) ctx.fillRect(x + 12, y + 18, 28, 8);
        if (n === 3) ctx.fillRect(x + 40, y + 50, 18, 18);
      }
    }
    ctx.strokeStyle = "rgba(196,92,74,0.18)";
    ctx.strokeRect(20, 20, WORLD - 40, WORLD - 40);
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
    };
  }
}
