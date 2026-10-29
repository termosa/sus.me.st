import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMINGS } from '../engine/rules';
import { createSetup } from '../engine/setup';
import { restore } from './session';

describe('restore', () => {
  const setup = createSetup(10, DEFAULT_TIMINGS);

  it('replays a saved game', () => {
    const saved = { schemaVersion: 1, setup, events: [{ type: 'pick', card: 4 }] };
    expect(restore(saved)?.game.taken).toEqual([4]);
  });

  it('keeps physical-card dealing, and treats saves from before it as dealt on screen', () => {
    const cards = createSetup(10, DEFAULT_TIMINGS, 'cards');
    expect(restore({ schemaVersion: 1, setup: cards, events: [] })?.setup.dealing).toBe('cards');
    const { dealing: _, ...old } = setup;
    expect(restore({ schemaVersion: 1, setup: old, events: [] })?.setup.dealing).toBe('app');
  });

  it('discards anything it cannot replay', () => {
    expect(restore(null)).toBeNull();
    expect(restore({ schemaVersion: 99, setup, events: [] })).toBeNull();
    expect(restore({ schemaVersion: 1, setup, events: [{ type: 'next' }] })).toBeNull();
    expect(restore({ schemaVersion: 1, setup: {}, events: [] })).toBeNull();
    expect(restore({ schemaVersion: 1, setup, events: [{ type: 'shuffle' }] })).toBeNull();
  });
});
