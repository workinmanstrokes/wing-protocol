/**
 * Wing Protocol audio engine.
 *
 * - SFX: short CC0 samples (Kenney, see AUDIO_LICENSES.md) + original layers,
 *   decoded once into AudioBuffers. Each play picks a random variant (never the
 *   same one twice in a row), pitch-varies it, and respects per-sound voice caps
 *   and minimum retrigger gaps so rapid-fire weapons never pile up.
 * - Music: original, pre-rendered seamless loops. Menu has its own loop; combat
 *   is two stems on the same grid (base + top) — the top stem fades in with the
 *   fight's intensity. Scene changes crossfade.
 * - Mobile: the AudioContext is created/resumed on the first user gesture and
 *   suspended while the page/app is hidden.
 * - Volumes (master mute, music, sfx) persist in localStorage.
 */
import { MUSIC, SFX, type MusicId, type SfxId } from "./audio-manifest";

export type AudioPrefs = { muted: boolean; music: number; sfx: number };
const PREFS_KEY = "wp.audio.v1";
const DEFAULT_PREFS: AudioPrefs = { muted: false, music: 0.7, sfx: 0.85 };

export function getAudioPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AudioPrefs>;
      const clamp = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
      return { muted: !!p.muted, music: clamp(p.music, DEFAULT_PREFS.music), sfx: clamp(p.sfx, DEFAULT_PREFS.sfx) };
    }
  } catch {
    /* storage unavailable */
  }
  return { ...DEFAULT_PREFS };
}

function savePrefs(p: AudioPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

type SfxSpec = { gain: number; pitch: number; maxVoices: number; minGap: number };
// gain: linear; pitch: ± random playback-rate spread; minGap: seconds between retriggers
const SPEC: Record<SfxId, SfxSpec> = {
  fire_beam: { gain: 0.32, pitch: 0.06, maxVoices: 3, minGap: 0.045 },
  fire_gatling: { gain: 0.26, pitch: 0.07, maxVoices: 3, minGap: 0.035 },
  fire_melee: { gain: 0.42, pitch: 0.08, maxVoices: 2, minGap: 0.08 },
  fire_shotgun: { gain: 0.42, pitch: 0.05, maxVoices: 2, minGap: 0.08 },
  fire_fang: { gain: 0.3, pitch: 0.06, maxVoices: 3, minGap: 0.05 },
  fire_arc: { gain: 0.3, pitch: 0.1, maxVoices: 3, minGap: 0.05 },
  fire_mortar: { gain: 0.45, pitch: 0.06, maxVoices: 2, minGap: 0.08 },
  fire_lance: { gain: 0.34, pitch: 0.05, maxVoices: 2, minGap: 0.07 },
  fire_mote: { gain: 0.26, pitch: 0.1, maxVoices: 3, minGap: 0.05 },
  fire_ember: { gain: 0.3, pitch: 0.08, maxVoices: 3, minGap: 0.05 },
  fire_tether: { gain: 0.3, pitch: 0.06, maxVoices: 2, minGap: 0.06 },
  fire_default: { gain: 0.3, pitch: 0.06, maxVoices: 3, minGap: 0.045 },
  hit: { gain: 0.22, pitch: 0.12, maxVoices: 4, minGap: 0.03 },
  death: { gain: 0.36, pitch: 0.1, maxVoices: 4, minGap: 0.04 },
  explode: { gain: 0.46, pitch: 0.08, maxVoices: 3, minGap: 0.07 },
  explode_big: { gain: 0.8, pitch: 0.03, maxVoices: 2, minGap: 0.2 },
  hurt: { gain: 0.55, pitch: 0.05, maxVoices: 1, minGap: 0.15 },
  slam: { gain: 0.7, pitch: 0.04, maxVoices: 2, minGap: 0.15 },
  pickup_xp: { gain: 0.2, pitch: 0, maxVoices: 4, minGap: 0.035 },
  pickup_hp: { gain: 0.45, pitch: 0.03, maxVoices: 2, minGap: 0.08 },
  pickup_loot: { gain: 0.55, pitch: 0.03, maxVoices: 2, minGap: 0.1 },
  level: { gain: 0.55, pitch: 0, maxVoices: 1, minGap: 0.2 },
  skill: { gain: 0.55, pitch: 0.04, maxVoices: 2, minGap: 0.1 },
  overdrive: { gain: 0.55, pitch: 0, maxVoices: 1, minGap: 0.3 },
  boss_alert: { gain: 0.5, pitch: 0, maxVoices: 1, minGap: 1.0 },
  alert: { gain: 0.45, pitch: 0, maxVoices: 1, minGap: 0.6 },
  ui_click: { gain: 0.35, pitch: 0.05, maxVoices: 2, minGap: 0.04 },
  ui_confirm: { gain: 0.45, pitch: 0, maxVoices: 1, minGap: 0.1 },
  ui_back: { gain: 0.35, pitch: 0.03, maxVoices: 1, minGap: 0.06 },
};

const MAX_VOICES = 24;
const FIRE_KINDS = new Set(["beam", "gatling", "melee", "shotgun", "fang", "arc", "mortar", "lance", "mote", "ember", "tether"]);

export type MusicScene = "menu" | "combat" | "none";
export type UiSound = "click" | "confirm" | "back";
export type PickupKind = "xp" | "hp" | "key" | "credit" | "chest";

type Voice = { src: AudioBufferSourceNode; id: SfxId; end: number };

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private duckBus: GainNode | null = null;
  private prefs: AudioPrefs = { ...DEFAULT_PREFS };
  private prefsLoaded = false;

  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private ext: "ogg" | "mp3" = "ogg";
  private base = "/";

  private voices: Voice[] = [];
  private lastPlay = new Map<SfxId, number>();
  private lastVariant = new Map<SfxId, number>();
  private pickupStreak = 0;
  private pickupT = 0;

  private scene: MusicScene = "none";
  private music: Partial<Record<MusicId, { src: AudioBufferSourceNode; gain: GainNode }>> = {};
  private intensity = 0;

  private thrustSrc: AudioBufferSourceNode | null = null;
  private thrustGain: GainNode | null = null;
  private thrustLevel = 0;
  private thrustLive = false;

  private listenersBound = false;

  get muted() {
    this.ensurePrefs();
    return this.prefs.muted;
  }

  /** Debug/test snapshot. */
  debugState() {
    return { state: this.ctx?.state ?? "none", ext: this.ext, buffers: this.buffers.size, voices: this.voices.length, music: Object.keys(this.music), scene: this.scene };
  }

  private ensurePrefs() {
    if (this.prefsLoaded || typeof window === "undefined") return;
    this.prefs = getAudioPrefs();
    this.prefsLoaded = true;
  }

  getPrefs(): AudioPrefs {
    this.ensurePrefs();
    return { ...this.prefs };
  }

  setPrefs(p: Partial<AudioPrefs>) {
    this.ensurePrefs();
    this.prefs = { ...this.prefs, ...p };
    savePrefs(this.prefs);
    this.applyGains();
  }

  setMuted(v: boolean) {
    this.setPrefs({ muted: v });
  }

  private applyGains() {
    if (!this.ctx || !this.master || !this.sfxBus || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.prefs.muted ? 0 : 1, t, 0.03);
    // perceptual (squared) curves for the sliders
    this.sfxBus.gain.setTargetAtTime(this.prefs.sfx ** 2 * 0.9, t, 0.03);
    this.musicBus.gain.setTargetAtTime(this.prefs.music ** 2 * 0.55, t, 0.05);
  }

  /** Call from any user gesture. Creates/resumes the context (mobile autoplay unlock). */
  unlock() {
    if (typeof window === "undefined") return;
    this.ensurePrefs();
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.duckBus = this.ctx.createGain();
      // gentle bus compressor keeps big fights from clipping on phone speakers
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 10;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      this.sfxBus.connect(comp);
      this.musicBus.connect(this.duckBus);
      this.duckBus.connect(comp);
      comp.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.master.gain.value = 0;
      const probe = document.createElement("audio");
      this.ext = probe.canPlayType('audio/ogg; codecs="vorbis"') ? "ogg" : "mp3";
      const b = (import.meta.env?.BASE_URL as string | undefined) ?? "/";
      this.base = b.endsWith("/") ? b : `${b}/`;
      this.applyGains();
      this.preload();
      this.bindLifecycle();
    }
    if (this.ctx.state === "suspended" && !document.hidden) void this.ctx.resume().catch(() => {});
  }

  /** Install one-time global gesture listeners so the very first tap anywhere unlocks audio. */
  installUnlock() {
    if (typeof window === "undefined" || this.listenersBound) return;
    this.listenersBound = true;
    if (import.meta.env?.DEV || /[?&]debug/.test(location.search)) (window as unknown as { __wpAudio: GameAudio }).__wpAudio = this;
    const go = () => this.unlock();
    for (const ev of ["pointerdown", "touchend", "keydown", "click"]) window.addEventListener(ev, go, { capture: true, passive: true });
  }

  private bindLifecycle() {
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend().catch(() => {});
      else void this.ctx.resume().catch(() => {});
    });
  }

  private url(path: string) {
    return `${this.base}audio/${path}.${this.ext}`;
  }

  private load(path: string): Promise<AudioBuffer | null> {
    const hit = this.loading.get(path);
    if (hit) return hit;
    const p = (async () => {
      if (!this.ctx) return null;
      try {
        const res = await fetch(this.url(path));
        if (!res.ok) return null;
        const data = await res.arrayBuffer();
        const buf = await new Promise<AudioBuffer>((resolve, reject) => {
          // callback form for older Safari
          const r = this.ctx!.decodeAudioData(data, resolve, reject);
          if (r && typeof (r as Promise<AudioBuffer>).then === "function") (r as Promise<AudioBuffer>).then(resolve, reject);
        });
        this.buffers.set(path, buf);
        return buf;
      } catch {
        return null;
      }
    })();
    this.loading.set(path, p);
    return p;
  }

  private preload() {
    // music for the current scene first, then all SFX, then the other music
    const first: MusicId[] = this.scene === "combat" ? ["combat_base", "combat_top"] : ["menu"];
    void Promise.all(first.map((m) => this.load(`music/${m}`))).then(() => this.syncMusic());
    for (const id of Object.keys(SFX) as SfxId[]) for (let i = 0; i < SFX[id]; i++) void this.load(`sfx/${id}_${i}`);
    void this.load("sfx/thruster_loop");
    for (const m of Object.keys(MUSIC) as MusicId[]) if (!first.includes(m)) void this.load(`music/${m}`);
  }

  // ---------------- SFX core ----------------

  private play(id: SfxId, opts: { rate?: number; gain?: number; pan?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || ctx.state !== "running" || this.prefs.muted) return;
    const spec = SPEC[id];
    const now = ctx.currentTime;
    if (now - (this.lastPlay.get(id) ?? -1) < spec.minGap) return;
    this.voices = this.voices.filter((v) => v.end > now);
    const mine = this.voices.filter((v) => v.id === id);
    if (mine.length >= spec.maxVoices) this.stopVoice(mine[0]!);
    if (this.voices.length >= MAX_VOICES) this.stopVoice(this.voices[0]!);

    const n = SFX[id];
    let variant = Math.floor(Math.random() * n);
    if (n > 1 && variant === this.lastVariant.get(id)) variant = (variant + 1) % n;
    const buf = this.buffers.get(`sfx/${id}_${variant}`) ?? this.buffers.get(`sfx/${id}_0`);
    if (!buf) return;
    this.lastVariant.set(id, variant);
    this.lastPlay.set(id, now);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const rate = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * spec.pitch);
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    // repeated voices of the same sound get quieter so spam stays a texture
    g.gain.value = spec.gain * (opts.gain ?? 1) * (1 / (1 + mine.length * 0.35));
    let tail: AudioNode = g;
    if (opts.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, opts.pan));
      g.connect(p);
      tail = p;
    }
    src.connect(g);
    tail.connect(this.sfxBus);
    src.start(now);
    const v: Voice = { src, id, end: now + buf.duration / rate };
    this.voices.push(v);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
      if (tail !== g) tail.disconnect();
    };
  }

  private stopVoice(v: Voice) {
    try {
      v.src.stop();
    } catch {
      /* already stopped */
    }
    v.end = 0;
    this.voices = this.voices.filter((x) => x !== v);
  }

  // ---------------- game-facing SFX ----------------

  fire(kind: string) {
    const id = (FIRE_KINDS.has(kind) ? `fire_${kind}` : "fire_default") as SfxId;
    this.play(id);
  }

  hit() {
    this.play("hit");
  }

  death() {
    this.play("death");
  }

  explode() {
    this.play("explode");
  }

  explodeBig() {
    this.play("explode_big");
  }

  /** Pickups climb in pitch while you vacuum up a trail of XP, then reset. */
  pickup(kind: PickupKind = "xp") {
    if (kind === "hp") return this.play("pickup_hp");
    if (kind !== "xp") return this.play("pickup_loot");
    const now = this.ctx?.currentTime ?? 0;
    this.pickupStreak = now - this.pickupT < 0.6 ? Math.min(this.pickupStreak + 1, 12) : 0;
    this.pickupT = now;
    this.play("pickup_xp", { rate: 2 ** (this.pickupStreak / 24) });
  }

  level() {
    this.play("level");
  }

  hurt() {
    this.play("hurt");
  }

  skill() {
    this.play("skill");
  }

  bossAlert() {
    this.play("boss_alert");
  }

  alert() {
    this.play("alert");
  }

  overdrive() {
    this.play("overdrive");
  }

  slam() {
    this.play("slam");
  }

  private uiHold = 0;

  ui(kind: UiSound = "click") {
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    if (kind === "click" && now < this.uiHold) return;
    if (kind !== "click") this.uiHold = now + 80;
    this.play(kind === "confirm" ? "ui_confirm" : kind === "back" ? "ui_back" : "ui_click");
  }

  // ---------------- thrusters ----------------

  /** 0..1 fraction of top speed; drives a looping thruster hum. */
  setThrust(frac: number) {
    this.thrustLevel = Math.max(0, Math.min(1.4, frac));
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    if (!this.thrustSrc) {
      const buf = this.buffers.get("sfx/thruster_loop");
      if (!buf) return;
      this.thrustGain = ctx.createGain();
      this.thrustGain.gain.value = 0;
      this.thrustGain.connect(this.sfxBus);
      this.thrustSrc = ctx.createBufferSource();
      this.thrustSrc.buffer = buf;
      this.thrustSrc.loop = true;
      this.thrustSrc.connect(this.thrustGain);
      this.thrustSrc.start();
    }
    const t = ctx.currentTime;
    const lv = this.thrustLive ? this.thrustLevel : 0;
    this.thrustGain!.gain.setTargetAtTime(this.thrustLive ? 0.03 + lv * 0.13 : 0, t, this.thrustLive ? 0.12 : 0.08);
    this.thrustSrc.playbackRate.setTargetAtTime(0.85 + lv * 0.3, t, 0.15);
  }

  // ---------------- music ----------------

  /** Which loop should play, and whether gameplay is paused (music ducks, thrusters stop). */
  setScene(scene: MusicScene, paused = false) {
    const changed = scene !== this.scene;
    this.scene = scene;
    this.thrustLive = scene === "combat" && !paused;
    if (this.ctx && this.duckBus) this.duckBus.gain.setTargetAtTime(paused ? 0.45 : 1, this.ctx.currentTime, 0.12);
    if (!this.thrustLive) this.setThrust(0);
    if (changed) {
      this.intensity = 0;
      this.syncMusic();
    }
  }

  private startLoop(id: MusicId, when: number, offset: number) {
    const ctx = this.ctx!;
    const buf = this.buffers.get(`music/${id}`);
    if (!buf || !this.musicBus) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const len = MUSIC[id];
    if (len && len < buf.duration) {
      src.loopStart = 0;
      src.loopEnd = len;
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(this.musicBus);
    src.start(when, offset % (len || buf.duration));
    this.music[id] = { src, gain };
  }

  private stopLoop(id: MusicId, fade = 0.8) {
    const m = this.music[id];
    if (!m || !this.ctx) return;
    const t = this.ctx.currentTime;
    m.gain.gain.cancelScheduledValues(t);
    m.gain.gain.setValueAtTime(m.gain.gain.value, t);
    m.gain.gain.linearRampToValueAtTime(0, t + fade);
    try {
      m.src.stop(t + fade + 0.05);
    } catch {
      /* ignore */
    }
    delete this.music[id];
  }

  private syncMusic() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const want: MusicId[] = this.scene === "menu" ? ["menu"] : this.scene === "combat" ? ["combat_base", "combat_top"] : [];
    for (const id of Object.keys(this.music) as MusicId[]) if (!want.includes(id)) this.stopLoop(id, this.scene === "none" ? 0.4 : 1.0);
    if (!want.every((id) => this.buffers.has(`music/${id}`))) {
      // not decoded yet: start as soon as they are
      void Promise.all(want.map((id) => this.load(`music/${id}`))).then(() => {
        if (want.every((id) => this.buffers.has(`music/${id}`)) && want.some((id) => !this.music[id])) this.syncMusic();
      });
      return;
    }
    const when = t + 0.05;
    for (const id of want) {
      if (this.music[id]) continue;
      this.startLoop(id, when, 0);
      const g = this.music[id]!.gain.gain;
      const target = id === "combat_top" ? this.topGain() : 1;
      g.setValueAtTime(0, t);
      g.linearRampToValueAtTime(target, t + (id === "menu" ? 1.6 : 0.6));
    }
  }

  private topGain() {
    // top stem (lead + arp) enters as the fight heats up
    const x = Math.min(1, Math.max(0, (this.intensity - 0.25) / 0.45));
    return x * x * (3 - 2 * x) * 1.25;
  }

  /** Called every combat frame; `intensity` 0..1 shapes the combat mix. */
  tickMusic(_dt: number, intensity: number) {
    if (!this.ctx) return;
    this.intensity = intensity;
    const top = this.music.combat_top;
    if (top) top.gain.gain.setTargetAtTime(this.topGain(), this.ctx.currentTime, 0.8);
  }
}

/** One engine for the whole app (menus, combat, settings). Safe to import during SSR. */
export const gameAudio = new GameAudio();
