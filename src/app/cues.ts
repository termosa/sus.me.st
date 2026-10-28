import { type Note, playNotes, unlockAudio } from '../platform/audio';
import { hush, speak, unlockSpeech } from '../platform/speech';
import { settings } from './settings.svelte';

const CUES = {
  /** The timer is about to run out. */
  warn: [{ hz: 880, at: 0, length: 0.15, gain: 0.4 }],
  /** The timer ran out. */
  end: [{ hz: 660, at: 0, length: 0.6, gain: 0.4 }],
  /** A falling pair as night begins. */
  night: [
    { hz: 523, at: 0, length: 0.35, gain: 0.4 },
    { hz: 392, at: 0.22, length: 0.6, gain: 0.4 },
  ],
  /** A rising pair as the day begins. */
  day: [
    { hz: 392, at: 0, length: 0.3, gain: 0.4 },
    { hz: 587, at: 0.18, length: 0.55, gain: 0.4 },
  ],
  /** The rules don't allow that. */
  error: [{ hz: 140, at: 0, length: 0.18, gain: 0.15, wave: 'square' }],
} satisfies Record<string, Note[]>;

export type Cue = keyof typeof CUES;

/** Must run inside a tap: iOS only starts audio and speech from a user gesture. */
export function unlockCues(): void {
  unlockAudio();
  unlockSpeech();
}

export function cue(name: Cue): void {
  if (settings.sounds) playNotes(CUES[name]);
}

let pending: ReturnType<typeof setTimeout> | undefined;

/** Speaks `text` after `delayMs` (to let a cue finish); a newer call replaces it. */
export function say(text: string | null, delayMs = 0): void {
  clearTimeout(pending);
  hush();
  if (!text || !settings.voice) return;
  pending = setTimeout(() => speak(text), delayMs);
}
