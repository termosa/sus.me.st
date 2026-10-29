import type { Role } from './rules';
import type { Game, Player } from './types';

export function alivePlayers(game: Game): Player[] {
  return game.players.filter((p) => p.out === null);
}

/** Whether the current speaker lost this speech to a 3rd foul (F-3). */
export function isSilent(game: Game): boolean {
  const step = game.step;
  return step.kind === 'speech' && game.players[step.seat - 1]?.silentOn === game.day;
}

/** Timer length for the current step in seconds, or null when the step is untimed. */
export function stepSeconds(game: Game): number | null {
  const t = game.setup.timings;
  const step = game.step;
  switch (step.kind) {
    case 'night0':
      if (step.stage === 'mafia') return t.night0Mafia;
      return step.stage === 'free' ? t.night0FreeSitting : null;
    case 'speech':
      if (!isSilent(game)) return t.speech;
      // F-4b: at 3 or 4 players, a silenced player still gets a short speech.
      return alivePlayers(game).length <= 4 ? t.shortSpeech : 0;
    case 'tieSpeech':
      return t.tieSpeech;
    case 'lastWords':
      return t.lastWords;
    case 'night':
      if (step.stage === 'don') return t.donCheck;
      if (step.stage === 'sheriff') return t.sheriffCheck;
      return step.stage === 'bestMove' ? t.bestMove : null;
    case 'deal':
    case 'morning':
    case 'vote':
    case 'raise':
    case 'over':
      return null;
  }
}

/**
 * Identifies the current step, so a timer restarts only when the step changes.
 * Removing someone else must not restart the current speaker's timer (F-8).
 */
export function stepKey(game: Game): string {
  const step = game.step;
  const at = [game.day, game.night, step.kind];
  switch (step.kind) {
    case 'speech':
      return JSON.stringify([...at, step.seat]);
    case 'lastWords':
      return JSON.stringify([...at, step.queue[0], step.after]);
    case 'tieSpeech':
      // The vote count tells repeated tie rounds of the same day apart (T-3).
      return JSON.stringify([...at, step.candidates[step.index], game.votes.length]);
    default:
      return JSON.stringify([...at, step]);
  }
}

/** The cards still face down, numbered from 1 so the labels don't show which were taken (S-6). */
export function cardsLeft(game: Game): { card: number; label: number }[] {
  return game.setup.deck
    .map((_, card) => card)
    .filter((card) => !game.taken.includes(card))
    .map((card, i) => ({ card, label: i + 1 }));
}

/**
 * With physical cards the host tells the app each seat's role: this is a card still face
 * down with that role, to pick for the seat. Null when none is left.
 */
export function cardFor(game: Game, role: Role): number | null {
  return cardsLeft(game).find(({ card }) => game.setup.deck[card] === role)?.card ?? null;
}
