<script lang="ts" module>
  // 24×24 stroke icons, drawn with currentColor.
  const PATHS = {
    undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
    next: 'M5 12h14M13 6l6 6-6 6',
    back: 'M19 12H5M11 6l-6 6 6 6',
    play: 'M8 5v14l11-7z',
    pause: 'M8 5v14M16 5v14',
    moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    mask: 'M2 9.5c3-2.5 7-2.5 10 0 3-2.5 7-2.5 10 0-.5 5.5-4.5 8-8 5.5-1-.8-1.2-1.5-2-1.5s-1 .7-2 1.5C6.5 17.5 2.5 15 2 9.5zM6.5 11h3M14.5 11h3',
    hat: 'M3 18h18M6.5 18V8.5A1.5 1.5 0 0 1 8 7h8a1.5 1.5 0 0 1 1.5 1.5V18M6.5 14h11',
    star: 'm12 3 2.6 5.6 6.1.6-4.6 4.1 1.3 6L12 16.2l-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z',
    person: 'M12 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5 20a7 7 0 0 1 14 0',
    mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
    muted: 'M4 9h4l5-4v14l-5-4H4zM16.5 9.5l5 5M21.5 9.5l-5 5',
    bubble: 'M4 5h16v11H10l-6 4z',
    scale: 'M12 4v16M7 20h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z',
    vote: 'M4 11h16v9H4zM8 11V4h8v7M10 7.5h4',
    hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V13M17 12a1.5 1.5 0 0 1 3 0v2a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.8l-2.7-4.5a1.5 1.5 0 0 1 2.5-1.6L8 13',
    target: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 1v6M12 17v6M1 12h6M17 12h6',
    miss: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM6.3 17.7 17.7 6.3',
    card: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
    remove: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 8.5l7 7M15.5 8.5l-7 7',
    nominate: 'M4 12h12M11 7l5 5-5 5M20 5v14',
    eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    check: 'm5 12.5 4.5 4.5L19 7',
    close: 'M6 6l12 12M18 6 6 18',
    menu: 'M12 5v.01M12 12v.01M12 19v.01',
    sliders: 'M4 6h9M17 6h3M15 4v4M4 12h3M11 12h9M9 10v4M4 18h11M19 18h1M17 16v4',
    crown: 'M3 18h18M4 16 3 7l5 4 4-6 4 6 5-4-1 9z',
    flag: 'M5 21V4h12l-2.5 4 2.5 4H5',
    restart: 'M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 3.5v5h5',
    share: 'M12 3v12M8 7l4-4 4 4M5 12v8h14v-8',
    download: 'M12 3v12M8 11l4 4 4-4M5 21h14',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    volume: 'M4 9h4l5-4v14l-5-4H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8v.01',
  } as const;

  export type IconName = keyof typeof PATHS;
</script>

<script lang="ts">
  let { name, size = 24 }: { name: IconName; size?: number } = $props();
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={PATHS[name]} />
</svg>

<style>
  .icon {
    display: block;
    flex: none;
  }
</style>
