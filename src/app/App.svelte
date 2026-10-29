<script lang="ts">
  import { keepAwake } from '../platform/wakelock';
  import { session } from './game.svelte';
  import Assign from './screens/Assign.svelte';
  import Deal from './screens/Deal.svelte';
  import Finished from './screens/Finished.svelte';
  import Play from './screens/Play.svelte';
  import Setup from './screens/Setup.svelte';

  const game = $derived(session.game);

  $effect(() => {
    keepAwake(game !== null && game.step.kind !== 'over');
  });
</script>

{#if !game}
  <Setup />
{:else if game.step.kind === 'deal' && game.setup.dealing === 'cards'}
  <Assign {game} />
{:else if game.step.kind === 'deal'}
  <Deal {game} />
{:else if game.step.kind === 'over'}
  <Finished {game} />
{:else}
  <Play {game} />
{/if}
