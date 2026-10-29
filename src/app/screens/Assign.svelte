<script lang="ts">
  import { ROLES, type Role, teamOf } from '../../engine/rules';
  import { cardFor } from '../../engine/selectors';
  import type { Game } from '../../engine/types';
  import { vibrate } from '../../platform/haptics';
  import Hint from '../components/Hint.svelte';
  import HoldButton from '../components/HoldButton.svelte';
  import Icon from '../components/Icon.svelte';
  import { ROLE_ICON, ROLE_NAME } from '../components/RoleArt.svelte';
  import { cue } from '../cues';
  import { session } from '../game.svelte';
  import { hint } from '../narration';

  /**
   * Physical cards: each seat in turn takes a card, then the role on it is entered here.
   * Between seats the roles are covered, so the phone can lie on the table, and nothing
   * on screen shows the roles entered before (S-5).
   */
  let { game }: { game: Game } = $props();

  const seat = $derived(game.taken.length + 1);
  /** The seat whose role buttons are showing; any other seat sees the cover. */
  let open: number | null = $state(null);
  const covered = $derived(open !== seat);

  function give(role: Role) {
    const card = cardFor(game, role);
    if (card === null) {
      // Only after a wrong entry for an earlier seat; undo fixes it.
      vibrate(80);
      cue('error');
      return;
    }
    session.dispatch({ type: 'pick', card });
  }

  // Cover the roles before the OS snapshots the app switcher.
  $effect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') open = null;
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  });
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

  {#if covered}
    <Hint text="Seat {seat}: take a card, then tap to enter its role." />

    <button type="button" class="cover" onclick={() => (open = seat)}>
      <Icon name="cards" size={56} />
      <span>Tap to enter the role</span>
    </button>
  {:else}
    <Hint text={hint(game)} />

    <div class="roles">
      {#each ROLES as role (role)}
        <button type="button" class="role {teamOf(role)}" onclick={() => give(role)}>
          <Icon name={ROLE_ICON[role]} size={40} />
          <span class="name">{ROLE_NAME[role]}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Progress only: which seats are done, never their roles. -->
  <ol class="seats" aria-label="Seats entered">
    {#each { length: game.setup.playerCount } as _, i (i)}
      <li
        class:done={i < game.taken.length}
        class:current={i + 1 === seat}
        aria-label={i < game.taken.length ? `Seat ${i + 1}: entered` : `Seat ${i + 1}`}
      >
        {i + 1}
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

  .cover {
    align-self: center;
    display: grid;
    place-items: center;
    gap: 16px;
    width: min(100%, var(--content-max));
    min-height: 220px;
    font-size: 20px;
    font-weight: 700;
    background: var(--card-back);
    border: 2px solid var(--surface-2);
  }

  .role {
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

  .name {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
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
    display: grid;
    place-items: center;
    min-height: 40px;
    border: 2px solid transparent;
    border-radius: 10px;
    background: var(--surface);
    color: var(--text-dim);
    font-weight: 700;
  }

  .seats li.done {
    background: var(--surface-2);
    color: var(--text);
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

    .cover {
      min-height: 160px;
    }

    .seats {
      grid-template-columns: repeat(10, 1fr);
    }
  }
</style>
