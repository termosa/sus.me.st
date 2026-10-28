// What the voice says when a step begins, and the hint line for first-time hosts.
// IDs in comments refer to docs/rules.md.
import { hasShooting } from '../engine/rules';
import { isSilent, stepSeconds } from '../engine/selectors';
import type { Game } from '../engine/types';

const list = (seats: number[]) => seats.join(', ');

/** The first stage of tonight: the shooting, or the Don's check on a night without one. */
function nightOpens(game: Game): boolean {
  const step = game.step;
  if (step.kind !== 'night') return false;
  return hasShooting(game.setup.playerCount, game.night)
    ? step.stage === 'shoot'
    : step.stage === 'don';
}

function silenced(game: Game): boolean {
  return isSilent(game) && stepSeconds(game) === 0;
}

/** Spoken when a step begins; null when there is nothing to call. */
export function announcement(game: Game): string | null {
  const step = game.step;
  switch (step.kind) {
    case 'deal':
      return null;
    case 'night0':
      if (step.stage === 'mafia') return 'Night. Mafia, wake up';
      if (step.stage === 'sheriff') return 'Mafia, sleep. Sheriff, show yourself';
      return 'Free seating';
    case 'speech':
      return silenced(game) ? `Player ${step.seat}, no speech` : `Player ${step.seat}`;
    case 'lastWords':
      return `Player ${step.queue[0]}, last words`;
    case 'tieSpeech':
      return `Player ${step.candidates[step.index]}, defence`;
    case 'vote':
      return step.revote
        ? `Revote: ${list(step.candidates)}`
        : `Vote. Nominated: ${list(step.candidates)}`;
    case 'raise':
      return `Raise vote: ${list(step.candidates)}`;
    case 'night': {
      const opening = nightOpens(game) ? 'Night. ' : '';
      if (step.stage === 'shoot') return `${opening}Mafia, shoot`;
      if (step.stage === 'don') return `${opening}Don, wake up`;
      if (step.stage === 'sheriff') return 'Sheriff, wake up';
      return `Player ${game.nights.at(-1)?.kill}, best move`;
    }
    case 'morning': {
      const kill = game.nights.at(-1)?.kill;
      if (kill === undefined) return 'Morning';
      return kill === null ? 'Morning. Miss' : `Morning. Player ${kill} is killed`;
    }
    case 'over': {
      const winner = game.outcome?.winner;
      if (winner === 'draw') return 'Draw';
      return winner === 'black' ? 'Black team wins' : 'Red team wins';
    }
  }
}

/** Why nobody left by vote today (V-2, V-3, T-5, T-6, F-7), told as the night begins. */
function nobodyLeftReason(game: Game): string {
  if (!nightOpens(game)) return '';
  if (game.cancelled.some((c) => c.day === game.day)) return 'A removal cancelled the vote. ';
  const last = game.votes.filter((v) => v.day === game.day).at(-1);
  if (last) {
    if (last.candidates.some((seat) => game.players[seat - 1]?.out === 'voted')) return '';
    return last.kind === 'raise'
      ? 'Not enough hands: everyone stays. '
      : 'Tie again, no raise vote: everyone stays. ';
  }
  if (game.nominations.length === 0) return 'No nominees: no vote. ';
  if (game.day === 1 && game.nominations.length === 1) return 'One nominee on Day 1: no vote. ';
  return '';
}

/** One short line telling the host what is happening and what to do. */
export function hint(game: Game): string {
  const step = game.step;
  switch (step.kind) {
    case 'deal':
      return `Seat ${game.taken.length + 1} picks a card. Tap to zoom, tap to reveal, tap to hide.`;
    case 'night0':
      if (step.stage === 'mafia') return 'Mafia open eyes and meet. Start the timer.';
      if (step.stage === 'sheriff') return 'The Sheriff shows themselves to you.';
      return 'Free seating: everyone masked, hands on the table.';
    case 'speech':
      if (silenced(game)) return `Player ${step.seat} lost this speech to a 3rd foul.`;
      return `Player ${step.seat} speaks. Tap a seat to nominate or give a foul.`;
    case 'lastWords': {
      const seat = step.queue[0];
      // V-4: from Day 2, the only nominee leaves without a show of hands.
      const unvoted = step.after === 'night' && !game.votes.some((v) => v.day === game.day);
      if (unvoted) return `Only nominee gets every vote: player ${seat} leaves. Last words.`;
      return `Last words for player ${seat}.`;
    }
    case 'tieSpeech':
      return `Tie. Player ${step.candidates[step.index]} defends, then a revote.`;
    case 'vote':
      return 'Count hands for each candidate. Votes not cast go to the last one.';
    case 'raise':
      return 'Should they all leave? It passes with more than half of the table.';
    case 'night': {
      const why = nobodyLeftReason(game);
      if (step.stage === 'shoot') {
        return `${why}Call seats 1 to ${game.setup.playerCount}. Tap the seat every mafia shot, or Miss.`;
      }
      if (step.stage === 'don') return `${why}Tap the seat the Don shows. ✓ means Sheriff.`;
      if (step.stage === 'sheriff') return 'Tap the seat the Sheriff shows: red or black.';
      return 'The killed player names up to 3 suspects. Tap them, then confirm.';
    }
    case 'morning': {
      const kill = game.nights.at(-1)?.kill;
      if (kill === undefined) return 'No shooting tonight. Start the day.';
      return kill === null ? 'The mafia missed. Nobody leaves.' : `Player ${kill} was killed.`;
    }
    case 'over':
      return 'Hold to start a new game.';
  }
}
