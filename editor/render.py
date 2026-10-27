#!/usr/bin/env python3
"""Editor de reels: convierte un guion (guion.json + imágenes) en un vídeo vertical
1080×1920 con voz en off, subtítulos animados, movimiento de cámara, efectos y música.

Uso:  python3 editor/render.py editor/episodios/001-apagon
"""
import json
import math
import os
import random
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
SR = 22050
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, 'fuentes', 'Inter-ExtraBold.otf')
FONT_TITLE = os.path.join(HERE, 'fuentes', 'Inter-Black.otf')
VOICES = os.path.join(HERE, 'voces')
FADE = .45          # fundido entre escenas (s)
SUB_Y = 1290        # centro vertical de los subtítulos (por encima de la interfaz de Instagram)
YELLOW = (255, 212, 59)


# ---------- voz en off ----------
# Tono "rudo": más grave, cuerpo en graves, algo de aspereza y compresión. (factor de tono, graves dB, saturación)
TONOS = {'suave': (.95, 3, 1.5), 'media': (.915, 4.5, 2.4), 'fuerte': (.88, 6, 3.6)}


def tone_filter(tono, sr=SR):
    r, low, drive = TONOS[tono]
    return (f'asetrate={sr}*{r},aresample=44100,atempo={1 / r:.4f},highpass=f=70,'
            f'equalizer=f=140:t=q:w=1:g={low},equalizer=f=2600:t=q:w=1.2:g=2.5,equalizer=f=7000:t=q:w=1:g=-3,'
            f'volume={drive},asoftclip=type=tanh,acompressor=threshold=-20dB:ratio=4:attack=5:release=120:makeup=2,'
            f'alimiter=limit=0.9,aresample={SR}')


KOKORO = os.path.join(VOICES, 'kokoro')
_kokoro = None


def synth_kokoro(text, voice, speed):
    """Voz neuronal Kokoro (em_alex, em_santa, ef_dora): mucho más natural que Piper."""
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(os.path.join(KOKORO, 'model.onnx'), os.path.join(KOKORO, 'voices.npz'))
    a, sr = _kokoro.create(text.replace('*', ''), voice=voice, speed=speed, lang='es')
    return a.astype(np.float32), sr


def synth(text, voice, speed, path, tono='media', speaker=0):
    if voice.startswith(('em_', 'ef_')):
        a, sr = synth_kokoro(text, voice, speed)
        if tono in TONOS:
            import soundfile as sf
            raw = path.replace('.wav', '-raw.wav')
            sf.write(raw, a, sr)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', tone_filter(tono, sr), '-ac', '1', path], check=True)
            a, sr = sf.read(path, dtype='float32')
        a = a / max(1e-6, np.abs(a).max()) * .89
        return np.interp(np.arange(int(len(a) * SR / sr)) * sr / SR, np.arange(len(a)), a).astype(np.float32)
    from piper import PiperVoice
    from piper.config import SynthesisConfig
    v = PiperVoice.load(os.path.join(VOICES, voice + '.onnx'))
    raw = path.replace('.wav', '-raw.wav') if tono in TONOS else path
    with wave.open(raw, 'wb') as w:
        v.synthesize_wav(text.replace('*', ''), w, syn_config=SynthesisConfig(
            speaker_id=speaker, length_scale=1.07 / speed, noise_scale=.5, noise_w_scale=.6))
    if tono in TONOS:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', tone_filter(tono), '-ac', '1', path], check=True)
    with wave.open(path) as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    if sr != SR:
        a = np.interp(np.arange(int(len(a) * SR / sr)) * sr / SR, np.arange(len(a)), a)
    return a


# ---------- música ambiente sintetizada ----------
def music(kind, n):
    if kind in (None, 'ninguna'):
        return np.zeros(n, np.float32)
    t = np.arange(n) / SR
    rng = np.random.default_rng(3)
    noise = rng.standard_normal(n).astype(np.float32)
    k = 1200
    noise = np.convolve(noise, np.ones(k) / k, mode='same') * 8   # ruido grave filtrado
    if kind == 'tension':
        notes = [55, 82.41, 110, 116.54]
        lfo = .6 + .4 * np.sin(2 * np.pi * t / 7)
        m = sum(np.sin(2 * np.pi * f * t + i) * (.5 if i < 3 else .18 * (np.sin(2 * np.pi * t / 11) > .3)) for i, f in enumerate(notes)) * lfo
        beat = np.zeros(n); per = int(SR * 1.15)
        for s in range(0, n, per):
            e = min(n, s + int(SR * .25)); tt = np.arange(e - s) / SR
            beat[s:e] += np.sin(2 * np.pi * 48 * tt) * np.exp(-tt * 18) * 1.6
        m = m + beat + noise * .5
    else:  # calma
        chords = [[110, 130.81, 164.81], [98, 123.47, 146.83], [87.31, 110, 130.81], [98, 123.47, 164.81]]
        m = np.zeros(n); seg = int(SR * 4)
        for ci, s in enumerate(range(0, n, seg)):
            e = min(n, s + seg); tt = np.arange(e - s) / SR
            env = np.minimum(1, tt / 1.2) * np.minimum(1, (4 - tt) / 1.2).clip(0)
            for f in chords[ci % 4]:
                m[s:e] += (np.sin(2 * np.pi * f * tt) + .3 * np.sin(4 * np.pi * f * tt)) * env
        m = m + noise * .2
    m = m / (np.abs(m).max() + 1e-6)
    fade = int(SR * 1.5)
    m[:fade] *= np.linspace(0, 1, fade); m[-fade:] *= np.linspace(1, 0, fade)
    return m.astype(np.float32)


# ---------- subtítulos ----------
def word_times(words, dur, lead=.12):
    weights = []
    for w in words:
        c = len(w.replace('*', '')) + 2
        if w[-1] in ',;:': c += 4
        if w[-1] in '.!?…': c += 8
        weights.append(c)
    tot = sum(weights); t = lead; out = []
    for c in weights:
        d = (dur - lead - .15) * c / tot
        out.append((t, t + d)); t += d
    return out


def chunks(words, max_chars=24, max_words=5):
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        n = sum(len(words[j].replace('*', '')) + 1 for j in cur)
        if n >= max_chars or len(cur) >= max_words or w[-1] in '.!?…,:;':
            out.append(cur); cur = []
    if cur: out.append(cur)
    return out


class Subs:
    def __init__(self):
        self.font = ImageFont.truetype(FONT, 74)
        self.big = ImageFont.truetype(FONT, 82)
        self.cache = {}

    def word(self, text, color, big):
        key = (text, color, big)
        if key not in self.cache:
            f = self.big if big else self.font
            bb = f.getbbox(text, stroke_width=9)
            im = Image.new('RGBA', (bb[2] - bb[0] + 4, bb[3] - bb[1] + 4))
            ImageDraw.Draw(im).text((2 - bb[0], 2 - bb[1]), text, font=f, fill=color, stroke_width=9, stroke_fill=(0, 0, 0, 235))
            self.cache[key] = im
        return self.cache[key]

    def draw(self, frame, words, times, groups, t):
        g = next((g for g in groups if times[g[0]][0] - .05 <= t < times[g[-1]][1] + .25), None)
        if g is None:
            return
        hl, items = False, []
        for i in range(len(words)):
            w = words[i]
            if w.startswith('*'): hl = True
            if i in g:
                clean = w.replace('*', '')
                active = times[i][0] <= t < times[i][1]
                items.append(self.word(clean, YELLOW if hl else (255, 255, 255), active))
            if w.rstrip('.,;:!?…)').endswith('*'): hl = False
        gap, maxw = 6, W - 140
        lines, cur, cw = [], [], 0
        for im in items:
            if cur and cw + im.width > maxw:
                lines.append(cur); cur, cw = [], 0
            cur.append(im); cw += im.width + gap
        lines.append(cur)
        lh = 96
        y = SUB_Y - (len(lines) * lh) // 2
        for ln in lines:
            tw = sum(i.width for i in ln) + gap * (len(ln) - 1)
            x = (W - tw) // 2
            for im in ln:
                frame.alpha_composite(im, (x, y + (lh - im.height) // 2))
                x += im.width + gap
            y += lh


# ---------- efectos ----------
class Effects:
    def __init__(self, seed=1):
        r = random.Random(seed)
        self.rain = [(r.random() * W * 1.3, r.random() * H, 1600 + r.random() * 900, 40 + r.random() * 50) for _ in range(380)]
        self.dust = [(r.random() * W, r.random() * H, r.random() * 6.28, 1.5 + r.random() * 3.5, 10 + r.random() * 25) for _ in range(140)]
        self.embers = [(r.random() * W, r.random() * H, 60 + r.random() * 160, 2 + r.random() * 4, r.random() * 6.28) for _ in range(110)]
        blob = Image.new('L', (420, 420)); ImageDraw.Draw(blob).ellipse((60, 60, 360, 360), fill=255)
        self.blob = blob.filter(ImageFilter.GaussianBlur(55))
        self.smoke = []
        for _ in range(14):
            sc = .6 + r.random() * .9; m = self.blob.resize((int(420 * sc * 1.6),) * 2)
            layer = Image.new('RGBA', m.size, (70, 64, 62, 0)); layer.putalpha(m.point(lambda v: v * 90 // 255))
            self.smoke.append((r.random() * W, r.random() * H, 8 + r.random() * 18, sc, layer))

    def apply(self, frame, kind, t):
        if not kind or kind == 'ninguno':
            return
        ov = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(ov)
        if kind == 'lluvia':
            for x, y0, sp, ln in self.rain:
                y = (y0 + sp * t) % (H + 100) - 50; xx = (x - (y * .18)) % (W + 60)
                d.line((xx, y, xx - ln * .18, y - ln), fill=(200, 215, 230, 85), width=2)
            if (t % 5.3) < .07: d.rectangle((0, 0, W, H), fill=(255, 255, 255, 110))
        elif kind in ('polvo', 'nieve'):
            snow = kind == 'nieve'
            for x, y0, ph, rad, sp in self.dust:
                y = (y0 + (sp * 4 if snow else -sp) * t) % H; xx = x + math.sin(t * .6 + ph) * 30
                a = 200 if snow else int(70 + 50 * math.sin(t + ph))
                d.ellipse((xx - rad, y - rad, xx + rad, y + rad), fill=(255, 250, 235, a))
        elif kind == 'brasas':
            for x, y0, sp, rad, ph in self.embers:
                y = (y0 - sp * t) % H; xx = x + math.sin(t * 1.3 + ph) * 25
                a = int(150 + 100 * math.sin(t * 9 + ph))
                d.ellipse((xx - rad, y - rad, xx + rad, y + rad), fill=(255, 140 + int(60 * math.sin(ph)), 40, max(0, a)))
            d.rectangle((0, 0, W, H), fill=(255, 90, 20, int(18 + 12 * math.sin(t * 7))))
        elif kind == 'humo':
            for x, y0, sp, sc, layer in self.smoke:
                y = (y0 - sp * 6 * t) % (H + 400) - 200; xx = x + math.sin(t * .3 + sc) * 60
                ov.paste(layer, (int(xx - layer.width / 2), int(y - layer.height / 2)), layer)
        elif kind == 'parpadeo':
            f = .5 + .5 * math.sin(t * 23) * math.sin(t * 3.7 + 1)
            d.rectangle((0, 0, W, H), fill=(0, 0, 8, int(max(0, f) * 150)))
        elif kind == 'sirena':
            c = (255, 30, 30) if int(t * 2.4) % 2 else (30, 80, 255)
            d.rectangle((0, 0, W, H), fill=c + (int(40 + 25 * abs(math.sin(t * 7.5))),))
        frame.alpha_composite(ov)


# ---------- imagen + movimiento de cámara ----------
def load_cover(path, scale=1.14):
    im = Image.open(path).convert('RGB')
    tw, th = int(W * scale), int(H * scale)
    s = max(tw / im.width, th / im.height)
    im = im.resize((math.ceil(im.width * s), math.ceil(im.height * s)), Image.LANCZOS)
    x, y = (im.width - tw) // 2, (im.height - th) // 2
    return im.crop((x, y, x + tw, y + th))


def camera(img, move, p, shake=0, t=0):
    e = p * p * (3 - 2 * p)
    iw, ih = img.size
    z = {'acercar': 1 + .12 * e, 'alejar': 1.12 - .12 * e}.get(move, 1.06)
    cw, ch = iw / (1.14 * z) * 1.0, ih / (1.14 * z) * 1.0
    cx, cy = iw / 2, ih / 2
    mx, my = (iw - cw) / 2, (ih - ch) / 2
    if move == 'izquierda': cx += mx * (.9 - 1.8 * e)
    if move == 'derecha': cx -= mx * (.9 - 1.8 * e)
    if move == 'subir': cy += my * (.9 - 1.8 * e)
    if move == 'bajar': cy -= my * (.9 - 1.8 * e)
    if shake:
        cx += math.sin(t * 47) * shake; cy += math.cos(t * 39) * shake
    box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
    return img.resize((W, H), Image.BICUBIC, box=box, reducing_gap=None)


def grade_layers():
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W * .62)) ** 2 + ((yy - H * .46) / (H * .62)) ** 2)
    a = (np.clip(r - .55, 0, 1) * 300).clip(0, 175).astype(np.uint8)
    bottom = (np.clip((yy - H * .55) / (H * .45), 0, 1) * 150).astype(np.uint8)
    vig = Image.fromarray(np.maximum(a, bottom), 'L')
    v = Image.new('RGBA', (W, H), (0, 0, 0, 0)); v.putalpha(vig)
    rng = np.random.default_rng(5); grains = []
    for _ in range(6):
        n = rng.integers(0, 255, (H // 2, W // 2), dtype=np.uint8)
        gi = Image.fromarray(n, 'L').resize((W, H), Image.NEAREST)
        g = Image.merge('RGBA', (gi, gi, gi, Image.new('L', (W, H), 14)))
        grains.append(g)
    return v, grains


def title_layer(text):
    f = ImageFont.truetype(FONT_TITLE, 66)
    lines, cur = [], ''
    for w in text.upper().split():
        test = (cur + ' ' + w).strip()
        if f.getlength(test) > W - 160 and cur: lines.append(cur); cur = w
        else: cur = test
    lines.append(cur)
    im = Image.new('RGBA', (W, 120 + 84 * len(lines)))
    d = ImageDraw.Draw(im)
    for i, ln in enumerate(lines):
        d.text((W // 2, 60 + i * 84), ln, font=f, fill=(255, 255, 255), anchor='mt', stroke_width=8, stroke_fill=(0, 0, 0, 220))
    return im


# ---------- render ----------
def render(folder):
    g = json.load(open(os.path.join(folder, 'guion.json'), encoding='utf-8'))
    voice, speed = g.get('voz', 'em_alex'), g.get('velocidad', 1.0)
    tono, speaker = g.get('tono', 'natural'), g.get('hablante', 0)
    os.makedirs(os.path.join(folder, 'tmp'), exist_ok=True)
    scenes, audio, t0 = [], [], .35
    audio.append(np.zeros(int(SR * t0), np.float32))
    for i, s in enumerate(g['escenas']):
        a = synth(s['texto'], voice, speed, os.path.join(folder, 'tmp', f'voz{i:02d}.wav'), tono, speaker)
        pause = s.get('pausa', .55)
        dur = len(a) / SR + pause
        words = s['texto'].split()
        times = [(t0 + a0, t0 + a1) for a0, a1 in word_times(words, len(a) / SR)]
        scenes.append(dict(s, start=t0, dur=dur, words=words, times=times, groups=chunks(words)))
        audio += [a, np.zeros(int(SR * pause), np.float32)]
        t0 += dur
    total = t0 + .6
    voice_track = np.concatenate(audio)
    voice_track = np.pad(voice_track, (0, int(total * SR) - len(voice_track)))
    bed = music(g.get('musica', 'tension'), len(voice_track)) * .12
    mix = np.clip(voice_track * 1.0 + bed, -1, 1)
    wav = os.path.join(folder, 'tmp', 'audio.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())

    imgs = {s['imagen']: load_cover(os.path.join(folder, s['imagen'])) for s in scenes}
    subs, fx = Subs(), Effects()
    vig, grains = grade_layers()
    title = title_layer(g['titulo']) if g.get('titulo') else None
    out = os.path.join(folder, g.get('salida', 'video.mp4'))
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-i', wav, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '8M', '-bufsize', '16M', '-pix_fmt', 'yuv420p',
                           '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-movflags', '+faststart', '-shortest', out], stdin=subprocess.PIPE)

    def scene_frame(s, t):
        p = min(1, max(0, (t - s['start']) / (s['dur'] + FADE)))
        shake = 9 if s.get('efecto') == 'temblor' else 0
        fr = camera(imgs[s['imagen']], s.get('movimiento', 'acercar'), p, shake, t).convert('RGBA')
        fx.apply(fr, s.get('efecto'), t)
        return fr

    nframes = int(total * FPS)
    for n in range(nframes):
        t = n / FPS
        k = max(0, max(i for i, s in enumerate(scenes) if t >= s['start'] or i == 0))
        s = scenes[k]
        fr = scene_frame(s, t)
        if k + 1 < len(scenes) and t > scenes[k + 1]['start'] - FADE:
            nxt = scene_frame(scenes[k + 1], t)
            fr = Image.blend(fr, nxt, (t - (scenes[k + 1]['start'] - FADE)) / FADE)
        fr.alpha_composite(vig)
        fr.alpha_composite(grains[n % len(grains)])
        if title and t < 3.2:
            a = min(1, t / .4) * min(1, (3.2 - t) / .4)
            tl = title.copy(); tl.putalpha(tl.getchannel('A').point(lambda v: int(v * a)))
            fr.alpha_composite(tl, (0, 150))
        subs.draw(fr, s['words'], s['times'], s['groups'], t)
        if t < .3: fr = Image.blend(Image.new('RGBA', (W, H), (0, 0, 0, 255)), fr, t / .3)
        if t > total - .5: fr = Image.blend(fr, Image.new('RGBA', (W, H), (0, 0, 0, 255)), (t - (total - .5)) / .5)
        ff.stdin.write(fr.convert('RGB').tobytes())
        if n % (FPS * 5) == 0:
            print(f'  {t:5.1f}/{total:.1f} s', flush=True)
    ff.stdin.close(); ff.wait()
    print('Listo:', out, f'({total:.1f} s)')
    return out


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    render(sys.argv[1])
