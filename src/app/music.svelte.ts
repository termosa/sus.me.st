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
  #night = false;
  #loaded: string | null = null;

  constructor() {
    if (typeof indexedDB === 'undefined') return;
    void this.#refresh().then(() => this.#prepare());
  }

  get selected(): string | null {
    return settings.nightTrack;
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
    void this.#prepare().then(() => {
      if (this.#night) void player.play();
    });
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
    if (on) void player.play();
    else player.fadeOut();
  }

  /** On a tap: starts the music if a reload at night left it waiting for a gesture. */
  resume(): void {
    if (this.#night && !player.isPlaying()) void player.play();
  }

  duck(on: boolean): void {
    player.duck(on);
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
