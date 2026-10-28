<script lang="ts">
  import { cue } from '../cues';
  import { music } from '../music.svelte';
  import { saveSettings, settings } from '../settings.svelte';
  import Hint from './Hint.svelte';
  import Icon from './Icon.svelte';

  let busy = $state(false);

  async function added(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    if (files.length === 0) return;
    busy = true;
    try {
      await music.add(files);
    } catch (error) {
      // Usually the device is out of storage.
      console.error(error);
      cue('error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="music">
  <Hint text="Plays during the night to cover table noise. Pick the track before night falls." />

  <label class="switch">
    <Icon name="music" />
    <span>Night music</span>
    <input
      type="checkbox"
      bind:checked={settings.nightMusic}
      onchange={() => {
        saveSettings();
        music.sync();
      }}
    />
  </label>

  {#each music.tracks as track (track.id)}
    <div class="row">
      <button
        type="button"
        class="track"
        class:on={music.selected === track.id}
        aria-pressed={music.selected === track.id}
        onclick={() => music.select(track.id)}
      >
        <Icon name="music" />
        <span>{track.name}</span>
      </button>
      {#if !track.builtIn}
        <button
          type="button"
          class="remove"
          aria-label="Delete {track.name}"
          onclick={() => music.remove(track.id)}
        >
          <Icon name="remove" />
        </button>
      {/if}
    </div>
  {/each}

  <label class="add" class:busy>
    <Icon name="plus" />
    <span>Add music</span>
    <input type="file" accept="audio/*" multiple disabled={busy} onchange={added} />
  </label>

  <label class="volume">
    <Icon name="volume" />
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      aria-label="Music volume"
      value={settings.musicVolume}
      oninput={(e) => music.setVolume(Number(e.currentTarget.value))}
    />
  </label>
</div>

<style>
  .music {
    display: grid;
    gap: 8px;
  }

  .music > :global(.hint) {
    justify-self: center;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr var(--tap);
    gap: 8px;
  }

  .track {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 0 16px;
    text-align: left;
    border: 2px solid transparent;
  }

  .track span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .track.on {
    border-color: var(--accent);
    color: var(--accent);
  }

  .switch {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 12px;
    min-height: var(--tap);
    color: var(--text-dim);
  }

  .switch input {
    width: 28px;
    height: 28px;
    accent-color: var(--accent);
  }

  .remove {
    display: grid;
    place-items: center;
    background: none;
    color: var(--text-dim);
  }

  .add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: var(--tap);
    border: 2px dashed var(--surface-2);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
  }

  .add.busy {
    opacity: 0.5;
  }

  .add input {
    display: none;
  }

  .volume {
    display: grid;
    grid-template-columns: 24px 1fr;
    align-items: center;
    gap: 12px;
    min-height: var(--tap);
    color: var(--text-dim);
  }

  .volume input {
    width: 100%;
    accent-color: var(--accent);
  }
</style>
