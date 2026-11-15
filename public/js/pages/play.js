import { AuthManager } from '../services/AuthManager.js';
import { api } from '../core/ApiClient.js';
import { renderTopbar, esc, toast, icon, paintIcons } from '../ui/Layout.js';

const user = await AuthManager.requireUser();
renderTopbar('play');
document.querySelector('#greeting').textContent = `Ready, ${user.name}? Choose a level`;

const META = {
  easy: { level: 1, blurb: 'Slow fall, generous puzzle timer.' },
  medium: { level: 2, blurb: 'Faster jungle, more rotten bananas.' },
  hard: { level: 3, blurb: 'Fast, risky and big puzzle rewards.' },
};

try {
  const rules = await api('rules.php');
  document.querySelector('#levels').innerHTML = Object.entries(rules.difficulties).map(([key, d]) => `
    <a class="card level" data-level="${key}" href="game.html?difficulty=${key}">
      <div class="level-top">
        <h2>${key[0].toUpperCase() + key.slice(1)}</h2>
        <span class="meter" aria-label="Difficulty ${META[key].level} of 3">${[1, 2, 3].map((n) => `<i class="${n <= META[key].level ? 'on' : ''}"></i>`).join('')}</span>
      </div>
      <p style="margin:0;color:var(--muted)">${META[key].blurb}</p>
      <ul>
        <li><span>Lives</span><b>${d.lives}</b></li>
        <li><span>Puzzle timer</span><b>${d.puzzleSeconds}s</b></li>
        <li><span>Puzzle bonus</span><b>+${d.puzzleBonus}</b></li>
        <li><span>Rotten bananas</span><b>${Math.round(d.rottenChance * 100)}%</b></li>
      </ul>
      <span class="btn btn-primary">Play ${esc(key)}</span>
    </a>`).join('');

  paintIcons();
} catch (err) {
  document.querySelector('#levels').innerHTML = '<p class="empty">Could not load levels.</p>';
  toast(err.message, 'warn');
}
