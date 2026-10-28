<script lang="ts">
  import { PLAYER_COUNTS, type PlayerCount } from '../../engine/rules';
  import { isIOS, isStandalone } from '../../platform/pwa';
  import { persistStorage } from '../../platform/storage';
  import { keepAwake } from '../../platform/wakelock';
  import Hint from '../components/Hint.svelte';
  import Icon from '../components/Icon.svelte';
  import SettingsPanel from '../components/SettingsPanel.svelte';
  import Sheet from '../components/Sheet.svelte';
  import UpdateButton from '../components/UpdateButton.svelte';
  import { session } from '../game.svelte';

  let settingsOpen = $state(false);

  function start(count: PlayerCount) {
    keepAwake(true);
    persistStorage();
    session.start(count);
  }
</script>

<main>
  <header>
    <UpdateButton />
    <button type="button" class="icon" aria-label="Settings" onclick={() => (settingsOpen = true)}>
      <Icon name="sliders" />
    </button>
  </header>

  <div class="logo"><Icon name="mask" size={96} /></div>

  <Hint text="How many players?" />

  <div class="counts">
    {#each PLAYER_COUNTS as count (count)}
      <button type="button" class="count" onclick={() => start(count)}>
        <span>{count}</span>
        <Icon name="person" size={28} />
      </button>
    {/each}
  </div>

  {#if isIOS && !isStandalone}
    <p class="install">
      <Icon name="share" size={20} />
      <span>→ Add to Home Screen</span>
    </p>
  {/if}
</main>

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
