<script lang="ts">
  /** Every count from 0 to `max` as a button, so a count is set in one tap. */
  let {
    value,
    max,
    limit = max,
    label,
    onpick,
  }: {
    value: number;
    max: number;
    /** Counts above this are greyed out. */
    limit?: number;
    label: string;
    onpick: (count: number) => void;
  } = $props();

  const counts = $derived(Array.from({ length: max + 1 }, (_, n) => n));
</script>

<fieldset class="picker" aria-label={label} style:--cols={Math.ceil((max + 1) / 2)}>
  {#each counts as n (n)}
    <button
      type="button"
      aria-pressed={n === value}
      class:on={n === value}
      disabled={n > limit}
      onclick={() => onpick(n)}
    >
      {n}
    </button>
  {/each}
</fieldset>

<style>
  /* Two rows, so even 0–10 keeps fingertip-sized buttons on a phone. */
  .picker {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 6px;
  }

  button {
    min-width: 0;
    min-height: 44px;
    padding: 0;
    font-size: 20px;
    font-weight: 800;
  }

  button.on {
    background: var(--accent);
    color: var(--bg);
  }

  button:disabled {
    opacity: 0.25;
  }
</style>
