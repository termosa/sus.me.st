<script lang="ts">
  import { settings } from '../settings.svelte';

  /** A line of plain English for first-time hosts; hidden when hints are off in settings. */
  let { text }: { text: string } = $props();
</script>

{#if settings.hints}
  <p class="hint">{text}</p>
{/if}

<style>
  .hint {
    margin: 0;
    max-width: 36ch;
    color: var(--text-dim);
    font-size: 15px;
    line-height: 1.35;
    text-align: center;
    text-wrap: balance;
    user-select: none;
  }
</style>
