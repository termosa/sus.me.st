import { describe, expect, it } from 'vitest';
import { replay } from '../engine/game';
import { DEFAULT_TIMINGS, type Role } from '../engine/rules';
import type { GameEvent, Setup } from '../engine/types';
import { announcement, hint } from './narration';

// Card k goes to seat k: seat 1 Don, 2–3 Mafia, 4 Sheriff, the rest Citizens.
const deck: Role[] = ['don', 'mafia', 'mafia', 'sheriff', ...Array<Role>(6).fill('citizen')];
const setup: Setup = { playerCount: 10, dealing: 'app', deck, timings: DEFAULT_TIMINGS };

const next: GameEvent = { type: 'next' };
const deal: GameEvent[] = deck.map((_, card) => ({ type: 'pick', card }));
const nextTimes = (n: number): GameEvent[] => Array(n).fill(next);
const nominate = (seat: number): GameEvent => ({ type: 'nominate', seat });
/** Day 1 with one nominee: seat 1 nominates seat 5, then everyone speaks. */
const day1Single: GameEvent[] = [...deal, ...nextTimes(3), nominate(5), ...nextTimes(10)];

const at = (events: GameEvent[]) => replay(setup, events);

describe('announcement', () => {
  it('calls the speaker by seat number', () => {
    expect(announcement(at([...deal, ...nextTimes(4)]))).toBe('Player 2');
  });

  it('calls the vote with its candidates in nomination order', () => {
    const game = at([...deal, ...nextTimes(3), nominate(7), next, nominate(3), ...nextTimes(9)]);
    expect(announcement(game)).toBe('Vote. Nominated: 7, 3');
  });

  it('announces the kill in the morning', () => {
    const game = at([
      ...day1Single,
      { type: 'shoot', seat: 6 },
      next,
      next,
      { type: 'bestMove', seats: [] },
    ]);
    expect(game.step.kind).toBe('morning');
    expect(announcement(game)).toBe('Morning. Player 6 is killed');
  });

  it('announces a miss in the morning', () => {
    const game = at([...day1Single, { type: 'shoot', seat: null }, next, next]);
    expect(announcement(game)).toBe('Morning. Miss');
  });

  it('starts the night with the shooting', () => {
    expect(announcement(at(day1Single))).toBe('Night. Mafia, shoot');
  });
});

describe('hint', () => {
  it("asks for the role on the seat's card when dealing physical cards", () => {
    const cards = replay({ ...setup, dealing: 'cards' }, deal.slice(0, 2));
    expect(hint(cards)).toBe('Seat 3: tap the role on the card.');
    expect(hint(at(deal.slice(0, 2)))).toMatch(/^Seat 3 picks a card\./);
  });

  it('explains why a single nominee on Day 1 gets no vote (V-3)', () => {
    expect(hint(at(day1Single))).toMatch(/^One nominee on Day 1: no vote\./);
  });

  it('explains why a single nominee from Day 2 leaves without a vote (V-4)', () => {
    const day2Single = [
      ...day1Single,
      { type: 'shoot', seat: null } as GameEvent,
      ...nextTimes(3),
      nominate(8),
      ...nextTimes(10),
    ];
    const game = at(day2Single);
    expect(game.step).toEqual({ kind: 'lastWords', queue: [8], after: 'night' });
    expect(hint(game)).toMatch(/^Only nominee gets every vote: player 8 leaves\./);
  });

  it('gives no Day 1 reason on the night after a single nominee left (V-4)', () => {
    const game = at([
      ...day1Single,
      { type: 'shoot', seat: null },
      ...nextTimes(3),
      nominate(8),
      ...nextTimes(11),
    ]);
    expect(game.step).toEqual({ kind: 'night', stage: 'shoot' });
    expect(hint(game)).toMatch(/^Call seats/);
  });

  it('explains that a repeated tie with no raise vote keeps everyone (T-6)', () => {
    const tie: GameEvent[] = [
      ...deal,
      ...nextTimes(3),
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((seat) => [nominate(seat), next]),
      { type: 'vote', counts: Array(10).fill(1) },
      ...nextTimes(10),
      { type: 'vote', counts: Array(10).fill(1) },
    ];
    expect(hint(at(tie))).toMatch(/^Tie again, no raise vote: everyone stays\./);
  });

  it('explains a failed raise vote', () => {
    const raise: GameEvent[] = [
      ...deal,
      ...nextTimes(3),
      nominate(5),
      next,
      nominate(6),
      ...nextTimes(9),
      { type: 'vote', counts: [5, 5] },
      next,
      next,
      { type: 'vote', counts: [5, 5] },
      { type: 'raise', yes: 5 },
    ];
    expect(hint(at(raise))).toMatch(/^Not enough hands: everyone stays\./);
  });

  it('tells the host who picks a card', () => {
    expect(hint(at(deal.slice(0, 2)))).toMatch(/^Seat 3/);
  });
});
