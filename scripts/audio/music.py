"""Original Wing Protocol score, synthesized offline (no samples) -> seamless loops.
80s outrun / synthpop: LinnDrum-style kit, gated-reverb snares, octave basslines,
poly-brass stabs, FM bells, arps and major-key lead hooks.

menu.ogg            120 BPM, F major (I-V-vi-IV), 16 bars, full mix
combat_base.ogg     146 BPM, A major, 16 bars: drums, octave bass, pads + brass stabs
combat_top.ogg      same grid: lead hook, FM bell, 16th arp, tambourine (faded in by intensity)
Each file is exactly one loop long; tails are wrapped to the start so loops are gapless.
"""
import os, json
import numpy as np
from scipy import signal
from common import SR, encode, lowpass, highpass, bandpass, ir, OUT

rng = np.random.default_rng(11)


def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)


def polyblep_saw(f, n, phase0=0.0):
    """Band-limited saw; f may be a scalar or a per-sample frequency array."""
    dt = np.broadcast_to(np.asarray(f, np.float64) / SR, (n,))
    t = (phase0 + np.cumsum(dt) - dt[0]) % 1.0
    y = 2 * t - 1
    m1 = t < dt
    x = t[m1] / dt[m1]
    y[m1] -= x + x - x * x - 1
    m2 = t > 1 - dt
    x = (t[m2] - 1) / dt[m2]
    y[m2] -= x * x + x + x + 1
    return y.astype(np.float32)


def adsr(n, a, d, s, r, hold):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = t > hold
    e[rel] *= np.exp(-(t[rel] - hold) / max(r, 1e-4))
    return e.astype(np.float32)


class Track:
    def __init__(self, bpm, bars):
        self.bpm = bpm
        self.beat = 60 / bpm
        self.L = int(round(bars * 4 * self.beat * SR))
        self.tail = int(3.0 * SR)
        self.buses = {}
        self.kicks = []

    def bus(self, name):
        if name not in self.buses:
            self.buses[name] = np.zeros((2, self.L + self.tail), np.float32)
        return self.buses[name]

    def at(self, beats): return int(round(beats * self.beat * SR))

    def add(self, name, start, x, pan=0.0, gain=1.0):
        b = self.bus(name)
        s = self.at(start) if isinstance(start, float) or isinstance(start, int) else start
        x = np.asarray(x, np.float32) * gain
        n = min(len(x), b.shape[1] - s)
        if n <= 0: return
        lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        b[0, s:s + n] += x[:n] * lg * 1.414
        b[1, s:s + n] += x[:n] * rg * 1.414

    def add_st(self, name, start, st, gain=1.0):
        b = self.bus(name)
        s = self.at(start)
        n = min(st.shape[1], b.shape[1] - s)
        b[:, s:s + n] += st[:, :n] * gain

    def wrap(self, x):
        y = x[:, : self.L].copy()
        y[:, : x.shape[1] - self.L] += x[:, self.L:]
        return y


# ---------- instruments ----------

def kick(punch=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 48 + 170 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    click = highpass(rng.uniform(-1, 1, n).astype(np.float32), 2500) * np.exp(-t / 0.004) * 0.5
    x = np.tanh((body * 1.6 + click * punch) * 1.4) * 0.9
    return x.astype(np.float32)


def snare():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.6 + np.sin(2 * np.pi * 330 * t) * np.exp(-t / 0.03) * 0.3
    nz = bandpass(rng.uniform(-1, 1, n).astype(np.float32), 4500, 0.7) * np.exp(-t / 0.11)
    return np.tanh((tone + nz * 1.1) * 1.3).astype(np.float32)


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    nz = bandpass(rng.uniform(-1, 1, n).astype(np.float32), 1600, 1.2)
    e = np.zeros(n)
    for o in (0, 0.009, 0.018):
        e += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.008 if o < 0.018 else 0.09))
    return (nz * e * 0.8).astype(np.float32)


def hat(open_=False):
    n = int((0.32 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    # metallic: sum of square-ish partials + noise
    m = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (317, 432, 539, 617, 811, 1019)) / 6
    x = highpass((m * 0.6 + rng.uniform(-1, 1, n) * 0.6).astype(np.float32), 7000)
    return (x * np.exp(-t / (0.11 if open_ else 0.016))).astype(np.float32)


def crash():
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    x = highpass(rng.uniform(-1, 1, n).astype(np.float32), 4500)
    x = x * np.exp(-t / 0.7)
    return x.astype(np.float32)


def tom(f):
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    ff = f * (1 + 0.6 * np.exp(-t / 0.04))
    return (np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / 0.15)).astype(np.float32)


def bass(m, dur, cutoff=900, sub=0.7):
    n = int((dur + 0.08) * SR)
    f = mtof(m)
    x = polyblep_saw(f, n) * 0.5 + polyblep_saw(f * 1.004, n, 0.3) * 0.5
    x = lowpass(x, cutoff)
    x = x + np.sin(2 * np.pi * f * np.arange(n) / SR) * sub
    # mid-bass harmonic (an octave up) so the line survives phone speakers
    x = x + lowpass(polyblep_saw(f * 2, n), 1400) * 0.22
    return np.tanh(x * adsr(n, 0.004, 0.12, 0.65, 0.05, dur) * 1.3).astype(np.float32)


def supersaw(m, dur, voices=7, detune=0.18, cutoff=3000, a=0.02, r=0.4, st=True):
    n = int((dur + r * 3) * SR)
    f = mtof(m)
    L = np.zeros(n, np.float32); R = np.zeros(n, np.float32)
    for v in range(voices):
        d = (v - (voices - 1) / 2) / ((voices - 1) / 2)
        fr = f * 2 ** (d * detune / 12)
        s = polyblep_saw(fr, n, rng.random())
        pan = d * 0.8
        L += s * (1 - pan) * 0.5; R += s * (1 + pan) * 0.5
    e = adsr(n, a, 0.3, 0.8, r, dur)
    L, R = lowpass(L, cutoff), lowpass(R, cutoff)
    return np.stack([L * e, R * e]) / voices


def pluck(m, dur=0.25, bright=5000, dark=900):
    n = int((dur + 0.5) * SR)
    f = mtof(m)
    s = polyblep_saw(f, n) * 0.6 + polyblep_saw(f * 1.006, n, 0.5) * 0.4
    e = adsr(n, 0.002, 0.09, 0.0, 0.1, dur)
    b, d = lowpass(s, bright), lowpass(s, dark)
    k = np.exp(-np.arange(n) / SR / 0.05)
    return ((b * k + d * (1 - k)) * e).astype(np.float32)


def lead(m, dur):
    n = int((dur + 0.4) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    f = mtof(m) * vib
    s = polyblep_saw(f, n) * 0.4 + polyblep_saw(f * 1.005, n, 0.3) * 0.4 + lowpass(polyblep_saw(f * 0.5, n, 0.6), 1200) * 0.25
    s = lowpass(s.astype(np.float32), 3800)
    return (s * adsr(n, 0.01, 0.2, 0.75, 0.12, dur)).astype(np.float32)


def pad(ms, dur, cutoff=1800, a=0.6, r=1.2):
    out = None
    for m in ms:
        x = supersaw(m, dur, voices=5, detune=0.12, cutoff=cutoff, a=a, r=r)
        out = x if out is None else out[:, :x.shape[1]] + x[:, :out.shape[1]]
    return out


# ---------- mix helpers ----------

def ducking(T, depth=0.55, rel=0.16):
    n = T.L + T.tail
    g = np.ones(n, np.float32)
    t = np.arange(int(rel * 4 * SR)) / SR
    curve = 1 - depth * np.exp(-t / rel)
    for k in T.kicks:
        for s in (k, k + T.L):
            e = min(n, s + len(curve))
            if s < n:
                g[s:e] = np.minimum(g[s:e], curve[: e - s])
    return g


def delay(x, T, beats, fb=0.35, mix=0.3, pingpong=True):
    d = T.at(beats)
    y = np.zeros_like(x)
    cur = x.copy()
    for i in range(1, 7):
        cur = np.stack([lowpass(cur[0], 4000), lowpass(cur[1], 4000)])
        sh = np.zeros_like(x)
        sh[:, d * i:] = cur[:, : x.shape[1] - d * i] * (fb ** (i - 1))
        if pingpong and i % 2: sh = sh[::-1]
        y += sh
    return x + y * mix


def verb(x, seconds, wet):
    h = ir(seconds, stereo=True)
    y = np.stack([signal.fftconvolve(x[0], h[0])[: x.shape[1]], signal.fftconvolve(x[1], h[1])[: x.shape[1]]])
    return x + y.astype(np.float32) * wet


def master(x, target_rms=0.14):
    x = np.stack([highpass(x[0], 28), highpass(x[1], 28)])
    rms = np.sqrt((x ** 2).mean())
    x = x * (target_rms / rms)
    x = np.tanh(x * 1.15) / np.tanh(1.15)
    pk = np.abs(x).max()
    if pk > 0.93: x = x * 0.93 / pk
    return x.astype(np.float32)


# ---------- 80s instruments ----------

def linn_kick():
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    f = 55 + 120 * np.exp(-t / 0.022)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.11)
    knock = bandpass(rng.uniform(-1, 1, n).astype(np.float32), 1800, 1.0) * np.exp(-t / 0.006) * 0.7
    return (np.tanh((body * 1.5 + knock) * 1.6) * 0.9).astype(np.float32)


_IR_GATE = None


def gated_snare(size=0.24):
    """Phil-Collins-style: snare + clap into a big dense room, tail chopped by a gate."""
    global _IR_GATE
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 200 * t) * np.exp(-t / 0.045) * 0.7 + np.sin(2 * np.pi * 340 * t) * np.exp(-t / 0.025) * 0.3
    nz = bandpass(rng.uniform(-1, 1, n).astype(np.float32), 3800, 0.6) * np.exp(-t / 0.09)
    dry = np.tanh((tone + nz * 1.2) * 1.4).astype(np.float32)
    dry = dry + np.pad(clap(), (0, n))[:n] * 0.5
    if _IR_GATE is None:
        _IR_GATE = ir(1.6, seed=5)[0]
    wet = signal.fftconvolve(dry, _IR_GATE)[:n].astype(np.float32)
    wet = wet / (np.abs(wet).max() + 1e-9) * np.abs(dry).max()
    gate = np.clip((size + 0.025 - t) / 0.025, 0, 1)
    return (dry * 0.8 + wet * 1.1 * gate).astype(np.float32)


def tamb():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    jingles = sum(np.sin(2 * np.pi * f * t + rng.random() * 6) for f in (5200, 6900, 8300, 9700)) / 4
    x = highpass((jingles * 0.5 + rng.uniform(-1, 1, n) * 0.7).astype(np.float32), 6000)
    return (x * np.exp(-t / 0.035)).astype(np.float32)


def oct_bass(m, dur):
    """Plucky saw bass with a snappy filter envelope (bright -> dark)."""
    n = int((dur + 0.05) * SR)
    f = mtof(m)
    s = polyblep_saw(f, n) * 0.6 + polyblep_saw(f * 1.003, n, 0.4) * 0.4
    k = np.exp(-np.arange(n) / SR / 0.06)
    x = lowpass(s, 2600) * k + lowpass(s, 420) * (1 - k)
    x = x + np.sin(2 * np.pi * f * np.arange(n) / SR) * 0.5
    return np.tanh(x * adsr(n, 0.002, 0.1, 0.7, 0.03, dur) * 1.4).astype(np.float32)


def brass(ms, dur, gain=1.0):
    """Analog poly-brass stab: detuned saws, filter 'blat' that opens then settles."""
    out = None
    for m in ms:
        n = int((dur + 0.25) * SR)
        f = mtof(m)
        L = np.zeros(n, np.float32); R = np.zeros(n, np.float32)
        for d in (-1, 0, 1):
            fr = f * 2 ** (d * 0.09 / 12)
            sw = polyblep_saw(fr, n, rng.random())
            L += sw * (0.6 - d * 0.3); R += sw * (0.6 + d * 0.3)
        t = np.arange(n) / SR
        k = np.clip(t / 0.03, 0, 1) * np.exp(-np.clip(t - 0.03, 0, None) / 0.12)
        e = adsr(n, 0.008, 0.15, 0.75, 0.12, dur)
        st = np.stack([lowpass(L, 5200) * k + lowpass(L, 1500) * (1 - k), lowpass(R, 5200) * k + lowpass(R, 1500) * (1 - k)]) * e / 3
        out = st if out is None else out + st
    return out * gain


def fm_bell(m, dur):
    """DX7-ish bell / e-piano: 1:3.5 FM with decaying index."""
    n = int((dur + 1.2) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    idx = 2.2 * np.exp(-t / 0.25) + 0.3
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) * 0.7 + np.sin(2 * np.pi * f * 2 * t + idx * 0.5 * np.sin(2 * np.pi * f * t)) * 0.2
    return (x * np.exp(-t / 0.9) * np.clip(t / 0.002, 0, 1)).astype(np.float32)


def hero_lead(m, dur, prev=None):
    """Bright saw+square lead with delayed vibrato and a short glide from the previous note."""
    n = int((dur + 0.3) * SR)
    t = np.arange(n) / SR
    f = np.full(n, mtof(m))
    if prev is not None and prev != m:
        g = np.exp(-t / 0.025)
        f = f * (mtof(prev) / mtof(m)) ** g
    f = f * (1 + 0.006 * np.sin(2 * np.pi * 5.8 * t) * np.clip((t - 0.18) / 0.2, 0, 1))
    sq = polyblep_saw(f, n) - polyblep_saw(f, n, 0.5)
    s = polyblep_saw(f, n) * 0.45 + polyblep_saw(f * 1.006, n, 0.2) * 0.35 + sq * 0.25
    s = lowpass(s, 5000)
    return (s * adsr(n, 0.006, 0.25, 0.8, 0.09, dur)).astype(np.float32)


def gate_env(T, n, pattern):
    """Trance/80s rhythmic gate for pads on a 16th grid (pattern of 16 0/1)."""
    g = np.zeros(n, np.float32)
    step = T.beat / 4
    s = 0
    while True:
        a = int(round(s * step * SR))
        if a >= n: break
        if pattern[s % 16]:
            b = min(n, a + int(step * SR * 0.85))
            g[a:b] = 1
        s += 1
    return lowpass(g, 180)


def song(T, roots, chords, mel, arp_pat, layers):
    """Shared arrangement on a 16-bar / 8-chord (2 bars each) grid."""
    K, SN, TB, HC, HO = linn_kick(), gated_snare(), tamb(), hat(), hat(True)
    for bar in range(16):
        b0 = bar * 4
        for q in range(4):
            T.add("kick", b0 + q, K, gain=0.9)
            T.kicks.append(T.at(b0 + q))
        for q in (1, 3):
            T.add("snare", b0 + q, SN, gain=0.6)
        for s in range(16):
            if s % 4 == 2:
                T.add("hats", b0 + s / 4, HO, pan=0.2, gain=0.18)
            else:
                T.add("hats", b0 + s / 4, HC, pan=0.2, gain=0.26 if s % 2 else 0.18)
            if s % 4 == 2 or (s % 8 == 7):
                T.add("tamb", b0 + s / 4, TB, pan=-0.35, gain=0.22)
    # classic 80s tom fill into the loop point
    for i, f in enumerate((220, 180, 150, 120, 100, 85)):
        T.add("snare", 62.5 + i / 4, tom(f), pan=-0.5 + 0.2 * i, gain=0.55)
    T.add("hats", 0, crash(), pan=-0.2, gain=0.3)
    T.add("hats", 32, crash(), pan=0.2, gain=0.25)
    # driving octave bass (8ths, root / octave)
    for c in range(8):
        r = roots[c]
        for e in range(16):
            T.add("bass", c * 8 + e * 0.5, oct_bass(r + (12 if e % 2 else 0), 0.5 * T.beat * 0.8), gain=0.5)
    # pads (rhythmically gated) + brass stabs (syncopated: 1, and-of-2, 4)
    gpat = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1]
    for c in range(8):
        p = pad([m - 12 for m in chords[c]] + [chords[c][0]], 8 * T.beat - 0.05, cutoff=2600, a=0.05, r=0.3)
        T.add_st("pad", c * 8, p, gain=0.45)
        for b in (0, 1.5, 3, 4, 5.5, 7):
            T.add_st("brass", c * 8 + b, brass(chords[c], 0.22 if b not in (3, 7) else 0.4), gain=0.5)
    T.gpat = gpat
    # lead hook + bell double
    for c, notes in enumerate(mel):
        prev = None
        for st, m, ln in notes:
            d = ln * 0.5 * T.beat - 0.02
            T.add("lead", c * 8 + st * 0.5, hero_lead(m, d, prev), gain=0.3 * layers.get("lead", 1))
            T.add("bell", c * 8 + st * 0.5, fm_bell(m + 12, d), gain=0.12 * layers.get("bell", 1))
            prev = m
    for c in range(8):
        ch = chords[c] + [chords[c][0] + 12]
        for s in range(32):
            m = ch[arp_pat[s % 8]] + 12
            T.add("arp", c * 8 + s * 0.25, pluck(m, 0.07, bright=6500, dark=1500), pan=(-0.5 if s % 2 else 0.5), gain=0.14)


def mixdown(T, gate_pads=True):
    n = T.L + T.tail
    duck = ducking(T, depth=0.5, rel=0.13)
    pad = T.bus("pad")
    if gate_pads:
        pad = pad * gate_env(T, n, T.gpat)
    base = T.bus("kick") + T.bus("snare") + T.bus("hats") + T.bus("bass") * duck
    base = base + verb(pad, 1.6, 0.35) * duck + verb(T.bus("brass"), 1.2, 0.3) * duck
    top = verb(delay(T.bus("lead"), T, 0.75, 0.3, 0.3), 1.8, 0.3)
    top = top + verb(T.bus("bell"), 1.5, 0.4) + delay(T.bus("arp"), T, 0.75, 0.35, 0.35) * duck + T.bus("tamb")
    return T.wrap(base), T.wrap(top)


def shape_pair(base, top, target=0.15):
    full = base + top
    g = target / np.sqrt((full ** 2).mean())
    sh = lambda x: (np.tanh(np.stack([highpass(x[0], 30), highpass(x[1], 30)]) * g * 1.1) / np.tanh(1.1)).astype(np.float32)
    b, t = sh(base), sh(top)
    s = min(1, 0.92 / max(np.abs(b).max(), np.abs(b + t).max()))
    return b * s, t * s


# ======================= COMBAT (A major, 146 BPM) =======================
def combat():
    T = Track(146, 16)
    roots = [45, 40, 42, 38, 45, 40, 38, 40]  # A E F#m D | A E D E
    chords = [[69, 73, 76], [68, 71, 76], [69, 73, 78], [69, 74, 78], [69, 73, 76], [68, 71, 76], [69, 74, 78], [68, 71, 76]]
    mel = [
        [(0, 76, 2), (2, 76, 1), (3, 78, 1), (4, 76, 2), (6, 73, 2), (8, 69, 3), (11, 71, 1), (12, 73, 4)],
        [(0, 71, 2), (2, 71, 1), (3, 73, 1), (4, 71, 2), (6, 68, 2), (8, 64, 4), (12, 68, 2), (14, 71, 2)],
        [(0, 73, 2), (2, 73, 1), (3, 76, 1), (4, 78, 2), (6, 76, 2), (8, 73, 3), (11, 71, 1), (12, 69, 4)],
        [(0, 74, 2), (2, 73, 2), (4, 71, 2), (6, 69, 2), (8, 71, 6), (14, 76, 2)],
        [(0, 76, 2), (2, 76, 1), (3, 78, 1), (4, 76, 2), (6, 73, 2), (8, 81, 3), (11, 80, 1), (12, 78, 4)],
        [(0, 76, 2), (2, 78, 1), (3, 80, 1), (4, 81, 2), (6, 80, 2), (8, 76, 4), (12, 73, 2), (14, 76, 2)],
        [(0, 78, 3), (3, 76, 1), (4, 74, 2), (6, 73, 2), (8, 74, 2), (10, 76, 2), (12, 78, 4)],
        [(0, 80, 4), (4, 78, 2), (6, 80, 2), (8, 80, 4), (12, 83, 4)],
    ]
    song(T, roots, [[m - 12 for m in c] for c in chords], mel, [0, 1, 2, 3, 2, 1, 3, 2], {})
    base, top = mixdown(T)
    b, t = shape_pair(base, top)
    return b, t, T


# ======================= MENU (F major, 120 BPM) =======================
def menu():
    T = Track(120, 16)
    roots = [41, 36, 38, 34, 41, 36, 34, 36]  # F C Dm Bb | F C Bb C
    chords = [[65, 69, 72], [64, 67, 72], [65, 69, 74], [65, 70, 74], [65, 69, 72], [64, 67, 72], [65, 70, 74], [64, 67, 72]]
    mel = [
        [(0, 72, 2), (2, 74, 2), (4, 77, 3), (7, 76, 1), (8, 74, 2), (10, 72, 2), (12, 69, 4)],
        [(0, 67, 2), (2, 69, 2), (4, 72, 3), (7, 74, 1), (8, 76, 4), (12, 72, 4)],
        [(0, 74, 2), (2, 76, 2), (4, 77, 3), (7, 79, 1), (8, 81, 2), (10, 79, 2), (12, 77, 4)],
        [(0, 77, 2), (2, 76, 2), (4, 74, 2), (6, 72, 2), (8, 74, 6), (14, 72, 2)],
        [(0, 72, 2), (2, 74, 2), (4, 77, 3), (7, 76, 1), (8, 77, 2), (10, 79, 2), (12, 81, 4)],
        [(0, 79, 2), (2, 77, 2), (4, 76, 3), (7, 77, 1), (8, 79, 4), (12, 76, 4)],
        [(0, 77, 3), (3, 76, 1), (4, 74, 2), (6, 72, 2), (8, 70, 2), (10, 72, 2), (12, 74, 4)],
        [(0, 76, 4), (4, 74, 2), (6, 76, 2), (8, 79, 8)],
    ]
    song(T, roots, [[m - 12 for m in c] for c in chords], mel, [0, 2, 1, 3, 2, 1, 3, 0], {"lead": 0.85, "bell": 1.4})
    base, top = mixdown(T)
    b, t = shape_pair(base, top, 0.135)
    return b + t, T


os.makedirs(f"{OUT}/music", exist_ok=True)
b, t, TC = combat()
encode(b, f"{OUT}/music/combat_base", q=2)
encode(t, f"{OUT}/music/combat_top", q=2)
m, TM = menu()
encode(m, f"{OUT}/music/menu", q=2)
print(json.dumps({"combat": TC.L / SR, "menu": TM.L / SR}))
