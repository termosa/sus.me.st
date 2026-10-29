<script lang="ts">
  import { PLAYER_COUNTS, type PlayerCount } from '../../engine/rules';
  import type { Dealing } from '../../engine/types';
  import { isIOS, isStandalone } from '../../platform/pwa';
  import { persistStorage } from '../../platform/storage';
  import { keepAwake } from '../../platform/wakelock';
  import Hint from '../components/Hint.svelte';
  import Icon from '../components/Icon.svelte';
  import MusicPanel from '../components/MusicPanel.svelte';
  import SettingsPanel from '../components/SettingsPanel.svelte';
  import Sheet from '../components/Sheet.svelte';
  import UpdateButton from '../components/UpdateButton.svelte';
  import { session } from '../game.svelte';

  let settingsOpen = $state(false);
  let musicOpen = $state(false);
  /** Picked player count; then the host chooses how roles are dealt. */
  let count: PlayerCount | null = $state(null);

  function start(dealing: Dealing) {
    if (!count) return;
    keepAwake(true);
    persistStorage();
    session.start(count, dealing);
  }
</script>

<main>
  <header>
    {#if count}
      <button type="button" class="icon back" aria-label="Back" onclick={() => (count = null)}>
        <Icon name="back" />
      </button>
    {/if}
    <UpdateButton />
    <button type="button" class="icon" aria-label="Music" onclick={() => (musicOpen = true)}>
      <Icon name="music" />
    </button>
    <button type="button" class="icon" aria-label="Settings" onclick={() => (settingsOpen = true)}>
      <Icon name="sliders" />
    </button>
  </header>

  <div class="logo"><Icon name="mask" size={96} /></div>

  {#if count}
    <Hint text="How are roles dealt? On screen, or with physical cards you enter seat by seat." />

    <div class="counts">
      <button type="button" class="count mode" onclick={() => start('app')}>
        <Icon name="phone" size={48} />
        <span>On screen</span>
      </button>
      <button type="button" class="count mode" onclick={() => start('cards')}>
        <Icon name="cards" size={48} />
        <span>Cards</span>
      </button>
    </div>
  {:else}
    <Hint text="How many players?" />

    <div class="counts">
      {#each PLAYER_COUNTS as n (n)}
        <button type="button" class="count" onclick={() => (count = n)}>
          <span>{n}</span>
          <Icon name="person" size={28} />
        </button>
      {/each}
    </div>
  {/if}

  {#if isIOS && !isStandalone}
    <p class="install">
      <Icon name="share" size={20} />
      <span>→ Add to Home Screen</span>
    </p>
  {/if}
</main>

{#if musicOpen}
  <Sheet onclose={() => (musicOpen = false)}>
    <MusicPanel />
  </Sheet>
{/if}

{#if settingsOpen}
  <Sheet onclose={() => (settingsOpen = false)}>
    <SettingsPanel />
  </Sheet>
{/if}

<style>
  main {
    display: grid;
    grid-template-rows: auto 1fr auto auto auto;
    justify-items: center;
    height: 100%;
    padding: 16px;
    gap: 24px;
  }

  header {
    justify-self: stretch;
    display: flex;
    justify-content: flex-end;
    gap: var(--gap);
  }

  .icon {
    display: grid;
    place-items: center;
    background: none;
    color: var(--text-dim);
  }

  .logo {
    align-self: center;
    color: var(--red);
  }

  .counts {
    display: flex;
    gap: 20px;
    padding-bottom: 12dvh;
  }

  .count {
    display: grid;
    place-items: center;
    gap: 4px;
    width: 120px;
    height: 140px;
    font-size: 56px;
    font-weight: 800;
    background: var(--surface);
  }

  .count :global(.icon) {
    color: var(--text-dim);
  }

  .mode {
    font-size: 18px;
    font-weight: 700;
  }

  .mode :global(.icon) {
    color: var(--text);
  }

  .back {
    margin-right: auto;
  }

  @media (max-height: 500px) {
    .logo {
      display: none;
    }

    .counts {
      align-self: center;
      padding-bottom: 0;
    }
  }

  .install {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--text-dim);
  }
</style>
