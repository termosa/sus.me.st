<script lang="ts">
  import { music } from '../music.svelte';
  import Icon from './Icon.svelte';
</script>

<div class="bar">
  <button
    type="button"
    aria-label="Previous track"
    disabled={music.playlist.length < 2}
    onclick={() => music.skip(-1)}
  >
    <Icon name="prev" size={20} />
  </button>
  <button
    type="button"
    class="toggle"
    aria-label={music.playing ? 'Pause music' : 'Play music'}
    onclick={() => music.toggle()}
  >
    <Icon name={music.playing ? 'pause' : 'play'} size={20} />
  </button>
  <button
    type="button"
    aria-label="Next track"
    disabled={music.playlist.length < 2}
    onclick={() => music.skip(1)}
  >
    <Icon name="skip" size={20} />
  </button>
  <span class="name" class:dim={!music.playing}>
    <Icon name="music" size={16} />
    <span>{music.track?.name ?? '—'}</span>
  </span>
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 2px 12px 2px 2px;
    border-radius: 999px;
    background: var(--surface);
  }

  button {
    display: grid;
    place-items: center;
    min-width: 44px;
    min-height: 44px;
    border-radius: 50%;
    background: none;
    color: var(--text-dim);
  }

  button:disabled {
    opacity: 0.3;
  }

  .toggle {
    color: var(--text);
  }

  .name {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    margin-left: 6px;
    color: var(--text);
    font-size: 15px;
  }

  .name > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name.dim {
    color: var(--text-dim);
  }
</style>
