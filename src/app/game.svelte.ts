import { newGame, RuleError, reduce, replay } from '../engine/game';
import type { PlayerCount } from '../engine/rules';
import { stepKey, stepSeconds } from '../engine/selectors';
import { createSetup } from '../engine/setup';
import type { Game, GameEvent, Setup, Step } from '../engine/types';
import { vibrate } from '../platform/haptics';
import { forget, load, save } from '../platform/storage';
import { newTimer, pauseTimer, startTimer, type Timer } from '../platform/timer';
import { withViewTransition } from './motion/transition';
import { GAME_KEY, restore, type Saved, SCHEMA_VERSION } from './session';
import { settings } from './settings.svelte';

const TIMER_KEY = 'timer:v1';

function isNight(step: Step): boolean {
  return step.kind === 'night' || step.kind === 'night0';
}

function loadTimer(): Timer | null {
  const t = load(TIMER_KEY) as Timer | null;
  return t && typeof t.key === 'string' && typeof t.leftMs === 'number' ? t : null;
}

/** A new step gets a fresh, idle timer; the same step keeps its running one. */
function timerFor(game: Game, current: Timer | null): Timer | null {
  const seconds = stepSeconds(game);
  if (!seconds) return null;
  const key = stepKey(game);
  return current?.key === key ? current : newTimer(key, seconds * 1000);
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

  start(count: PlayerCount): void {
    const setup = createSetup(count, settings.timings);
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
      return false;
    }
    const phaseChange = isNight(game.step) !== isNight(next.step);
    this.#commit(this.#setup, [...this.#events, event], next, phaseChange);
    return true;
  };

  undo = (): void => {
    if (!this.#setup || this.#events.length === 0) return;
    const events = this.#events.slice(0, -1);
    this.#commit(this.#setup, events, replay(this.#setup, events));
  };

  quit = (): void => {
    this.#setup = null;
    this.#events = [];
    this.#game = null;
    this.#timer = null;
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
  };

  #commit(setup: Setup, events: GameEvent[], game: Game, animate = false): void {
    this.#setup = setup;
    this.#events = events;
    this.#game = game;
    this.#timer = timerFor(game, this.#timer);
    const saved: Saved = { schemaVersion: SCHEMA_VERSION, setup, events };
    save(GAME_KEY, saved);
    save(TIMER_KEY, this.#timer);
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
