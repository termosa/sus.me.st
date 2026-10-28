import * as player from '../platform/music';
import { addTrack, listTracks, loadTrack, removeTrack } from '../platform/tracks';
import { saveSettings, settings } from './settings.svelte';

export interface Track {
  id: string;
  name: string;
  /** Shipped with the app (public/music, CC0); can't be deleted. */
  builtIn: boolean;
}

const BUILT_IN: Track[] = [
  { id: 'builtin:jazz', name: 'Noir jazz', builtIn: true },
  { id: 'builtin:funk', name: 'Funk', builtIn: true },
  { id: 'builtin:lofi', name: 'Lo-fi', builtIn: true },
  { id: 'builtin:synthwave', name: 'Synthwave', builtIn: true },
  { id: 'builtin:drive', name: 'Midnight drive', builtIn: true },
  { id: 'builtin:street', name: 'Blue street', builtIn: true },
  { id: 'builtin:eighties', name: 'Eighties', builtIn: true },
  { id: 'builtin:rush', name: 'Virtual rush', builtIn: true },
  { id: 'builtin:dark', name: 'Dark synth', builtIn: true },
  { id: 'builtin:rain', name: 'Rain', builtIn: true },
];

const DEFAULT_TRACK = 'builtin:jazz';

/**
 * Built-in tracks are fetched into a blob rather than streamed: the service worker
 * serves them from its cache, which can't answer the range requests Safari makes.
 */
async function trackData(id: string): Promise<Blob | null> {
  if (!id.startsWith('builtin:')) return loadTrack(id);
  try {
    const response = await fetch(`music/${id.slice('builtin:'.length)}.mp3`);
    return response.ok ? await response.blob() : null;
  } catch {
    return null;
  }
}

/** The tracks with the names the host gave them. */
function named(tracks: Track[]): Track[] {
  return tracks.map((t) => ({ ...t, name: settings.trackNames[t.id] ?? t.name }));
}

/**
 * Music for the night: the chosen track fades in as night falls and out at morning.
 * The track is loaded ahead of time so it can start inside the tap that begins the night,
 * which iOS requires.
 */
class NightMusic {
  tracks: Track[] = $state(named(BUILT_IN));
  /** Whether music is playing now, for the night controls. */
  playing = $state(false);
  #night = false;
  /** The host paused it; holds until they resume or the next night begins. */
  #paused = false;
  #loaded: string | null = null;
  /** The tracks under their own names. */
  #own: Track[] = BUILT_IN;

  constructor() {
    if (typeof indexedDB === 'undefined') return;
    void this.#refresh().then(() => this.#prepare());
  }

  /** The chosen track, or the first built-in one. */
  get selected(): string {
    return settings.nightTrack ?? DEFAULT_TRACK;
  }

  get track(): Track | undefined {
    return this.tracks.find((t) => t.id === this.selected);
  }

  /** Adds files and picks the first of them. */
  async add(files: FileList | File[]): Promise<void> {
    let first: string | null = null;
    for (const file of files) first ??= (await addTrack(file)).id;
    await this.#refresh();
    if (first) this.select(first);
  }

  async remove(id: string): Promise<void> {
    await removeTrack(id);
    delete settings.trackNames[id];
    if (this.selected === id) this.select(null);
    await this.#refresh();
  }

  /** Gives a track a name; an empty one brings back its own. */
  rename(id: string, name: string): void {
    const own = this.#own.find((t) => t.id === id)?.name;
    const trimmed = name.trim();
    if (trimmed && trimmed !== own) settings.trackNames[id] = trimmed;
    else delete settings.trackNames[id];
    saveSettings();
    this.tracks = named(this.#own);
  }

  /** Picks the track for the coming night; during a night it switches at once. */
  select(id: string | null): void {
    settings.nightTrack = id;
    saveSettings();
    void this.#prepare().then(() => this.#sync());
  }

  /** The next or previous track, wrapping around the list. */
  skip(by: 1 | -1): void {
    const at = this.tracks.findIndex((t) => t.id === this.selected);
    const next = this.tracks[(at + by + this.tracks.length) % this.tracks.length];
    this.#paused = false;
    if (next) this.select(next.id);
  }

  toggle(): void {
    this.#paused = this.playing;
    if (this.#paused) this.#stop(0.3);
    else this.#sync();
  }

  setVolume(value: number): void {
    settings.musicVolume = value;
    player.setLevel(value);
    saveSettings();
  }

  /** Follows the game: plays while it is night, fades out when the day starts. */
  setNight(on: boolean): void {
    if (on === this.#night) return;
    this.#night = on;
    this.#paused = false;
    if (on) this.#sync();
    else this.#stop();
  }

  /** On a tap: starts music a reload at night left waiting for a gesture. */
  resume(): void {
    if (!this.playing) this.#sync();
  }

  /** After the Night music setting changed. */
  sync(): void {
    this.#sync();
  }

  duck(on: boolean): void {
    player.duck(on);
  }

  #wanted(): boolean {
    return this.#night && !this.#paused && settings.nightMusic;
  }

  #sync(): void {
    if (!this.#wanted()) {
      this.#stop();
      return;
    }
    // Also when already playing: it cancels a fade-out still in progress.
    void player.play().then((ok) => {
      // A pause may have come in while playback was starting.
      this.playing = ok && this.#wanted();
    });
  }

  #stop(seconds?: number): void {
    player.fadeOut(seconds);
    this.playing = false;
  }

  async #refresh(): Promise<void> {
    // Without storage (some private windows) only the built-in tracks are offered.
    const stored = await listTracks().catch(() => []);
    const added = stored.map((t) => ({ ...t, builtIn: false }));
    this.#own = [...BUILT_IN, ...added];
    this.tracks = named(this.#own);
    if (!this.track) {
      settings.nightTrack = null;
      saveSettings();
    }
  }

  async #prepare(): Promise<void> {
    const id = this.selected;
    if (id === this.#loaded) return;
    this.#loaded = id;
    player.setLevel(settings.musicVolume);
    const data = await trackData(id);
    // Another track may have been picked while this one was loading.
    if (this.#loaded === id) player.load(data);
  }
}

export const music = new NightMusic();
