import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMINGS, roleDeck } from './rules';
import { createSetup } from './setup';

describe('createSetup', () => {
  it('shuffles the role deck for the player count', () => {
    const setup = createSetup(9, DEFAULT_TIMINGS, () => 0.999);
    expect(setup.playerCount).toBe(9);
    expect([...setup.deck].sort()).toEqual([...roleDeck(9)].sort());
    expect(setup.deck).not.toEqual(roleDeck(9));
  });

  it('puts the Don on every card over many shuffles', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++)
      seen.add(createSetup(10, DEFAULT_TIMINGS).deck.indexOf('don').toString());
    expect(seen.size).toBe(10);
  });
});
