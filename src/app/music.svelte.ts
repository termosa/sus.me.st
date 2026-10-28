import * as player from '../platform/music';
import { addTrack, listTracks, loadTrack, removeTrack, type TrackInfo } from '../platform/tracks';
import { saveSettings, settings } from './settings.svelte';

/**
 * Music for the night: the chosen track fades in as night falls and out at morning.
 * The track is loaded ahead of time so it can start inside the tap that begins the night,
 * which iOS requires.
 */
class NightMusic {
  tracks: TrackInfo[] = $state([]);
  /** Whether music is playing now, for the night controls. */
  playing = $state(false);
  #night = false;
  /** The host paused it; holds until they resume or the next night begins. */
  #paused = false;
  #loaded: string | null = null;

  constructor() {
    if (typeof indexedDB === 'undefined') return;
    void this.#refresh().then(() => this.#prepare());
  }

  get selected(): string | null {
    return settings.nightTrack;
  }

  get track(): TrackInfo | undefined {
    return this.tracks.find((t) => t.id === settings.nightTrack);
  }

  async add(files: FileList | File[]): Promise<void> {
    for (const file of files) {
      const track = await addTrack(file);
      settings.nightTrack ??= track.id;
    }
    saveSettings();
    await this.#refresh();
    await this.#prepare();
  }

  async remove(id: string): Promise<void> {
    await removeTrack(id);
    if (settings.nightTrack === id) this.select(null);
    await this.#refresh();
  }

  /** Picks the track for the coming night; during a night it switches at once. */
  select(id: string | null): void {
    settings.nightTrack = id;
    saveSettings();
    if (id === null) this.#stop();
    void this.#prepare().then(() => this.#sync());
  }

  /** The next or previous track, wrapping around the list. */
  skip(by: 1 | -1): void {
    if (this.tracks.length === 0) return;
    const at = this.tracks.findIndex((t) => t.id === settings.nightTrack);
    const next = this.tracks[(at + by + this.tracks.length) % this.tracks.length];
    this.#paused = false;
    if (next) this.select(next.id);
  }

  toggle(): void {
    if (!this.track) {
      this.skip(1);
      return;
    }
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
    this.tracks = await listTracks();
    if (settings.nightTrack && !this.tracks.some((t) => t.id === settings.nightTrack)) {
      settings.nightTrack = null;
      saveSettings();
    }
  }

  async #prepare(): Promise<void> {
    const id = settings.nightTrack;
    if (id === this.#loaded) return;
    this.#loaded = id;
    player.setLevel(settings.musicVolume);
    player.load(id ? await loadTrack(id) : null);
  }
}

export const music = new NightMusic();
