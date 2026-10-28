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
}

function initial(): Settings {
  const saved = load(SETTINGS_KEY) as Partial<Settings> | null;
  const timings: Timings = { ...DEFAULT_TIMINGS };
  for (const key of CONFIGURABLE) {
    const value = saved?.timings?.[key];
    if (typeof value === 'number' && value > 0) timings[key] = value;
  }
  return { timings, cuesInSilentMode: saved?.cuesInSilentMode === true };
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
