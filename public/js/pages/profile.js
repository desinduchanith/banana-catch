import { AuthManager } from '../services/AuthManager.js';
import { api } from '../core/ApiClient.js';
import { renderTopbar, initial, esc, toast, icon, paintIcons } from '../ui/Layout.js';

await AuthManager.requireUser();
renderTopbar('profile');
const root = document.querySelector('#profile');

function render({ user, stats, recent }) {
  root.innerHTML = `
    <div class="profile-grid">
      <section class="card profile-card">
        ${initial(user.name, 'xl')}
        <h2>${esc(user.name)}</h2>
        <p style="color:var(--muted);margin:0">Joined ${new Date(user.joined.replace(' ', 'T')).toLocaleDateString()}</p>
        <form id="profileForm">
          <div class="field" style="text-align:left">
            <label for="pname">Player name</label>
            <input id="pname" name="pname" value="${esc(user.name)}" maxlength="40" required>
          </div>
          <button class="btn btn-primary btn-block" type="submit">Save profile</button>
        </form>
      </section>

      <section>
        <div class="stats">
          <div class="stat"><b>${stats.games}</b><small>Games played</small></div>
          <div class="stat"><b>${stats.best.toLocaleString()}</b><small>Best score</small></div>
          <div class="stat"><b>${stats.best_combo}</b><small>Best combo</small></div>
        </div>

        <h2 class="section-title">Recent games</h2>
        ${recent.length ? `
          <div class="card table-wrap" style="padding:8px 16px">
            <table class="recent">
              <thead><tr><th>Level</th><th>Score</th><th>Combo</th><th>When</th></tr></thead>
              <tbody>${recent.map((g) => `
                <tr><td>${g.difficulty}</td><td><b>${Number(g.score).toLocaleString()}</b></td>
                <td>${g.best_combo}</td><td>${new Date(g.ended_at.replace(' ', 'T')).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<div class="card empty">No games yet. <a href="play.html">Play your first round!</a></div>'}
      </section>
    </div>`;

  paintIcons();
  root.querySelector('#profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = root.querySelector('#pname').value.trim();
    try {
      const data = await api('profile.php', { method: 'POST', body: { name } });
      AuthManager.updateLocal({ name: data.user.name });
      document.querySelector('.topbar').remove();
      renderTopbar('profile');
      render(data);
      toast('Profile saved');
    } catch (err) {
      toast(err.message, 'warn');
    }
  });
}

try {
  render(await api('profile.php'));
} catch (err) {
  root.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
}
