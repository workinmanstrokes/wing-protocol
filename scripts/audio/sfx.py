"""Build Wing Protocol's SFX from Kenney CC0 packs (+ original procedural layers).

Sources (CC0, download and unzip into $AUDIO_SRC):
  sci-fi_sounds/          https://opengameart.org/content/sci-fi-sounds   (Kenney "Sci-Fi Sounds")
  kenney_interfaceSounds/ https://opengameart.org/content/interface-sounds (Kenney "Interface Sounds")

Usage: AUDIO_SRC=/path python3 scripts/audio/sfx.py   -> public/audio/sfx/*.ogg|mp3
"""
import os, subprocess, json
import numpy as np
from common import SR, load, encode, fade, norm, resample, lowpass, highpass, bandpass, reverb_mono, OUT

SRC = os.environ.get("AUDIO_SRC", "/workspace/audio-src")
SCI = f"{SRC}/sci-fi_sounds/Audio"
UI = f"{SRC}/kenney_interfaceSounds/Audio"
rng = np.random.default_rng(7)


def k(path, start=0.0, dur=None, rate=1.0, fin=0.002, fout=0.04):
    x = load(path)
    # trim leading silence
    idx = np.argmax(np.abs(x) > 0.01)
    x = x[idx + int(start * SR):]
    x = resample(x, rate)
    if dur:
        x = x[: int(dur * SR)]
    return fade(x, fin, fout)


def mix(*parts):
    n = max(len(p) for p, _ in parts)
    out = np.zeros(n, np.float32)
    for p, g in parts:
        out[: len(p)] += p * g
    return out


def env_exp(n, tau):
    t = np.arange(n) / SR
    return np.exp(-t / tau).astype(np.float32)


def thump(f0, f1, dur, tau):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / (tau * 0.5))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * env_exp(n, tau)).astype(np.float32)


def noise(dur):
    return rng.uniform(-1, 1, int(dur * SR)).astype(np.float32)


def swoosh(dur, f0, f1):
    n = int(dur * SR)
    x = noise(dur)
    out = np.zeros(n, np.float32)
    seg = 256
    for i in range(0, n, seg):
        fr = f0 * (f1 / f0) ** (i / n)
        out[i:i + seg] = bandpass(x[max(0, i - 2048):i + seg], fr, 2.5)[-len(x[i:i + seg]):]
    t = np.arange(n) / n
    return out * (np.sin(np.pi * t) ** 1.5)


def zap(dur, seed):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    # crackling arc: noise bursts gated by a jittery square, plus a buzzing saw
    gate = (r.random(n // 120 + 1) > 0.45).repeat(120)[:n].astype(np.float32)
    crackle = highpass(r.uniform(-1, 1, n).astype(np.float32), 1800) * gate
    f = 95 + 30 * r.random()
    buzz = ((t * f * 2) % 1.0 * 2 - 1).astype(np.float32)
    buzz = bandpass(buzz, 1400, 0.8)
    e = env_exp(n, dur * 0.35)
    return (crackle * 0.8 + buzz * 0.6) * e


def klaxon(dur, hi, lo, period):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.where((t // period) % 2 == 0, hi, lo)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sign(np.sin(ph)) * 0.5 + np.sin(ph * 2) * 0.3 + np.sin(ph * 3) * 0.15
    tone = lowpass(tone.astype(np.float32), 3200)
    e = np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.15)
    return tone * e.astype(np.float32)


def riser(dur, f0, f1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(ph * (1 + 0.004 * d)) for d in (-2, -1, 0, 1, 2)) / 5
    x = x + 0.3 * np.sin(ph * 2)
    return (x * (t / dur) ** 0.6 * np.minimum(1, (dur - t) / 0.05)).astype(np.float32)


S = {}
# ---------------- weapons ----------------
S["fire_beam"] = [mix((k(f"{SCI}/laserSmall_00{i}.ogg", dur=0.22, rate=r), 1), (highpass(noise(0.03), 5000) * env_exp(int(0.03 * SR), 0.008), 0.25)) for i, r in ((1, 1.0), (2, 1.08), (1, 0.93))]
S["fire_gatling"] = [mix((k(f"{SCI}/laserRetro_004.ogg", dur=0.11, rate=r, fout=0.03), 0.7), (thump(260, 90, 0.09, 0.03), 0.8), (bandpass(noise(0.05), 2600, 1.2) * env_exp(int(0.05 * SR), 0.01), 0.7)) for r in (1.25, 1.35, 1.15)]
S["fire_melee"] = [mix((swoosh(0.22, 600, 4200), 1.0), (k(f"{SCI}/forceField_00{i}.ogg", dur=0.2, rate=2.0, fout=0.1), 0.35)) for i in (0, 2)]
S["fire_shotgun"] = [mix((k(f"{SCI}/explosionCrunch_00{i}.ogg", dur=0.32, rate=1.25, fout=0.18), 0.8), (thump(180, 55, 0.25, 0.07), 1.0)) for i in (0, 2)]
S["fire_fang"] = [k(f"{SCI}/laserLarge_00{i}.ogg", dur=0.3, rate=r, fout=0.12) for i, r in ((1, 1.0), (3, 1.05))]
S["fire_arc"] = [zap(0.2, s) for s in (1, 2, 3)]
S["fire_mortar"] = [mix((thump(150, 48, 0.35, 0.09), 1.0), (k(f"{SCI}/impactMetal_002.ogg", dur=0.25, rate=r), 0.5), (lowpass(noise(0.2), 900) * env_exp(int(0.2 * SR), 0.05), 0.5)) for r in (1.4, 1.6)]
S["fire_lance"] = [k(f"{SCI}/laserLarge_00{i}.ogg", dur=0.45, rate=0.8, fout=0.2) for i in (0, 4)]
S["fire_mote"] = [mix((k(f"{SCI}/forceField_00{i}.ogg", dur=0.18, rate=2.6, fout=0.1), 0.8), (k(f"{UI}/glass_00{j}.ogg", dur=0.12, rate=1.4), 0.4)) for i, j in ((1, 2), (3, 6))]
S["fire_ember"] = [mix((lowpass(k(f"{SCI}/thrusterFire_00{i}.ogg", start=0.5, dur=0.24, fin=0.01, fout=0.15), 5000), 1.0), (thump(120, 60, 0.12, 0.04), 0.4)) for i in (1, 3)]
S["fire_tether"] = [k(f"{SCI}/forceField_00{i}.ogg", dur=0.28, rate=1.4, fout=0.14) for i in (2, 4)]
S["fire_default"] = [k(f"{SCI}/laserSmall_00{i}.ogg", dur=0.24, rate=1.0) for i in (0, 4)]
# ---------------- impacts ----------------
S["hit"] = [mix((k(f"{SCI}/impactMetal_00{i}.ogg", dur=0.14, rate=r, fout=0.08), 1.0), (highpass(noise(0.03), 3000) * env_exp(int(0.03 * SR), 0.006), 0.35)) for i, r in ((0, 1.6), (3, 1.8), (4, 1.5))]
S["death"] = [mix((k(f"{SCI}/explosionCrunch_00{i}.ogg", dur=0.55, rate=r, fout=0.3), 1.0), (thump(140, 45, 0.3, 0.08), 0.7)) for i, r in ((0, 1.1), (2, 1.0), (1, 1.2))]
big = mix((k(f"{SCI}/lowFrequency_explosion_001.ogg", dur=1.0, fout=0.5), 1.0), (k(f"{SCI}/explosionCrunch_004.ogg", dur=1.4, rate=0.9, fout=0.8), 0.7))
S["explode_big"] = [big + reverb_mono(big, 1.2) * 0.25]
S["explode"] = [mix((k(f"{SCI}/explosionCrunch_00{i}.ogg", dur=0.8, rate=0.95, fout=0.4), 0.9), (k(f"{SCI}/lowFrequency_explosion_001.ogg", dur=0.6, rate=1.2, fout=0.3), 0.6)) for i in (3, 1)]
S["hurt"] = [mix((k(f"{SCI}/impactMetal_001.ogg", dur=0.35, rate=1.0, fout=0.2), 1.0), (k(f"{UI}/error_008.ogg", dur=0.14), 0.35), (bandpass(noise(0.12), 700, 1.0) * env_exp(int(0.12 * SR), 0.04), 0.5))]
S["slam"] = [mix((k(f"{SCI}/lowFrequency_explosion_000.ogg", dur=1.2, fout=0.6), 1.0), (k(f"{SCI}/impactMetal_001.ogg", dur=0.6, rate=0.8, fout=0.3), 0.8))]
# ---------------- pickups / progression ----------------
S["pickup_xp"] = [k(f"{UI}/glass_00{i}.ogg", dur=0.13, rate=1.3) for i in (2, 3, 6)]
S["pickup_hp"] = [k(f"{UI}/confirmation_003.ogg", dur=0.35)]
S["pickup_loot"] = [mix((k(f"{UI}/maximize_007.ogg", dur=0.2), 0.8), (k(f"{UI}/glass_001.ogg", dur=0.3, rate=1.2), 0.6))]
lvl = mix((k(f"{UI}/confirmation_002.ogg", dur=0.6), 0.9), (riser(0.45, 400, 1600), 0.25))
S["level"] = [lvl + reverb_mono(lvl, 0.9) * 0.3]
sk = mix((k(f"{SCI}/forceField_000.ogg", dur=0.6, rate=1.2, fout=0.3), 0.9), (k(f"{SCI}/laserLarge_003.ogg", dur=0.4, rate=0.7, fout=0.2), 0.6))
S["skill"] = [sk]
od = mix((riser(0.5, 220, 1100), 0.6), (k(f"{SCI}/forceField_004.ogg", dur=0.7, rate=0.9, fout=0.3), 0.7))
S["overdrive"] = [od + reverb_mono(od, 1.0) * 0.3]
ba = klaxon(1.3, 660, 495, 0.32)
S["boss_alert"] = [ba + reverb_mono(ba, 1.4) * 0.35 + np.pad(thump(90, 40, 0.8, 0.25), (0, len(ba)))[: len(ba)] * 0.6]
al = mix((klaxon(0.6, 880, 880, 1), 0.5), (k(f"{UI}/question_003.ogg", dur=0.33), 0.6))
S["alert"] = [al + reverb_mono(al, 0.8) * 0.3]
# ---------------- UI ----------------
S["ui_click"] = [k(f"{UI}/select_001.ogg", fout=0.01), k(f"{UI}/select_002.ogg", fout=0.01)]
S["ui_confirm"] = [k(f"{UI}/confirmation_001.ogg")]
S["ui_back"] = [k(f"{UI}/back_002.ogg", fout=0.02)]

# ---------------- thruster loop (seamless) ----------------
eng = load(f"{SCI}/spaceEngineSmall_000.ogg")
eng = lowpass(eng[int(0.3 * SR): int(4.6 * SR)], 2500)
L = int(3.6 * SR)
xf = int(0.5 * SR)
a, b = eng[:L], eng[L:L + xf]
w = np.linspace(0, 1, xf, dtype=np.float32)
loop = a.copy()
loop[:xf] = a[:xf] * np.sqrt(w) + b * np.sqrt(1 - w)

os.makedirs(f"{OUT}/sfx", exist_ok=True)
manifest = {}
for name, vs in S.items():
    for i, v in enumerate(vs):
        encode(norm(np.asarray(v, np.float32), 0.89), f"{OUT}/sfx/{name}_{i}", mono=True)
    manifest[name] = len(vs)
encode(norm(loop, 0.7), f"{OUT}/sfx/thruster_loop", mono=True)
print(json.dumps(manifest))
