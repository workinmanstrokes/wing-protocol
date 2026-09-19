export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  // 16th-note step sequencer driving the background beat.
  private stepTimer = 0;
  private musicStep = 0;
  private readonly BPM = 104;
  private readonly rootFreq = 55; // A1

  unlock() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.gain.value = 0.7;
      this.music.gain.value = 0.26;
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 1);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(v: boolean) {
    this.muted = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v ? 0 : 0.55, this.ctx.currentTime, 0.03);
    }
  }

  // ---------------- low-level synth helpers ----------------

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

  private sweep(f0: number, f1: number, dur: number, type: OscillatorType, gain: number, dest: GainNode | null) {
    if (!this.ctx || !dest) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  /** Filtered burst from the shared noise buffer — percussion & weapon texture. */
  private noiseHit(
    filterType: BiquadFilterType,
    freq: number,
    q: number,
    dur: number,
    gain: number,
    dest: GainNode | null,
  ) {
    if (!this.ctx || !this.noiseBuffer || !dest) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.setValueAtTime(freq, t);
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      filt.disconnect();
      g.disconnect();
    };
  }

  // ---------------- combat sfx ----------------

  fire(kind: string) {
    const jitter = 0.92 + Math.random() * 0.16;
    if (kind === "beam") {
      this.beep(880 * jitter, 0.07, "square", 0.07);
      this.noiseHit("highpass", 4200, 1, 0.03, 0.05, this.sfx);
    } else if (kind === "gatling") {
      this.beep(420 * jitter, 0.035, "sawtooth", 0.045);
      this.noiseHit("bandpass", 1800, 2, 0.03, 0.08, this.sfx);
    } else if (kind === "melee") {
      this.beep(180 * jitter, 0.09, "sawtooth", 0.08);
      this.noiseHit("highpass", 2200, 0.7, 0.08, 0.05, this.sfx);
    } else if (kind === "shotgun") {
      this.beep(220 * jitter, 0.1, "square", 0.07);
      this.noiseHit("lowpass", 1200, 1, 0.09, 0.15, this.sfx);
    } else {
      this.beep(640 * jitter, 0.05, "triangle", 0.05);
      this.noiseHit("highpass", 3000, 1, 0.03, 0.04, this.sfx);
    }
  }

  hit() {
    this.beep(140 + Math.random() * 40, 0.07, "square", 0.07);
    this.noiseHit("bandpass", 1000, 1.5, 0.05, 0.1, this.sfx);
  }

  death() {
    this.beep(90, 0.22, "sawtooth", 0.1);
    this.noiseHit("lowpass", 500, 1, 0.2, 0.22, this.sfx);
  }

  pickup() {
    this.beep(980, 0.08, "sine", 0.05);
    this.beep(1320, 0.1, "sine", 0.03);
    this.beep(1760, 0.09, "sine", 0.02);
  }

  level() {
    this.beep(520, 0.12, "triangle", 0.07);
    this.beep(780, 0.16, "triangle", 0.05);
    this.beep(1040, 0.18, "triangle", 0.04);
  }

  hurt() {
    this.beep(110, 0.16, "sawtooth", 0.12);
    this.noiseHit("bandpass", 700, 1.2, 0.14, 0.16, this.sfx);
  }

  skill() {
    this.sweep(200, 900, 0.16, "sawtooth", 0.09, this.sfx);
    this.beep(240, 0.18, "square", 0.09);
    this.beep(480, 0.2, "triangle", 0.05);
  }

  bossAlert() {
    this.beep(220, 0.24, "sawtooth", 0.12);
    this.beep(174, 0.32, "sawtooth", 0.1);
    this.noiseHit("bandpass", 900, 3, 0.4, 0.08, this.sfx);
  }

  overdrive() {
    this.beep(660, 0.12, "square", 0.08);
    this.beep(880, 0.16, "square", 0.07);
    this.beep(1180, 0.2, "triangle", 0.05);
    this.noiseHit("highpass", 6000, 1, 0.15, 0.05, this.sfx);
  }

  slam() {
    this.beep(120, 0.3, "sawtooth", 0.14);
    this.beep(70, 0.4, "square", 0.12);
    this.noiseHit("lowpass", 300, 1, 0.3, 0.2, this.sfx);
  }

  // ---------------- background beat ----------------
  // A boom-bap 16-step loop: kick/snare/hihat always present once combat
  // starts, with a bassline and old-school synth stabs layered in as the
  // fight's intensity (time-into-mission) climbs.

  private kick() {
    if (!this.ctx || !this.music) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g);
    g.connect(this.music);
    o.start(t);
    o.stop(t + 0.24);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    this.noiseHit("lowpass", 800, 0.8, 0.04, 0.22, this.music);
  }

  private snare() {
    this.noiseHit("highpass", 1400, 0.6, 0.16, 0.5, this.music);
    if (!this.ctx || !this.music) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(180, t);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g);
    g.connect(this.music);
    o.start(t);
    o.stop(t + 0.12);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  private hihat(open: boolean) {
    this.noiseHit("highpass", 7500, 0.5, open ? 0.18 : 0.045, open ? 0.14 : 0.16, this.music);
  }

  private bassNote(freq: number, dur: number) {
    if (!this.ctx || !this.music) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(freq, t);
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(520, t);
    filt.Q.value = 4;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(filt);
    filt.connect(g);
    g.connect(this.music);
    o.start(t);
    o.stop(t + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      filt.disconnect();
      g.disconnect();
    };
  }

  /** Old-school synth-brass stab — a short, filtered, detuned chord pluck. */
  private stab(freqs: number[]) {
    if (!this.ctx || !this.music) return;
    const t = this.ctx.currentTime;
    const filt = this.ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(1300, t);
    filt.Q.value = 2.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    filt.connect(g);
    g.connect(this.music);
    const oscs = freqs.map((f) => {
      const o = this.ctx!.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f, t);
      o.connect(filt);
      o.start(t);
      o.stop(t + 0.24);
      return o;
    });
    oscs[oscs.length - 1]!.onended = () => {
      for (const o of oscs) o.disconnect();
      filt.disconnect();
      g.disconnect();
    };
  }

  private readonly KICK_STEPS = new Set([0, 6, 8, 14]);
  private readonly SNARE_STEPS = new Set([4, 12]);
  private readonly OPEN_HAT_STEPS = new Set([10]);
  private readonly BASS_LINE: Array<{ step: number; semi: number }> = [
    { step: 0, semi: 0 },
    { step: 3, semi: 0 },
    { step: 6, semi: 7 },
    { step: 8, semi: 0 },
    { step: 11, semi: 5 },
  ];
  private readonly STAB_STEPS = new Set([0, 8]);

  tickMusic(dt: number, intensity: number) {
    if (!this.ctx || !this.music) return;
    const stepDur = 60 / this.BPM / 4;
    this.stepTimer -= dt;
    if (this.stepTimer > 0) return;
    this.stepTimer += stepDur;
    const step = this.musicStep % 16;
    this.musicStep++;

    if (step % 2 === 0 || intensity > 0.5) this.hihat(this.OPEN_HAT_STEPS.has(step));
    if (this.KICK_STEPS.has(step)) this.kick();
    if (intensity > 0.22 && this.SNARE_STEPS.has(step)) this.snare();
    if (intensity > 0.35) {
      const b = this.BASS_LINE.find((p) => p.step === step);
      if (b) this.bassNote(this.rootFreq * 2 ** (b.semi / 12), 0.22);
    }
    if (intensity > 0.6 && this.STAB_STEPS.has(step)) {
      const base = this.rootFreq * 4;
      this.stab([base, base * 2 ** (3 / 12), base * 2 ** (7 / 12)]);
    }
  }
}
