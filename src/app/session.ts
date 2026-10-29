import { replay } from '../engine/game';
import { DEFAULT_TIMINGS, PLAYER_COUNTS, ROLES } from '../engine/rules';
import type { Game, GameEvent, Setup } from '../engine/types';

export const SCHEMA_VERSION = 1;
export const GAME_KEY = 'game:v1';

export interface Saved {
  schemaVersion: number;
  setup: Setup;
  events: GameEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSetup(value: unknown): value is Setup {
  if (!isRecord(value) || !isRecord(value.timings)) return false;
  const { playerCount, deck, timings } = value;
  return (
    PLAYER_COUNTS.some((n) => n === playerCount) &&
    Array.isArray(deck) &&
    deck.length === playerCount &&
    deck.every((role) => ROLES.includes(role)) &&
    Object.keys(DEFAULT_TIMINGS).every((k) => typeof timings[k] === 'number')
  );
}

/** Replays a saved game; anything unreadable or no longer valid is dropped. */
export function restore(saved: unknown): { setup: Setup; events: GameEvent[]; game: Game } | null {
  if (!isRecord(saved) || saved.schemaVersion !== SCHEMA_VERSION) return null;
  const { setup, events } = saved;
  if (!isSetup(setup) || !Array.isArray(events)) return null;
  // Games saved before physical cards were an option were dealt on screen.
  const dealt: Setup = { ...setup, dealing: setup.dealing === 'cards' ? 'cards' : 'app' };
  try {
    return { setup: dealt, events, game: replay(dealt, events) };
  } catch {
    return null;
  }
}
