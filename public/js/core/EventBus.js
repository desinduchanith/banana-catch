
export const Events = Object.freeze({
  GAME_STARTED: 'game:started',
  GAME_PAUSED: 'game:paused',
  GAME_RESUMED: 'game:resumed',
  GAME_OVER: 'game:over',
  ITEM_CAUGHT: 'item:caught',
  BANANA_MISSED: 'item:missed',
  SCORE_CHANGED: 'score:changed',
  COMBO_CHANGED: 'combo:changed',
  LIFE_LOST: 'life:lost',
  LIVES_CHANGED: 'lives:changed',
  PUZZLE_TRIGGERED: 'puzzle:triggered',
  PUZZLE_RESOLVED: 'puzzle:resolved',
});

export class EventBus extends EventTarget {
  on(type, handler) {
    const listener = (e) => handler(e.detail);
    this.addEventListener(type, listener);
    return () => this.removeEventListener(type, listener);
  }

  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
