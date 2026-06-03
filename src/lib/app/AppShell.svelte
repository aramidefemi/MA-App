<script>
  import WordGoalBar from '../components/WordGoalBar.svelte'

  let { showWelcome, welcome, editor, settings } = $props()
</script>

<div class="app">
  <WordGoalBar />
  {#if showWelcome}
    <div class="titlebar-drag" data-tauri-drag-region></div>
    <div class="empty">
      {@render welcome()}
    </div>
  {:else}
    <div class="editor-shell">
      {@render editor()}
    </div>
  {/if}
  {@render settings?.()}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg);
  }

  .titlebar-drag {
    height: 38px;
    flex-shrink: 0;
    -webkit-app-region: drag;
  }

  .editor-shell {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
</style>
