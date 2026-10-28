<script lang="ts">
  import type { Timings } from '../../engine/rules';
  import Icon, { type IconName } from '../components/Icon.svelte';
  import Sheet from '../components/Sheet.svelte';
  import { CONFIGURABLE, resetTimings, saveSettings, settings } from '../settings.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const ROWS: Record<(typeof CONFIGURABLE)[number], { icon: IconName; label: string }> = {
    night0FreeSitting: { icon: 'moon', label: 'Free' },
    donCheck: { icon: 'hat', label: 'Don' },
    sheriffCheck: { icon: 'star', label: 'Sheriff' },
  };

  function step(key: keyof Timings, by: number) {
    settings.timings[key] = Math.max(5, settings.timings[key] + by);
    saveSettings();
  }
</script>

<Sheet {onclose}>
  {#each CONFIGURABLE as key (key)}
    {@const row = ROWS[key]}
    <div class="row">
      <Icon name={row.icon} />
      <span class="label">{row.label}</span>
      <button type="button" aria-label="Less" onclick={() => step(key, -5)}>
        <Icon name="minus" />
      </button>
      <span class="value">{settings.timings[key]}</span>
      <button type="button" aria-label="More" onclick={() => step(key, 5)}>
        <Icon name="plus" />
      </button>
    </div>
  {/each}

  <label class="row toggle">
    <Icon name="bell" />
    <span class="label">Cues in silent mode</span>
    <input
      type="checkbox"
      bind:checked={settings.cuesInSilentMode}
      onchange={saveSettings}
    />
  </label>

  <button type="button" class="reset" aria-label="Default timings" onclick={resetTimings}>
    <Icon name="restart" />
  </button>
</Sheet>

<style>
  .row {
    display: grid;
    grid-template-columns: 24px 1fr var(--tap) 3ch var(--tap);
    align-items: center;
    gap: 12px;
  }

  .row button {
    display: grid;
    place-items: center;
  }

  .label {
    color: var(--text-dim);
  }

  .value {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
  }

  .toggle {
    grid-template-columns: 24px 1fr auto;
    min-height: var(--tap);
  }

  .toggle input {
    width: 28px;
    height: 28px;
    accent-color: var(--accent);
  }

  .reset {
    display: grid;
    place-items: center;
    justify-self: end;
    color: var(--text-dim);
  }
</style>
