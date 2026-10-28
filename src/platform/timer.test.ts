import { describe, expect, it } from 'vitest';
import { newTimer, pauseTimer, remaining, startTimer } from './timer';

describe('timer', () => {
  it('starts full and idle', () => {
    const t = newTimer('a', 60_000);
    expect(t.endsAt).toBeNull();
    expect(remaining(t, 5_000)).toBe(60_000);
  });

  it('counts down from timestamps while running and stops at zero', () => {
    const t = startTimer(newTimer('a', 60_000), 1_000);
    expect(remaining(t, 21_000)).toBe(40_000);
    expect(remaining(t, 99_000)).toBe(0);
  });

  it('keeps the remaining time across a pause and resumes from it', () => {
    let t = startTimer(newTimer('a', 60_000), 0);
    t = pauseTimer(t, 15_000);
    expect(remaining(t, 50_000)).toBe(45_000);
    t = startTimer(t, 50_000);
    expect(remaining(t, 60_000)).toBe(35_000);
  });
});
