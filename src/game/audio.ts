export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  muted = false;
  private musicTimer = 0;

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.gain.value = 0.7;
      this.music.gain.value = 0.18;
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(v: boolean) {
    this.muted = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v ? 0 : 0.55, this.ctx.currentTime, 0.03);
    }
  }

  private beep(freq: number, dur: number, type: OscillatorType, gain: number, pan = 0) {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const p = this.ctx.createStereoPanner();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    p.pan.setValueAtTime(pan, t);
    o.connect(g);
    g.connect(p);
    p.connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      p.disconnect();
    };
  }

  fire(kind: string) {
    const jitter = 0.92 + Math.random() * 0.16;
    if (kind === "beam") this.beep(880 * jitter, 0.06, "square", 0.06);
    else if (kind === "gatling") this.beep(420 * jitter, 0.035, "sawtooth", 0.045);
    else if (kind === "melee") this.beep(180 * jitter, 0.09, "sawtooth", 0.08);
    else if (kind === "shotgun") this.beep(220 * jitter, 0.1, "square", 0.07);
    else this.beep(640 * jitter, 0.05, "triangle", 0.05);
  }

  hit() {
    this.beep(140 + Math.random() * 40, 0.07, "square", 0.07);
  }

  death() {
    this.beep(90, 0.22, "sawtooth", 0.1);
  }

  pickup() {
    this.beep(980, 0.08, "sine", 0.05);
    this.beep(1320, 0.1, "sine", 0.03);
  }

  level() {
    this.beep(520, 0.12, "triangle", 0.07);
    this.beep(780, 0.16, "triangle", 0.05);
  }

  hurt() {
    this.beep(110, 0.16, "sawtooth", 0.12);
  }

  skill() {
    this.beep(240, 0.18, "square", 0.09);
    this.beep(480, 0.2, "triangle", 0.05);
  }

  bossAlert() {
    this.beep(220, 0.24, "sawtooth", 0.12);
    this.beep(174, 0.32, "sawtooth", 0.1);
  }

  overdrive() {
    this.beep(660, 0.12, "square", 0.08);
    this.beep(880, 0.16, "square", 0.07);
    this.beep(1180, 0.2, "triangle", 0.05);
  }

  slam() {
    this.beep(120, 0.3, "sawtooth", 0.14);
    this.beep(70, 0.4, "square", 0.12);
  }

  tickMusic(dt: number, intensity: number) {
    if (!this.ctx || !this.music) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.42 - intensity * 0.12;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    const base = 55 + Math.round(intensity * 8) * 2;
    o.frequency.setValueAtTime(base, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g);
    g.connect(this.music);
    o.start(t);
    o.stop(t + 0.3);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
}
