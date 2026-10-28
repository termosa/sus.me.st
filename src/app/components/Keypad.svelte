<script lang="ts">
  import Icon from './Icon.svelte';

  /** 0–10 and a confirm key: a full 4×3 pad (6×2 when short), since a table never has more than 10. */
  let {
    value,
    limit,
    onpick,
    onconfirm,
  }: {
    /** The count shown as chosen; null when nothing is being entered. */
    value: number | null;
    /** Counts above this are greyed out; null greys out them all. */
    limit: number | null;
    onpick: (count: number) => void;
    onconfirm: () => void;
  } = $props();

  const KEYS = Array.from({ length: 11 }, (_, n) => n);
</script>

<div class="pad">
  {#each KEYS as n (n)}
    <button
      type="button"
      class="key"
      class:on={n === value}
      aria-pressed={n === value}
      disabled={limit === null || n > limit}
      onclick={() => onpick(n)}
    >
      {n}
    </button>
  {/each}
  <button type="button" class="key confirm" aria-label="Confirm" onclick={onconfirm}>
    <Icon name="check" size={30} />
  </button>
</div>

<style>
  .pad {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .key {
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: 56px;
    padding: 0;
    font-size: 24px;
    font-weight: 800;
    transition:
      background-color 150ms,
      opacity 150ms;
  }

  .key.on {
    background: var(--text);
    color: var(--bg);
  }

  .key:disabled {
    opacity: 0.2;
  }

  .confirm {
    background: var(--accent);
    color: var(--bg);
  }

  /* Phones on their side: two rows of six to save height. */
  @media (orientation: landscape) and (max-height: 560px) {
    .pad {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 6px;
    }

    .key {
      min-height: 44px;
    }
  }
</style>
