<script lang="ts">
  import { fade } from 'svelte/transition';
  import { ROLES, type Role } from '../../engine/rules';
  import { cardFor } from '../../engine/selectors';
  import type { Game } from '../../engine/types';
  import { vibrate } from '../../platform/haptics';
  import GameMenu from '../components/GameMenu.svelte';
  import Hint from '../components/Hint.svelte';
  import HoldButton from '../components/HoldButton.svelte';
  import Icon from '../components/Icon.svelte';
  import NightMusicBar from '../components/NightMusicBar.svelte';
  import RoleArt, { ROLE_NAME } from '../components/RoleArt.svelte';
  import { session } from '../game.svelte';
  import { music } from '../music.svelte';
  import { hint } from '../narration';
  import { settings } from '../settings.svelte';

  /**
   * Physical cards: each seat in turn takes a card and the role on it is entered here.
   * Nothing on screen shows the roles entered before (S-5): no counts, and the strip of
   * seats only marks which are done.
   */
  let { game }: { game: Game } = $props();

  const seat = $derived(game.taken.length + 1);
  let menuOpen = $state(false);
  let musicOpen = $state(false);

  /** Shown while a role with no card left is held down, and for at least a second. */
  let notice: string | null = $state(null);
  let shownAt = 0;
  /** The notice came from a press, so the click that follows it adds nothing. */
  let pressed = false;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  const NOTICE_MS = 1000;

  function press(role: Role) {
    if (cardFor(game, role) !== null) return;
    clearTimeout(hideTimer);
    notice = `No ${ROLE_NAME[role]} card left. A seat before was entered wrong: undo it.`;
    shownAt = performance.now();
    pressed = true;
    vibrate(60);
  }

  function release() {
    if (!notice) return;
    clearTimeout(hideTimer);
    const left = NOTICE_MS - (performance.now() - shownAt);
    hideTimer = setTimeout(() => (notice = null), Math.max(0, left));
  }

  function give(role: Role) {
    const card = cardFor(game, role);
    if (card !== null) {
      session.dispatch({ type: 'pick', card });
    } else if (pressed) {
      pressed = false;
    } else {
      // A click without a press first, as from the keyboard.
      press(role);
      pressed = false;
      release();
    }
  }
</script>

<main>
  <header>
    {#if game.taken.length === 0}
      <!-- Nothing entered yet, so going back to the dealing choice loses nothing. -->
      <button type="button" class="icon" aria-label="Back" onclick={session.backToSetup}>
        <Icon name="back" />
      </button>
    {:else}
      <button type="button" class="icon" aria-label="Undo" onclick={session.undo}>
        <Icon name="undo" />
      </button>
    {/if}
    <div class="who" role="img" aria-label="Seat {seat}">
      <Icon name="person" size={28} />
      <span>{seat}</span>
    </div>
    <button type="button" class="icon" aria-label="Menu" onclick={() => (menuOpen = true)}>
      <Icon name="menu" />
    </button>
    {#if settings.nightMusic && music.playlist.length > 0}
      <div class="music-bar"><NightMusicBar onopen={() => (musicOpen = true)} /></div>
    {/if}
  </header>

  <Hint text={hint(game)} />

  <div class="roles">
    {#each ROLES as role (role)}
      <button
        type="button"
        class="role"
        aria-label={ROLE_NAME[role]}
        onpointerdown={() => press(role)}
        onpointerup={release}
        onpointercancel={release}
        onpointerleave={release}
        onclick={() => give(role)}
        oncontextmenu={(e) => e.preventDefault()}
      >
        <RoleArt {role} />
      </button>
    {/each}
    {#if notice}
      <p class="notice" role="alert" transition:fade={{ duration: 120 }}>{notice}</p>
    {/if}
  </div>

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

<GameMenu bind:menu={menuOpen} bind:music={musicOpen}>
  {#snippet actions()}
    <HoldButton label="New game" onconfirm={session.quit}>
      <Icon name="restart" size={28} />
    </HoldButton>
  {/snippet}
</GameMenu>

<style>
  main {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    justify-items: center;
    height: 100%;
    padding: 8px 16px 16px;
    gap: 12px;
  }

  header {
    justify-self: stretch;
    display: grid;
    grid-template-columns: var(--tap) 1fr var(--tap);
    align-items: center;
  }

  .music-bar {
    grid-column: 1 / -1;
    display: flex;
    justify-content: center;
    min-width: 0;
  }

  .icon {
    display: grid;
    place-items: center;
    color: var(--text-dim);
    background: none;
  }

  .who {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 32px;
    font-weight: 800;
  }

  /* Portrait cards like the real ones: 2×2, or one row of 4 on a wide screen. */
  .roles {
    --cols: 2;
    --rows: 2;
    position: relative;
    align-self: center;
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 12px;
    width: min(100%, (100dvh - 340px) / var(--rows) * 3 / 4 * var(--cols), 560px);
  }

  @media (orientation: landscape) {
    .roles {
      --cols: 4;
      --rows: 1;
      width: min(100%, (100dvh - 250px) * 3 / 4 * var(--cols), 960px);
    }
  }

  .role {
    aspect-ratio: 3 / 4;
    padding: 0;
    overflow: hidden;
    border-radius: 16px;
    background: none;
    transition: scale 100ms ease;
  }

  .role:active {
    scale: 0.96;
  }

  .notice {
    position: absolute;
    inset: 50% 0 auto;
    translate: 0 -50%;
    margin: 0;
    padding: 16px 20px;
    border: 2px solid var(--warn);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    font-size: 18px;
    font-weight: 600;
    text-align: center;
    pointer-events: none;
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

  /* Short landscape phones: the music bar in the header row, seats in one row. */
  @media (orientation: landscape) and (max-height: 560px) {
    main {
      gap: 8px;
    }

    header {
      grid-template-columns: var(--tap) auto 1fr var(--tap);
      gap: 12px;
    }

    .music-bar {
      grid-column: 3;
      grid-row: 1;
      justify-content: flex-end;
    }

    .roles {
      width: min(100%, (100dvh - 170px) * 3 / 4 * var(--cols), 760px);
    }

    .seats {
      grid-template-columns: repeat(10, 1fr);
    }

    .seats li {
      min-height: 32px;
    }
  }
</style>
