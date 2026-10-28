<script lang="ts">
  import { teamOf } from '../../engine/rules';
  import type { Departure, Game } from '../../engine/types';
  import Icon, { type IconName } from './Icon.svelte';
  import { ROLE_ICON } from './RoleArt.svelte';

  let {
    game,
    current = [],
    selected = [],
    showRoles = false,
    enabled = (seat) => game.players[seat - 1]?.out === null,
    onpick,
    onhold,
  }: {
    game: Game;
    /** Seats to ring: the speaker, or the candidates. */
    current?: number[];
    selected?: number[];
    showRoles?: boolean;
    /** Which seats respond to taps; by default the players in the game. */
    enabled?: (seat: number) => boolean;
    onpick: (seat: number) => void;
    /** Long press: seat actions while taps pick targets. */
    onhold?: (seat: number) => void;
  } = $props();

  const OUT_ICON: Record<Departure, IconName> = {
    killed: 'target',
    voted: 'hand',
    removed: 'remove',
  };

  const range = (n: number) => Array.from({ length: n }, (_, i) => i);
  const nominated = $derived(new Map(game.nominations.map((n, i) => [n.seat, i + 1])));

  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let held = false;

  function down(seat: number) {
    held = false;
    if (!onhold) return;
    holdTimer = setTimeout(() => {
      held = true;
      onhold(seat);
    }, 500);
  }

  function up() {
    clearTimeout(holdTimer);
  }

  function click(seat: number) {
    if (!held) onpick(seat);
    held = false;
  }
</script>

<div class="grid" class:ten={game.players.length === 10}>
  {#each game.players as p (p.seat)}
    <button
      type="button"
      class="seat"
      class:out={p.out !== null}
      class:current={current.includes(p.seat)}
      class:selected={selected.includes(p.seat)}
      class:black={showRoles && teamOf(p.role) === 'black'}
      disabled={!enabled(p.seat)}
      aria-label="Seat {p.seat}"
      onpointerdown={() => down(p.seat)}
      onpointerup={up}
      onpointercancel={up}
      onpointerleave={up}
      oncontextmenu={(e) => e.preventDefault()}
      onclick={() => click(p.seat)}
    >
      <span class="num">{p.seat}</span>
      {#if showRoles && p.role !== 'citizen'}
        <span class="corner"><Icon name={ROLE_ICON[p.role]} size={14} /></span>
      {:else if p.out && !showRoles}
        <span class="corner"><Icon name={OUT_ICON[p.out]} size={14} /></span>
      {/if}
      {#if nominated.has(p.seat)}
        <span class="badge">{nominated.get(p.seat)}</span>
      {/if}
      {#if p.fouls > 0}
        <span class="fouls">
          {#each range(p.fouls) as i (i)}<i></i>{/each}
        </span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    width: 100%;
    max-width: var(--content-max);
    margin-inline: auto;
  }

  .seat {
    position: relative;
    aspect-ratio: 1;
    min-width: 0;
    padding: 0;
    border: 2px solid transparent;
    background: var(--surface);
    transition:
      background-color 200ms,
      border-color 200ms,
      opacity 200ms;
  }

  .num {
    font-size: 26px;
    font-weight: 800;
  }

  .black {
    background: #050507;
    border-color: var(--black);
  }

  .current {
    border-color: var(--accent);
  }

  .selected {
    background: var(--accent);
    color: var(--bg);
  }

  .out {
    opacity: 0.35;
  }

  .out .num {
    text-decoration: line-through;
  }

  .seat:disabled {
    color: var(--text);
  }

  .corner {
    position: absolute;
    top: 5px;
    right: 5px;
  }

  .badge {
    position: absolute;
    top: 4px;
    left: 4px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: var(--red);
    color: #fff;
    font-size: 12px;
    font-weight: 800;
    line-height: 18px;
  }

  .fouls {
    position: absolute;
    bottom: 6px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 3px;
  }

  .fouls i {
    width: 6px;
    height: 9px;
    border-radius: 1px;
    background: var(--warn);
  }
</style>
