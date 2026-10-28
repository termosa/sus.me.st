<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import { cardsLeft } from '../../engine/selectors';
  import type { Game } from '../../engine/types';
  import Hint from '../components/Hint.svelte';
  import HoldButton from '../components/HoldButton.svelte';
  import Icon from '../components/Icon.svelte';
  import RoleArt from '../components/RoleArt.svelte';
  import { session } from '../game.svelte';
  import { shrinkAway, zoomFrom } from '../motion/transition';
  import { hint } from '../narration';

  let { game }: { game: Game } = $props();

  const seat = $derived(game.taken.length + 1);
  // Picked cards leave the grid; the rest are renumbered from 1 (S-6).
  const cards = $derived(cardsLeft(game));

  // Tap 1 zooms the card, tap 2 reveals the role, tap 3 hides it and gives it to the seat.
  let open = $state<{ card: number; label: number; from: DOMRect } | null>(null);
  let revealed = $state(false);
  let closing = $state(false);
  let bigCard: HTMLElement | undefined = $state();
  const openRole = $derived(open ? game.setup.deck[open.card] : undefined);

  const FLIP_MS = 450;

  function zoom(card: number, label: number, event: MouseEvent) {
    if (open) return;
    open = { card, label, from: (event.currentTarget as HTMLElement).getBoundingClientRect() };
    revealed = false;
  }

  /** Before the reveal, a tap outside puts the card back. */
  function cancel() {
    if (!revealed && !closing) open = null;
  }

  function commit() {
    if (!open) return;
    session.dispatch({ type: 'pick', card: open.card });
    open = null;
    revealed = false;
    closing = false;
  }

  async function tapBig() {
    if (closing) return;
    if (!revealed) {
      revealed = true;
      return;
    }
    closing = true;
    revealed = false;
    await new Promise((resolve) => setTimeout(resolve, FLIP_MS));
    if (bigCard) await shrinkAway(bigCard);
    commit();
  }

  // Hide a revealed role before the OS snapshots the app switcher.
  $effect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && revealed) commit();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  });
</script>

<main>
  <header>
    <HoldButton label="Undo" tone="plain" onconfirm={session.undo}>
      <Icon name="undo" />
    </HoldButton>
    <div class="who" role="img" aria-label="Seat {seat} picks">
      <Icon name="person" size={28} />
      <span>{seat}</span>
    </div>
    <span class="spacer"></span>
  </header>

  <Hint text={hint(game)} />

  <div class="grid">
    {#each cards as { card, label } (card)}
      <button
        type="button"
        class="card"
        class:hidden={open?.card === card}
        animate:flip={{ duration: 300 }}
        out:fade={{ duration: 0 }}
        onclick={(e) => zoom(card, label, e)}
      >
        {label}
      </button>
    {/each}
  </div>
</main>

{#if open}
  <button
    type="button"
    class="backdrop"
    aria-label="Back"
    tabindex="-1"
    onclick={cancel}
    transition:fade={{ duration: 200 }}
  ></button>
  <button
    type="button"
    class="big"
    class:revealed
    bind:this={bigCard}
    use:zoomFrom={open.from}
    aria-label={revealed ? 'Hide' : 'Reveal'}
    onclick={tapBig}
    oncontextmenu={(e) => e.preventDefault()}
  >
    <div class="inner">
      <div class="face back">{open.label}</div>
      <div class="face front">
        {#if openRole}<RoleArt role={openRole} />{/if}
      </div>
    </div>
  </button>
{/if}

<style>
  main {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
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

  header :global(.hold) {
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

  /* Sized by the height too, so 3×4 cards (5×2 on a wide screen) always fit. */
  .grid {
    --rows: 4;
    --cols: 3;
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    grid-auto-rows: min-content;
    align-content: center;
    gap: 12px;
    width: min(100%, (100dvh - 180px) * var(--cols) * 3 / (var(--rows) * 4), 640px);
  }

  @media (orientation: landscape) {
    .grid {
      --rows: 2;
      --cols: 5;
    }
  }

  .card {
    aspect-ratio: 3 / 4;
    font-size: 36px;
    font-weight: 800;
    background: var(--card-back);
    border: 2px solid var(--surface-2);
  }

  .card.hidden {
    visibility: hidden;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    border-radius: 0;
    background: rgb(0 0 0 / 0.85);
  }

  .big {
    position: fixed;
    z-index: 11;
    top: 50%;
    left: 50%;
    width: min(78vw, 56dvh * 3 / 4, 420px);
    aspect-ratio: 3 / 4;
    translate: -50% -50%;
    padding: 0;
    background: none;
    border-radius: 24px;
    perspective: 1200px;
    touch-action: none;
  }

  .inner {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    transform-style: preserve-3d;
    transition: transform 450ms var(--ease-out);
  }

  .revealed .inner {
    transform: rotateY(180deg);
  }

  .face {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-radius: inherit;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }

  .back {
    font-size: 120px;
    font-weight: 800;
    background: var(--card-back);
    border: 3px solid var(--surface-2);
  }

  .front {
    transform: rotateY(180deg);
    overflow: hidden;
  }

  .front :global(.art) {
    width: 100%;
  }
</style>
