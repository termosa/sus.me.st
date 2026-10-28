<script lang="ts">
  import { untrack } from 'svelte';
  import { raisePasses } from '../../engine/rules';
  import { alivePlayers } from '../../engine/selectors';
  import type { Game } from '../../engine/types';
  import { session } from '../game.svelte';
  import CountPicker from './CountPicker.svelte';
  import Icon from './Icon.svelte';

  /** Vote counts per candidate (V-7: the last one gets the rest), or the raise count (T-5). */
  let { game, candidates, raise }: { game: Game; candidates: number[]; raise: boolean } = $props();

  const alive = $derived(alivePlayers(game).length);
  // Play keys this panel by step, so the candidates are fixed for its lifetime.
  let counts = $state(untrack(() => candidates.slice(0, -1).map(() => 0)));
  let yes = $state(0);
  const rest = $derived(alive - counts.reduce((a, b) => a + b, 0));
  const passes = $derived(raisePasses(yes, alive));


  function confirm() {
    if (raise) session.dispatch({ type: 'raise', yes });
    else session.dispatch({ type: 'vote', counts: [...counts, rest] });
  }
</script>

<div class="panel">
  <div class="title">
    <Icon name={raise ? 'hand' : 'vote'} size={40} />
    <span class="alive"><Icon name="person" size={18} />{alive}</span>
  </div>

  {#if raise}
    <div class="seats">
      {#each candidates as seat (seat)}<span class="seat">{seat}</span>{/each}
    </div>
    <CountPicker value={yes} max={alive} label="Hands raised" onpick={(n) => (yes = n)} />
    <div class="need" class:passes>{yes} &gt; {alive / 2}</div>
  {:else}
    {#each candidates as seat, i (seat)}
      <div class="row">
        <span class="seat">{seat}</span>
        {#if i < counts.length}
          <!-- Up to what is still unassigned, so the total never passes the table. -->
          <CountPicker
            value={counts[i] ?? 0}
            max={alive}
            limit={(counts[i] ?? 0) + rest}
            label="Votes for {seat}"
            onpick={(n) => (counts[i] = n)}
          />
        {:else}
          <span class="count rest">{rest}</span>
        {/if}
      </div>
    {/each}
  {/if}

  <button type="button" class="confirm" aria-label="Confirm" onclick={confirm}>
    <Icon name="check" size={32} />
  </button>
</div>

<style>
  .panel {
    display: grid;
    gap: 10px;
    width: 100%;
    max-width: 360px;
  }

  .title {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .alive {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-dim);
    font-size: 20px;
  }

  .row {
    display: grid;
    grid-template-columns: 48px 1fr;
    align-items: center;
    gap: 10px;
  }

  .seats {
    display: flex;
    justify-content: center;
    gap: 8px;
  }

  .seat {
    display: grid;
    place-items: center;
    height: 48px;
    min-width: 48px;
    border-radius: 12px;
    background: var(--red);
    color: #fff;
    font-size: 24px;
    font-weight: 800;
  }

  .count {
    text-align: center;
    font-size: 36px;
    font-weight: 800;
  }

  .rest {
    color: var(--text-dim);
  }

  .passes {
    color: var(--red);
  }

  .need {
    text-align: center;
    color: var(--text-dim);
    font-size: 20px;
  }

  .confirm {
    display: grid;
    place-items: center;
    min-height: 64px;
    margin-top: 8px;
    background: var(--accent);
    color: var(--bg);
  }

  /* Phones on their side: tighter rows so a few candidates fit without scrolling. */
  @media (orientation: landscape) and (max-height: 560px) {
    .panel {
      --tap: 44px;
      gap: 6px;
    }

    .seat {
      height: 40px;
    }

    .panel :global(.picker button) {
      min-height: 36px;
    }

    .count {
      font-size: 28px;
    }

    .confirm {
      min-height: 48px;
      margin-top: 0;
    }
  }
</style>
