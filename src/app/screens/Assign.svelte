<script lang="ts">
  import { ROLES, type Role, teamOf } from '../../engine/rules';
  import { cardFor, rolesLeft } from '../../engine/selectors';
  import type { Game } from '../../engine/types';
  import Hint from '../components/Hint.svelte';
  import HoldButton from '../components/HoldButton.svelte';
  import Icon from '../components/Icon.svelte';
  import { ROLE_ICON, ROLE_NAME } from '../components/RoleArt.svelte';
  import { session } from '../game.svelte';
  import { hint } from '../narration';

  /** Physical cards: the host enters the role on each seat's card, in seat order. */
  let { game }: { game: Game } = $props();

  const seat = $derived(game.taken.length + 1);
  const left = $derived(rolesLeft(game));
  /** Every seat with the role entered for it so far. */
  const seats = $derived(
    Array.from({ length: game.setup.playerCount }, (_, i) => ({
      n: i + 1,
      role: game.setup.deck[game.taken[i] ?? -1],
    })),
  );

  function give(role: Role) {
    const card = cardFor(game, role);
    if (card !== null) session.dispatch({ type: 'pick', card });
  }
</script>

<main>
  <header>
    {#if game.taken.length === 0}
      <!-- Nothing entered yet, so going back to the player count loses nothing. -->
      <button type="button" class="back" aria-label="Back" onclick={session.quit}>
        <Icon name="back" />
      </button>
    {:else}
      <HoldButton label="Undo" tone="plain" onconfirm={session.undo}>
        <Icon name="undo" />
      </HoldButton>
    {/if}
    <div class="who" role="img" aria-label="Seat {seat}">
      <Icon name="person" size={28} />
      <span>{seat}</span>
    </div>
    <span class="spacer"></span>
  </header>

  <Hint text={hint(game)} />

  <div class="roles">
    {#each ROLES as role (role)}
      <button
        type="button"
        class="role {teamOf(role)}"
        disabled={left[role] === 0}
        aria-label="{ROLE_NAME[role]}, {left[role]} left"
        onclick={() => give(role)}
      >
        <Icon name={ROLE_ICON[role]} size={40} />
        <span class="name">{ROLE_NAME[role]}</span>
        <span class="left">{left[role]}</span>
      </button>
    {/each}
  </div>

  <ol class="seats" aria-label="Roles entered">
    {#each seats as { n, role } (n)}
      <li
        class={role ? teamOf(role) : ''}
        class:current={n === seat}
        aria-label={role ? `Seat ${n}: ${ROLE_NAME[role]}` : `Seat ${n}`}
      >
        <span>{n}</span>
        {#if role}<Icon name={ROLE_ICON[role]} size={18} />{/if}
      </li>
    {/each}
  </ol>
</main>

<style>
  main {
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    justify-items: center;
    height: 100%;
    padding: 12px 16px 16px;
    gap: 16px;
  }

  header {
    justify-self: stretch;
    display: grid;
    grid-template-columns: var(--tap) 1fr var(--tap);
    align-items: center;
  }

  header :global(.hold),
  .back {
    color: var(--text-dim);
    background: none;
  }

  .back {
    display: grid;
    place-items: center;
  }

  .who {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 32px;
    font-weight: 800;
  }

  .roles {
    align-self: center;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    width: min(100%, var(--content-max));
  }

  .role {
    position: relative;
    display: grid;
    place-items: center;
    gap: 6px;
    padding: 20px 8px;
    border: 2px solid transparent;
  }

  .role.red {
    background: #2a0b0d;
    color: #ffd9da;
    border-color: #7a1d22;
  }

  .role.black {
    background: #101016;
    color: #e8e8f0;
    border-color: var(--black);
  }

  .role:disabled {
    opacity: 0.3;
  }

  .name {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .left {
    position: absolute;
    top: 8px;
    right: 12px;
    font-size: 18px;
    font-weight: 700;
    opacity: 0.8;
  }

  .seats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    width: min(100%, var(--content-max));
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .seats li {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 40px;
    border: 2px solid transparent;
    border-radius: 10px;
    background: var(--surface);
    color: var(--text-dim);
    font-weight: 700;
  }

  .seats li.red {
    color: #ffd9da;
    background: #2a0b0d;
  }

  .seats li.black {
    color: #e8e8f0;
    background: #101016;
  }

  .seats li.current {
    border-color: var(--accent);
    color: var(--text);
  }

  /* Short landscape phones: roles in one row, seats in one row. */
  @media (orientation: landscape) and (max-height: 560px) {
    main {
      gap: 8px;
    }

    .roles {
      grid-template-columns: repeat(4, 1fr);
    }

    .role {
      padding: 12px 8px;
    }

    .seats {
      grid-template-columns: repeat(10, 1fr);
    }
  }
</style>
