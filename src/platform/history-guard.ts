/**
 * The back gesture can't be disabled, so keep a sentinel history entry: one back
 * lands on it and the app stays. Browsers skip entries pushed without a user
 * gesture, so the entry is (re)pushed on the next tap.
 */
export function guardBackNavigation(): void {
  const push = () => history.pushState({ guard: true }, '');
  window.addEventListener('pointerdown', push, { once: true });
  window.addEventListener('popstate', () => {
    window.addEventListener('pointerdown', push, { once: true });
  });
}
