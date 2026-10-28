<script lang="ts">
  import type { Game } from '../../engine/types';
  import Hint from '../components/Hint.svelte';
  import HoldButton from '../components/HoldButton.svelte';
  import Icon from '../components/Icon.svelte';
  import SeatGrid from '../components/SeatGrid.svelte';
  import UpdateButton from '../components/UpdateButton.svelte';
  import { session } from '../game.svelte';
  import { hint } from '../narration';

  let { game }: { game: Game } = $props();

  const outcome = $derived(game.outcome);
  const role = (seat: number) => game.players[seat - 1]?.role;
</script>

<main>
  <header>
    <button type="button" class="icon" aria-label="Undo" onclick={session.undo}>
      <Icon name="undo" />
    </button>
    <UpdateButton />
  </header>

  <div class="banner {outcome?.winner}">
    {#if outcome?.winner === 'draw'}
      <Icon name="scale" size={72} />
    {:else}
      <Icon name="crown" size={56} />
      <Icon name={outcome?.winner === 'black' ? 'mask' : 'person'} size={72} />
    {/if}
    {#if outcome?.teamLoss}<Icon name="flag" size={32} />{/if}
  </div>

  <ul class="log">
    {#each game.nights.filter((n) => n.night > 0) as n (n.night)}
      <li>
        <span class="tag"><Icon name="moon" size={18} />{n.night}</span>
        {#if n.kill !== undefined}
          <span><Icon name={n.kill === null ? 'miss' : 'target'} size={18} />{n.kill ?? ''}</span>
        {/if}
        {#if n.don !== undefined}
          <span class:hit={role(n.don) === 'sheriff'}><Icon name="hat" size={18} />{n.don}</span>
        {/if}
        {#if n.sheriff !== undefined}
          {@const r = role(n.sheriff)}
          <span class:hit={r === 'mafia' || r === 'don'}><Icon name="star" size={18} />{n.sheriff}</span>
        {/if}
      </li>
    {/each}
    {#if game.bestMove}
      <li>
        <span class="tag"><Icon name="target" size={18} />{game.bestMove.seat}</span>
        {#each game.bestMove.picks as seat (seat)}
          {@const r = role(seat)}
          <span class:hit={r === 'mafia' || r === 'don'}>{seat}</span>
        {/each}
      </li>
    {/if}
  </ul>

  <SeatGrid {game} showRoles enabled={() => false} onpick={() => {}} />

  <Hint text={hint(game)} />

  <HoldButton label="New game" tone="plain" onconfirm={session.quit}>
    <Icon name="restart" size={28} />
  </HoldButton>
</main>

<style>
  main {
    display: grid;
    grid-template-rows: auto auto 1fr auto auto auto;
    height: 100%;
    padding: 8px 16px 16px;
    gap: 16px;
  }

  header {
    display: flex;
    justify-content: space-between;
  }

  .icon {
    display: grid;
    place-items: center;
    background: none;
    color: var(--text-dim);
  }

  .banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px;
    border-radius: var(--radius);
  }

  .banner.red {
    background: var(--red);
    color: #fff;
  }

  .banner.black {
    background: #000;
    border: 2px solid var(--black);
  }

  .banner.draw {
    background: var(--surface-2);
  }

  .log {
    display: grid;
    align-content: start;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    color: var(--text-dim);
  }

  .log li {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 18px;
    font-weight: 700;
  }

  .log span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .tag {
    color: var(--text);
  }

  .hit {
    color: var(--red);
  }

  main > :global(.hold) {
    min-height: 64px;
  }

  main > :global(.hint) {
    justify-self: center;
  }

  @media (orientation: landscape) {
    main {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-rows: auto auto minmax(0, 1fr) auto auto;
      grid-template-areas:
        'head head'
        'banner table'
        'log table'
        'log hint'
        'log new';
      column-gap: 32px;
    }

    header {
      grid-area: head;
    }

    .banner {
      grid-area: banner;
    }

    .log {
      grid-area: log;
    }

    main > :global(.grid) {
      grid-area: table;
      align-self: center;
    }

    main > :global(.hint) {
      grid-area: hint;
    }

    main > :global(.hold) {
      grid-area: new;
    }
  }
</style>
