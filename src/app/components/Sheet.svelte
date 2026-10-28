<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  let { onclose, children }: { onclose: () => void; children: Snippet } = $props();
</script>

<button
  type="button"
  class="backdrop"
  aria-label="Close"
  tabindex="-1"
  onclick={onclose}
  transition:fade={{ duration: 150 }}
></button>
<div class="sheet" role="dialog" aria-modal="true" transition:fly={{ y: 240, duration: 220 }}>
  {@render children()}
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    border-radius: 0;
    background: rgb(0 0 0 / 0.6);
  }

  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-width: var(--content-max);
    margin-inline: auto;
    z-index: 11;
    display: grid;
    gap: var(--gap);
    padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
    border-radius: 24px 24px 0 0;
    background: var(--surface);
    max-height: 85dvh;
    overflow-y: auto;
  }
</style>
