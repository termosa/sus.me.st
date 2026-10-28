import type { PlayerCount, Role, Team, Timings } from './rules';

export interface Setup {
  playerCount: PlayerCount;
  /** `deck[i]` is the role on card number `i + 1`. */
  deck: Role[];
  timings: Timings;
}

export type Departure = 'killed' | 'voted' | 'removed';

export interface Player {
  seat: number;
  role: Role;
  /** Why the player left the game; null while in the game. */
  out: Departure | null;
  fouls: number;
  /** The day whose discussion speech the player loses (F-3); null when none. */
  silentOn: number | null;
}

export type Night0Stage = 'mafia' | 'sheriff' | 'free';
export type NightStage = 'shoot' | 'don' | 'sheriff' | 'bestMove';

export type Step =
  /** Seat `taken.length + 1` picks a card. */
  | { kind: 'deal' }
  | { kind: 'night0'; stage: Night0Stage }
  /** Announce the night's kill or miss. */
  | { kind: 'morning' }
  /** `queue[0]` is speaking; `after` is where the game goes after the last one. */
  | { kind: 'lastWords'; queue: number[]; after: 'speech' | 'night' }
  /** `queue` holds the speakers still to come after `seat`. */
  | { kind: 'speech'; seat: number; queue: number[] }
  | { kind: 'tieSpeech'; candidates: number[]; index: number }
  | { kind: 'vote'; candidates: number[]; revote: boolean }
  | { kind: 'raise'; candidates: number[] }
  | { kind: 'night'; stage: NightStage }
  | { kind: 'over' };

export interface Nomination {
  seat: number;
  by: number;
}

export interface NightRecord {
  night: number;
  /** Killed seat, or null for a miss; undefined when the night had no shooting. */
  kill?: number | null;
  don?: number;
  sheriff?: number;
  /** Seats removed during the shooting, who can still be killed (F-9). */
  removed?: number[];
}

export type VoteRecord =
  | { day: number; kind: 'vote'; candidates: number[]; counts: number[] }
  | { day: number; kind: 'raise'; candidates: number[]; yes: number };

export interface Outcome {
  winner: Team | 'draw';
  teamLoss: boolean;
}

export interface Game {
  setup: Setup;
  /** Card indexes in pick order: `taken[k]` belongs to seat `k + 1`. */
  taken: number[];
  /** Empty until every seat has picked a card; then `players[seat - 1]`. */
  players: Player[];
  day: number;
  night: number;
  step: Step;
  /** The seat that actually opened the current day's discussion (D-3). */
  opener: number | null;
  /** Today's nominations, in the order they were accepted (D-8). */
  nominations: Nomination[];
  /** One entry per removal (F-7): the day whose vote it cancels, and the removed seat. */
  cancelled: { day: number; seat: number }[];
  /** Whether the current day's vote result is fixed (§4.3). */
  resultFixed: boolean;
  /** Shooting nights in a row with a miss and no departures (W-4). */
  misses: number;
  nights: NightRecord[];
  votes: VoteRecord[];
  bestMove: { seat: number; picks: number[] } | null;
  /** A win fixed by a vote or kill, applied after last words (W-3, L-4). */
  pending: Team | null;
  outcome: Outcome | null;
}

export type GameEvent =
  | { type: 'pick'; card: number }
  /** Finish the current timed step. */
  | { type: 'next' }
  | { type: 'nominate'; seat: number }
  /** Votes per candidate, in candidate order; must add up to the players in the game. */
  | { type: 'vote'; counts: number[] }
  | { type: 'raise'; yes: number }
  /** The seat the black team killed, or null for a miss. */
  | { type: 'shoot'; seat: number | null }
  /** The seat the Don or the Sheriff checks, depending on the night stage. */
  | { type: 'check'; seat: number }
  | { type: 'bestMove'; seats: number[] }
  | { type: 'foul'; seat: number }
  | { type: 'remove'; seat: number }
  | { type: 'teamLoss'; team: Team };
