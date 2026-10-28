<script lang="ts">
  import { cue } from '../cues';
  import { music } from '../music.svelte';
  import { saveSettings, settings } from '../settings.svelte';
  import Hint from './Hint.svelte';
  import Icon from './Icon.svelte';

  let busy = $state(false);
  /** The track whose name is being edited. */
  let editing: string | null = $state(null);
  let field: HTMLInputElement | undefined = $state();

  function rename(id: string, input: HTMLInputElement) {
    if (editing !== id) return;
    editing = null;
    music.rename(id, input.value);
  }

  function focus(input: HTMLInputElement) {
    input.focus();
    input.select();
  }

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
    <div class="row" class:own={!track.builtIn}>
      {#if editing === track.id}
        <input
          class="track name"
          aria-label="Track name"
          value={track.name}
          maxlength="40"
          enterkeyhint="done"
          bind:this={field}
          {@attach focus}
          onblur={(e) => rename(track.id, e.currentTarget)}
          onkeydown={(e) => {
            if (e.key === 'Enter') rename(track.id, e.currentTarget);
            if (e.key === 'Escape') editing = null;
          }}
        />
      {:else}
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
      {/if}
      {#if editing === track.id}
        <!-- Keeps the focus in the field, so its blur doesn't save first. -->
        <button
          type="button"
          class="icon-button"
          aria-label="Save name"
          onpointerdown={(e) => e.preventDefault()}
          onclick={() => field && rename(track.id, field)}
        >
          <Icon name="check" />
        </button>
      {:else}
        <button
          type="button"
          class="icon-button"
          aria-label="Rename {track.name}"
          onclick={() => (editing = track.id)}
        >
          <Icon name="edit" />
        </button>
      {/if}
      {#if !track.builtIn}
        <button
          type="button"
          class="icon-button"
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

  .row.own {
    grid-template-columns: 1fr var(--tap) var(--tap);
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

  .name {
    width: 100%;
    min-height: var(--tap);
    border-color: var(--accent);
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text);
    font: inherit;
  }

  .icon-button {
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
