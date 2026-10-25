// Transition sound design — generated in code with the Web Audio API (no files, no music).
// Bundle  → soft rounded pops / bubbles.   Lavara → airy breeze / silk.
// Weight by level: slide (barely audible) < section < zoom (gentle swell).

const LEVEL_GAIN = { slide: 0.10, section: 0.32, zoom: 0.5, ui: 0.08 };

export class SoundEngine {
  constructor() {
    this.ctx = null; this.out = null; this.noise = null;
    this.cfg = { master: 0.35, muted: false };
    this.brand = {}; // projectId → { muted, volume, texture }
  }
  configure(settings = {}, projects = []) {
    this.cfg = { master: settings.master ?? 0.35, muted: !!settings.muted };
    this.brand = {};
    for (const p of projects) this.brand[p.id] = { muted: !!p.brand?.sound?.muted, volume: p.brand?.sound?.volume ?? 1, texture: p.brand?.texture || 'bubbles' };
    if (this.out) this.out.gain.value = this.cfg.muted ? 0 : this.cfg.master;
  }
  get ready() { return !!this.ctx && this.ctx.state === 'running'; }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 3;
      this.out = this.ctx.createGain(); this.out.gain.value = this.cfg.muted ? 0 : this.cfg.master;
      this.out.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 3, buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = 0.985 * b + 0.15 * w; d[i] = (w * 0.35 + b * 0.65); } }
      this.noise = buf;
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }
  setMuted(m) { this.cfg.muted = m; if (this.out) this.out.gain.setTargetAtTime(m ? 0 : this.cfg.master, this.ctx.currentTime, 0.05); }

  play(level, projectId, texture) {
    if (!this.ready || this.cfg.muted) return;
    const b = projectId ? this.brand[projectId] : null;
    if (b?.muted) return;
    const tex = texture || b?.texture || 'neutral';
    const g = (LEVEL_GAIN[level] ?? 0.1) * (b?.volume ?? 1);
    if (tex === 'bubbles') this.bubbles(level, g);
    else if (tex === 'mist') this.breeze(level, g);
    else this.neutral(level, g);
  }

  /* ---------- building blocks */
  env(gainNode, t0, a, hold, r, peak) {
    const p = gainNode.gain; p.cancelScheduledValues(t0); p.setValueAtTime(0.0001, t0);
    p.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    p.setValueAtTime(Math.max(peak, 0.0002), t0 + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t0 + a + hold + r);
  }
  noiseSweep({ t0, dur, f0, f1, q = 0.8, peak, panFrom = 0.6, panTo = -0.6, type = 'bandpass' }) {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
    const gn = c.createGain(); const pan = c.createStereoPanner();
    pan.pan.setValueAtTime(panFrom, t0); pan.pan.linearRampToValueAtTime(panTo, t0 + dur);
    src.connect(f).connect(lp).connect(gn).connect(pan).connect(this.out);
    this.env(gn, t0, dur * 0.45, 0, dur * 0.55, peak);
    src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.1);
  }
  tone({ t0, freq, freq1, dur, peak, type = 'sine', attack = 0.005, pan = 0 }) {
    const c = this.ctx, o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t0); if (freq1) o.frequency.exponentialRampToValueAtTime(freq1, t0 + dur);
    const gn = c.createGain(), pn = c.createStereoPanner(); pn.pan.value = pan;
    o.connect(gn).connect(pn).connect(this.out);
    this.env(gn, t0, attack, 0, Math.max(0.02, dur - attack), peak);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  /* ---------- Bundle: rounded pops */
  pop(t0, peak, base = 420, pan = 0) {
    const f = base * (0.85 + Math.random() * 0.4);
    this.tone({ t0, freq: f * 1.8, freq1: f, dur: 0.14, peak, attack: 0.004, pan });
    this.tone({ t0: t0 + 0.01, freq: f * 3.6, freq1: f * 2.2, dur: 0.08, peak: peak * 0.25, attack: 0.003, pan });
  }
  bubbles(level, g) {
    const t = this.ctx.currentTime + 0.01;
    if (level === 'slide' || level === 'ui') { this.pop(t, g * 0.5, 520, 0.3); return; }
    if (level === 'section') {
      this.noiseSweep({ t0: t, dur: 1.4, f0: 300, f1: 1400, q: 0.6, peak: g * 0.35 });
      [0.15, 0.42, 0.66, 0.9, 1.25].forEach((d, i) => this.pop(t + d, g * (0.55 - i * 0.05), 360 + i * 70, 0.6 - i * 0.3));
      return;
    }
    // zoom: soft swell + two pops on arrival
    this.noiseSweep({ t0: t, dur: 1.6, f0: 180, f1: 900, q: 0.5, peak: g * 0.45, type: 'lowpass' });
    [262, 392, 523].forEach((f, i) => this.tone({ t0: t + 0.1, freq: f, dur: 1.6, peak: g * 0.06, attack: 0.7, pan: i - 1 }));
    this.pop(t + 1.25, g * 0.5, 380, -0.2); this.pop(t + 1.38, g * 0.35, 560, 0.2);
  }

  /* ---------- Lavara: breeze / silk */
  breeze(level, g) {
    const t = this.ctx.currentTime + 0.01;
    if (level === 'slide' || level === 'ui') { this.noiseSweep({ t0: t, dur: 0.9, f0: 1800, f1: 3800, q: 1.2, peak: g * 0.7 }); return; }
    if (level === 'section') {
      this.noiseSweep({ t0: t, dur: 2.4, f0: 500, f1: 2600, q: 0.7, peak: g * 0.75 });
      this.noiseSweep({ t0: t + 0.5, dur: 1.8, f0: 3000, f1: 5200, q: 2.5, peak: g * 0.25, panFrom: -0.5, panTo: 0.5 });
      [1318, 1975].forEach((f, i) => this.tone({ t0: t + 0.6 + i * 0.2, freq: f, dur: 1.8, peak: g * 0.03, attack: 0.6 }));
      return;
    }
    this.noiseSweep({ t0: t, dur: 2.0, f0: 220, f1: 1600, q: 0.5, peak: g * 0.6, type: 'lowpass' });
    [196, 294, 392, 587].forEach((f, i) => this.tone({ t0: t + 0.05, freq: f, dur: 2.0, peak: g * 0.05, attack: 0.9, pan: (i - 1.5) / 2 }));
  }

  /* ---------- neutral (Universe / Decision / Closing) */
  neutral(level, g) {
    const t = this.ctx.currentTime + 0.01;
    this.noiseSweep({ t0: t, dur: level === 'zoom' ? 1.8 : 1.0, f0: 250, f1: 1200, q: 0.6, peak: g * 0.4, type: 'lowpass' });
    if (level === 'zoom') [220, 330, 440].forEach((f, i) => this.tone({ t0: t, freq: f, dur: 1.8, peak: g * 0.045, attack: 0.8, pan: i - 1 }));
  }
}
