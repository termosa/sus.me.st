/** A countdown kept as timestamps, so it stays right in the background and across reloads. */
export interface Timer {
  /** The game step this timer belongs to. */
  key: string;
  totalMs: number;
  /** When it reaches zero while running; null while idle or paused. */
  endsAt: number | null;
  /** Time left while idle or paused. */
  leftMs: number;
}

export function newTimer(key: string, totalMs: number): Timer {
  return { key, totalMs, endsAt: null, leftMs: totalMs };
}

export function remaining(timer: Timer, now: number): number {
  return timer.endsAt === null ? timer.leftMs : Math.max(0, timer.endsAt - now);
}

export function startTimer(timer: Timer, now: number): Timer {
  return timer.endsAt === null ? { ...timer, endsAt: now + timer.leftMs } : timer;
}

export function pauseTimer(timer: Timer, now: number): Timer {
  return timer.endsAt === null ? timer : { ...timer, endsAt: null, leftMs: remaining(timer, now) };
}
