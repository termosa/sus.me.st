<script lang="ts">
  import { untrack } from 'svelte';
  import { raisePasses } from '../../engine/rules';
  import { alivePlayers } from '../../engine/selectors';
  import type { Game } from '../../engine/types';
  import { session } from '../game.svelte';
  import Icon from './Icon.svelte';
  import Keypad from './Keypad.svelte';

  /** Vote counts per candidate (V-7: the last one gets the rest), or the raise count (T-5). */
  let { game, candidates, raise }: { game: Game; candidates: number[]; raise: boolean } = $props();

  const alive = $derived(alivePlayers(game).length);
  // Play keys this panel by step, so the candidates are fixed for its lifetime.
  let counts = $state(untrack(() => candidates.slice(0, -1).map(() => 0)));
  let yes = $state(0);
  /** The candidate whose count the keypad enters; null once all are in. */
  let active = $state<number | null>(0);
  const rest = $derived(alive - counts.reduce((a, b) => a + b, 0));
  const passes = $derived(raisePasses(yes, alive));

  /** Sets the active count and moves on, the way the host calls the candidates. */
  function pick(n: number) {
    if (raise) {
      yes = n;
      return;
    }
    if (active === null) return;
    counts[active] = n;
    active = active + 1 < counts.length ? active + 1 : null;
  }

  function confirm() {
    if (raise) session.dispatch({ type: 'raise', yes });
    else session.dispatch({ type: 'vote', counts: [...counts, rest] });
  }
</script>

<div class="panel">
  <div class="title">
    <Icon name={raise ? 'hand' : 'vote'} size={32} />
    <span class="alive"><Icon name="person" size={18} />{alive}</span>
  </div>

  <div class="board">
    {#each candidates as seat, i (seat)}
      {#if raise}
        <div class="tile">
          <span class="seat">{seat}</span>
        </div>
      {:else if i < counts.length}
        <button
          type="button"
          class="tile"
          class:active={active === i}
          aria-label="Votes for {seat}: {counts[i]}"
          onclick={() => (active = i)}
        >
          <span class="seat">{seat}</span>
          <span class="count">{counts[i]}</span>
        </button>
      {:else}
        <!-- V-7: whatever is left goes to the last candidate. -->
        <div class="tile auto" role="img" aria-label="Votes for {seat}: {rest}">
          <span class="seat">{seat}</span>
          <span class="count">{rest}</span>
        </div>
      {/if}
    {/each}
  </div>

  {#if raise}
    <div class="tally" class:passes>
      <Icon name="hand" size={24} />
      <span class="count">{yes}</span>
      <span class="need">&gt; {alive / 2}</span>
    </div>
  {/if}

  <Keypad
    value={raise ? yes : active === null ? null : (counts[active] ?? 0)}
    limit={raise ? alive : active === null ? null : (counts[active] ?? 0) + rest}
    onpick={pick}
    onconfirm={confirm}
  />
</div>

<style>
  .panel {
    display: grid;
    gap: 14px;
    width: 100%;
    max-width: 380px;
  }

  .title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--text-dim);
  }

  .alive {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 20px;
    font-weight: 700;
  }

  /* A scoreboard: one tile per candidate, in nomination order. */
  .board {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .tile {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 4px;
    width: 72px;
    min-height: 0;
    padding: 8px 0 10px;
    border: 2px solid transparent;
    border-radius: var(--radius);
    background: var(--surface);
    transition: border-color 150ms;
  }

  .tile.active {
    border-color: var(--accent);
  }

  .seat {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--red);
    color: #fff;
    font-size: 18px;
    font-weight: 800;
  }

  .count {
    font-size: 30px;
    font-weight: 800;
    line-height: 1;
  }

  .auto .count {
    color: var(--text-dim);
  }

  .tally {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 10px;
    color: var(--text-dim);
  }

  .tally .count {
    color: var(--text);
    font-size: 40px;
  }

  .tally.passes .count {
    color: var(--red);
  }

  .need {
    font-size: 20px;
  }

  @media (orientation: landscape) and (max-height: 560px) {
    .panel {
      gap: 8px;
    }

    .tile {
      padding: 4px 0 6px;
    }

    .count {
      font-size: 24px;
    }
  }
</style>
