# Tech choices: mafia host panel (phone-first, offline-first SPA)

Research date: 2026-10-28. Package versions are from the npm registry on that date. Bundle sizes were **measured** (see §1). Browser support comes from MDN browser-compat-data (BCD) unless another source is cited.

**TL;DR:** **Svelte 5 + Vite 8 + TypeScript**. Game logic is a **pure, event-sourced reducer**: undo works by replaying the log. Persistence is **localStorage**, saved on every action. Offline/install is handled by **vite-plugin-pwa (generateSW, prompt-to-update)**. Animation uses **WAAPI/CSS transforms (FLIP)** for the cards and **View Transitions** for phase changes, without an animation library. Timers are **timestamp-based**, and the screen is kept on with the **Screen Wake Lock** API.

---

## 1. UI framework

### Measured bundle size

Each framework built the same tiny app: a 10-card grid with tap state plus a rAF countdown. Build: Vite 8.3.5 production, single JS chunk, `gzip -9`.

| Framework (version) | JS gzip | Notes |
|---|---|---|
| SolidJS 1.9.17 | **6.6 KB** | Solid 2.0 is at `2.0.0-rc.19` (not stable) |
| Preact 11.1.0 + @preact/signals 2.11 | **8.8 KB** | Preact 11 stable since 2026-09-30 |
| Svelte 5.57.3 | **13.1 KB** | **16.2 KB** with `transition:fly/fade` + `animate:flip` + `Tween` |
| Vue 3.6.0-rc.13 Vapor (`createVaporApp`) | 20.3 KB | 3.6 is still RC; latest stable is 3.5.44 |
| Vue 3.5.44 | 24.7 KB | |
| React 19.3.1 + react-dom | 68.0 KB | before adding Motion for animation (~+25 KB) |

Svelte 5's baseline runtime is larger than the "~2 KB" figure that blog posts still repeat. Around 13 KB is the real number today. All candidates except React are within ~10 KB of each other. The app is precached once, so that difference doesn't matter for perceived speed.

### Comparison

| | Svelte 5 (runes) | SolidJS | Preact + signals | React 19 | Vue 3.5 / Vapor |
|---|---|---|---|---|---|
| Size (above) | 13–16 KB | 6.6 KB | 8.8 KB | 68 KB | 25 / 20 KB |
| Runtime perf (low-end Android) | Fine-grained, compiled: excellent | Best in class | Very good (signals skip VDOM diff) | OK; Compiler 1.0 helps | Good / excellent with Vapor |
| **Built-in animation** | **Yes**: `transition:`, `animate:flip`, `crossfade`, `Tween`/`Spring` classes, `prefersReducedMotion`. Transitions run on WAAPI | None (solid-transition-group, or Motion) | None | None (Motion for React is best-in-class, but heavy) | `<Transition>`/`<TransitionGroup>` (CSS-class based) |
| TypeScript | Good (`lang="ts"`, svelte-check). TS 7 caveat, see §7 | Excellent (TSX) | Excellent (TSX) | Excellent | Good (vue-tsc) |
| Maturity / stability now | Stable major, frequent minors | 1.x stable, **2.0 in RC** (migration ahead) | Stable (v11 just shipped) | Most mature | 3.5 stable, **Vapor in RC** |
| State-machine fit | `$state.raw(state)` + `dispatch()` in a `.svelte.ts` module: trivial | Signals/stores: trivial | Signals: trivial | `useReducer`/`useSyncExternalStore`: fine | `shallowRef`: fine |

Newer projects worth knowing about: **Ripple** (0.5.x, Svelte-like TS framework) is too early. **Solid 2.0** and **Vue Vapor** are promising but pre-stable. React Compiler 1.0 is stable, but it doesn't change React's size.

### Pick: **Svelte 5** (plain Svelte + Vite, no SvelteKit; one screen, no routing)

- It is the only candidate whose **animation primitives ship in the box**: `animate:flip` for grid reorders, `crossfade` for grid-to-overlay hand-off, `Tween`/`Spring` for the timer ring and counters. That covers this app's animation needs with no extra library. The owner asked specifically for "lightweight animated UI", and this is the reason for the pick.
- Fine-grained compiled updates mean UI work per tap is negligible even on low-end Android. Frame drops there come from *what* you animate (layout/paint), not from the framework.
- Runes (`$state`, `$derived`, `$effect`) map cleanly onto "pure reducer outside, reactive snapshot inside". Single-file components keep markup, style and transitions co-located, which gives good DX for a small app.
- It is the most stable of the fine-grained options right now (Solid 2 and Vue Vapor are both RC).
- Runner-up: **Preact 11 + signals**. It is smaller and gives TSX/React familiarity, but you would hand-write every animation with WAAPI (fine) or add Motion.

## 2. Animation approach

### Options

| Approach | Status | Verdict for this app |
|---|---|---|
| CSS transitions/keyframes on `transform`/`opacity` | Universal; compositor-friendly | **Use** for the flip (rotateY) and simple states |
| Web Animations API (`el.animate`) | Universal; compositor-friendly; promise-based (`.finished`), reversible, cancelable | **Use** for the FLIP zoom (interruptible, exact control) |
| Svelte transitions (`transition:`, `animate:flip`, `crossfade`) | Built-in. Driven by WAAPI, so global `prefers-reduced-motion` CSS **doesn't affect them**: use `prefersReducedMotion` | **Use** for list/overlay enter-exit and grid reorders |
| Same-document View Transitions (`document.startViewTransition`) | **Baseline**: Chrome 111, Safari 18, Firefox 144 (Oct 2025). `view-transition-class` Chrome 125 / Safari 18.2 / FF 144. Element-scoped VT is **Chrome 147 only** | **Use** for phase/screen changes (Day→Night, Voting), as progressive enhancement |
| Motion (`motion` 14.7) | `motion/mini` `animate` measured at **3.5 KB** gz (WAAPI-based). Full `animate` with springs is ~24 KB | Optional; not needed with Svelte |
| GSAP 3.15 | Fully free incl. plugins since Webflow's Apr 2025 change. Measured at **27 KB** gz. rAF/main-thread driven | Skip: overkill, and main-thread animation is the first thing to jank on low-end Android |
| auto-animate 0.10 | 3.3 KB gz | Skip: `animate:flip` covers it |

### Card zoom-to-fullscreen + 3D flip recipe (iOS Safari + Android Chrome)

Use a **WAAPI FLIP** for the zoom, not a View Transition. VT snapshots are rasterized images: scaling a small card snapshot up looks soft. Taps are swallowed during the transition, and a new `startViewTransition` *skips* the running one, which is bad for fast, impatient taps. A 3D flip inside `::view-transition-*` pseudo-elements is impractical.

1. **Structure.** The grid cell stays in place as a placeholder, which avoids layout shift. The zoomed card is rendered in a `position: fixed` overlay **at its final (large) size**. A separate backdrop element fades `opacity`. Do **not** use `backdrop-filter: blur`: it is expensive, and a WebKit bug breaks `backface-visibility` when the two are combined.
2. **Tap 1 (zoom).** Read `cell.getBoundingClientRect()` and the overlay card rect. Compute `translate(dx,dy) scale(sx,sy)` from big to small and run `card.animate([{transform: inverse}, {transform: 'none'}], {duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)'})`. Scaling *down from* the final size keeps text crisp at rest. Only `transform` and `opacity` are animated, so it stays on the compositor.
3. **Tap 2 (flip).** Use `.card { perspective: 1000px }` and `.inner { transform-style: preserve-3d; transition: transform 450ms }`. Toggle `rotateY(180deg)`. Both faces get `backface-visibility: hidden; -webkit-backface-visibility: hidden` (unprefixed since Safari 15.4; keep the prefix for safety), and the back face gets an opaque background.
4. **Tap 3 (hide + return).** Flip back to face-down, then fade/shrink the overlay out and unmount it. The picked card is removed from the grid (product decision: taken cards aren't shown).
5. **Robustness.** The state machine owns the step (`zoomed`/`revealed`/`idle`); animations only follow it. Either ignore taps while `anim.finished` is pending, or commit state immediately and `reverse()`/`cancel()` the in-flight animation. Add `will-change: transform` only during the animation. Hide the revealed role on `visibilitychange: hidden` so the OS app-switcher snapshot doesn't leak it (best-effort).
6. **Svelte option.** `crossfade` (send/receive) does steps 1–2 declaratively. A ~30-line `flip.ts` WAAPI helper gives tighter control. Use the helper for the card, and Svelte transitions everywhere else.

**Phase transitions:** `document.startViewTransition(() => flushSync(() => dispatch(e)))` with `view-transition-name` on persistent chrome (timer, header). Fall back to an instant update when `startViewTransition` is missing or reduced motion is preferred.

**Timer ring:** SVG circle `stroke-dashoffset` driven by a **CSS animation** with `animation-duration: <total>` and `animation-delay: -<elapsed>`. Pause with `animation-play-state`. The ring then needs no per-frame JS. It repaints only a tiny area, which is cheap. JS updates the seconds digits about 4×/s from timestamps.

## 3. State management

| Option | Verdict |
|---|---|
| XState 5.33 | Solid, with a great visualizer. But it measured **11.8 KB** gz for a 2-state machine, it is verbose for a rules-heavy game, it has **no built-in undo**, and **v6 is in alpha** (6.0.0-alpha.70), so a migration is coming. Skip. |
| Framework stores as the source of truth | Mixes rules with UI and is hard to test and undo. Skip. |
| **Hand-rolled typed reducer + event log** | **Pick.** |

Design:
- `GameState` uses a discriminated `phase` (`setup | deal | day | nomination | voting | night | finished`). `GameEvent` is a discriminated union. `reduce(state, event): GameState` is pure, with exhaustive `switch` + `never` checks. Rule constants (speech 60s/30s, foul limits, role sets for 9/10) live in `rules.ts`.
- **Event sourcing:** persist `{ schemaVersion, setup, events[] }`. `state = events.reduce(reduce, init(setup))`. **Undo = drop the last undoable event and replay** (microseconds for a few hundred events). Redo is a stack of popped events. This also gives an audit trail ("why is #7 out?") for free.
- Keep the reducer deterministic. Randomness (the role shuffle) happens once in `setup` and is stored as a permutation or seed. Timestamps are passed *in* the event payload (`at: Date.now()`) and never read inside the reducer.
- Mark timer start/pause events `undoable: false`, or keep the speech timer outside the log, so "undo" doesn't rewind a running timer by accident.
- Svelte glue: `let game = $state.raw(replay(saved))`; `dispatch(e)` appends to the log, reassigns `game`, then saves. Use `$state.raw`: snapshots are immutable and replaced, not deep-proxied.

## 4. Persistence

- **localStorage** is the right tool here. The state is a few KB, and a **synchronous** `setItem` after every dispatch is durable before the next frame, even if the page is killed immediately after. IndexedDB/`idb-keyval` (6.3, 0.7 KB) adds async-ness for no benefit at this size. Reconsider it only for multi-game history.
- Key: `game:v1` → `{schemaVersion, setup, events}`. Also save on `pagehide`. Wrap reads in try/catch and run migrations when `schemaVersion` changes.
- `navigator.storage.persist()` (Chrome 55, Safari 15.2, FF 57): call it once on first launch, best-effort. WebKit grants persistence by heuristics, and **being a Home Screen web app is one of the signals**. Persistent origins are exempt from eviction ([WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/)).
- iOS caveats:
  - ITP can evict script-writable storage after 7 days *without use*. Home Screen apps have their own day counter that only advances when the app is used, so an in-progress game is safe.
  - **Storage in the installed iOS app is separate from Safari's.** A game started in Safari won't appear in the home-screen app.
  - Storage can also be evicted under disk pressure (LRU by origin).
  - No history in v1 means losing data costs at most one game.

## 5. PWA / offline

- **vite-plugin-pwa 2.0.0** (2026-10-03; Workbox 7.4; supports Vite 8) with `strategies: 'generateSW'`, `registerType: 'prompt'`. It precaches all build assets and sets `navigateFallback: 'index.html'`. A hand-written SW is ~40 lines but needs a hashed precache manifest generated from the build. The plugin does that, and you can still drop to `injectManifest` later.
- **Update strategy (never reload mid-game):** a new SW installs in the background and **waits**: no `skipWaiting`, no `clientsClaim`. Use `useRegisterSW` (`virtual:pwa-register/svelte`) to read `needRefresh`. Show an "Update ready" button **only when `phase` is `setup` or `finished`**, and call `updateServiceWorker(true)` only on that explicit tap. Call `registration.update()` on app open when online. Because state persists, even an unexpected reload resumes the game.
- **Manifest:** `name`, `short_name`, `start_url: "."`, `scope`, `display: "standalone"`, `orientation: "portrait"` (Android only), dark `background_color`/`theme_color`, icons 192/512 plus `maskable`. Generate the icons with `@vite-pwa/assets-generator` 2.0. Also add `<link rel="apple-touch-icon">` (180px) and `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`.
- **iOS install:**
  - iOS has no `beforeinstallprompt`. Show a one-time "Share → Add to Home Screen" hint when `!matchMedia('(display-mode: standalone)').matches` on iOS.
  - Since **iOS 26**, Add to Home Screen opens sites as web apps by default ([heise](https://heise.de/-10749652)).
  - Android Chrome: use `beforeinstallprompt` for a custom Install button.

## 6. Timers on phones

- **Timestamp-based:** store `{status:'running', endsAt}` or `{status:'paused', remainingMs}` in state. Derive `remaining = endsAt - Date.now()`. Render via rAF while visible, and recompute on `visibilitychange`. Never count `setInterval` ticks: they are throttled or suspended when backgrounded or locked. Use `Date.now()` (not `performance.now()`) for anything persisted, so the timer survives a reload. Monotonic `performance.now()` is fine for in-memory frame math.
- **Lock/background:** JS is suspended. On return, the timer is still correct, but cues that should have fired while hidden are lost. Show "time's up" on resume. The real fix is to keep the screen on.
- **Screen Wake Lock:**
  - Support is Baseline 2025. Chrome Android works.
  - iOS Safari supports it from **16.4**, but it **did not work in installed Home Screen apps until 18.4** (BCD; [WebKit bug 254545](https://webkit.org/b/254545)).
  - Request it on game start, from a gesture. Re-acquire it on `visibilitychange → visible`. Listen for the sentinel's `release` event, and wrap the request in try/catch (power-saver mode rejects).
  - Fallback: show "set Auto-Lock to Never" if `!('wakeLock' in navigator)`.
- **Audio cues:**
  - Use Web Audio with synthesized beeps (`OscillatorNode` + gain envelope): no asset files, schedule-accurate.
  - Create or `resume()` the `AudioContext` inside the first tap ("Start game") to unlock it on iOS, and resume again after `interrupted`/`suspended` states (calls, Siri).
  - **iOS silent switch:** Web Audio is muted by default (session type `auto`/ambient). `navigator.audioSession.type = 'playback'` (Safari 16.4+; not in Chrome/FF) makes it play through silent mode, **but it is exclusive and pauses other audio** such as the host's background music. Make it a setting ("Play cues in silent mode").
- **Vibration:**
  - `navigator.vibrate` works on **Chrome Android** (needs prior user interaction on the page). It is **no-op on Firefox Android** (returns true, doesn't vibrate) and **unsupported on iOS Safari**.
  - The iOS `<input type=checkbox switch>` haptic hack worked on iOS 17.4–26.4, but third-party testers report it was **closed in iOS 26.5** ([ios-haptics tester](https://rapidtoolset.com/en/tool/ios-haptics-tester)). Don't rely on it.
  - Cue strategy: sound + strong visual (ring color change, full-screen pulse at 10 s and 0 s) + vibrate where available.

## 7. Tooling

| Area | Choice | Notes |
|---|---|---|
| Build | **Vite 8.3** | Rolldown-based since 8.0 (Mar 2026); Rolldown 1.0 stable May 2026 |
| Svelte plugin | `@sveltejs/vite-plugin-svelte` 7.3 | |
| TypeScript | **typescript 6.0.x** (pin), `strict` | TS **7.0.2** (Go) is `latest`, but **svelte-check supports TS 7 only behind `--tsgo` flags and needs TS 6 installed alongside**. Stay on 6 for v1 and revisit later. |
| Type check | `svelte-check` 4.7 | Also surfaces Svelte a11y warnings |
| Unit tests | **Vitest 5.0** | Covers the engine (reducer, replay/undo, vote tallies) as pure TS; no DOM needed |
| E2E | **Playwright 1.64** (Chromium preinstalled) | Mobile emulation (`devices['Pixel 7']`, touch). Use `page.clock` to fast-forward speech timers. Playwright WebKit on Linux ≠ iOS Safari, so **real-device iOS checks are mandatory** for flip, wake lock and audio. |
| Lint/format | **Biome 2.6** | One fast tool. **Svelte support is still "experimental"** (opt-in; "sufficient for the majority of Svelte 5 projects"). Fallback if it bites: ESLint 10 + eslint-plugin-svelte + Prettier + prettier-plugin-svelte. |
| Package manager | **pnpm** | Strict and fast. Latest is 12.16, but the local 10.34 is fine; pin it via `packageManager`. Bun 1.4 works, but adds nothing here. |
| Runtime | Node 24 LTS (installed) | |
| Hosting | **Cloudflare Workers Static Assets** or **GitHub Pages** | Both are free and support custom domains and HTTPS. Cloudflare now steers new projects from Pages to Workers static assets, and you get a `_headers` file (`no-cache` for `index.html`/`sw.js`). GitHub Pages is zero-config via Actions. The SW update check bypasses the HTTP cache by default, so GH Pages' 10-min max-age is acceptable. |

## 8. Mobile UX notes

- **Viewport:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Don't set `user-scalable=no`, which iOS ignores anyway. Give the app shell `height: 100dvh` (Safari 15.4, Chrome 108), or `100svh` to avoid resize jumps while the browser chrome animates. Use `position: fixed; inset: 0` for overlays.
- **Safe areas:** `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`. This is needed because the status bar is `black-translucent`.
- **No scroll/zoom/selection accidents:**
  - Make the shell non-scrolling with `overscroll-behavior: none` on `html, body`. It is supported on Safari 16+ and Chrome; it kills Android pull-to-refresh. Reports on iOS standalone pull-to-refresh are mixed, so test on device.
  - `touch-action: manipulation` on body removes double-tap zoom and the click delay. Use `touch-action: none` on the card overlay.
  - `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent`. Prevent `contextmenu` on cards.
- **Touch targets:** the guidelines say ≥44 pt (Apple HIG) / 48 dp (Material). For a host acting fast in dim light, use **≥56 px** for frequent actions (foul +1, next speaker, vote). Put destructive actions (kill, remove player) behind hold-to-confirm or undo, not dialogs.
- **Dark by default:** `color-scheme: dark`, `<meta name="color-scheme" content="dark">`, dark `theme-color`. Use a low-luminance palette and avoid large white areas; a dimmer red-tinted theme fits the night phase. Respect `prefers-reduced-motion` through Svelte's `prefersReducedMotion`.
- **Back-navigation protection:**
  - The Android back gesture/button and the iOS edge-swipe in standalone mode **cannot be disabled** ([W3C discussion](https://lists.w3.org/Archives/Public/public-css-archive/2021Mar/0867.html)).
  - Use a sentinel history entry: `history.pushState` once **after a user tap** (Chrome skips entries added without user activation). On `popstate`, re-push it and show "Leave game?".
  - The Navigation API is now cross-browser (Chrome 102, Safari 26.2, Firefox 147) and is an alternative.
  - `beforeunload` is unreliable on mobile. The real safety net is that state persists and the app resumes exactly where it was.
- **Privacy while passing the phone:** auto-hide the revealed role on `visibilitychange`. Never show roles in the grid. Keep a host-only "show all roles" view behind a long-press.

---

## Recommended stack

| Layer | Choice | Why |
|---|---|---|
| UI | **Svelte 5.57** (plain, no SvelteKit) | Built-in transitions/`animate:flip`/`crossfade`/`Tween`, compiled fine-grained updates, ~13–16 KB, stable |
| Animation | **CSS transforms + WAAPI FLIP**; **View Transitions** for phases | Compositor-only, interruptible, zero dependencies; VT is Baseline (Chrome/Safari 18/FF 144) |
| Game logic | **Typed pure reducer + event log** | Trivially testable, deterministic replay, undo/redo for free, no 12 KB XState |
| Persistence | **localStorage** (+ `storage.persist()`) | Synchronous save per action; tiny state; IndexedDB unnecessary |
| Offline/PWA | **vite-plugin-pwa 2.0** (generateSW, `prompt`) | Hashed precache; update only between games |
| Timers | `endsAt` timestamps + rAF + **Wake Lock** | Correct across background/reload; screen stays on (iOS PWA 18.4+) |
| Cues | Web Audio beeps (+ optional `audioSession='playback'`), `vibrate` on Android | iOS has no web vibration |
| Build | **Vite 8.3** (Rolldown) + **TypeScript 6.0** | Fast; TS 7 not yet first-class in svelte-check |
| Test | **Vitest 5** (engine) + **Playwright 1.64** (mobile emulation, `page.clock`) | Engine fully unit-tested; e2e for flows |
| Lint/format | **Biome 2.6** (+ svelte-check) | One tool; ESLint+Prettier fallback |
| PM / host | **pnpm**; Cloudflare Workers static assets or GitHub Pages | Free static hosting with HTTPS + custom domain |

## Project structure sketch

```
src/
  engine/                 # pure TS: no DOM, no Svelte imports
    types.ts              # GameState (phase union), Player, Role, GameEvent union
    rules.ts              # speech durations, foul limits, role sets for 9/10
    setup.ts              # init(setup), seeded role deal
    reducer.ts            # reduce(state, event) -> state (exhaustive)
    selectors.ts          # alive players, speaking order, nominees, vote tally
    log.ts                # replay(setup, events), undo/redo, undoable flags
    *.test.ts             # Vitest
  platform/               # browser adapters, no game rules
    storage.ts            # localStorage load/save, schemaVersion migrations
    clock.ts              # now(), remaining(endsAt)
    wakelock.ts           # request/re-acquire on visibilitychange
    audio.ts              # AudioContext unlock, beep(), audioSession setting
    haptics.ts            # vibrate() with feature detection
    history-guard.ts      # back-navigation sentinel
    pwa.ts                # useRegisterSW wrapper, update-only-between-games
  app/                    # Svelte UI
    game.svelte.ts        # $state.raw game, dispatch(), undo(), auto-save
    App.svelte            # switches screen by game.phase (+ view transition)
    screens/              # Setup, Deal, Day, Nomination, Voting, Night, Finished
    components/           # CardGrid, RoleCard, TimerRing, PlayerRow, FoulBadge, UndoBar
    motion/               # flip.ts (WAAPI FLIP), viewTransition.ts
    styles/               # tokens.css (dark palette, sizes), base.css (resets, safe areas)
  main.ts
public/                   # icons (generated), apple-touch-icon
tests/e2e/                # deal.spec.ts, speech-timer.spec.ts, undo.spec.ts, offline.spec.ts
index.html  vite.config.ts  tsconfig.json  biome.json  playwright.config.ts
```

## Risks / open questions

- **iOS real-device testing is required.** Nothing in CI reproduces iOS Safari's 3D compositing, wake lock in standalone mode, audio unlock or silent-switch behavior.
- **Wake lock on iOS < 18.4 standalone** doesn't work. Decide whether to support those devices with a hint only.
- **iOS haptics are effectively unavailable.** Cues must work through sound and visuals alone.
- **`audioSession='playback'` pauses other audio.** Decide whether it should be on by default.
- **Tooling churn:** TypeScript 7 / svelte-check, Biome's experimental Svelte support, Solid 2.0 and Vue Vapor going stable, XState v6. None of these blocks v1. Pin versions.
- **Domain questions:** ruleset and UI language are decided (see [rules.md](rules.md) §14 and [product.md](product.md)). Undo can step back through any game event, including night actions; timer start/pause events are not undoable.

## Sources

- npm registry metadata (versions/dates), queried 2026-10-28: `npm view <pkg>`.
- Bundle measurements: local Vite 8.3.5 builds (method in §1).
- Vite 8 announcement: https://vite.dev/blog/announcing-vite8 · Rolldown 1.0: https://voidzero.dev/posts/announcing-rolldown-1-0
- Vue 3.6 RC status: https://newreleases.io/project/github/vuejs/core/release/v3.6.0-rc.1 · Preact 11: https://preactjs.com/blog/preact-11 · Solid releases: https://github.com/solidjs/solid/releases
- Svelte transitions (WAAPI, reduced motion): https://svelte.dev/docs/svelte/transition · `svelte/motion`: https://svelte.dev/docs/svelte/svelte-motion
- Same-document View Transitions Baseline: https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available · VT 2025 update: https://developer.chrome.com/blog/view-transitions-in-2025
- MDN browser-compat-data (WakeLock, vibrate, AudioSession, StorageManager.persist, startViewTransition, Element.startViewTransition, Navigation, backface-visibility, viewport units, overscroll-behavior): https://github.com/mdn/browser-compat-data
- Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API · WebKit bug 254545: https://webkit.org/b/254545 · https://progressier.com/pwa-capabilities/screen-wake-lock
- AudioSession: https://developer.mozilla.org/docs/Web/API/AudioSession/type · https://www.w3.org/TR/audio-session/ · https://bugs.webkit.org/show_bug.cgi?id=237322
- iOS web haptics: https://rapidtoolset.com/en/tool/ios-haptics-tester · https://azukiazusa.dev/en/blog/ios-safari-web-haptics
- WebKit storage policy: https://webkit.org/blog/14403/updates-to-storage-policy/ · 7-day cap / Home Screen counter: https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519
- WebKit backface-visibility + backdrop-filter bug: https://bugs.webkit.org/show_bug.cgi?id=249952
- iOS 26 Home Screen web app behavior: https://heise.de/-10749652 · iOS back-swipe can't be disabled: https://lists.w3.org/Archives/Public/public-css-archive/2021Mar/0867.html · `overscroll-behavior-x` doesn't stop history swipe (WebKit): https://bugs.webkit.org/show_bug.cgi?id=240183
- vite-plugin-pwa 2.0.0 release: https://github.com/vite-pwa/vite-plugin-pwa/releases · Svelte integration: https://vite-pwa-org.netlify.app/frameworks/svelte
- GSAP free: https://webflow.com/blog/gsap-becomes-free
- svelte-check TS 7 note: https://github.com/sveltejs/language-tools/tree/master/packages/svelte-check
- Biome language support: https://biomejs.dev/internals/language-support/
- Cloudflare Pages → Workers static assets: https://developers.cloudflare.com/workers/static-assets/migrate-from-pages/
