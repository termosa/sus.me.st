import { flushSync } from 'svelte';
import { prefersReducedMotion } from 'svelte/motion';

/** Runs a state update inside a View Transition where supported (phase changes). */
export function withViewTransition(update: () => void): void {
  if (!document.startViewTransition || prefersReducedMotion.current) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}

const EASE = 'cubic-bezier(.2,.8,.2,1)';

/** Svelte action: FLIP the element from `from` (a grid cell) to where it is now. */
export function zoomFrom(node: HTMLElement, from: DOMRect): void {
  if (prefersReducedMotion.current) return;
  const to = node.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const scale = `scale(${from.width / to.width}, ${from.height / to.height})`;
  node.animate([{ transform: `translate(${dx}px, ${dy}px) ${scale}` }, { transform: 'none' }], {
    duration: 320,
    easing: EASE,
  });
}

export async function shrinkAway(node: HTMLElement): Promise<void> {
  if (prefersReducedMotion.current) return;
  await node.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: 'scale(0.6)', opacity: 0 },
    ],
    { duration: 220, easing: EASE, fill: 'forwards' },
  ).finished;
}
