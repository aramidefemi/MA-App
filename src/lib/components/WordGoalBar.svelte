<script lang="ts">
  import { document } from '../modules/document'
  import { wordGoal } from '../modules/wordGoal'

  $effect(() => {
    document.content
    wordGoal.syncCompletion()
  })
</script>

{#if wordGoal.isActive}
  <div class="goal-bar" aria-hidden="true">
    <div
      class="goal-fill"
      class:complete={wordGoal.isComplete}
      class:faded={wordGoal.completedFaded}
      style:width="{wordGoal.progress}%"
    ></div>
  </div>
{/if}

<style>
  .goal-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    z-index: 100;
    background: color-mix(in srgb, var(--border) 65%, transparent);
    pointer-events: none;
  }

  .goal-fill {
    height: 100%;
    min-width: 2px;
    background: color-mix(in srgb, var(--accent) 70%, transparent);
    transition: width 0.25s ease, background 0.8s ease;
  }

  .goal-fill.complete {
    background: var(--accent);
  }

  .goal-fill.complete.faded {
    background: color-mix(in srgb, var(--accent) 40%, transparent);
  }
</style>
