const KEY = 'bcq-muted';

class SoundBoard {
  #ctx = null;
  muted = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();

  #audio() {
    this.#ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
    return this.#ctx;
  }

  #tone(freq, { at = 0, dur = 0.12, type = 'sine', gain = 0.15, slide = 0 } = {}) {
    if (this.muted) return;
    const ctx = this.#audio();
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem(KEY, this.muted ? '1' : '0'); } catch {}
    if (this.muted) this.stopMusic();
    return this.muted;
  }

  catch(combo = 0) { this.#tone(520 + Math.min(combo, 40) * 12, { dur: 0.08, type: 'triangle' }); }
  rotten() { this.#tone(160, { dur: 0.3, type: 'sawtooth', gain: 0.12, slide: -80 }); }
  box() { this.#tone(300, { dur: 0.25, type: 'sine', slide: 600 }); }
  correct() { [523, 659, 784].forEach((f, i) => this.#tone(f, { at: i * 0.08, dur: 0.18, type: 'triangle' })); }
  wrong() { [330, 247].forEach((f, i) => this.#tone(f, { at: i * 0.12, dur: 0.2, type: 'square', gain: 0.07 })); }
  tick() { this.#tone(1000, { dur: 0.03, gain: 0.05 }); }
  gameOver() { [392, 330, 262, 196].forEach((f, i) => this.#tone(f, { at: i * 0.15, dur: 0.25, type: 'triangle' })); }
  levelUp() { [523, 784, 1047].forEach((f, i) => this.#tone(f, { at: i * 0.05, dur: 0.12, type: 'square', gain: 0.06 })); }
  countdown(final = false) { this.#tone(final ? 880 : 440, { dur: final ? 0.35 : 0.15, type: 'square', gain: 0.08 }); }
  click() { this.#tone(700, { dur: 0.04, type: 'triangle', gain: 0.06 }); }

  musicMuted = (() => { try { return localStorage.getItem(KEY + '-music') === '1'; } catch { return false; } })();
  #music = null;

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    try { localStorage.setItem(KEY + '-music', this.musicMuted ? '1' : '0'); } catch {}
    this.musicMuted ? this.stopMusic() : this.startMusic();
    return this.musicMuted;
  }

  startMusic() {
    if (this.musicMuted || this.muted || this.#music) return;
    const ctx = this.#audio();
    const out = ctx.createGain();
    out.gain.value = 0.05;
    out.connect(ctx.destination);
    const melody = [440, 0, 523, 587, 659, 0, 587, 523, 440, 0, 392, 440, 523, 0, 440, 0];
    const bass = [110, 110, 131, 131, 98, 98, 110, 110];
    const step = 0.2;
    let next = ctx.currentTime + 0.1;
    let i = 0;
    const note = (freq, t, dur, type, gain) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.02);
    };
    const timer = setInterval(() => {
      while (next < ctx.currentTime + 0.3) {
        const m = melody[i % melody.length];
        if (m) note(m, next, 0.18, 'triangle', 0.9);
        if (i % 2 === 0) note(bass[(i / 2) % bass.length], next, 0.35, 'sine', 1.2);
        if (i % 4 === 2) note(2000, next, 0.03, 'square', 0.15);
        next += step;
        i++;
      }
    }, 100);
    this.#music = { timer, out };
  }

  stopMusic() {
    if (!this.#music) return;
    clearInterval(this.#music.timer);
    const { out } = this.#music;
    out.gain.setTargetAtTime(0, this.#ctx.currentTime, 0.1);
    setTimeout(() => out.disconnect(), 500);
    this.#music = null;
  }

  duckMusic(on) {
    if (this.#music) this.#music.out.gain.setTargetAtTime(on ? 0.015 : 0.05, this.#ctx.currentTime, 0.2);
  }
}

export const Sound = new SoundBoard();
