export type TimerCue = 'half' | 'warn' | 'tick' | 'end';

export interface Mark {
  /** Fires when the time left reaches this. */
  leftMs: number;
  cue: TimerCue;
}

/**
 * Cues as a countdown runs down, each with its own tone so the host hears how much
 * is left: halfway, a warning at 10 s (5 s on timers under 50 s), 2 s, 1 s, the end.
 */
export function timerMarks(totalMs: number): Mark[] {
  const warn = totalMs >= 50_000 ? 10_000 : 5_000;
  const marks: Mark[] = [
    { leftMs: totalMs / 2, cue: 'half' },
    { leftMs: warn, cue: 'warn' },
    { leftMs: 2_000, cue: 'tick' },
    { leftMs: 1_000, cue: 'tick' },
    { leftMs: 0, cue: 'end' },
  ];
  // Halfway only counts when it comes before the warning.
  return marks.filter((m) => m.leftMs < totalMs && (m.cue !== 'half' || m.leftMs > warn));
}
