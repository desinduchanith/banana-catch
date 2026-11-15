# 🍌 Banana Catch & Quiz

A browser arcade game: move a basket to catch falling bananas, build combos, and catch
**Mystery Boxes** that pause the action for a live puzzle from the University of
Bedfordshire **Banana API**. Solving a puzzle earns bonus points and a extra life.
Scores belong to an authenticated player profile.

Built with HTML/CSS/JavaScript (ES modules, Canvas), PHP 8 and MySQL on WAMP.

---

## Gameplay

| Item | Effect |
|---|---|
| 🍌 Banana | +10 × combo multiplier |
| 🟤 Rotten banana | −1 life, combo resets |
| ❓ Mystery Box | Game pauses → Banana API puzzle. Correct: bonus + extra life. Wrong / timeout: −1 life |

**Combo:** 10 catches in a row → x2, 25 → x3, 50 → x4. Missing a good banana resets it.

**Levels** (the Banana API has no difficulty setting, so difficulty is our own rules in `api/lib/rules.php`):

| | Easy | Medium | Hard |
|---|---|---|---|
| Lives | 5 | 4 | 3 |
| Fall speed | slow | medium | fast |
| Rotten bananas | 14% | 22% | 30% |
| Puzzle timer | 30 s | 20 s | 12 s |
| Puzzle bonus | +100 | +150 | +250 |

**Controls:** ← → / A D, mouse, or touch-drag · P / Esc to pause · number keys answer puzzles.
**Sound:** synthesised effects and a looping background track (Web Audio API, no audio files); separate toggles for effects 🔊 and music 🎵.

---

## Setup (WAMP / XAMPP)

1. Put the project in `C:\wamp64\www\banana-catch` and start WAMP.
2. Create the database:
   ```
   mysql -uroot < sql/schema.sql
   ```
3. Copy `.env.example` to `.env` and set your DB credentials (`DB_HOST`, `DB_USER`, `DB_PASS`, …).
   If PHP shows *"SSL certificate problem"* when fetching puzzles, set `CA_BUNDLE` to a CA file
   (e.g. Git's `C:/Program Files/Git/mingw64/etc/ssl/certs/ca-bundle.crt` or https://curl.se/ca/cacert.pem).
4. Open http://localhost/banana-catch/ (requires PHP 8.1+).

Add `&debug` to a game URL (e.g. `game.html?difficulty=easy&debug`) and run `bcq.spawnBox()` in
the console to drop a Mystery Box on cue — handy for demo videos.

---

## Design (Figma)

The full UI design lives in Figma (file **"Banana Catch & Quiz — UI design"**): a design system page
(colour + text styles, 19 components, game sprites), 15 desktop screens with a clickable prototype,
and 9 mobile screens.

---

## Architecture

```
Browser (HTML/CSS/JS)                PHP endpoints (api/)                 External / DB
───────────────────────              ────────────────────                 ─────────────
GameEngine.js  ─┐                    auth/register|login|logout|me.php ── MySQL: users,
UIController.js ├─ EventBus ─┐       game_start.php                         login_attempts
AuthManager.js ─┘            │       puzzle.php ──── BananaApi.php ─────── Banana API (JSON)
BananaApiService.js ─── ApiClient.js ─ answer.php                           (image + solution)
                             (fetch + CSRF)   game_end.php ──────────── MySQL: games,
                                              leaderboard.php, profile.php
```

```
public/                     api/
  index.html  (login)         lib/bootstrap.php   session, CSRF, JSON, PDO
  register.html               lib/rules.php       difficulty, points, score cap
  play.html   (levels)
  game.html                   lib/BananaApi.php   Banana API client (retry, validation)
  leaderboard.html            auth/*.php          identity endpoints
  profile.html                game_start.php · puzzle.php · answer.php · game_end.php
  js/core/      EventBus, ApiClient
  js/services/  AuthManager, BananaApiService
  js/game/      GameEngine, Sprites
  js/ui/        UIController, Layout, Sound
  js/pages/     one entry script per page
```

---

## How it covers the four themes

### 1. Interoperability
- `puzzle.php` calls the Banana API **server-side** with cURL (timeouts, one retry with back-off),
  validates the JSON shape, checks the solution is an integer and the image host is on an allow-list.
- The **solution is stored in the PHP session**; the browser receives only `{puzzle_id, image, seconds}`.
  Open DevTools → Network: the answer is never visible until the puzzle is closed.
- **Graceful failure:** if the API is down the Mystery Box is "empty", a toast explains why, and the
  game resumes with no penalty. If the image fails to load, the client abandons the puzzle without penalty.
- The client waits for the image to finish downloading before starting the countdown, so slow
  networks do not eat into the player's time; the server adds a grace period to its deadline.

### 2. Event-driven programming
- Input: `keydown` / `keyup`, `pointermove` / `pointerdown`, `visibilitychange` (auto-pause), `resize`.
- Game loop: `requestAnimationFrame` with a clamped delta time.
- A custom **EventBus** (built on `EventTarget` + `CustomEvent`) decouples modules:
  `puzzle:triggered`, `puzzle:resolved`, `item:caught`, `combo:changed`, `life:lost`,
  `powerup:started/ended`, `game:over` … The engine never touches the DOM; the UI never touches game state.
- On the server, each PHP endpoint is a request-driven handler.

### 3. Virtual identity
- Passwords hashed with `password_hash()` (bcrypt), checked with `password_verify()`, auto-rehash.
- PHP session in an **HttpOnly, SameSite=Lax** cookie; `session_regenerate_id()` on login (anti-fixation).
- **CSRF token** required in an `X-CSRF-Token` header on every state-changing request.
- Login throttling (5 failures / 15 min per email) and generic error messages.
- All SQL via PDO prepared statements; all user text escaped before rendering (XSS).
- Profile: player name, stats and game history.
- Secrets in `.env` (never committed); root `.htaccess` blocks `.env`, `.git/`, SQL and docs from the web.
- *Report discussion:* sessions vs JWT — sessions chosen because the server must hold per-game secrets
  (the puzzle solution) anyway, they can be revoked instantly on logout, and HttpOnly cookies keep the
  credential away from JavaScript. JWT suits stateless APIs/mobile clients but needs refresh/revocation logic.

### 4. Version control
See **Git workflow** below.

---

## Anti-cheat design (critical evaluation)

| Value | Who decides | Why |
|---|---|---|
| Puzzle correctness, bonus, extra life | Server only | Solution never leaves the server; one answer per puzzle ID; deadline enforced |
| Puzzle count / accuracy | Server only | Counted in the session per game |
| Catch points | Client, **clamped by server** | Real-time catching happens in the browser. The server computes the maximum physically possible score from the game's server-timed duration (minus puzzle time), spawn rate and best multipliers. Higher claims are capped and the game is flagged. |

**Limitation (honest):** a determined cheater can still submit a score just under the cap. A full fix
would need server-side simulation or replay validation — a good "future work" point.

---

## Git workflow

```
git add .
git commit -m "chore: project structure, schema and config template"

git switch -c feature/auth          # auth endpoints + login/register pages
git switch -c feature/banana-api    # BananaApi.php, puzzle/answer endpoints
git switch -c feature/game-engine   # GameEngine, EventBus, UIController
git switch -c feature/powerups      # power-ups, combo, badges, sound
# merge each into main after review, then tag releases:
git tag -a v0.1.0 -m "Playable prototype"
git tag -a v1.0.0 -m "Submission build"
git log --oneline --graph --all
```

Never commit `.env` (it is in `.gitignore`); commit `.env.example` instead.

---

## References
- Banana API documentation: https://marcconrad.com/uob/banana/doc.php
- PHP password hashing: https://www.php.net/manual/en/function.password-hash.php
- MDN: EventTarget, CustomEvent, requestAnimationFrame, Web Audio API
