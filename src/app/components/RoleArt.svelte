<script lang="ts" module>
  import type { Role } from '../../engine/rules';
  import type { IconName } from './Icon.svelte';

  export const ROLE_ICON: Record<Role, IconName> = {
    citizen: 'person',
    sheriff: 'star',
    mafia: 'mask',
    don: 'hat',
  };

  export const ROLE_NAME: Record<Role, string> = {
    citizen: 'Citizen',
    sheriff: 'Sheriff',
    mafia: 'Mafia',
    don: 'Don',
  };
</script>

<script lang="ts">
  import { teamOf } from '../../engine/rules';
  import Icon from './Icon.svelte';

  let { role }: { role: Role } = $props();
</script>

<div class="art {teamOf(role)}">
  <div class="disc"><Icon name={ROLE_ICON[role]} size={88} /></div>
  <div class="name">{ROLE_NAME[role]}</div>
</div>

<style>
  /* Scales with the card it is drawn on: the big dealt card, the preview, the role buttons. */
  .art {
    container-type: inline-size;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 6cqi;
    height: 100%;
    border-radius: inherit;
  }

  .red {
    background: radial-gradient(circle at 50% 35%, #7a1d22, #2a0b0d 75%);
    color: #ffd9da;
  }

  .black {
    background: radial-gradient(circle at 50% 35%, #2b2b36, #050507 75%);
    color: #e8e8f0;
  }

  .disc {
    display: grid;
    place-items: center;
    width: 42cqi;
    height: 42cqi;
    border-radius: 50%;
    border: max(2px, 0.8cqi) solid currentColor;
  }

  .disc :global(.icon) {
    width: 55%;
    height: auto;
  }

  .name {
    font-size: 8cqi;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>
