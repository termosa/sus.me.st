<script lang="ts">
  import { fade } from 'svelte/transition';
  import { isAllowed } from '../../engine/game';
  import { BEST_MOVE_PICKS, teamOf } from '../../engine/rules';
  import { isSilent, stepKey } from '../../engine/selectors';
  import type { Game } from '../../engine/types';
  import Hint from '../components/Hint.svelte';
  import HoldButton from '../components/HoldButton.svelte';
  import Icon from '../components/Icon.svelte';
  import MusicPanel from '../components/MusicPanel.svelte';
  import NightMusicBar from '../components/NightMusicBar.svelte';
  import { ROLE_ICON } from '../components/RoleArt.svelte';
  import SeatGrid from '../components/SeatGrid.svelte';
  import SeatSheet from '../components/SeatSheet.svelte';
  import SettingsPanel from '../components/SettingsPanel.svelte';
  import Sheet from '../components/Sheet.svelte';
  import TimerRing from '../components/TimerRing.svelte';
  import VotePanel from '../components/VotePanel.svelte';
  import { session } from '../game.svelte';
  import { music } from '../music.svelte';
  import { hint } from '../narration';
  import { settings } from '../settings.svelte';

  let { game }: { game: Game } = $props();

  const step = $derived(game.step);
  const key = $derived(stepKey(game));
  const night = $derived(step.kind === 'night' || step.kind === 'night0');
  const tonight = $derived(game.nights.at(-1));
  const timer = $derived(session.timer);

  let sheetSeat = $state<number | null>(null);
  let menuOpen = $state(false);
  let musicOpen = $state(false);
  /** The music sheet was opened from the menu, so it offers a way back. */
  let fromMenu = $state(false);

  function openMusic(viaMenu: boolean) {
    menuOpen = false;
    fromMenu = viaMenu;
    musicOpen = true;
  }

  function openMenu() {
    musicOpen = false;
    menuOpen = true;
  }
  let peek = $state(false);
  /** Seats chosen on the grid during the shooting or the best move. */
  let picks = $state<number[]>([]);

  $effect(() => {
    void key;
    picks = [];
  });

  const picking = $derived(step.kind === 'night' && step.stage !== 'shoot' ? 'any' : null);
  const current = $derived.by((): number[] => {
    switch (step.kind) {
      case 'speech':
        return [step.seat];
      case 'lastWords':
        return step.queue.slice(0, 1);
      case 'tieSpeech':
        return step.candidates.slice(step.index, step.index + 1);
      case 'vote':
      case 'raise':
        return step.candidates;
      case 'night':
        if (step.stage === 'don') return tonight?.don === undefined ? [] : [tonight.don];
        if (step.stage === 'sheriff') return tonight?.sheriff === undefined ? [] : [tonight.sheriff];
        if (step.stage === 'bestMove') return tonight?.kill == null ? [] : [tonight.kill];
        return [];
      default:
        return [];
    }
  });

  function enabled(seat: number): boolean {
    // N-a: checks and the best move may name any seat.
    if (picking) return true;
    // F-9: a player removed during the shooting can still be the one killed.
    if (step.kind === 'night') return game.players[seat - 1]?.out === null || !!tonight?.removed?.includes(seat);
    // Anyone still at the table: players in the game, and those leaving with words to come.
    return isAllowed(game, { type: 'foul', seat });
  }

  function pick(seat: number) {
    if (step.kind !== 'night') {
      sheetSeat = seat;
    } else if (step.stage === 'shoot') {
      picks = picks[0] === seat ? [] : [seat];
    } else if (step.stage === 'bestMove') {
      if (picks.includes(seat)) picks = picks.filter((s) => s !== seat);
      else if (picks.length < BEST_MOVE_PICKS) picks = [...picks, seat];
    } else {
      session.dispatch({ type: 'check', seat });
    }
  }

  const SLOTS = Array.from({ length: BEST_MOVE_PICKS }, (_, i) => i);
  const next = () => session.dispatch({ type: 'next' });
  const checked = (seat: number | undefined) =>
    seat === undefined ? undefined : game.players[seat - 1];
</script>

<main class:night>
  <header>
    <button type="button" class="icon" aria-label="Undo" onclick={session.undo}>
      <Icon name="undo" />
    </button>
    <div class="phase">
      <Icon name={night ? 'moon' : 'sun'} size={22} />
      <span>{night ? game.night : game.day}</span>
    </div>
    <button
      type="button"
      class="icon"
      class:on={peek}
      aria-label="Show roles"
      onpointerdown={() => (peek = true)}
      onpointerup={() => (peek = false)}
      onpointercancel={() => (peek = false)}
      onpointerleave={() => (peek = false)}
      oncontextmenu={(e) => e.preventDefault()}
    >
      <Icon name="eye" />
    </button>
    <button type="button" class="icon" aria-label="Menu" onclick={() => (menuOpen = true)}>
      <Icon name="menu" />
    </button>
    {#if night && settings.nightMusic && music.playlist.length > 0}
      <div class="music-bar"><NightMusicBar onopen={() => openMusic(false)} /></div>
    {/if}
  </header>

  {#key key}
    <section class="stage" in:fade={{ duration: 200 }}>
      <Hint text={hint(game)} />
      <div class="focus">
      {#if step.kind === 'night0'}
        <div class="who">
          <Icon name={step.stage === 'mafia' ? 'mask' : step.stage === 'sheriff' ? 'star' : 'moon'} size={56} />
        </div>
      {:else if step.kind === 'morning'}
        <div class="who">
          <Icon name="sun" size={56} />
          {#if tonight?.kill != null}
            <Icon name="target" size={40} /><span class="big">{tonight.kill}</span>
          {:else if tonight?.kill === null}
            <Icon name="miss" size={56} />
          {/if}
        </div>
      {:else if step.kind === 'speech'}
        <div class="who">
          <Icon name={isSilent(game) ? 'muted' : 'mic'} size={40} />
          <span class="big">{step.seat}</span>
        </div>
      {:else if step.kind === 'lastWords'}
        <div class="who">
          <Icon name="bubble" size={40} />
          <span class="big">{step.queue[0]}</span>
        </div>
      {:else if step.kind === 'tieSpeech'}
        <div class="who">
          <Icon name="scale" size={40} />
          <span class="big">{step.candidates[step.index]}</span>
        </div>
      {:else if step.kind === 'night'}
        <div class="who">
          {#if step.stage === 'shoot'}
            <Icon name="target" size={56} />
          {:else if step.stage === 'don'}
            <Icon name="hat" size={56} />
          {:else if step.stage === 'sheriff'}
            <Icon name="star" size={56} />
          {:else}
            <Icon name="target" size={40} /><span class="big">{tonight?.kill}</span>
          {/if}
        </div>
      {/if}

      {#if step.kind === 'vote' || step.kind === 'raise'}
        <VotePanel {game} candidates={step.candidates} raise={step.kind === 'raise'} />
      {:else if timer}
        {#key timer.key}
          <TimerRing {timer} ontoggle={session.toggleTimer} />
        {/key}
      {/if}
      </div>

      {#if step.kind === 'speech' && game.nominations.length > 0}
        <div class="noms">
          {#each game.nominations as n (n.seat)}<span>{n.seat}</span>{/each}
        </div>
      {/if}

      {#if step.kind === 'night' && step.stage === 'don'}
        {@const p = checked(tonight?.don)}
        {#if p}
          <div class="result">
            <Icon name="star" size={36} />
            <Icon name={p.role === 'sheriff' ? 'check' : 'close'} size={44} />
          </div>
        {/if}
      {:else if step.kind === 'night' && step.stage === 'sheriff'}
        {@const p = checked(tonight?.sheriff)}
        {#if p}
          <div class="result disc {teamOf(p.role)}">
            <Icon name={teamOf(p.role) === 'black' ? 'mask' : 'person'} size={40} />
          </div>
        {/if}
      {:else if step.kind === 'night' && step.stage === 'bestMove'}
        <div class="slots">
          {#each SLOTS as i (i)}<span>{picks[i] ?? ''}</span>{/each}
        </div>
      {/if}

    </section>
  {/key}

  {#if step.kind !== 'vote' && step.kind !== 'raise'}
  <div class="actions">
    {#if step.kind === 'night' && step.stage === 'shoot'}
      <button
        type="button"
        class="secondary"
        aria-label="Miss"
        onclick={() => session.dispatch({ type: 'shoot', seat: null })}
      >
        <Icon name="miss" size={32} />
      </button>
      <button
        type="button"
        class="go"
        aria-label="Kill"
        disabled={picks.length === 0}
        onclick={() => session.dispatch({ type: 'shoot', seat: picks[0] ?? null })}
      >
        <Icon name="target" size={28} /><span>{picks[0] ?? ''}</span>
      </button>
    {:else if step.kind === 'night' && step.stage === 'bestMove'}
      <button
        type="button"
        class="go"
        aria-label="Confirm"
        onclick={() => session.dispatch({ type: 'bestMove', seats: [...picks] })}
      >
        <Icon name="check" size={32} />
      </button>
    {:else}
      <button type="button" class="go" aria-label="Next" onclick={next}>
        <Icon name="next" size={32} />
      </button>
    {/if}
  </div>
  {/if}

  <SeatGrid
    {game}
    {current}
    selected={picks}
    showRoles={night || peek}
    {enabled}
    onpick={pick}
    onhold={step.kind === 'night' ? (seat) => (sheetSeat = seat) : undefined}
  />
</main>

{#if sheetSeat !== null}
  <SeatSheet {game} seat={sheetSeat} onclose={() => (sheetSeat = null)} />
{/if}

{#if musicOpen}
  <Sheet onclose={() => (musicOpen = false)}>
    <MusicPanel onback={fromMenu ? openMenu : undefined} />
  </Sheet>
{/if}

{#if menuOpen}
  <Sheet onclose={() => (menuOpen = false)}>
    <SettingsPanel onmusic={() => openMusic(true)} />
    <hr />
    <div class="menu">
      {#each ['red', 'black'] as const as team (team)}
        <HoldButton
          label="{team} team loses"
          tone="plain"
          onconfirm={() => {
            menuOpen = false;
            session.dispatch({ type: 'teamLoss', team });
          }}
        >
          <Icon name="flag" size={28} />
          <span class="team {team}"><Icon name={ROLE_ICON[team === 'red' ? 'citizen' : 'mafia']} /></span>
        </HoldButton>
      {/each}
    </div>
    <HoldButton label="New game" onconfirm={session.quit}>
      <Icon name="restart" size={28} />
    </HoldButton>
  </Sheet>
{/if}

<style>
  main {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    height: 100%;
    padding: 8px 16px 16px;
    gap: 12px;
    transition: background-color 600ms;
  }

  main.night {
    background: var(--night);
  }

  header {
    display: grid;
    grid-template-columns: var(--tap) 1fr var(--tap) var(--tap);
    align-items: center;
    view-transition-name: header;
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
    background: none;
    color: var(--text-dim);
  }

  .icon.on {
    color: var(--accent);
  }

  .phase {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 22px;
    font-weight: 800;
  }

  .stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: safe center;
    gap: 16px;
    min-height: 0;
    overflow-y: auto;
  }

  .stage > :global(*) {
    flex-shrink: 0;
  }

  .focus {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
  }

  .who {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text);
  }

  .big {
    font-size: 56px;
    font-weight: 800;
    line-height: 1;
  }

  .noms {
    display: flex;
    gap: 6px;
  }

  .noms span {
    min-width: 36px;
    padding: 4px 8px;
    border-radius: 10px;
    background: var(--red);
    color: #fff;
    text-align: center;
    font-weight: 800;
  }

  .result {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .disc {
    justify-content: center;
    width: 72px;
    height: 72px;
    border-radius: 50%;
  }

  .disc.red {
    background: var(--red);
    color: #fff;
  }

  .disc.black {
    background: #000;
    border: 2px solid var(--black);
  }

  .slots {
    display: flex;
    gap: 10px;
  }

  .slots span {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 12px;
    border: 2px dashed var(--surface-2);
    font-size: 26px;
    font-weight: 800;
  }

  .actions {
    display: flex;
    gap: var(--gap);
    width: 100%;
    max-width: var(--content-max);
    margin-inline: auto;
  }

  .actions button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 64px;
    font-size: 26px;
    font-weight: 800;
  }

  .go {
    flex: 1;
    background: var(--accent);
    color: var(--bg);
  }

  .go:disabled {
    opacity: 0.3;
  }

  .secondary {
    width: 96px;
  }

  /* Tablets and phones on their side: the step on the left, the table on the right. */
  @media (orientation: landscape) {
    main {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      /* The table and its buttons sit together, centred beside the step. */
      grid-template-rows: auto 1fr auto auto 1fr;
      grid-template-areas:
        'head head'
        'stage .'
        'stage table'
        'stage actions'
        'stage .';
      column-gap: 32px;
    }

    header {
      grid-area: head;
    }

    .stage {
      grid-area: stage;
    }

    .actions {
      grid-area: actions;
    }

    main > :global(.grid) {
      grid-area: table;
    }
  }

  /* Phones on their side: the number goes beside the timer to save height. */
  @media (orientation: landscape) and (max-height: 560px) {
    .stage {
      gap: 10px;
    }

    .focus {
      flex-direction: row;
      justify-content: center;
      gap: 24px;
    }

    .actions button {
      min-height: 52px;
    }
  }

  hr {
    width: 100%;
    margin: 4px 0;
    border: 0;
    border-top: 1px solid var(--surface-2);
  }

  .menu {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--gap);
  }

  .menu :global(.hold),
  .menu + :global(.hold) {
    min-height: 64px;
  }

  .team {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .team.red {
    background: var(--red);
    color: #fff;
  }

  .team.black {
    background: #000;
    color: var(--text);
  }
</style>
