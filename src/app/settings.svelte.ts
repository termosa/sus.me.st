import { DEFAULT_TIMINGS, type Timings } from '../engine/rules';
import { playThroughSilentMode } from '../platform/audio';
import { load, save } from '../platform/storage';

const SETTINGS_KEY = 'settings:v1';

/** Only the night timers are configurable; day timings are fixed by the rules (D-1, T-1, L-1). */
export const CONFIGURABLE = ['night0FreeSitting', 'donCheck', 'sheriffCheck'] as const;

export interface Settings {
  timings: Timings;
  /** iOS: play cues with the silent switch on (pauses other audio). */
  cuesInSilentMode: boolean;
  sounds: boolean;
  /** Announce speakers, votes and night steps aloud. */
  voice: boolean;
  /** A line of text explaining the current step, for first-time hosts. */
  hints: boolean;
  /** Music during nights at all. */
  nightMusic: boolean;
  /** The track that plays during nights; null for the first built-in one. */
  nightTrack: string | null;
  /** 0–1. */
  musicVolume: number;
}

function initial(): Settings {
  const saved = load(SETTINGS_KEY) as Partial<Settings> | null;
  const timings: Timings = { ...DEFAULT_TIMINGS };
  for (const key of CONFIGURABLE) {
    const value = saved?.timings?.[key];
    if (typeof value === 'number' && value > 0) timings[key] = value;
  }
  return {
    timings,
    cuesInSilentMode: saved?.cuesInSilentMode === true,
    sounds: saved?.sounds !== false,
    voice: saved?.voice !== false,
    hints: saved?.hints !== false,
    nightMusic: saved?.nightMusic !== false,
    nightTrack: typeof saved?.nightTrack === 'string' ? saved.nightTrack : null,
    musicVolume:
      typeof saved?.musicVolume === 'number' && saved.musicVolume >= 0 && saved.musicVolume <= 1
        ? saved.musicVolume
        : 0.6,
  };
}

export const settings: Settings = $state(initial());

playThroughSilentMode(settings.cuesInSilentMode);

export function saveSettings(): void {
  playThroughSilentMode(settings.cuesInSilentMode);
  save(SETTINGS_KEY, $state.snapshot(settings));
}

export function resetTimings(): void {
  settings.timings = { ...DEFAULT_TIMINGS };
  saveSettings();
}
