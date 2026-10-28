import { describe, expect, it } from 'vitest';
import { hasShooting, roleDeck, teamOf } from './rules';

describe('roleDeck', () => {
  it('deals 7 red and 3 black for 10 players', () => {
    const deck = roleDeck(10);
    expect(deck).toHaveLength(10);
    expect(deck.filter((r) => teamOf(r) === 'black')).toHaveLength(3);
    expect(deck.filter((r) => r === 'sheriff')).toHaveLength(1);
    expect(deck.filter((r) => r === 'don')).toHaveLength(1);
  });

  it('deals 6 red and 3 black for 9 players', () => {
    const deck = roleDeck(9);
    expect(deck).toHaveLength(9);
    expect(deck.filter((r) => teamOf(r) === 'black')).toHaveLength(3);
    expect(deck.filter((r) => r === 'citizen')).toHaveLength(5);
  });
});

describe('hasShooting', () => {
  it('never shoots on Night 0', () => {
    expect(hasShooting(10, 0)).toBe(false);
    expect(hasShooting(9, 0)).toBe(false);
  });

  it('starts shooting on Night 1 with 10 players and Night 2 with 9', () => {
    expect(hasShooting(10, 1)).toBe(true);
    expect(hasShooting(9, 1)).toBe(false);
    expect(hasShooting(9, 2)).toBe(true);
  });
});
