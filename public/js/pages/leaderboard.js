import { AuthManager } from '../services/AuthManager.js';
import { api } from '../core/ApiClient.js';
import { renderTopbar, initial, esc, icon, paintIcons } from '../ui/Layout.js';

await AuthManager.requireUser();
renderTopbar('leaderboard');

const board = document.querySelector('#board');
const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];

async function show(level) {
  tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.level === level)));
  board.innerHTML = '<p class="empty">Loading…</p>';
  try {
    const data = await api(`leaderboard.php?difficulty=${level}`);
    render(data, level);
  } catch (err) {
    board.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
  }
}

function render({ players, me }, level) {
  if (!players.length) {
    board.innerHTML = `<div class="card empty">No scores on ${level} yet. <a href="game.html?difficulty=${level}">Be the first!</a></div>`;
    return;
  }
  const medals = ['gold', 'silver', 'bronze'];
  const top = players.slice(0, 3);
  const order = [top[1], top[0], top[2]];
  const podium = order.map((p) => p ? `
    <div class="spot ${p.rank === 1 ? 'first' : ''}">
      ${p.rank === 1 ? `<span class="crown">${icon('crown')}</span>` : ''}
      <div class="medal ${medals[p.rank - 1]}">${p.rank}</div>
      ${initial(p.name, 'lg')}
      <div class="who">${esc(p.name)}${p.is_me ? ' (you)' : ''}</div>
      <div class="pts">${p.best.toLocaleString()}</div>
    </div>` : '<div></div>').join('');

  const rest = players.slice(3).map((p) => `
    <li class="${p.is_me ? 'me' : ''}">
      <span class="rank">#${p.rank}</span>
      ${initial(p.name)}
      <span class="who">${esc(p.name)}${p.is_me ? ' (you)' : ''}<small>${p.games} game${p.games === 1 ? '' : 's'}</small></span>
      <span class="pts">${p.best.toLocaleString()}</span>
    </li>`).join('');

  const mine = me
    ? `<div class="my-rank"><span>Your rank on ${level}: <b>#${me.rank}</b></span><span>Best: <b>${me.best.toLocaleString()}</b></span></div>`
    : `<div class="my-rank"><span>You haven't played ${level} yet.</span><a href="game.html?difficulty=${level}">Play now →</a></div>`;

  board.innerHTML = `<div class="podium">${podium}</div>${rest ? `<ol class="board">${rest}</ol>` : ''}${mine}`;
  paintIcons();
}

tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.level)));
show('easy');
