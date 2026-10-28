<script lang="ts">
  import { untrack } from 'svelte';
  import { beep } from '../../platform/audio';
  import { vibrate } from '../../platform/haptics';
  import { remaining, type Timer } from '../../platform/timer';
  import Icon from './Icon.svelte';

  let { timer, ontoggle }: { timer: Timer; ontoggle: () => void } = $props();

  const R = 46;
  const C = 2 * Math.PI * R;

  let now = $state(Date.now());
  const left = $derived(remaining(timer, now));
  const running = $derived(timer.endsAt !== null && left > 0);
  // B-4 calls "5 seconds" on the 20 s best move; longer timers warn at 10 s.
  const warnMs = $derived(timer.totalMs > 20_000 ? 10_000 : 5_000);
  const seconds = $derived(Math.ceil(left / 1000));

  $effect(() => {
    if (timer.endsAt === null) {
      now = Date.now();
      return;
    }
    const id = setInterval(() => {
      now = Date.now();
    }, 250);
    const onVisible = () => {
      now = Date.now();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  });

  // Cues fire when the countdown crosses a mark, never on mount or after a reload.
  // The parent keys this component by step, so the starting value is captured once.
  let previous = untrack(() => remaining(timer, Date.now()));
  $effect(() => {
    const current = left;
    if (previous > warnMs && current <= warnMs && current > 0) {
      beep();
      vibrate(120);
    }
    if (previous > 0 && current === 0) {
      beep(true);
      vibrate([250, 120, 250]);
    }
    previous = current;
  });
</script>

<button
  type="button"
  class="ring"
  class:warn={left <= warnMs}
  class:done={left === 0}
  aria-label={running ? 'Pause' : 'Start'}
  onclick={ontoggle}
>
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <circle class="track" cx="50" cy="50" r={R} />
    {#key timer}
      <circle
        class="progress"
        cx="50"
        cy="50"
        r={R}
        style:--c={C}
        style:animation-duration="{timer.totalMs}ms"
        style:animation-delay="-{timer.totalMs - remaining(timer, Date.now())}ms"
        style:animation-play-state={timer.endsAt === null ? 'paused' : 'running'}
      />
    {/key}
  </svg>
  <span class="digits">{seconds}</span>
  <span class="state"><Icon name={running ? 'pause' : 'play'} size={20} /></span>
</button>

<style>
  .ring {
    position: relative;
    width: min(56vw, 34dvh, 240px);
    aspect-ratio: 1;
    padding: 0;
    border-radius: 50%;
    background: none;
    color: var(--text);
  }

  svg {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
  }

  circle {
    fill: none;
    stroke-width: 6;
  }

  .track {
    stroke: var(--surface-2);
  }

  .progress {
    stroke: var(--accent);
    stroke-linecap: round;
    stroke-dasharray: var(--c);
    animation-name: drain;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
    transition: stroke 300ms;
  }

  @keyframes drain {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: var(--c);
    }
  }

  .warn .progress {
    stroke: var(--red);
  }

  .digits {
    position: relative;
    font-size: clamp(48px, 16vw, 88px);
    font-weight: 800;
  }

  .warn .digits {
    color: var(--red);
  }

  .done .digits {
    animation: pulse 900ms ease-in-out infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }

  .state {
    position: absolute;
    bottom: 22%;
    left: 50%;
    transform: translateX(-50%);
    color: var(--text-dim);
  }
</style>
