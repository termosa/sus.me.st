<script lang="ts">
  import type { Snippet } from 'svelte';
  import MusicPanel from './MusicPanel.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import Sheet from './Sheet.svelte';

  /**
   * The menu sheet (settings, plus the screen's own actions below them) and the night music
   * sheet. Music opened from the menu gets a back arrow to it; opened directly, it doesn't.
   */
  let {
    menu = $bindable(false),
    music = $bindable(false),
    actions,
  }: { menu?: boolean; music?: boolean; actions?: Snippet } = $props();

  let fromMenu = $state(false);

  function openMusic() {
    menu = false;
    fromMenu = true;
    music = true;
  }

  function backToMenu() {
    music = false;
    fromMenu = false;
    menu = true;
  }

  function closeMusic() {
    music = false;
    fromMenu = false;
  }
</script>

{#if music}
  <Sheet onclose={closeMusic}>
    <MusicPanel onback={fromMenu ? backToMenu : undefined} />
  </Sheet>
{/if}

{#if menu}
  <Sheet onclose={() => (menu = false)}>
    <SettingsPanel onmusic={openMusic} />
    {#if actions}
      <hr />
      {@render actions()}
    {/if}
  </Sheet>
{/if}

<style>
  hr {
    width: 100%;
    margin: 4px 0;
    border: 0;
    border-top: 1px solid var(--surface-2);
  }
</style>
