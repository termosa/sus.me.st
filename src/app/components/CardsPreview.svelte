<script lang="ts">
  import { fade } from 'svelte/transition';
  import { ROLES } from '../../engine/rules';
  import Icon from './Icon.svelte';
  import RoleArt from './RoleArt.svelte';

  /** Every role card face up, to show the players before the game. */
  let { onclose }: { onclose: () => void } = $props();
</script>

<div class="preview" role="dialog" aria-modal="true" aria-label="The cards" transition:fade={{ duration: 150 }}>
  <button type="button" class="close" aria-label="Close" onclick={onclose}>
    <Icon name="close" />
  </button>
  <div class="cards">
    {#each ROLES as role (role)}
      <div class="card"><RoleArt {role} /></div>
    {/each}
  </div>
</div>

<style>
  .preview {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    padding: 16px;
    background: var(--bg);
  }

  .close {
    position: absolute;
    top: 12px;
    right: 12px;
    display: grid;
    place-items: center;
    background: none;
    color: var(--text-dim);
  }

  /* 2×2 cards in portrait, one row of 4 in landscape; sized to fit both ways. */
  .cards {
    --cols: 2;
    --rows: 2;
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 12px;
    width: min(100%, (100dvh - 112px) / var(--rows) * 3 / 4 * var(--cols), 640px);
  }

  @media (orientation: landscape) {
    .cards {
      --cols: 4;
      --rows: 1;
      width: min(100%, (100dvh - 96px) * 3 / 4 * var(--cols), 960px);
    }
  }

  .card {
    aspect-ratio: 3 / 4;
    overflow: hidden;
    border-radius: 16px;
  }
</style>
