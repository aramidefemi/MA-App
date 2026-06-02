<script>
  /**
   * @typedef {{ id: string, label: string, danger?: boolean, disabled?: boolean, shortcut?: string }} MenuItem
   */

  /** @type {{ open?: boolean, x?: number, y?: number, items?: MenuItem[], onSelect?: (id: string) => void, onClose?: () => void }} */
  let {
    open = false,
    x = 0,
    y = 0,
    items = [],
    onSelect = () => {},
    onClose = () => {},
  } = $props()

  let menuEl = $state(null)

  const style = $derived.by(() => {
    if (!open) return ''
    const pad = 8
    const maxW = 220
    const maxH = 320
    let left = x
    let top = y
    if (typeof window !== 'undefined') {
      left = Math.min(left, window.innerWidth - maxW - pad)
      top = Math.min(top, window.innerHeight - maxH - pad)
    }
    return `left:${Math.max(pad, left)}px;top:${Math.max(pad, top)}px`
  })

  function pick(id) {
    const item = items.find((i) => i.id === id)
    if (!item || item.disabled) return
    onSelect(id)
    onClose()
  }

  $effect(() => {
    if (!open) return

    function onPointerDown(e) {
      if (menuEl?.contains(/** @type {Node} */ (e.target))) return
      onClose()
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  })
</script>

{#if open}
  <div
    bind:this={menuEl}
    class="ctx-menu"
    role="menu"
    tabindex="-1"
    style={style}
    oncontextmenu={(e) => e.preventDefault()}
  >
    {#each items as item (item.id)}
      <button
        type="button"
        class="ctx-item"
        class:danger={item.danger}
        role="menuitem"
        disabled={item.disabled}
        onclick={() => pick(item.id)}
      >
        <span class="ctx-label">{item.label}</span>
        {#if item.shortcut}
          <span class="ctx-shortcut">{item.shortcut}</span>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .ctx-menu {
    position: fixed;
    z-index: 1000;
    min-width: 168px;
    max-width: 220px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: 0 4px 16px rgb(0 0 0 / 28%);
    font-family: var(--font-ui);
    font-size: 12px;
  }

  .ctx-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 5px 8px;
    border: 0;
    border-radius: calc(var(--radius) - 2px);
    background: transparent;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: default;
    transition: background 0.1s;
  }

  .ctx-item:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .ctx-item:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .ctx-item.danger:not(:disabled) {
    color: var(--crepe-color-error);
  }

  .ctx-label {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .ctx-shortcut {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--text-dim);
  }

  .ctx-item.danger:not(:disabled) .ctx-shortcut {
    color: color-mix(in srgb, var(--crepe-color-error) 70%, var(--text-dim));
  }
</style>
