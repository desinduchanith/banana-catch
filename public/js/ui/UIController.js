import { Events } from '../core/EventBus.js';
import { Sound } from './Sound.js';
import { esc, icon, paintIcons } from './Layout.js';

const $ = (sel) => document.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class UIController {
  constructor(bus) {
    this.bus = bus;
    this.puzzlePoints = 0;
    this.catchPoints = 0;
    this.el = {
      stage: $('#stage'),
      score: $('#score'),
      lives: $('#lives'),
      comboFill: $('#comboFill'),
      comboMult: $('#comboMult'),
      comboCount: $('#comboCount'),
      overlay: $('#overlay'),
      panel: $('#overlayPanel'),
      soundBtn: $('#soundBtn'),
      musicBtn: $('#musicBtn'),
    };
    this.#subscribe();
    this.#syncSoundButtons();
    this.el.soundBtn.addEventListener('click', () => { Sound.toggle(); this.#syncSoundButtons(); });
    this.el.musicBtn.addEventListener('click', () => { Sound.toggleMusic(); this.#syncSoundButtons(); });
  }

  #syncSoundButtons() {
    const { soundBtn, musicBtn } = this.el;
    soundBtn.innerHTML = icon(Sound.muted ? 'volume-x' : 'volume-2');
    soundBtn.setAttribute('aria-label', Sound.muted ? 'Turn sound effects on' : 'Turn sound effects off');
    musicBtn.innerHTML = icon('music');
    musicBtn.style.opacity = Sound.musicMuted || Sound.muted ? 0.4 : 1;
    musicBtn.setAttribute('aria-label', Sound.musicMuted ? 'Turn music on' : 'Turn music off');
    paintIcons();
  }

  #subscribe() {
    const { bus } = this;
    bus.on(Events.SCORE_CHANGED, ({ catchPoints }) => { this.catchPoints = catchPoints; this.#renderScore(); });

    bus.on(Events.LIVES_CHANGED, ({ lives, max }) => {
      this.el.lives.innerHTML = Array.from({ length: Math.max(max, lives) }, (_, i) =>
        `<span class="${i < lives ? '' : 'lost'}" aria-hidden="true">❤️</span>`).join('');
      this.el.lives.setAttribute('aria-label', `${lives} lives left`);
    });

    bus.on(Events.COMBO_CHANGED, ({ combo, multiplier, progress, levelUp }) => {
      this.el.comboFill.style.width = `${Math.round(progress * 100)}%`;
      this.el.comboMult.textContent = `x${multiplier}`;
      this.el.comboCount.textContent = combo;
      if (levelUp) {
        Sound.levelUp();
        this.el.comboMult.classList.remove('bump');
        void this.el.comboMult.offsetWidth;
        this.el.comboMult.classList.add('bump');
      }
    });

    bus.on(Events.ITEM_CAUGHT, ({ combo }) => Sound.catch(combo));

    bus.on(Events.LIFE_LOST, () => {
      Sound.rotten();
      const { stage } = this.el;
      stage.classList.remove('shake');
      void stage.offsetWidth;
      stage.classList.add('shake');
    });

  }

  #renderScore() {
    this.el.score.textContent = (this.catchPoints + this.puzzlePoints).toLocaleString();
  }

  reset() {
    this.catchPoints = 0;
    this.setPuzzlePoints(0);
  }

  setPuzzlePoints(points) {
    this.puzzlePoints = points;
    this.#renderScore();
  }

  #open(html, label) {
    this.el.panel.innerHTML = html;
    this.el.overlay.setAttribute('aria-label', label);
    this.el.overlay.hidden = false;
  }

  close() {
    this.el.overlay.hidden = true;
    this.el.panel.innerHTML = '';
  }

  showMessage(title, text) {
    this.#open(`<div class="card panel"><h2>${title}</h2><p>${text}</p></div>`, title);
  }

  async countdown() {
    for (const n of ['3', '2', '1', 'GO!']) {
      Sound.countdown(n === 'GO!');
      this.el.overlay.hidden = false;
      this.el.panel.innerHTML = `<div class="countdown" aria-live="assertive">${n}</div>`;
      await wait(n === 'GO!' ? 500 : 700);
    }
    this.close();
  }

  showPause({ onResume, onQuit }) {
    this.#open(`
      <div class="card panel">
        <h2>Paused</h2>
        <p style="color:var(--muted)">Press <kbd>P</kbd> or <kbd>Esc</kbd> to keep playing.</p>
        <div class="go-actions">
          <button class="btn btn-primary" id="resumeBtn" type="button">Resume</button>
          <button class="btn btn-ghost" id="quitBtn" type="button">End game &amp; save</button>
        </div>
      </div>`, 'Game paused');
    $('#resumeBtn').focus();
    $('#resumeBtn').addEventListener('click', onResume);
    $('#quitBtn').addEventListener('click', onQuit);
  }

  showPuzzleLoading() {
    Sound.box();
    Sound.duckMusic(true);
    this.#open(`
      <div class="card panel" role="dialog" aria-modal="true" aria-labelledby="pzTitle">
        <div class="puzzle-head"><h2 id="pzTitle">Mystery Box!</h2></div>
        <div class="puzzle-img"><span class="loading">Opening the box…</span></div>
      </div>`, 'Mystery Box puzzle');
  }

  askPuzzle({ image, seconds, hint }) {
    this.#open(`
      <div class="card panel" role="dialog" aria-modal="true" aria-labelledby="pzTitle">
        <div class="puzzle-head">
          <h2 id="pzTitle">Mystery puzzle</h2>
          <div class="timer" id="pzTimer" role="timer" aria-label="Seconds left"><span id="pzSecs">${seconds}</span></div>
        </div>
        <div class="puzzle-img" id="pzImg"></div>
        <div class="feedback" id="pzFeedback" role="status" aria-live="polite"></div>
        <div class="keypad" id="keypad" aria-label="Choose the missing digit">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `<button type="button" data-d="${d}">${d}</button>`).join('')}
        </div>
        <div class="puzzle-foot"><span>${hint === undefined ? 'Tip: press a number key' : `Demo mode — answer: <b>${hint}</b>`}</span><button class="btn btn-ghost btn-sm" id="skipBtn" type="button">Skip (−1 life)</button></div>
      </div>`, 'Mystery Box puzzle');
    $('#pzImg').append(image);

    this.skipped = false;
    return new Promise((resolve) => {
      const started = performance.now();
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        clearInterval(timer);
        window.removeEventListener('keydown', onKey);
        $('#keypad').querySelectorAll('button').forEach((b) => (b.disabled = true));
        $('#skipBtn').disabled = true;
        if (value !== null) $(`#keypad [data-d="${value}"]`)?.classList.add('picked');
        resolve(value);
      };
      const onKey = (e) => {
        if (/^[0-9]$/.test(e.key)) { e.preventDefault(); Sound.click(); finish(Number(e.key)); }
      };
      window.addEventListener('keydown', onKey);
      $('#keypad').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-d]');
        if (b) { Sound.click(); finish(Number(b.dataset.d)); }
      });
      $('#skipBtn').addEventListener('click', () => { this.skipped = true; finish(null); });
      $('#keypad button').focus();

      let lastWhole = seconds;
      const timer = setInterval(() => {
        const left = Math.max(0, seconds - (performance.now() - started) / 1000);
        const whole = Math.ceil(left);
        const t = $('#pzTimer');
        if (!t) return finish(null);
        t.style.setProperty('--t', (left / seconds).toFixed(3));
        $('#pzSecs').textContent = whole;
        t.classList.toggle('low', left <= 5);
        if (whole !== lastWhole && whole <= 5 && whole > 0) Sound.tick();
        lastWhole = whole;
        if (left <= 0) finish(null);
      }, 100);
    });
  }

  async showPuzzleResult(res, answer) {
    const fb = $('#pzFeedback');
    if (res.correct) {
      Sound.correct();
      $(`#keypad [data-d="${answer}"]`)?.classList.add('right');
      fb.className = 'feedback ok';
      fb.textContent = `Correct! +${res.bonus} points`;
      fb.insertAdjacentHTML('afterend', `<div class="reward"><span class="big">❤️</span>Extra life!</div>`);
    } else {
      Sound.wrong();
      if (answer !== null) $(`#keypad [data-d="${answer}"]`)?.classList.add('wrong');
      fb.className = 'feedback bad';
      fb.textContent = res.error ? res.error
        : this.skipped ? 'Skipped. You lose a life.'
        : res.timed_out || answer === null ? 'Out of time! You lose a life.'
        : 'Wrong answer. You lose a life.';
    }
    await wait(res.correct ? 1600 : 1900);
    Sound.duckMusic(false);
    this.close();
  }

  showSaving() {
    this.#open('<div class="card panel"><h2>Game over</h2><p>Saving your score…</p></div>', 'Game over');
  }

  showGameOver(s, { onAgain }) {
    this.#open(`
      <div class="card panel" role="dialog" aria-modal="true" aria-labelledby="goTitle">
        <h2 id="goTitle">Game over</h2>
        ${s.is_new_best ? '<span class="new-best">New personal best!</span>' : ''}
        <div class="go-score">${s.score.toLocaleString()}</div>
        <p style="color:var(--muted);margin:0">Rank <b style="color:var(--text)">#${s.rank}</b> on this level · best ${s.personal_best.toLocaleString()}</p>
        <div class="go-grid">
          <div><b>${s.catch_points.toLocaleString()}</b><small>Catch pts</small></div>
          <div><b>${s.puzzle_points.toLocaleString()}</b><small>Puzzle pts</small></div>
          <div><b>${s.best_combo}</b><small>Best combo</small></div>
        </div>
        ${s.adjusted ? '<p class="form-error">Whoa, that score looked a bit too bananas — it was adjusted to the max possible for this run.</p>' : ''}
        <div class="go-actions">
          <button class="btn btn-primary" id="againBtn" type="button">Play again</button>
          <a class="btn btn-ghost" href="play.html">Change level</a>
          <a class="btn btn-ghost" href="leaderboard.html">Leaderboard</a>
        </div>
      </div>`, 'Game over');
    paintIcons();
    $('#againBtn').focus();
    $('#againBtn').addEventListener('click', onAgain);
  }

  showSaveError(message, { onRetry }) {
    this.#open(`
      <div class="card panel">
        <h2>Couldn't save</h2>
        <p class="form-error">${esc(message)}</p>
        <div class="go-actions">
          <button class="btn btn-primary" id="retryBtn" type="button">Try again</button>
          <a class="btn btn-ghost" href="play.html">Back to levels</a>
        </div>
      </div>`, 'Save failed');
    $('#retryBtn').addEventListener('click', onRetry);
  }
}
