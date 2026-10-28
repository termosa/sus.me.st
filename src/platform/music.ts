import { audioContext } from './audio';

/**
 * One looping music player. It plays through the shared AudioContext when there is
 * one, because iOS ignores the volume of a plain audio element and so can't fade it.
 */
let element: HTMLAudioElement | null = null;
let gain: GainNode | null = null;
let url: string | null = null;
let level = 1;
let ducked = false;
let stopTimer: ReturnType<typeof setTimeout> | undefined;

const FADE_S = 1.5;
const DUCKED = 0.3;

function player(): HTMLAudioElement {
  element ??= Object.assign(new Audio(), { loop: true, preload: 'auto' });
  const context = audioContext();
  if (context && !gain) {
    gain = context.createGain();
    gain.gain.value = 0;
    context.createMediaElementSource(element).connect(gain).connect(context.destination);
  }
  return element;
}

function target(): number {
  return ducked ? level * DUCKED : level;
}

function rampTo(value: number, seconds: number): void {
  const context = audioContext();
  if (gain && context) {
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(value, now + seconds);
  } else if (element) {
    element.volume = value;
  }
}

/** Loads a track without playing it, so a later {@link play} can start inside a tap. */
export function load(blob: Blob | null): void {
  const el = player();
  if (url) URL.revokeObjectURL(url);
  url = blob ? URL.createObjectURL(blob) : null;
  if (url) el.src = url;
  else el.removeAttribute('src');
}

/** Fades the loaded track in; resolves false when the browser blocked playback. */
export async function play(): Promise<boolean> {
  const el = player();
  if (!url) return false;
  clearTimeout(stopTimer);
  try {
    await el.play();
  } catch {
    return false;
  }
  rampTo(target(), FADE_S);
  return true;
}

export function fadeOut(): void {
  if (!element || element.paused) return;
  rampTo(0, FADE_S);
  clearTimeout(stopTimer);
  stopTimer = setTimeout(() => element?.pause(), FADE_S * 1000);
}

export function isPlaying(): boolean {
  return !!element && !element.paused;
}

export function setLevel(value: number): void {
  level = value;
  if (isPlaying()) rampTo(target(), 0.2);
}

/** Lowers the music while the voice speaks. */
export function duck(on: boolean): void {
  ducked = on;
  if (isPlaying()) rampTo(target(), 0.3);
}
