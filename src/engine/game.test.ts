import { describe, expect, it } from 'vitest';
import { isAllowed, newGame, RuleError, reduce, replay } from './game';
import { DEFAULT_TIMINGS, type PlayerCount, type Role } from './rules';
import { isSilent, stepKey, stepSeconds } from './selectors';
import type { Game, GameEvent, Setup } from './types';

// Card k goes to seat k, so: seat 1 Don, 2–3 Mafia, 4 Sheriff, the rest Citizens.
function setup(playerCount: PlayerCount = 10): Setup {
  const deck: Role[] = ['don', 'mafia', 'mafia', 'sheriff'];
  while (deck.length < playerCount) deck.push('citizen');
  return { playerCount, deck, timings: DEFAULT_TIMINGS };
}

const next: GameEvent = { type: 'next' };
const deal = (count: PlayerCount = 10): GameEvent[] =>
  Array.from({ length: count }, (_, card) => ({ type: 'pick', card }));
const night0: GameEvent[] = [next, next, next];

function play(events: GameEvent[], count: PlayerCount = 10) {
  return replay(setup(count), events);
}

describe('dealing (S-6)', () => {
  it('starts with every card face down and seat 1 to pick', () => {
    const game = newGame(setup());
    expect(game.step).toEqual({ kind: 'deal' });
    expect(game.taken).toEqual([]);
    expect(game.players).toEqual([]);
  });

  it('gives the k-th picked card to seat k', () => {
    const game = play([
      { type: 'pick', card: 9 },
      { type: 'pick', card: 0 },
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((card): GameEvent => ({ type: 'pick', card })),
    ]);
    expect(game.players[0]?.role).toBe('citizen');
    expect(game.players[1]?.role).toBe('don');
    expect(game.players[4]?.role).toBe('sheriff');
  });

  it('rejects a card that was already taken', () => {
    const game = play([{ type: 'pick', card: 3 }]);
    expect(() => reduce(game, { type: 'pick', card: 3 })).toThrow(RuleError);
  });

  it('goes to Night 0 once every seat has a card', () => {
    const game = play(deal());
    expect(game.step).toEqual({ kind: 'night0', stage: 'mafia' });
    expect(game.players.every((p) => p.out === null && p.fouls === 0)).toBe(true);
  });
});

describe('Night 0 (N0)', () => {
  it('runs mafia, sheriff and free sitting, then Day 1 opens at seat 1 (D-2)', () => {
    let game = play(deal());
    game = reduce(game, next);
    expect(game.step).toEqual({ kind: 'night0', stage: 'sheriff' });
    game = reduce(game, next);
    expect(game.step).toEqual({ kind: 'night0', stage: 'free' });
    game = reduce(game, next);
    expect(game.day).toBe(1);
    expect(game.step).toEqual({ kind: 'speech', seat: 1, queue: [2, 3, 4, 5, 6, 7, 8, 9, 10] });
  });

  it('has no kill and no checks', () => {
    const game = play([...deal(), ...night0]);
    expect(game.nights).toEqual([]);
  });
});

const nominate = (seat: number): GameEvent => ({ type: 'nominate', seat });
const day1 = (): GameEvent[] => [...deal(), ...night0];
/** Ends every remaining speech of the current discussion. */
function endDiscussion(game: Game): Game {
  let g = game;
  while (g.step.kind === 'speech') g = reduce(g, next);
  return g;
}

describe('discussion (D-*)', () => {
  it('gives every player in the game one speech in seat order', () => {
    let game = play(day1());
    const speakers: number[] = [];
    while (game.step.kind === 'speech') {
      speakers.push(game.step.seat);
      game = reduce(game, next);
    }
    expect(speakers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('accepts one nomination per speaker, in acceptance order (D-6, D-8)', () => {
    const game = play([...day1(), nominate(5), next, nominate(3)]);
    expect(game.nominations).toEqual([
      { seat: 5, by: 1 },
      { seat: 3, by: 2 },
    ]);
    expect(() => reduce(game, nominate(7))).toThrow(RuleError);
  });

  it('rejects nominating a player who is already nominated (D-7)', () => {
    const game = play([...day1(), nominate(5), next]);
    expect(() => reduce(game, nominate(5))).toThrow(RuleError);
    expect(reduce(game, nominate(6)).nominations).toHaveLength(2);
  });

  it('allows self-nomination (D-11)', () => {
    expect(play([...day1(), nominate(1)]).nominations).toEqual([{ seat: 1, by: 1 }]);
  });

  it('only accepts nominations during a speech (D-5)', () => {
    expect(() => play([...deal(), nominate(2)])).toThrow(RuleError);
  });
});

describe('vote gate', () => {
  it('goes to night with no nominations (V-2)', () => {
    const game = endDiscussion(play(day1()));
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
    expect(game.night).toBe(1);
  });

  it('holds no vote on Day 1 with a single nominee (V-3)', () => {
    const game = endDiscussion(play([...day1(), nominate(7)]));
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
  });

  it('votes on the nominees in nomination order', () => {
    const game = endDiscussion(play([...day1(), nominate(7), next, nominate(3)]));
    expect(game.step).toEqual({ kind: 'vote', candidates: [7, 3], revote: false });
  });
});

const shoot = (seat: number | null): GameEvent => ({ type: 'shoot', seat });
const check = (seat: number): GameEvent => ({ type: 'check', seat });
/** Everyone speaks, nobody is nominated: Day 1 ends without a vote. */
const quietDay = (count: PlayerCount = 10): GameEvent[] => Array(count).fill(next);

describe('night (N-*)', () => {
  it('kills the shot player, runs both checks, then morning and last words (N-3, L-2)', () => {
    let game = play([...day1(), ...quietDay(), shoot(7)]);
    expect(game.players[6]?.out).toBe('killed');
    expect(game.step).toEqual({ kind: 'night', stage: 'don' });
    game = reduce(game, check(4));
    expect(game.step).toEqual({ kind: 'night', stage: 'don' });
    game = reduce(game, next);
    expect(game.step).toEqual({ kind: 'night', stage: 'sheriff' });
    game = reduce(reduce(game, check(2)), next);
    expect(game.nights).toEqual([{ night: 1, kill: 7, don: 4, sheriff: 2 }]);
    // Night 1 kill gets the best move (B-1).
    expect(game.step).toEqual({ kind: 'night', stage: 'bestMove' });
    game = reduce(game, { type: 'bestMove', seats: [1, 2, 3] });
    expect(game.bestMove).toEqual({ seat: 7, picks: [1, 2, 3] });
    expect(game.step).toEqual({ kind: 'morning' });
    expect(game.day).toBe(2);
    game = reduce(game, next);
    expect(game.step).toEqual({ kind: 'lastWords', queue: [7], after: 'speech' });
    game = reduce(game, next);
    // Day 2 opens at the seat after Day 1's opener (D-2).
    expect(game.step).toMatchObject({ kind: 'speech', seat: 2 });
  });

  it('records a miss and goes straight to the discussion after morning', () => {
    let game = play([...day1(), ...quietDay(), shoot(null), next, next]);
    expect(game.nights).toEqual([{ night: 1, kill: null }]);
    expect(game.step).toEqual({ kind: 'morning' });
    game = reduce(game, next);
    expect(game.step).toMatchObject({ kind: 'speech', seat: 2 });
  });

  it('opens the next day after the actual opener when the nominal one is out (D-3)', () => {
    // Night 1 kills seat 2, so Day 2 opens at 3 and Day 3 at 4.
    let game = play([...day1(), ...quietDay(), shoot(2), next, next, next, next, next]);
    expect(game.step).toMatchObject({ kind: 'speech', seat: 3 });
    game = endDiscussion(game);
    game = [shoot(null), next, next, next].reduce(reduce, game);
    expect(game.step).toMatchObject({ kind: 'speech', seat: 4 });
  });

  it('runs the Don and Sheriff steps even when they are out (N-b)', () => {
    const game = play([...day1(), ...quietDay(), shoot(4)]);
    expect(game.step).toEqual({ kind: 'night', stage: 'don' });
    expect(reduce(game, next).step).toEqual({ kind: 'night', stage: 'sheriff' });
  });

  it('only accepts a check during the Don or Sheriff step', () => {
    const game = play([...day1(), ...quietDay()]);
    expect(() => reduce(game, check(3))).toThrow(RuleError);
  });

  it('treats a shot at a player out of the game as a miss (edge case 18)', () => {
    let game = play([...day1(), ...quietDay(), shoot(5), next, next, next, next, next]);
    game = endDiscussion(game);
    expect(reduce(game, shoot(5)).nights[1]).toEqual({ night: 2, kill: null });
  });
});

describe('9 players (S-2, §11)', () => {
  it('skips shooting on Night 1 but still runs both checks', () => {
    let game = play([...deal(9), ...night0, ...quietDay(9)], 9);
    expect(game.step).toEqual({ kind: 'night', stage: 'don' });
    game = [next, next].reduce(reduce, game);
    expect(game.step).toEqual({ kind: 'morning' });
    expect(game.nights).toEqual([{ night: 1 }]);
    expect(game.misses).toBe(0);
  });

  it('shoots from Night 2', () => {
    let game = play([...deal(9), ...night0, ...quietDay(9), next, next, next], 9);
    game = endDiscussion(game);
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
  });
});

const vote = (...counts: number[]): GameEvent => ({ type: 'vote', counts });
const raise = (yes: number): GameEvent => ({ type: 'raise', yes });
/** Day 1 where seats 1, 2, 3 nominate 5, 6, 7 and the discussion ends. */
const threeNominees = (count: PlayerCount = 10): GameEvent[] => [
  ...deal(count),
  ...night0,
  nominate(5),
  next,
  nominate(6),
  next,
  nominate(7),
  ...Array(count - 2).fill(next),
];

describe('voting (V-*)', () => {
  it('requires one vote from every player in the game (V-6, V-7)', () => {
    const game = play(threeNominees());
    expect(() => reduce(game, vote(3, 3, 3))).toThrow(RuleError);
    expect(() => reduce(game, vote(5, 5))).toThrow(RuleError);
    expect(() => reduce(game, vote(-1, 6, 5))).toThrow(RuleError);
  });

  it('eliminates the plurality; last words follow, then night (V-9, L-1)', () => {
    let game = play([...threeNominees(), vote(4, 3, 3)]);
    expect(game.players[4]?.out).toBe('voted');
    expect(game.votes).toEqual([
      { day: 1, kind: 'vote', candidates: [5, 6, 7], counts: [4, 3, 3] },
    ]);
    expect(game.step).toEqual({ kind: 'lastWords', queue: [5], after: 'night' });
    game = reduce(game, next);
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
  });

  it('eliminates a single nominee without a vote from Day 2 (V-4)', () => {
    let game = play([...day1(), ...quietDay(), shoot(null), next, next, next, nominate(9)]);
    game = endDiscussion(game);
    expect(game.players[8]?.out).toBe('voted');
    expect(game.step).toEqual({ kind: 'lastWords', queue: [9], after: 'night' });
  });
});

describe('ties (T-*)', () => {
  it('gives each tied candidate a defence speech, then re-votes among them (T-1)', () => {
    let game = play([...threeNominees(), vote(4, 4, 2)]);
    expect(game.step).toEqual({ kind: 'tieSpeech', candidates: [5, 6], index: 0 });
    game = reduce(game, next);
    expect(game.step).toEqual({ kind: 'tieSpeech', candidates: [5, 6], index: 1 });
    game = reduce(game, next);
    expect(game.step).toEqual({ kind: 'vote', candidates: [5, 6], revote: true });
    game = reduce(game, vote(6, 4));
    expect(game.players[4]?.out).toBe('voted');
  });

  it('repeats speeches for a smaller tied set (T-3)', () => {
    const game = play([...threeNominees(9), vote(3, 3, 3), next, next, next, vote(4, 4, 1)], 9);
    expect(game.step).toEqual({ kind: 'tieSpeech', candidates: [5, 6], index: 0 });
  });

  it('asks for a raise when the same set ties again (T-4)', () => {
    const game = play([...threeNominees(), vote(5, 5, 0), next, next, vote(5, 5)]);
    expect(game.step).toEqual({ kind: 'raise', candidates: [5, 6] });
  });

  it('eliminates everyone on a raise with more than half; last words in nomination order (T-5, T-8)', () => {
    const game = play([...threeNominees(), vote(5, 5, 0), next, next, vote(5, 5), raise(6)]);
    expect(game.players[4]?.out).toBe('voted');
    expect(game.players[5]?.out).toBe('voted');
    expect(game.votes.at(-1)).toEqual({ day: 1, kind: 'raise', candidates: [5, 6], yes: 6 });
    expect(game.step).toEqual({ kind: 'lastWords', queue: [5, 6], after: 'night' });
  });

  it('keeps everyone on exactly half (T-5)', () => {
    const game = play([...threeNominees(), vote(5, 5, 0), next, next, vote(5, 5), raise(5)]);
    expect(game.players.every((p) => p.out === null)).toBe(true);
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
  });

  it('holds no raise for 3 tied players at a table of 9 (T-6b)', () => {
    const game = play([...threeNominees(9), vote(3, 3, 3), next, next, next, vote(3, 3, 3)], 9);
    expect(game.step).toEqual({ kind: 'night', stage: 'don' });
  });
});

const foul = (seat: number): GameEvent => ({ type: 'foul', seat });
const fouls = (seat: number, n: number): GameEvent[] => Array(n).fill(foul(seat));

describe('fouls (F-*)', () => {
  it('silences a player whose 3rd foul comes before their speech this round (F-3)', () => {
    let game = play([...day1(), ...fouls(5, 3), next, next, next, next]);
    expect(game.step).toMatchObject({ kind: 'speech', seat: 5 });
    expect(isSilent(game)).toBe(true);
    expect(stepSeconds(game)).toBe(0);
    // The silenced player may still nominate (D-10).
    game = reduce(game, nominate(1));
    expect(game.nominations).toEqual([{ seat: 1, by: 5 }]);
  });

  it('serves the silence once', () => {
    let game = play([...day1(), ...fouls(5, 3), ...quietDay(), shoot(null), next, next, next]);
    while (game.step.kind === 'speech' && game.step.seat !== 5) game = reduce(game, next);
    expect(isSilent(game)).toBe(false);
    expect(stepSeconds(game)).toBe(60);
  });

  it('moves the silence to the next day when the 3rd foul comes during or after the speech', () => {
    let game = play([...day1(), next, next, next, next, ...fouls(5, 3)]);
    game = endDiscussion(game);
    game = [shoot(null), next, next, next].reduce(reduce, game);
    while (game.step.kind === 'speech' && game.step.seat !== 5) game = reduce(game, next);
    expect(isSilent(game)).toBe(true);
  });

  it('adds up fouls across days (F-1)', () => {
    const game = play([...day1(), foul(8), ...quietDay(), shoot(null), next, foul(8)]);
    expect(game.players[7]?.fouls).toBe(2);
  });

  it('removes a player on the 4th foul (F-5)', () => {
    const game = play([...day1(), ...fouls(8, 4)]);
    expect(game.players[7]?.out).toBe('removed');
    expect(() => reduce(game, foul(8))).toThrow(RuleError);
  });

  it('still gives a 3-foul player their tie defence speech (T-2)', () => {
    const game = play([...threeNominees(), ...fouls(5, 3), vote(4, 4, 2)]);
    expect(stepSeconds(game)).toBe(30);
  });
});

const remove = (seat: number): GameEvent => ({ type: 'remove', seat });
/** Night with a miss, then morning: lands on the next day's first speech. */
const missNight: GameEvent[] = [shoot(null), next, next, next];

describe('removal (F-7 to F-10)', () => {
  it("cancels today's vote; the remaining speeches still happen (F-7a, F-8)", () => {
    let game = play([...day1(), nominate(5), next, nominate(6), remove(9)]);
    expect(game.step).toMatchObject({ kind: 'speech', seat: 2 });
    game = endDiscussion(game);
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
  });

  it('cancels only one vote for several removals in the same window (F-7)', () => {
    let game = play([...day1(), remove(9), remove(10)]);
    game = endDiscussion(game);
    game = [...missNight, nominate(5), next, nominate(6)].reduce(reduce, game);
    game = endDiscussion(game);
    expect(game.step).toMatchObject({ kind: 'vote', candidates: [5, 6] });
  });

  it("cancels the next day's vote once today's result is fixed (F-7b)", () => {
    let game = play([...threeNominees(), vote(4, 3, 3), remove(9)]);
    expect(game.step).toEqual({ kind: 'lastWords', queue: [5], after: 'night' });
    game = [next, ...missNight, nominate(6), next, nominate(7)].reduce(reduce, game);
    game = endDiscussion(game);
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
  });

  it("cancels the next day's vote for a removal at night (F-9)", () => {
    let game = play([...day1(), ...quietDay(), shoot(null), remove(9), next, next, next]);
    game = [nominate(5), next, nominate(6)].reduce(reduce, game);
    expect(endDiscussion(game).step).toEqual({ kind: 'night', stage: 'shoot' });
  });

  it('ends the speech of a player removed while speaking', () => {
    const game = play([...day1(), next, remove(2)]);
    expect(game.step).toMatchObject({ kind: 'speech', seat: 3 });
  });

  it('skips a removed player later in the round (D-4)', () => {
    let game = play([...day1(), remove(3)]);
    game = reduce(game, next);
    expect(game.step).toMatchObject({ kind: 'speech', seat: 2, queue: [4, 5, 6, 7, 8, 9, 10] });
  });

  it('stops a vote in progress and goes to night (F-7a)', () => {
    const game = play([...threeNominees(), remove(9)]);
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
  });

  it('lets the other tied candidates speak, then goes to night (F-8)', () => {
    let game = play([...threeNominees(), vote(4, 4, 2), remove(5)]);
    expect(game.step).toEqual({ kind: 'tieSpeech', candidates: [6], index: 0 });
    game = reduce(game, next);
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
  });

  it("ends the last words of a voted-out player who is removed, keeping tomorrow's vote", () => {
    let game = play([...threeNominees(), vote(4, 3, 3), remove(5)]);
    expect(game.players[4]?.out).toBe('voted');
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
    game = [...missNight, nominate(6), next, nominate(7)].reduce(reduce, game);
    expect(endDiscussion(game).step).toMatchObject({ kind: 'vote' });
  });

  it('counts a kill on a player removed during the shooting (F-9)', () => {
    let game = play([...day1(), ...quietDay(), remove(9), shoot(9)]);
    expect(game.nights[0]?.kill).toBe(9);
    expect(game.players[8]?.out).toBe('removed');
    game = [next, next, next].reduce(reduce, game);
    // Removed players get no last words, and the next day's vote is held.
    game = [nominate(5), next, nominate(6)].reduce(reduce, game);
    expect(endDiscussion(game).step).toMatchObject({ kind: 'vote' });
  });

  it("keeps the next day's vote cancelled by a second removal when the first one is killed (F-7, F-9)", () => {
    let game = play([...day1(), ...quietDay(), remove(9), remove(10), shoot(9)]);
    game = [next, next, next].reduce(reduce, game);
    game = [nominate(5), next, nominate(6)].reduce(reduce, game);
    expect(endDiscussion(game).step).toEqual({ kind: 'night', stage: 'shoot' });
  });

  it('takes the best move and last words from a killed player removed before them (L-3)', () => {
    let game = play([...day1(), ...quietDay(), shoot(7), remove(7)]);
    expect(game.players[6]?.out).toBe('removed');
    game = [next, next].reduce(reduce, game);
    expect(game.step).toEqual({ kind: 'morning' });
    game = reduce(game, next);
    expect(game.step).toMatchObject({ kind: 'speech' });
    // Leaving by the kill, the removal cancels no vote (F-7).
    expect(game.cancelled).toEqual([]);
  });

  it('lets a killed player be fouled before their last words', () => {
    const game = play([...day1(), ...quietDay(), shoot(7), next, next, next, foul(7)]);
    expect(game.players[6]?.fouls).toBe(1);
  });

  it('ends the game at once when a removal decides it (W-3)', () => {
    const game = play([...day1(), remove(1), remove(2), remove(3)]);
    expect(game.outcome).toEqual({ winner: 'red', teamLoss: false });
    expect(game.step).toEqual({ kind: 'over' });
  });
});

describe('end of the game (W-*)', () => {
  it('gives the last words, then ends, when a kill gives black parity (L-4, edge case 22)', () => {
    // 3 black against 4 red; the kill makes it 3 against 3.
    let game = play([...day1(), remove(5), remove(6), remove(7)]);
    game = endDiscussion(game);
    game = reduce(game, shoot(8));
    expect(game.outcome).toBeNull();
    // The checks are skipped once the game is decided; the best move still happens.
    expect(game.step).toEqual({ kind: 'night', stage: 'bestMove' });
    game = [next, next].reduce(reduce, game);
    expect(game.step).toEqual({ kind: 'lastWords', queue: [8], after: 'speech' });
    game = reduce(game, next);
    expect(game.outcome).toEqual({ winner: 'black', teamLoss: false });
  });

  it('lets black kill one of their own; red wins with the last black gone (edge case 19)', () => {
    let game = play([...day1(), remove(2), remove(3)]);
    game = endDiscussion(game);
    game = [shoot(1), next, next].reduce(reduce, game);
    expect(game.step).toEqual({ kind: 'lastWords', queue: [1], after: 'speech' });
    game = reduce(game, next);
    expect(game.outcome).toEqual({ winner: 'red', teamLoss: false });
  });

  it('ends the game after the last words of a deciding vote, whatever is removed after (F-10)', () => {
    // Only the Don is left in black; Day 2 votes him out.
    let game = endDiscussion(play([...day1(), remove(2), remove(3)]));
    game = [...missNight, nominate(1), next, nominate(5)].reduce(reduce, game);
    game = endDiscussion(game);
    game = reduce(game, vote(5, 3));
    expect(game.pending).toBe('red');
    game = reduce(game, remove(5));
    game = reduce(game, next);
    expect(game.outcome).toEqual({ winner: 'red', teamLoss: false });
  });

  it('declares a draw after 3 misses in a row with no departures (W-4)', () => {
    let game = play([...day1(), ...quietDay(), ...missNight]);
    game = [...missNight].reduce(reduce, endDiscussion(game));
    expect(game.misses).toBe(2);
    game = reduce(endDiscussion(game), shoot(null));
    game = [next, next].reduce(reduce, game);
    expect(game.outcome).toEqual({ winner: 'draw', teamLoss: false });
  });

  it('resets the miss count on a departure (W-4)', () => {
    let game = play([...day1(), ...quietDay(), ...missNight]);
    game = [...missNight].reduce(reduce, endDiscussion(game));
    game = reduce(game, remove(10));
    expect(game.misses).toBe(0);
  });

  it('awards the game to the other team on a team loss (W-5)', () => {
    const game = play([...day1(), { type: 'teamLoss', team: 'black' }]);
    expect(game.outcome).toEqual({ winner: 'red', teamLoss: true });
  });

  it('accepts nothing once the game is over', () => {
    const game = play([...day1(), { type: 'teamLoss', team: 'red' }]);
    expect(() => reduce(game, next)).toThrow(RuleError);
    expect(() => reduce(game, foul(5))).toThrow(RuleError);
  });
});

describe('raise ban for everyone in the game (T-6a)', () => {
  it('goes to night when the tie includes every player in the game', () => {
    // Seats 1, 8, 9, 10 are left, and each of them is nominated.
    let game = play([...day1(), ...[2, 3, 4, 5, 6, 7].map(remove)]);
    game = [...Array(4).fill(next), ...missNight].reduce(reduce, game);
    game = [nominate(8), next, nominate(9), next, nominate(10), next, nominate(1)].reduce(
      reduce,
      game,
    );
    game = endDiscussion(game);
    game = [vote(1, 1, 1, 1), next, next, next, next, vote(1, 1, 1, 1)].reduce(reduce, game);
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
  });

  it('gives a silenced player 30 s at 3 or 4 players (F-4b)', () => {
    let game = play([...day1(), ...[2, 3, 4, 5, 6, 7].map(remove), ...fouls(9, 3)]);
    while (game.step.kind === 'speech' && game.step.seat !== 9) game = reduce(game, next);
    expect(isSilent(game)).toBe(true);
    expect(stepSeconds(game)).toBe(30);
  });
});

describe('best move (B-*)', () => {
  it('is not given after a miss on the first shooting night (B-3)', () => {
    let game = play([...day1(), ...quietDay(), ...missNight]);
    game = [...[shoot(5), next, next]].reduce(reduce, endDiscussion(game));
    expect(game.step).toEqual({ kind: 'morning' });
  });

  it('is not given when 2 or more players were voted out on Day 1 (B-2)', () => {
    let game = play([...threeNominees(), vote(5, 5, 0), next, next, vote(5, 5), raise(6)]);
    game = [next, next, shoot(8), next, next].reduce(reduce, game);
    expect(game.step).toEqual({ kind: 'morning' });
  });

  it('goes to the first kill on Night 2 with 9 players (§11)', () => {
    let game = play([...deal(9), ...night0, ...quietDay(9), next, next, next], 9);
    game = [shoot(7), next, next].reduce(reduce, endDiscussion(game));
    expect(game.step).toEqual({ kind: 'night', stage: 'bestMove' });
  });
});

describe('undo by replay (edge case 25)', () => {
  it('never changes an earlier state, so dropping the last event restores it', () => {
    const before = play([...day1(), nominate(5)]);
    const snapshot = structuredClone(before);
    reduce(before, foul(5));
    reduce(before, next);
    expect(before).toEqual(snapshot);
    expect(play([...day1(), nominate(5), foul(5)].slice(0, -1))).toEqual(snapshot);
  });

  it('keeps no reference to arrays passed in events', () => {
    const seats = [1, 2, 3];
    let game = play([...day1(), ...quietDay(), shoot(7), next, next]);
    game = reduce(game, { type: 'bestMove', seats });
    const counts = [4, 3, 3];
    const voted = reduce(play(threeNominees()), { type: 'vote', counts });
    seats.push(4);
    counts[0] = 9;
    expect(game.bestMove?.picks).toEqual([1, 2, 3]);
    expect(voted.votes[0]).toMatchObject({ counts: [4, 3, 3] });
  });

  it('tells whether an event is allowed without applying it', () => {
    const game = play([...day1(), nominate(5)]);
    expect(isAllowed(game, nominate(6))).toBe(false);
    expect(isAllowed(game, foul(6))).toBe(true);
  });
});

describe('step key', () => {
  it('changes with the step but not with fouls or nominations, so timers reset only on a new step', () => {
    const game = play(day1());
    expect(stepKey(reduce(reduce(game, foul(4)), nominate(3)))).toBe(stepKey(game));
    expect(stepKey(reduce(game, next))).not.toBe(stepKey(game));
  });

  it('stays the same when someone else is removed during a speech or a tie defence (F-8)', () => {
    const speech = play(day1());
    expect(stepKey(reduce(speech, remove(7)))).toBe(stepKey(speech));
    const tie = play([...threeNominees(9), vote(3, 3, 3), next], 9);
    expect(stepKey(reduce(tie, remove(5)))).toBe(stepKey(tie));
  });
});
