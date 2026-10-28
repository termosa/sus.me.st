<script lang="ts">
  import type { Snippet } from 'svelte';
  import { vibrate } from '../../platform/haptics';

  /** Hold to confirm, for actions that are hard to take back. */
  let {
    onconfirm,
    children,
    tone = 'danger',
    label,
    ms = 700,
  }: {
    onconfirm: () => void;
    children: Snippet;
    tone?: 'danger' | 'plain';
    label: string;
    ms?: number;
  } = $props();

  let holding = $state(false);
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function down(event: PointerEvent) {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    holding = true;
    timeout = setTimeout(() => {
      holding = false;
      vibrate(30);
      onconfirm();
    }, ms);
  }

  function up() {
    holding = false;
    clearTimeout(timeout);
  }
</script>

<button
  type="button"
  class="hold {tone}"
  class:holding
  style:--ms="{ms}ms"
  aria-label={label}
  onpointerdown={down}
  onpointerup={up}
  onpointercancel={up}
  oncontextmenu={(e) => e.preventDefault()}
>
  <span class="fill"></span>
  <span class="content">{@render children()}</span>
</button>

<style>
  .hold {
    position: relative;
    overflow: hidden;
    display: grid;
    place-items: center;
    padding: 0 16px;
  }

  .danger {
    color: var(--red);
  }

  .fill {
    position: absolute;
    inset: 0;
    background: currentColor;
    opacity: 0.25;
    transform: scaleX(0);
    transform-origin: left;
  }

  .holding .fill {
    transform: scaleX(1);
    transition: transform var(--ms) linear;
  }

  .content {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
