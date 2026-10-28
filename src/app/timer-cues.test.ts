import { describe, expect, it } from 'vitest';
import { timerMarks } from './timer-cues';

describe('timerMarks', () => {
  it('marks a 60 s speech at halfway, 10 s, 2 s, 1 s and the end', () => {
    expect(timerMarks(60_000)).toEqual([
      { leftMs: 30_000, cue: 'half' },
      { leftMs: 10_000, cue: 'warn' },
      { leftMs: 2_000, cue: 'tick' },
      { leftMs: 1_000, cue: 'tick' },
      { leftMs: 0, cue: 'end' },
    ]);
  });

  it('warns at 10 s from 50 s up', () => {
    expect(timerMarks(50_000).map((m) => m.leftMs)).toEqual([25_000, 10_000, 2_000, 1_000, 0]);
  });

  it('warns at 5 s on shorter timers', () => {
    expect(timerMarks(30_000).map((m) => m.leftMs)).toEqual([15_000, 5_000, 2_000, 1_000, 0]);
  });

  it('skips halfway when it would land on or after the warning', () => {
    expect(timerMarks(10_000)).toEqual([
      { leftMs: 5_000, cue: 'warn' },
      { leftMs: 2_000, cue: 'tick' },
      { leftMs: 1_000, cue: 'tick' },
      { leftMs: 0, cue: 'end' },
    ]);
  });

  it('skips marks at or past the start of a very short timer', () => {
    expect(timerMarks(5_000).map((m) => m.cue)).toEqual(['tick', 'tick', 'end']);
  });
});
