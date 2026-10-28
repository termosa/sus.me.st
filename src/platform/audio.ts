let context: AudioContext | null = null;

interface AudioSessionNavigator {
  audioSession?: { type: string };
}

/** Must run inside a tap: iOS only lets audio start from a user gesture. */
export function unlockAudio(): void {
  context ??= new AudioContext();
  if (context.state !== 'running') void context.resume();
}

/**
 * iOS mutes web audio on the silent switch unless the session type is "playback",
 * which also pauses other audio such as the host's music, so it is opt-in.
 */
export function playThroughSilentMode(on: boolean): void {
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (session) session.type = on ? 'playback' : 'auto';
}

export interface Note {
  hz: number;
  /** Seconds after the first note. */
  at: number;
  length: number;
  /** Peak volume, 0–1. */
  gain: number;
  wave?: OscillatorType;
}

/** Plays synthesized notes; silent until {@link unlockAudio} has run. */
export function playNotes(notes: readonly Note[]): void {
  if (!context) return;
  if (context.state !== 'running') void context.resume();
  const start = context.currentTime;
  for (const note of notes) {
    const at = start + note.at;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = note.wave ?? 'sine';
    osc.frequency.value = note.hz;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(note.gain, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + note.length);
    osc.connect(gain).connect(context.destination);
    osc.start(at);
    osc.stop(at + note.length + 0.05);
  }
}
