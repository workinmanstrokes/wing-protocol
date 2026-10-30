import os, subprocess
import numpy as np
from scipy import signal

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "audio")


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def resample(x, rate):
    if abs(rate - 1) < 1e-4:
        return x
    n = int(len(x) / rate)
    return np.interp(np.arange(n) * rate, np.arange(len(x)), x).astype(np.float32)


def fade(x, fin, fout):
    x = x.copy()
    a, b = min(len(x), int(fin * SR)), min(len(x), int(fout * SR))
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b) ** 2
    return x


def norm(x, peak):
    m = np.abs(x).max()
    return x * (peak / m) if m > 0 else x


def _sos(kind, f, q=0.707):
    if kind == "band":
        bw = f / q
        lo, hi = max(20, f - bw / 2), min(SR / 2 - 100, f + bw / 2)
        return signal.butter(2, [lo, hi], "bandpass", fs=SR, output="sos")
    return signal.butter(2, min(f, SR / 2 - 100), kind, fs=SR, output="sos")


def lowpass(x, f): return signal.sosfilt(_sos("lowpass", f), x).astype(np.float32)
def highpass(x, f): return signal.sosfilt(_sos("highpass", f), x).astype(np.float32)
def bandpass(x, f, q): return signal.sosfilt(_sos("band", f, q), x).astype(np.float32)


def ir(seconds, seed=3, stereo=False):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    e = np.exp(-t * 6.9 / seconds)
    ch = 2 if stereo else 1
    x = r.standard_normal((ch, n)) * e
    x = np.stack([lowpass(c.astype(np.float32), 6500) for c in x])
    x[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return x / np.sqrt((x ** 2).sum(axis=1, keepdims=True))


def reverb_mono(x, seconds):
    y = signal.fftconvolve(x, ir(seconds)[0])[: len(x)]
    return y.astype(np.float32)


def encode(x, base, mono=False, q=3, mp3k=96):
    x = np.asarray(x, np.float32)
    if x.ndim == 1:
        ch, data = 1, x
    else:
        ch, data = x.shape[0], x.T.reshape(-1)
    raw = np.clip(data, -1, 1).astype(np.float32).tobytes()
    common = ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", str(ch), "-i", "-"]
    subprocess.run(common + ["-c:a", "libvorbis", "-q:a", str(q), base + ".ogg"], input=raw, check=True)
    subprocess.run(common + ["-c:a", "libmp3lame", "-b:a", f"{mp3k if ch > 1 else 64}k", base + ".mp3"], input=raw, check=True)
