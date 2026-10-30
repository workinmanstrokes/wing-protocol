"""Original Wing Protocol score, synthesized offline (no samples) -> seamless loops.

menu.ogg            92 BPM, A minor, 16 bars: pads, pluck arp, sub, half-time drums
combat_base.ogg     132 BPM, D minor, 16 bars: drums, driving bass, supersaw pads
combat_top.ogg      same grid: lead, 16th arp, ride/perc (faded in by fight intensity)
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


# ======================= COMBAT (D minor, 132 BPM) =======================
def combat():
    T = Track(132, 16)
    # chord per 2 bars: Dm Bb F C Dm Bb Gm A
    roots = [38, 34, 41, 36, 38, 34, 43, 45]
    chords = [[62, 65, 69], [58, 62, 65], [60, 65, 69], [60, 64, 67], [62, 65, 69], [58, 62, 65], [58, 62, 67], [61, 64, 69]]
    K, SN, CL, HC, HO = kick(), snare(), clap(), hat(), hat(True)
    for bar in range(16):
        b0 = bar * 4
        for q in range(4):
            if bar == 15 and q == 3: continue
            T.add("kick", b0 + q, K, gain=0.95)
            T.kicks.append(T.at(b0 + q))
        for q in (1, 3):
            T.add("snare", b0 + q, SN, gain=0.55)
            T.add("snare", b0 + q, CL, pan=0.1, gain=0.45)
        for s in range(16):
            acc = 0.5 if s % 4 == 2 else (0.32 if s % 2 else 0.22)
            if s % 4 == 2:
                T.add("hats", b0 + s / 4, HO, pan=0.25, gain=0.22)
            else:
                T.add("hats", b0 + s / 4, HC, pan=0.25, gain=acc)
    # fill on the last bar's final beat (snare roll + toms) leading into the loop start
    for i, s in enumerate(range(12, 16)):
        T.add("snare", 60 + s / 4, SN, gain=0.3 + 0.1 * i)
    for i, f in enumerate((180, 140, 110, 90)):
        T.add("snare", 63 + i / 4, tom(f), pan=-0.3 + 0.2 * i, gain=0.5)
    T.add("hats", 0, crash(), pan=-0.2, gain=0.35)
    T.add("hats", 32, crash(), pan=0.2, gain=0.3)

    # driving 8th bass with octave pops
    for c in range(8):
        r = roots[c]
        for e in range(16):
            m = r + (12 if e % 4 == 3 else 0)
            T.add("bass", c * 8 + e * 0.5, bass(m, 0.2, cutoff=700 + 500 * (e % 2)), gain=0.55)
    # pads
    for c in range(8):
        T.add_st("pad", c * 8, pad(chords[c], 8 * T.beat - 0.1, cutoff=2200, a=0.15, r=0.6), gain=0.5)

    # ---- top layer ----
    mel = [
        [(0, 74, 3), (3, 72, 1), (4, 69, 4), (8, 65, 2), (10, 67, 2), (12, 69, 4)],
        [(0, 70, 3), (3, 69, 1), (4, 65, 4), (8, 62, 2), (10, 65, 2), (12, 70, 4)],
        [(0, 72, 3), (3, 70, 1), (4, 69, 4), (8, 65, 2), (10, 69, 2), (12, 72, 4)],
        [(0, 76, 4), (4, 74, 2), (6, 72, 2), (8, 67, 6), (14, 72, 2)],
        [(0, 74, 3), (3, 76, 1), (4, 77, 4), (8, 76, 2), (10, 74, 2), (12, 69, 4)],
        [(0, 74, 3), (3, 72, 1), (4, 70, 4), (8, 65, 2), (10, 70, 2), (12, 74, 4)],
        [(0, 70, 3), (3, 72, 1), (4, 74, 4), (8, 79, 4), (12, 77, 2), (14, 74, 2)],
        [(0, 73, 6), (6, 76, 2), (8, 81, 8)],
    ]
    for c, notes in enumerate(mel):
        for st, m, ln in notes:
            d = ln * 0.5 * T.beat - 0.02
            T.add("lead", c * 8 + st * 0.5, lead(m, d), gain=0.32)
            T.add("lead", c * 8 + st * 0.5, lead(m - 12, d), gain=0.12)
    pat = [0, 1, 2, 3, 2, 1, 0, 1]
    for c in range(8):
        ch = chords[c] + [chords[c][0] + 12]
        for s in range(32):
            m = ch[pat[s % 8]] + (12 if (s // 8) % 2 else 0)
            T.add("arp", c * 8 + s * 0.25, pluck(m, 0.08), pan=(-0.4 if s % 2 else 0.4), gain=0.16)
    # shaker on 16ths + ride on quarters for drive
    for bar in range(16):
        for s in range(16):
            T.add("perc", bar * 4 + s / 4, hat()[: int(0.03 * SR)], pan=-0.45, gain=0.12 if s % 2 else 0.07)

    duck = ducking(T)
    hats = T.bus("hats")
    base = T.bus("kick") + T.bus("snare") * 1.0 + hats
    base = base + verb(T.bus("snare"), 1.1, 0.25) - T.bus("snare")
    base = base + T.bus("bass") * duck + verb(T.bus("pad"), 2.0, 0.5) * duck
    top = delay(T.bus("lead"), T, 0.75, 0.3, 0.28)
    top = verb(top, 1.8, 0.35) + delay(T.bus("arp"), T, 0.75, 0.35, 0.35) * duck + T.bus("perc")
    base, top = T.wrap(base), T.wrap(top)
    # master both with the same gain so they sum correctly
    full = base + top
    g = 0.14 / np.sqrt((full ** 2).mean())
    shape = lambda x: (np.tanh(np.stack([highpass(x[0], 28), highpass(x[1], 28)]) * g * 1.1) / np.tanh(1.1)).astype(np.float32)
    b, t = shape(base), shape(top)
    pk = max(np.abs(b).max(), np.abs(b + t).max())
    s = min(1, 0.92 / pk)
    return b * s, t * s, T


# ======================= MENU (A minor, 92 BPM) =======================
def menu():
    T = Track(92, 16)
    roots = [33, 29, 36, 31, 33, 29, 26, 28]  # Am F C G Am F Dm E
    chords = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 60, 64, 67], [55, 59, 62, 67], [57, 60, 64, 71], [53, 57, 60, 65], [50, 57, 62, 65], [52, 56, 59, 64]]
    K = kick(0.6)
    for c in range(8):
        T.add_st("pad", c * 8, pad(chords[c], 8 * T.beat - 0.05, cutoff=1500, a=1.2, r=2.0), gain=0.6)
        T.add("bass", c * 8, bass(roots[c] + 12, 8 * T.beat - 0.02, cutoff=400, sub=0.9) * 0.8, gain=0.5)
    for bar in range(16):
        b0 = bar * 4
        if bar >= 2:
            T.add("drums", b0, K, gain=0.7); T.kicks.append(T.at(b0))
            T.add("drums", b0 + 2.5, K, gain=0.45); T.kicks.append(T.at(b0 + 2.5))
            T.add("drums", b0 + 2, snare(), gain=0.32)
            for s in range(8):
                T.add("drums", b0 + s / 2, hat(), pan=0.3, gain=0.14 if s % 2 else 0.08)
    pat = [0, 2, 1, 3, 2, 1, 3, 0]
    for c in range(8):
        ch = chords[c]
        for s in range(16):
            m = ch[pat[s % 8]] + 12
            T.add("arp", c * 8 + s * 0.5, pluck(m, 0.12, bright=3500, dark=700), pan=(-0.5 if s % 2 else 0.5), gain=0.17)
    # sparse bell melody (second half)
    bell = [(32, 76, 2), (34, 74, 1), (35, 72, 1), (36, 72, 3), (40, 67, 4), (44, 69, 2), (46, 72, 2), (48, 76, 3), (51, 79, 1), (52, 77, 4), (56, 76, 2), (58, 74, 2), (60, 71, 4)]
    for b, m, ln in bell:
        T.add("lead", b, pluck(m, ln * T.beat * 0.3, bright=6000, dark=1800), gain=0.22)
    duck = ducking(T, depth=0.35, rel=0.25)
    mix = verb(T.bus("pad"), 3.0, 0.6) * duck + T.bus("bass") * duck + verb(T.bus("drums"), 1.2, 0.15)
    mix = mix + verb(delay(T.bus("arp"), T, 0.75, 0.45, 0.45), 2.5, 0.4) + verb(delay(T.bus("lead"), T, 1.5, 0.4, 0.4), 3.0, 0.6)
    return master(T.wrap(mix), 0.12), T


os.makedirs(f"{OUT}/music", exist_ok=True)
b, t, TC = combat()
encode(b, f"{OUT}/music/combat_base", q=2)
encode(t, f"{OUT}/music/combat_top", q=2)
m, TM = menu()
encode(m, f"{OUT}/music/menu", q=2)
print(json.dumps({"combat": TC.L / SR, "menu": TM.L / SR}))
