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

/** A short synthesized tone; `long` marks the end of a timer. */
export function beep(long = false): void {
  if (!context) return;
  if (context.state !== 'running') void context.resume();
  const at = context.currentTime;
  const length = long ? 0.6 : 0.15;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.frequency.value = long ? 660 : 880;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.4, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(context.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}
