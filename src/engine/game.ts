import {
  BEST_MOVE_PICKS,
  FOULS_TO_REMOVE,
  FOULS_TO_SILENCE,
  hasShooting,
  raisePasses,
  type Team,
  teamOf,
} from './rules';
import type { Game, GameEvent, NightRecord, Player, Setup } from './types';

/** Thrown for an event the rules don't allow in the current state. */
export class RuleError extends Error {
  override name = 'RuleError';
}

function fail(message: string): never {
  throw new RuleError(message);
}

export function newGame(setup: Setup): Game {
  return {
    setup,
    taken: [],
    players: [],
    day: 0,
    night: 0,
    step: { kind: 'deal' },
    opener: null,
    nominations: [],
    cancelled: [],
    resultFixed: true,
    misses: 0,
    nights: [],
    votes: [],
    bestMove: null,
    pending: null,
    outcome: null,
  };
}

export function replay(setup: Setup, events: readonly GameEvent[]): Game {
  return events.reduce(reduce, newGame(setup));
}

/** Applies one event; throws {@link RuleError} when the rules don't allow it. */
export function reduce(game: Game, event: GameEvent): Game {
  const draft = structuredClone(game);
  apply(draft, event);
  return draft;
}

export function isAllowed(game: Game, event: GameEvent): boolean {
  try {
    reduce(game, event);
    return true;
  } catch (error) {
    if (error instanceof RuleError) return false;
    throw error;
  }
}

function apply(g: Game, e: GameEvent): void {
  switch (e.type) {
    case 'pick':
      pick(g, e.card);
      break;
    case 'next':
      next(g);
      break;
    case 'nominate':
      nominate(g, e.seat);
      break;
    case 'vote':
      vote(g, e.counts);
      break;
    case 'raise':
      raise(g, e.yes);
      break;
    case 'shoot':
      shoot(g, e.seat);
      break;
    case 'check':
      check(g, e.seat);
      break;
    case 'bestMove':
      bestMove(g, e.seats);
      break;
    case 'foul':
      foul(g, e.seat);
      break;
    case 'remove':
      remove(g, e.seat);
      break;
    case 'teamLoss':
      teamLoss(g, e.team);
      break;
    default:
      // Only reachable from data that skipped type checks, such as an old save.
      fail('Unknown event');
  }
}

function pick(g: Game, card: number): void {
  if (g.step.kind !== 'deal') fail('Cards are only picked while dealing');
  if (!Number.isInteger(card) || card < 0 || card >= g.setup.deck.length) fail('No such card');
  if (g.taken.includes(card)) fail('That card is taken');
  g.taken.push(card);
  if (g.taken.length < g.setup.playerCount) return;
  g.players = g.taken.map((c, i): Player => {
    const role = g.setup.deck[c];
    if (!role) fail('No such card');
    return { seat: i + 1, role, out: null, fouls: 0, silentOn: null };
  });
  g.step = { kind: 'night0', stage: 'mafia' };
}

function next(g: Game): void {
  const step = g.step;
  switch (step.kind) {
    case 'night0':
      if (step.stage === 'mafia') g.step = { kind: 'night0', stage: 'sheriff' };
      else if (step.stage === 'sheriff') g.step = { kind: 'night0', stage: 'free' };
      else {
        beginDay(g, 1);
        startDiscussion(g);
      }
      return;
    case 'speech': {
      const speaker = player(g, step.seat);
      if (speaker.silentOn === g.day) speaker.silentOn = null;
      nextSpeaker(g, step.queue);
      return;
    }
    case 'tieSpeech':
      if (step.index + 1 < step.candidates.length) g.step = { ...step, index: step.index + 1 };
      else if (voteCancelled(g)) startNight(g);
      else g.step = { kind: 'vote', candidates: step.candidates, revote: true };
      return;
    case 'night':
      if (step.stage === 'shoot') fail('Record the shot or the miss first');
      if (step.stage === 'don') g.step = { kind: 'night', stage: 'sheriff' };
      else if (step.stage === 'sheriff') afterChecks(g);
      else endNight(g);
      return;
    case 'morning': {
      const kill = tonight(g).kill;
      if (kill != null && player(g, kill).out === 'killed') {
        g.step = { kind: 'lastWords', queue: [kill], after: 'speech' };
      } else startDiscussion(g);
      return;
    }
    case 'lastWords':
      continueLastWords(g, step.queue.slice(1), step.after);
      return;
    case 'deal':
    case 'vote':
    case 'raise':
    case 'over':
      fail(`Can't advance from ${step.kind}`);
  }
}

/** Seats in the game, clockwise starting at `from` (wrapping past the last seat). */
function aliveFrom(g: Game, from: number): number[] {
  const n = g.setup.playerCount;
  const seats: number[] = [];
  for (let i = 0; i < n; i++) {
    const seat = ((from - 1 + i) % n) + 1;
    if (g.players[seat - 1]?.out === null) seats.push(seat);
  }
  return seats;
}

function player(g: Game, seat: number): Player {
  return g.players[seat - 1] ?? fail(`No seat ${seat}`);
}

function aliveCount(g: Game): number {
  return g.players.filter((p) => p.out === null).length;
}

function beginDay(g: Game, day: number): void {
  g.day = day;
  g.nominations = [];
  g.resultFixed = false;
}

/** D-2, D-3: Day 1 opens at seat 1; later days at the next seat after the previous opener. */
function startDiscussion(g: Game): void {
  const from = g.opener === null ? 1 : (g.opener % g.setup.playerCount) + 1;
  const [seat, ...queue] = aliveFrom(g, from);
  if (seat === undefined) fail('Nobody is left to speak');
  g.opener = seat;
  g.step = { kind: 'speech', seat, queue };
}

/** D-5 to D-11. */
function nominate(g: Game, seat: number): void {
  const step = g.step;
  if (step.kind !== 'speech') fail('Nominations are only made during a speech');
  if (g.nominations.some((n) => n.by === step.seat)) fail('One nomination per player per day');
  if (player(g, seat).out !== null) fail('That player is out of the game');
  if (g.nominations.some((n) => n.seat === seat)) fail('That player is already nominated');
  g.nominations.push({ seat, by: step.seat });
}

function nextSpeaker(g: Game, queue: number[]): void {
  const [seat, ...rest] = queue;
  if (seat === undefined) voteGate(g);
  else g.step = { kind: 'speech', seat, queue: rest };
}

function continueLastWords(g: Game, queue: number[], after: 'speech' | 'night'): void {
  if (queue.length > 0) g.step = { kind: 'lastWords', queue, after };
  else if (g.pending) finish(g, g.pending);
  else if (after === 'speech') startDiscussion(g);
  else startNight(g);
}

function voteCancelled(g: Game): boolean {
  return g.cancelled.some((c) => c.day === g.day);
}

/** V-2 to V-4: decide whether the day ends with a vote. */
function voteGate(g: Game): void {
  const candidates = g.nominations.map((n) => n.seat);
  const noVote = candidates.length === 0 || (g.day === 1 && candidates.length === 1);
  if (voteCancelled(g) || noVote) startNight(g);
  else if (candidates.length === 1) eliminate(g, candidates);
  else g.step = { kind: 'vote', candidates, revote: false };
}

function isCount(n: number, max: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= max;
}

/** V-6 to V-9, T-1 to T-4. */
function vote(g: Game, counts: number[]): void {
  const step = g.step;
  if (step.kind !== 'vote') fail('No vote now');
  const alive = aliveCount(g);
  if (counts.length !== step.candidates.length) fail('One count per candidate');
  if (!counts.every((c) => isCount(c, alive))) fail('Counts must be whole numbers');
  if (counts.reduce((a, b) => a + b, 0) !== alive) fail('Every player votes exactly once');
  g.votes.push({ day: g.day, kind: 'vote', candidates: step.candidates, counts: [...counts] });
  const top = Math.max(...counts);
  const tied = step.candidates.filter((_, i) => counts[i] === top);
  if (tied.length === 1) eliminate(g, tied);
  else if (step.revote && tied.length === step.candidates.length) raiseGate(g, tied);
  else g.step = { kind: 'tieSpeech', candidates: tied, index: 0 };
}

/** T-6: no raise vote for everyone in the game, or for 3 players at a table of 9. */
function raiseGate(g: Game, candidates: number[]): void {
  const alive = aliveCount(g);
  if (candidates.length === alive || (candidates.length === 3 && alive === 9)) startNight(g);
  else g.step = { kind: 'raise', candidates };
}

/** T-5: everyone leaves when more than half of the players in the game raise a hand. */
function raise(g: Game, yes: number): void {
  const step = g.step;
  if (step.kind !== 'raise') fail('No raise vote now');
  const alive = aliveCount(g);
  if (!isCount(yes, alive)) fail('Not a valid count');
  g.votes.push({ day: g.day, kind: 'raise', candidates: step.candidates, yes });
  if (raisePasses(yes, alive)) eliminate(g, step.candidates);
  else startNight(g);
}

/** L-1, T-8: voted out, with last words in nomination order. */
function eliminate(g: Game, seats: number[]): void {
  for (const seat of seats) player(g, seat).out = 'voted';
  g.resultFixed = true;
  g.misses = 0;
  g.pending = winner(g);
  g.step = { kind: 'lastWords', queue: seats, after: 'night' };
}

function startNight(g: Game): void {
  g.resultFixed = true;
  g.night = g.day;
  g.nights.push({ night: g.night });
  g.step = { kind: 'night', stage: hasShooting(g.setup.playerCount, g.night) ? 'shoot' : 'don' };
}

function tonight(g: Game): NightRecord {
  return g.nights.at(-1) ?? fail('No night has been played');
}

/** N-2, N-3: a kill, or a miss when the shot hits nobody in the game. */
function shoot(g: Game, seat: number | null): void {
  if (g.step.kind !== 'night' || g.step.stage !== 'shoot') fail('Not shooting now');
  const target = seat === null ? null : player(g, seat);
  const record = tonight(g);
  if (target !== null && record.removed?.includes(target.seat)) {
    // F-9: killed and removed. The kill counts, and the removal no longer cancels a vote.
    record.kill = target.seat;
    g.misses = 0;
    g.cancelled = g.cancelled.filter((c) => c.seat !== target.seat);
  } else if (target === null || target.out !== null) {
    record.kill = null;
    g.misses += 1;
  } else {
    record.kill = target.seat;
    target.out = 'killed';
    g.misses = 0;
    g.pending = winner(g);
  }
  // Once the kill decides the game, the checks can no longer leak anything (W-3).
  if (g.pending) afterChecks(g);
  else g.step = { kind: 'night', stage: 'don' };
}

/** N-5, N-6: the Don looks for the Sheriff, the Sheriff for black players (N-a: any seat). */
function check(g: Game, seat: number): void {
  const step = g.step;
  if (step.kind !== 'night' || (step.stage !== 'don' && step.stage !== 'sheriff')) {
    fail('Checks happen in the Don and Sheriff steps');
  }
  player(g, seat);
  tonight(g)[step.stage] = seat;
}

function afterChecks(g: Game): void {
  if (bestMoveEligible(g)) g.step = { kind: 'night', stage: 'bestMove' };
  else endNight(g);
}

/** B-1 to B-3. */
function bestMoveEligible(g: Game): boolean {
  const firstShootingNight = hasShooting(g.setup.playerCount, 1) ? 1 : 2;
  const kill = tonight(g).kill;
  const votedOut = g.players.filter((p) => p.out === 'voted').length;
  return (
    g.night === firstShootingNight &&
    kill != null &&
    player(g, kill).out === 'killed' &&
    votedOut < 2
  );
}

/** B-4, B-5: up to three seats, recorded as named. */
function bestMove(g: Game, seats: number[]): void {
  if (g.step.kind !== 'night' || g.step.stage !== 'bestMove') fail('No best move now');
  if (seats.length > BEST_MOVE_PICKS || new Set(seats).size !== seats.length) {
    fail('Up to three different seats');
  }
  for (const seat of seats) player(g, seat);
  const victim = tonight(g).kill ?? fail('Nobody was killed');
  g.bestMove = { seat: victim, picks: [...seats] };
  endNight(g);
}

function endNight(g: Game): void {
  beginDay(g, g.night + 1);
  // W-4: three shooting nights in a row with a miss and no departures.
  if (g.misses >= 3) finish(g, 'draw');
  else g.step = { kind: 'morning' };
}

/** W-1, W-2. */
function winner(g: Game): Team | null {
  const alive = g.players.filter((p) => p.out === null);
  const black = alive.filter((p) => teamOf(p.role) === 'black').length;
  if (black === 0) return 'red';
  if (black >= alive.length - black) return 'black';
  return null;
}

function finish(g: Game, winner: Team | 'draw', teamLoss = false): void {
  g.outcome = { winner, teamLoss };
  g.step = { kind: 'over' };
}

function inPlay(g: Game): boolean {
  return g.step.kind !== 'deal' && g.step.kind !== 'over';
}

function inLastWords(g: Game, seat: number): boolean {
  return g.step.kind === 'lastWords' && g.step.queue.includes(seat);
}

/** Killed tonight, with the best move or last words still to come. */
function killedTonight(g: Game, seat: number): boolean {
  const kind = g.step.kind;
  return (
    (kind === 'night' || kind === 'morning') &&
    g.nights.at(-1)?.kill === seat &&
    player(g, seat).out === 'killed'
  );
}

/** Out of the game but still at the table, so they can be fouled or removed too. */
function leaving(g: Game, seat: number): boolean {
  return inLastWords(g, seat) || killedTonight(g, seat);
}

/** F-1 to F-5. */
function foul(g: Game, seat: number): void {
  const p = player(g, seat);
  if (!inPlay(g)) fail('No fouls outside the game');
  if (p.out !== null && !leaving(g, seat)) fail('That player is out of the game');
  p.fouls += 1;
  if (p.fouls >= FOULS_TO_REMOVE) remove(g, seat);
  else if (p.fouls === FOULS_TO_SILENCE && p.out === null) p.silentOn = silenceDay(g, seat);
}

/** F-3: this round's speech if it is still to come, otherwise the next day's. */
function silenceDay(g: Game, seat: number): number {
  const step = g.step;
  const before =
    (step.kind === 'speech' && step.queue.includes(seat)) ||
    step.kind === 'morning' ||
    (step.kind === 'lastWords' && step.after === 'speech');
  return before ? g.day : g.day + 1;
}

/** F-5 to F-10: removal, without last words. */
function remove(g: Game, seat: number): void {
  const p = player(g, seat);
  const step = g.step;
  if (!inPlay(g)) fail('No removals outside the game');
  if (p.out !== null) {
    // Already leaving by vote or kill: no vote is cancelled (F-7), only what they had left
    // to say is lost (L-3).
    if (step.kind === 'lastWords' && step.queue.includes(seat)) {
      const queue = step.queue.filter((s) => s !== seat);
      if (step.queue[0] === seat) continueLastWords(g, queue, step.after);
      else g.step = { ...step, queue };
    } else if (killedTonight(g, seat)) {
      // The kill still counts; the morning and the best move skip a removed player.
      p.out = 'removed';
      if (step.kind === 'night' && step.stage === 'bestMove') endNight(g);
    } else {
      fail('That player is out of the game');
    }
    return;
  }
  p.out = 'removed';
  // F-10: once a vote or kill decided the game, a removal changes nothing.
  if (g.pending) return;
  g.misses = 0;
  // F-7: today's vote while its result is open, otherwise the next day's. Several
  // removals in one window still cancel just that one vote.
  g.cancelled.push({ day: g.resultFixed ? g.day + 1 : g.day, seat });
  if (step.kind === 'night' && step.stage === 'shoot') {
    const record = tonight(g);
    record.removed = [...(record.removed ?? []), seat];
  }
  const decided = winner(g);
  if (decided) finish(g, decided);
  else resumeAfterRemoval(g, seat);
}

/** F-8: the discussion goes on; a vote in progress stops; tied candidates finish speaking. */
function resumeAfterRemoval(g: Game, seat: number): void {
  const step = g.step;
  switch (step.kind) {
    case 'speech':
      if (step.seat === seat) nextSpeaker(g, step.queue);
      else g.step = { ...step, queue: step.queue.filter((s) => s !== seat) };
      return;
    case 'tieSpeech': {
      const i = step.candidates.indexOf(seat);
      if (i === -1) return;
      const candidates = step.candidates.filter((s) => s !== seat);
      // The removed candidate's own speech ends; the others still speak (F-8).
      const index = i < step.index ? step.index - 1 : step.index;
      if (index < candidates.length) g.step = { ...step, candidates, index };
      else startNight(g);
      return;
    }
    case 'vote':
    case 'raise':
      startNight(g);
      break;
    default:
      return;
  }
}

/** W-5: the offender's team loses at once. */
function teamLoss(g: Game, team: Team): void {
  if (!inPlay(g)) fail('The game is not running');
  if (g.pending) fail('The result is already decided');
  finish(g, team === 'red' ? 'black' : 'red', true);
}
