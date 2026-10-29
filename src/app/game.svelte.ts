import { newGame, RuleError, reduce, replay } from '../engine/game';
import type { PlayerCount, Timings } from '../engine/rules';
import { stepKey, stepSeconds } from '../engine/selectors';
import { createSetup } from '../engine/setup';
import type { Dealing, Game, GameEvent, Setup, Step } from '../engine/types';
import { vibrate } from '../platform/haptics';
import { forget, load, save } from '../platform/storage';
import { newTimer, pauseTimer, startTimer, type Timer } from '../platform/timer';
import { cue, say } from './cues';
import { withViewTransition } from './motion/transition';
import { music } from './music.svelte';
import { announcement } from './narration';
import { GAME_KEY, restore, type Saved, SCHEMA_VERSION } from './session';
import { settings } from './settings.svelte';

const TIMER_KEY = 'timer:v1';

function isNight(step: Step): boolean {
  return step.kind === 'night' || step.kind === 'night0';
}

function phaseChanged(before: Game, after: Game): boolean {
  return isNight(before.step) !== isNight(after.step);
}

function loadTimer(): Timer | null {
  const t = load(TIMER_KEY) as Timer | null;
  return t && typeof t.key === 'string' && typeof t.leftMs === 'number' ? t : null;
}

function untouched(timer: Timer): boolean {
  return timer.endsAt === null && timer.leftMs === timer.totalMs;
}

/**
 * A new step gets a fresh, idle timer; the same step keeps its own, unless it was never
 * started and its length changed in settings.
 */
function timerFor(game: Game, current: Timer | null): Timer | null {
  const seconds = stepSeconds(game);
  if (!seconds) return null;
  const key = stepKey(game);
  const keep = current?.key === key && !(untouched(current) && current.totalMs !== seconds * 1000);
  return keep ? current : newTimer(key, seconds * 1000);
}

/** The running game: an event log, the state replayed from it, and the step timer. */
class Session {
  /** What the screen shows. During a View Transition it updates a frame after the log. */
  game: Game | null = $state.raw(null);
  timer: Timer | null = $state.raw(null);

  // The source of truth, always current, so saves and fast taps never see a stale state.
  #setup: Setup | null = null;
  #events: GameEvent[] = [];
  #game: Game | null = null;
  #timer: Timer | null = null;

  constructor() {
    const saved = restore(load(GAME_KEY));
    if (!saved) return;
    this.#timer = loadTimer();
    this.#commit(saved.setup, saved.events, saved.game);
  }

  start(count: PlayerCount, dealing: Dealing): void {
    const setup = createSetup(count, settings.timings, dealing);
    this.#commit(setup, [], newGame(setup));
  }

  /** Applies a host action; returns false (and buzzes) when the rules don't allow it. */
  dispatch = (action: GameEvent): boolean => {
    // Components may pass reactive arrays; the log keeps plain data only.
    const event = $state.snapshot(action);
    const game = this.#game;
    if (!this.#setup || !game) return false;
    let next: Game;
    try {
      next = reduce(game, event);
    } catch (error) {
      if (!(error instanceof RuleError)) throw error;
      vibrate(80);
      cue('error');
      return false;
    }
    this.#commit(this.#setup, [...this.#events, event], next, phaseChanged(game, next));
    this.#narrate(game, next);
    return true;
  };

  undo = (): void => {
    if (!this.#setup || this.#events.length === 0) return;
    const before = this.#game;
    const events = this.#events.slice(0, -1);
    const game = replay(this.#setup, events);
    this.#commit(this.#setup, events, game);
    this.#narrate(before, game);
  };

  quit = (): void => {
    this.#setup = null;
    this.#events = [];
    this.#game = null;
    this.#timer = null;
    say(null);
    music.setNight(false);
    this.game = null;
    this.timer = null;
    forget(GAME_KEY);
    forget(TIMER_KEY);
  };

  toggleTimer = (): void => {
    const t = this.#timer;
    if (!t) return;
    this.#timer = t.endsAt === null ? startTimer(t, Date.now()) : pauseTimer(t, Date.now());
    this.timer = this.#timer;
    save(TIMER_KEY, this.#timer);
    // A timed step is called out as its timer starts, not again on resume.
    if (untouched(t) && this.#game) say(announcement(this.#game));
  };

  /** Applies new timings to the running game from its next timer on. */
  retime = (timings: Timings): void => {
    const setup = this.#setup;
    if (!setup) return;
    const next = { ...setup, timings: { ...timings } };
    this.#commit(next, this.#events, replay(next, this.#events));
  };

  /**
   * Cues a change of phase and calls out a new step; the same step stays quiet.
   * A timed step is called out when its timer starts instead.
   */
  #narrate(before: Game | null, after: Game): void {
    if (before && stepKey(before) === stepKey(after)) return;
    const phaseChange = before !== null && phaseChanged(before, after);
    if (phaseChange) cue(isNight(after.step) ? 'night' : 'day');
    say(this.#timer ? null : announcement(after), phaseChange ? 900 : 0);
  }

  #commit(setup: Setup, events: GameEvent[], game: Game, animate = false): void {
    this.#setup = setup;
    this.#events = events;
    this.#game = game;
    this.#timer = timerFor(game, this.#timer);
    const saved: Saved = { schemaVersion: SCHEMA_VERSION, setup, events };
    save(GAME_KEY, saved);
    save(TIMER_KEY, this.#timer);
    // Called inside the tap that changed the step, so the music may start.
    music.setNight(isNight(game.step));
    const timer = this.#timer;
    const show = () => {
      this.game = game;
      this.timer = timer;
    };
    if (animate) withViewTransition(show);
    else show();
  }
}

export const session = new Session();
