// Rule constants. IDs in comments refer to docs/rules.md.

export type Role = 'citizen' | 'sheriff' | 'mafia' | 'don';
export type Team = 'red' | 'black';

export const PLAYER_COUNTS = [9, 10] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];

export function teamOf(role: Role): Team {
  return role === 'mafia' || role === 'don' ? 'black' : 'red';
}

// S-1, S-2
const ROLE_COUNTS: Record<PlayerCount, Record<Role, number>> = {
  10: { citizen: 6, sheriff: 1, mafia: 2, don: 1 },
  9: { citizen: 5, sheriff: 1, mafia: 2, don: 1 },
};

export function roleDeck(count: PlayerCount): Role[] {
  const counts = ROLE_COUNTS[count];
  return (Object.keys(counts) as Role[]).flatMap((role) => Array(counts[role]).fill(role));
}

// §11: with 9 players, Night 1 has no shooting.
export function hasShooting(count: PlayerCount, night: number): boolean {
  return night >= (count === 9 ? 2 : 1);
}

// §10. Seconds. Night timers are configurable (decision Q4).
export const DEFAULT_TIMINGS = {
  night0Mafia: 60,
  night0FreeSitting: 30,
  speech: 60,
  shortSpeech: 30, // F-4b: 3-foul player at 3–4 players
  tieSpeech: 30,
  lastWords: 60,
  donCheck: 10,
  sheriffCheck: 10,
  bestMove: 20,
} as const;

export type Timings = { [K in keyof typeof DEFAULT_TIMINGS]: number };

// F-3, F-5
export const FOULS_TO_SILENCE = 3;
export const FOULS_TO_REMOVE = 4;
