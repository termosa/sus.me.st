<script lang="ts">
  import type { Timings } from '../../engine/rules';
  import { say } from '../cues';
  import { session } from '../game.svelte';
  import {
    CONFIGURABLE,
    resetTimings,
    type Settings,
    saveSettings,
    settings,
  } from '../settings.svelte';
  import Icon, { type IconName } from './Icon.svelte';

  const ROWS: Record<(typeof CONFIGURABLE)[number], { icon: IconName; label: string }> = {
    night0FreeSitting: { icon: 'moon', label: 'Free' },
    donCheck: { icon: 'hat', label: 'Don' },
    sheriffCheck: { icon: 'star', label: 'Sheriff' },
  };

  type Switch = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

  const TOGGLES: { key: Switch; icon: IconName; label: string }[] = [
    { key: 'sounds', icon: 'volume', label: 'Sounds' },
    { key: 'voice', icon: 'mic', label: 'Voice' },
    { key: 'hints', icon: 'info', label: 'Hints' },
    { key: 'cuesInSilentMode', icon: 'bell', label: 'Cues in silent mode' },
  ];

  function toggled() {
    saveSettings();
    // Turning the voice off also stops what it is saying.
    if (!settings.voice) say(null);
  }

  // Night timers apply to a game in progress too, from its next timer on.
  function step(key: keyof Timings, by: number) {
    settings.timings[key] = Math.max(5, settings.timings[key] + by);
    saveSettings();
    session.retime(settings.timings);
  }

  function reset() {
    resetTimings();
    session.retime(settings.timings);
  }
</script>

<div class="settings">
  {#each TOGGLES as t (t.key)}
    <label class="row toggle">
      <Icon name={t.icon} />
      <span class="label">{t.label}</span>
      <input type="checkbox" bind:checked={settings[t.key]} onchange={toggled} />
    </label>
  {/each}



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

  <button type="button" class="reset" aria-label="Default timings" onclick={reset}>
    <Icon name="restart" />
  </button>
</div>

<style>
  .settings {
    display: grid;
    gap: var(--gap);
  }

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
