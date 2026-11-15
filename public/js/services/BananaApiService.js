// Game-side gateway to the server. The Banana API is reached only through our PHP
// proxy (api/puzzle.php), so the puzzle solution never travels to the browser.
import { api } from '../core/ApiClient.js';

function preloadImage(src, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error('Puzzle image timed out')), timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('Puzzle image failed to load')); };
    img.alt = 'Banana maths puzzle: work out the missing digit';
    img.src = src;
  });
}

export class BananaApiService {
  startGame(difficulty) {
    return api('game_start.php', { method: 'POST', body: { difficulty } });
  }

  async fetchPuzzle() {
    const data = await api('puzzle.php', { method: 'POST', body: {} });
    try {
      const image = await preloadImage(data.image);
      return { id: data.puzzle_id, seconds: data.seconds, image, hint: data.answer_hint };
    } catch (err) {
      await api('answer.php', { method: 'POST', body: { puzzle_id: data.puzzle_id, abandon: true } }).catch(() => {});
      throw err;
    }
  }

  submitAnswer(puzzleId, answer) {
    return api('answer.php', { method: 'POST', body: { puzzle_id: puzzleId, answer } });
  }

  endGame(payload) {
    return api('game_end.php', { method: 'POST', body: payload, timeout: 15000 });
  }
}
