let sentinel: WakeLockSentinel | null = null;
let wanted = false;

async function acquire(): Promise<void> {
  if (!wanted || sentinel || document.visibilityState !== 'visible') return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    // Power saving, or no support (iOS before 18.4 in a home-screen app).
  }
}

/** Keeps the screen on while a game runs; the OS drops the lock when the page is hidden. */
export function keepAwake(on: boolean): void {
  if (!('wakeLock' in navigator)) return;
  wanted = on;
  if (on) void acquire();
  else void sentinel?.release();
}

document.addEventListener('visibilitychange', () => void acquire());
// iOS grants the lock only with a user gesture, so retry on taps (a no-op while held).
document.addEventListener('pointerdown', () => void acquire());
