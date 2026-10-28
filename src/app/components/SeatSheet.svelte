<script lang="ts">
  import { isAllowed } from '../../engine/game';
  import { FOULS_TO_REMOVE } from '../../engine/rules';
  import type { Game } from '../../engine/types';
  import { session } from '../game.svelte';
  import HoldButton from './HoldButton.svelte';
  import Icon from './Icon.svelte';
  import Sheet from './Sheet.svelte';

  let { game, seat, onclose }: { game: Game; seat: number; onclose: () => void } = $props();

  const SLOTS = Array.from({ length: FOULS_TO_REMOVE }, (_, i) => i);
  const player = $derived(game.players[seat - 1]);
  const speaker = $derived(game.step.kind === 'speech' ? game.step.seat : null);
  const canNominate = $derived(isAllowed(game, { type: 'nominate', seat }));
  const canFoul = $derived(isAllowed(game, { type: 'foul', seat }));
  const canRemove = $derived(isAllowed(game, { type: 'remove', seat }));

  function act(ok: boolean) {
    if (ok) onclose();
  }
</script>

<Sheet {onclose}>
  <div class="head">
    <span class="seat">{seat}</span>
    {#if player}
      <span class="fouls" role="img" aria-label="{player.fouls} fouls">
        {#each SLOTS as i (i)}<i class:on={i < player.fouls}></i>{/each}
      </span>
    {/if}
  </div>

  {#if canNominate && speaker !== null}
    <button
      type="button"
      class="primary"
      onclick={() => act(session.dispatch({ type: 'nominate', seat }))}
    >
      <span>{speaker}</span>
      <Icon name="nominate" size={28} />
      <span>{seat}</span>
    </button>
  {/if}

  <div class="row">
    <button
      type="button"
      class="foul"
      disabled={!canFoul}
      aria-label="Foul"
      onclick={() => act(session.dispatch({ type: 'foul', seat }))}
    >
      <Icon name="card" size={28} />
      <span>+1</span>
    </button>
    {#if canRemove}
      <HoldButton
        label="Remove"
        onconfirm={() => act(session.dispatch({ type: 'remove', seat }))}
      >
        <Icon name="remove" size={28} />
      </HoldButton>
    {/if}
  </div>
</Sheet>

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .seat {
    font-size: 48px;
    font-weight: 800;
  }

  .fouls {
    display: flex;
    gap: 6px;
  }

  .fouls i {
    width: 14px;
    height: 20px;
    border-radius: 3px;
    border: 2px solid var(--warn);
  }

  .fouls i.on {
    background: var(--warn);
  }

  .primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    min-height: 72px;
    font-size: 32px;
    font-weight: 800;
    background: var(--red);
    color: #fff;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--gap);
  }

  .row > :global(button) {
    min-height: 64px;
  }

  .foul {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--warn);
    font-size: 24px;
    font-weight: 800;
  }

  .foul:disabled {
    opacity: 0.3;
  }
</style>
