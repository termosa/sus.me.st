<script lang="ts">
  import { tick } from 'svelte';
  import { cue } from '../cues';
  import { music } from '../music.svelte';
  import { saveSettings, settings } from '../settings.svelte';
  import Hint from './Hint.svelte';
  import Icon from './Icon.svelte';

  /** Set when opened from settings: a back button returns there. */
  let { onback }: { onback?: () => void } = $props();

  let busy = $state(false);
  /** The track whose name is being edited. */
  let editing: string | null = $state(null);
  let field: HTMLInputElement | undefined = $state();
  let showHidden = $state(false);
  const hidden = $derived(music.tracks.filter((t) => t.hidden));

  const GAP = 8;
  /** A track being dragged by its grip: where it started, where it would land. */
  let drag: {
    id: string;
    from: number;
    to: number;
    startY: number;
    dy: number;
    /** Row height plus the gap: how far one place is. */
    pitch: number;
  } | null = $state(null);

  function grab(event: PointerEvent, id: string, index: number) {
    if (event.button !== 0 || editing) return;
    const grip = event.currentTarget as HTMLElement;
    grip.setPointerCapture(event.pointerId);
    const pitch = (grip.parentElement?.offsetHeight ?? 0) + GAP;
    drag = { id, from: index, to: index, startY: event.clientY, dy: 0, pitch };
  }

  function pull(event: PointerEvent) {
    if (!drag) return;
    const last = music.playlist.length - 1;
    const dy = event.clientY - drag.startY;
    drag.dy = Math.max(-drag.from * drag.pitch, Math.min((last - drag.from) * drag.pitch, dy));
    drag.to = drag.from + Math.round(drag.dy / drag.pitch);
  }

  function drop() {
    if (drag && drag.to !== drag.from) music.move(drag.id, drag.to);
    drag = null;
  }

  /** Where a row is drawn during a drag: the dragged one follows the finger, others make room. */
  function offset(index: number): number {
    if (!drag) return 0;
    const { from, to, pitch } = drag;
    if (index === from) return drag.dy;
    if (from < to && index > from && index <= to) return -pitch;
    if (from > to && index < from && index >= to) return pitch;
    return 0;
  }

  /** The last tap on a track, to tell a double tap: the first picks it, the second renames it. */
  let lastTap = { id: '', at: 0 };

  function tap(id: string) {
    const now = performance.now();
    if (lastTap.id === id && now - lastTap.at < 400) {
      lastTap = { id: '', at: 0 };
      editing = id;
      return;
    }
    lastTap = { id, at: now };
    music.select(id);
  }

  /** Arrow keys on a grip move its track; the grip keeps the focus. */
  async function nudge(event: KeyboardEvent, id: string, index: number) {
    const by = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    const to = index + by;
    if (!by || to < 0 || to >= music.playlist.length) return;
    event.preventDefault();
    music.move(id, to);
    await tick();
    document.querySelector<HTMLElement>(`[data-grip="${id}"]`)?.focus();
  }

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
  {#if onback}
    <button type="button" class="back" aria-label="Back to settings" onclick={onback}>
      <Icon name="back" />
    </button>
  {/if}
  <Hint
    text="Plays during the night to cover table noise. Pick the track before night falls; double-tap one to rename it."
  />

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

  <div class="list" class:dragging={drag}>
    {#each music.playlist as track, index (track.id)}
      <div
        class="row"
        class:lifted={drag?.id === track.id}
        style:transform={drag ? `translateY(${offset(index)}px)` : null}
      >
        <button
          type="button"
          class="icon-button grip"
          data-grip={track.id}
          aria-label="Move {track.name} (arrow keys)"
          onpointerdown={(e) => grab(e, track.id, index)}
          onpointermove={pull}
          onpointerup={drop}
          onpointercancel={() => (drag = null)}
          onkeydown={(e) => nudge(e, track.id, index)}
        >
          <Icon name="grip" />
        </button>
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
          <!-- In place of hide or delete. Keeps the focus in the field, so its blur doesn't save first. -->
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
            class="track"
            class:on={music.selected === track.id}
            aria-pressed={music.selected === track.id}
            title="Double-tap to rename"
            onclick={() => tap(track.id)}
          >
            <Icon name="music" />
            <span>{track.name}</span>
          </button>
          {#if track.builtIn}
            <button
              type="button"
              class="icon-button"
              aria-label="Hide {track.name}"
              onclick={() => music.hide(track.id)}
            >
              <Icon name="hide" />
            </button>
          {:else}
            <button
              type="button"
              class="icon-button"
              aria-label="Delete {track.name}"
              onclick={() => music.remove(track.id)}
            >
              <Icon name="remove" />
            </button>
          {/if}
        {/if}
      </div>
    {/each}
  </div>

  {#if hidden.length > 0}
    <button
      type="button"
      class="disclose"
      aria-expanded={showHidden}
      onclick={() => (showHidden = !showHidden)}
    >
      <Icon name="hide" size={20} />
      <span>Hidden ({hidden.length})</span>
    </button>
    {#if showHidden}
      {#each hidden as track (track.id)}
        <div class="row hidden-row">
          <span class="track">
            <Icon name="music" />
            <span>{track.name}</span>
          </span>
          <button
            type="button"
            class="icon-button"
            aria-label="Show {track.name}"
            onclick={() => music.show(track.id)}
          >
            <Icon name="eye" />
          </button>
        </div>
      {/each}
    {/if}
  {/if}

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

  .back {
    display: grid;
    place-items: center;
    justify-self: start;
    background: none;
    color: var(--text-dim);
  }

  .music > :global(.hint) {
    justify-self: center;
  }

  .list {
    display: grid;
    gap: 8px;
  }

  .row {
    display: grid;
    grid-template-columns: 32px 1fr var(--tap);
    gap: 8px;
    position: relative;
  }

  .dragging .row {
    transition: transform 150ms ease;
  }

  .dragging .row.lifted {
    z-index: 1;
    transition: none;
  }

  .grip {
    min-width: 0;
    cursor: grab;
    touch-action: none;
  }

  .lifted .grip {
    cursor: grabbing;
    color: var(--text);
  }

  .hidden-row {
    grid-template-columns: 1fr var(--tap);
  }

  .disclose {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 6px;
    background: none;
    color: var(--text-dim);
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

  .lifted .track {
    box-shadow: 0 8px 24px rgb(0 0 0 / 50%);
  }

  .hidden-row .track {
    background: none;
    color: var(--text-dim);
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
