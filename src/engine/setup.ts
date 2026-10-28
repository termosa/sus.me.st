import { type PlayerCount, type Role, roleDeck, type Timings } from './rules';
import type { Setup } from './types';

/** A fresh game setup with the roles shuffled onto the cards. */
export function createSetup(
  playerCount: PlayerCount,
  timings: Timings,
  random: () => number = Math.random,
): Setup {
  const pile = roleDeck(playerCount);
  const deck: Role[] = [];
  while (pile.length > 0) deck.push(...pile.splice(Math.floor(random() * pile.length), 1));
  return { playerCount, deck, timings: { ...timings } };
}
