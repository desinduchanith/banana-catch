// The real identity lives in the server session (HttpOnly cookie); this class only mirrors it for the UI.
import { api } from '../core/ApiClient.js';

class AuthManagerClass {
  #user = null;
  #ready = null;

  get user() {
    return this.#user;
  }

  init() {
    this.#ready ??= api('auth/me.php').then((d) => (this.#user = d.user));
    return this.#ready;
  }

  async requireUser() {
    const user = await this.init();
    if (!user) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.replace(`index.html?next=${next}`);
      return new Promise(() => {});
    }
    return user;
  }

  async login(email, password) {
    await this.init();
    const d = await api('auth/login.php', { method: 'POST', body: { email, password } });
    return (this.#user = d.user);
  }

  async register(name, email, password) {
    await this.init();
    const d = await api('auth/register.php', { method: 'POST', body: { name, email, password } });
    return (this.#user = d.user);
  }

  async logout() {
    await api('auth/logout.php', { method: 'POST' });
    this.#user = null;
    location.replace('index.html');
  }

  updateLocal(user) {
    this.#user = { ...this.#user, ...user };
  }
}

export const AuthManager = new AuthManagerClass();
