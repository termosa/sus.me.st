<script lang="ts">
  import { needRefresh, updateServiceWorker } from '../../platform/pwa';
  import Icon from './Icon.svelte';
</script>

{#if $needRefresh}
  <button type="button" class="update" aria-label="Update" onclick={() => updateServiceWorker(true)}>
    <Icon name="download" />
  </button>
{/if}

<style>
  .update {
    display: grid;
    place-items: center;
    color: var(--accent);
    background: var(--surface);
    animation: glow 1.6s ease-in-out infinite;
  }

  @keyframes glow {
    50% {
      box-shadow: 0 0 0 4px rgb(245 197 66 / 0.25);
    }
  }
</style>
