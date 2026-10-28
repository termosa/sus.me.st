<script lang="ts">
  import { PLAYER_COUNTS } from '../engine/rules';
</script>

<main>
  <div class="counts">
    {#each PLAYER_COUNTS as count (count)}
      <button type="button">{count}</button>
    {/each}
  </div>
</main>

<style>
  main {
    display: grid;
    place-items: center;
    height: 100%;
  }

  .counts {
    display: flex;
    gap: var(--gap);
  }

  .counts button {
    width: 96px;
    height: 96px;
    font-size: 40px;
    font-weight: 700;
  }
</style>
