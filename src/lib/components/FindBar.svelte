<script>
  import { getEditorCommands } from '../editor/editorCommands.js'

  /** @type {{ open: boolean, onClose: () => void }} */
  let { open = false, onClose } = $props()

  let query = $state('')
  let inputEl = $state()

  $effect(() => {
    if (open) {
      queueMicrotask(() => inputEl?.focus())
    } else {
      query = ''
    }
  })

  function runNext() {
    if (!query.trim()) return
    getEditorCommands()?.findNext(query)
  }

  function runPrev() {
    if (!query.trim()) return
    getEditorCommands()?.findPrevious(query)
  }

  /** @param {KeyboardEvent} e */
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      e.shiftKey ? runPrev() : runNext()
    }
  }
</script>

{#if open}
  <div class="find-bar" role="search">
    <input
      bind:this={inputEl}
      type="search"
      class="find-input"
      placeholder="Find"
      bind:value={query}
      oninput={() => query && runNext()}
      onkeydown={handleKeydown}
    />
    <button type="button" class="find-btn" onclick={runPrev} title="Previous (⇧Enter)">↑</button>
    <button type="button" class="find-btn" onclick={runNext} title="Next (Enter)">↓</button>
    <button type="button" class="find-btn find-close" onclick={onClose} title="Close (Esc)">×</button>
  </div>
{/if}

<style>
  .find-bar {
    position: absolute;
    top: 8px;
    right: 12px;
    z-index: 25;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  }

  .find-input {
    width: 180px;
    border: none;
    background: transparent;
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--text);
    outline: none;
  }

  .find-btn {
    border: none;
    background: none;
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1;
    padding: 2px 6px;
    cursor: pointer;
    border-radius: 3px;
  }

  .find-btn:hover {
    color: var(--text);
    background: var(--crepe-color-hover);
  }

  .find-close {
    font-size: 14px;
  }
</style>
