import { Events } from '../core/EventBus.js';
import { buildSprites } from './Sprites.js';

const COMBO_STEPS = [0, 10, 25, 50];
const PLAYER_SPEED = 620;
const MIN_BOX_GAP = 3;
const MAX_SPEED_FACTOR = 2.2;

const rand = (min, max) => min + Math.random() * (max - min);

export class GameEngine {
  constructor(canvas, bus, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bus = bus;
    this.cfg = config;
    this.sprites = buildSprites();

    this.state = 'idle';
    this.items = [];
    this.particles = [];
    this.keys = new Set();
    this.pointerX = null;
    this.player = { x: 0, y: 0, w: 92 };

    this.lives = config.lives;
    this.maxLives = config.lives + 2;
    this.catchPoints = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.caught = { banana: 0 };
    this.elapsed = 0;
    this.spawnTimer = 0.6;
    this.lastBoxAt = -MIN_BOX_GAP + 3;
    this.hurtFlash = 0;

    this.#bindInput();
    this.resize();
  }

  start() {
    this.state = 'running';
    this.bus.emit(Events.LIVES_CHANGED, { lives: this.lives, max: this.heartSlots });
    this.bus.emit(Events.GAME_STARTED, {});
    this.#loop();
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.keys.clear();
    this.bus.emit(Events.GAME_PAUSED, {});
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.bus.emit(Events.GAME_RESUMED, {});
    this.#loop();
  }

  togglePause() {
    if (this.state === 'running') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  end() {
    if (this.state === 'over') return;
    this.#gameOver();
  }

  resolvePuzzle(result) {
    if (this.state !== 'puzzle') return;
    if (result && result.correct) {
      this.#addLife();
      this.#floatText(`+${result.bonus}`, this.player.x, this.player.y - 80, '#a78bfa', 30);
    } else if (result) {
      this.#loseLife(result.timed_out ? 'Too slow!' : 'Wrong!');
    }
    this.items = this.items.filter((it) => it.y < this.h * 0.55);
    if (this.lives <= 0) return this.#gameOver();
    this.state = 'running';
    this.keys.clear();
    this.#loop();
  }

  destroy() {
    this.state = 'over';
    this.abort.abort();
  }

  #bindInput() {
    this.abort = new AbortController();
    const opts = { signal: this.abort.signal };
    const left = ['ArrowLeft', 'a', 'A'];
    const right = ['ArrowRight', 'd', 'D'];

    window.addEventListener('keydown', (e) => {
      if (left.includes(e.key)) this.keys.add('left');
      else if (right.includes(e.key)) this.keys.add('right');
      else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (this.state === 'running' || this.state === 'paused') { e.preventDefault(); this.togglePause(); }
        return;
      } else return;
      e.preventDefault();
      this.pointerX = null;
    }, opts);

    window.addEventListener('keyup', (e) => {
      if (left.includes(e.key)) this.keys.delete('left');
      if (right.includes(e.key)) this.keys.delete('right');
    }, opts);

    const point = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = e.clientX - rect.left;
    };
    this.canvas.addEventListener('pointermove', point, opts);
    this.canvas.addEventListener('pointerdown', point, opts);

    window.addEventListener('resize', () => this.resize(), opts);
    window.addEventListener('blur', () => this.keys.clear(), opts);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const ratio = this.w ? this.player.x / this.w : 0.5;
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.player.w = Math.max(70, Math.min(110, this.w * 0.12));
    this.player.x = ratio * this.w;
    this.player.y = this.h - 48;
    if (this.state !== 'running') this.#render();
  }

  #loop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.last = performance.now();
    const frame = (now) => {
      if (this.state !== 'running') { this.#render(); return; }
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.#update(dt);
      this.#render();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  get heartSlots() {
    return Math.max(this.cfg.lives, this.lives);
  }

  get speedFactor() {
    return Math.min(MAX_SPEED_FACTOR, 1 + this.cfg.speedRamp * (this.elapsed / 5));
  }

  get multiplier() {
    let m = 1;
    COMBO_STEPS.forEach((step, i) => { if (this.combo >= step) m = i + 1; });
    return Math.min(m, this.cfg.maxComboMult);
  }

  #update(dt) {
    this.elapsed += dt;
    this.#movePlayer(dt);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.#spawn();
      this.spawnTimer = (this.cfg.spawnMs / 1000) / Math.sqrt(this.speedFactor) * rand(0.75, 1.25);
    }

    const p = this.player;
    const catchTop = p.y - 30;
    for (const it of this.items) {
      it.y += it.vy * this.speedFactor * dt;
      it.rot += it.vr * dt;
      const inX = Math.abs(it.x - p.x) < p.w / 2 + it.size * 0.25;
      const inY = it.y + it.size / 2 >= catchTop && it.y - it.size / 2 <= catchTop + 26;
      if (inX && inY) {
        it.dead = true;
        this.#onCatch(it);
        if (this.state === 'puzzle' || this.state === 'over') break;
      } else if (it.y - it.size > this.h) {
        it.dead = true;
        if (it.good) this.#breakCombo();
      }
    }
    this.items = this.items.filter((it) => !it.dead);

    for (const pt of this.particles) {
      pt.life -= dt;
      pt.y += pt.vy * dt;
      pt.x += (pt.vx || 0) * dt;
      if (pt.gravity) pt.vy += pt.gravity * dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5);
  }

  #movePlayer(dt) {
    const p = this.player;
    if (this.keys.has('left')) p.x -= PLAYER_SPEED * dt;
    if (this.keys.has('right')) p.x += PLAYER_SPEED * dt;
    if (this.pointerX !== null && this.keys.size === 0) {
      p.x += (this.pointerX - p.x) * Math.min(1, dt * 18);
    }
    p.x = Math.max(p.w / 2, Math.min(this.w - p.w / 2, p.x));
  }

  #spawn() {
    const c = this.cfg;
    const r = Math.random();
    let type = 'banana';
    const boxAllowed = this.elapsed - this.lastBoxAt >= MIN_BOX_GAP && !this.items.some((i) => i.type === 'box');
    if (r < c.boxChance) type = boxAllowed ? 'box' : 'banana';
    else if (r < c.boxChance + c.rottenChance) type = 'rotten';
    if (type === 'box') this.lastBoxAt = this.elapsed;

    const size = type === 'box' ? 48 : 44;
    this.items.push({
      type, size,
      good: type === 'banana',
      x: rand(size, this.w - size),
      y: -size,
      vy: c.fallSpeed * rand(0.85, 1.15) * (type === 'box' ? 0.8 : 1),
      rot: rand(-0.5, 0.5),
      vr: type === 'box' ? rand(-0.8, 0.8) : rand(-2, 2),
    });
  }

  #onCatch(it) {
    if (it.type === 'rotten') {
      this.#loseLife('Rotten!');
      this.#breakCombo();
      if (this.lives <= 0) this.#gameOver();
      return;
    }

    if (it.type === 'box') {
      this.state = 'puzzle';
      this.keys.clear();
      this.bus.emit(Events.PUZZLE_TRIGGERED, {});
      return;
    }

    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.caught[it.type]++;
    const before = this.multiplier;
    const pts = this.cfg.points[it.type] * this.multiplier;
    this.catchPoints += pts;
    this.#floatText(`+${pts}`, it.x, it.y, '#f5f1e3');
    this.#burst(it.x, it.y, '#fff3b0');
    this.bus.emit(Events.ITEM_CAUGHT, { type: it.type, points: pts, combo: this.combo });
    this.bus.emit(Events.SCORE_CHANGED, { catchPoints: this.catchPoints });
    this.#emitCombo(before);
  }

  #breakCombo() {
    if (this.combo === 0) return;
    const before = this.multiplier;
    this.combo = 0;
    this.bus.emit(Events.BANANA_MISSED, {});
    this.#emitCombo(before);
  }

  #emitCombo(prevMult) {
    const m = this.multiplier;
    const lo = COMBO_STEPS[m - 1];
    const hi = COMBO_STEPS[m];
    const progress = hi ? (this.combo - lo) / (hi - lo) : 1;
    this.bus.emit(Events.COMBO_CHANGED, { combo: this.combo, multiplier: m, progress, levelUp: m > prevMult });
  }

  #loseLife(label) {
    this.lives--;
    this.hurtFlash = 1;
    this.#floatText(label, this.player.x, this.player.y - 70, '#ff6b6b', 26);
    this.bus.emit(Events.LIFE_LOST, { lives: this.lives });
    this.bus.emit(Events.LIVES_CHANGED, { lives: this.lives, max: this.heartSlots });
  }

  #addLife() {
    this.lives = Math.min(this.maxLives, this.lives + 1);
    this.bus.emit(Events.LIVES_CHANGED, { lives: this.lives, max: this.heartSlots });
  }

  #gameOver() {
    this.state = 'over';
    cancelAnimationFrame(this.raf);
    this.#render();
    this.bus.emit(Events.GAME_OVER, {
      catchPoints: this.catchPoints,
      bestCombo: this.bestCombo,
      caught: { ...this.caught },
      seconds: Math.round(this.elapsed),
    });
  }

  #floatText(text, x, y, color, size = 20) {
    this.particles.push({ kind: 'text', text, x, y, vy: -70, life: 0.9, max: 0.9, color, size });
  }

  #burst(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      this.particles.push({ kind: 'dot', x, y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140 - 40, gravity: 300, life: 0.45, max: 0.45, color });
    }
  }

  #draw(sprite, x, y, rot = 0, scale = 1) {
    const s = sprite.size * scale;
    const { ctx } = this;
    if (rot) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(sprite.canvas, -s / 2, -s / 2, s, s);
      ctx.restore();
    } else {
      ctx.drawImage(sprite.canvas, x - s / 2, y - s / 2, s, s);
    }
  }

  #render() {
    const { ctx, w, h, player: p } = this;
    ctx.clearRect(0, 0, w, h);

    for (const it of this.items) this.#draw(this.sprites[it.type], it.x, it.y, it.rot);

    const t = performance.now() / 1000;

    const scale = p.w / 92;
    this.#draw(this.sprites.mascot, p.x, p.y - 34 * scale, Math.sin(t * 3) * 0.06, scale);
    this.#draw(this.sprites.basket, p.x, p.y, 0, scale * 1.1);

    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      if (pt.kind === 'text') {
        ctx.font = `700 ${pt.size}px Fredoka, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,.45)';
        ctx.strokeText(pt.text, pt.x, pt.y);
        ctx.fillStyle = pt.color;
        ctx.fillText(pt.text, pt.x, pt.y);
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (this.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255, 60, 60, ${this.hurtFlash * 0.25})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
