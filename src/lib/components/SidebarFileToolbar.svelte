<script>
  import { Bot, FilePlus, FolderMinus, FolderPlus, RefreshCw, Search, X } from '@lucide/svelte'
  import Tooltip from './Tooltip.svelte'

  let {
    onNewFile = () => {},
    onNewFolder = () => {},
    onRefresh = () => {},
    onCollapse = () => {},
    onAiDrift = () => {},
    aiDriftStatus = 'idle',
    aiDriftStatusText = '',
    aiDriftDraftCount = null,
    aiDriftIsStale = false,
    aiDriftIsRunning = false,
    aiDriftIssueCount = 0,
    onDriftNavigate = () => {},
    searchQuery = $bindable(''),
  } = $props()

  let aiDriftTooltip = $derived.by(() => {
    if (aiDriftIsRunning) return 'AI Draft scan running...'
    if (aiDriftStatus === 'error') return 'AI Draft scan failed. Try again.'
    if (aiDriftStatus === 'done') {
      const count = aiDriftDraftCount ?? 0
      const nav =
        aiDriftIssueCount > 0 && !aiDriftIsStale
          ? ' Click the count to jump between highlights.'
          : ''
      return `AI Draft: ${count} drifty passage${count === 1 ? '' : 's'}.${nav}`
    }
    return 'Re-run AI Draft scan'
  })

  function handleDriftStatusClick() {
    if (aiDriftStatus === 'done' && aiDriftIssueCount > 0 && !aiDriftIsStale) {
      onDriftNavigate()
    }
  }

  function clearSearch() {
    searchQuery = ''
  }
</script>

<div class="file-toolbar" role="toolbar" aria-label="File explorer actions">
  <div class="file-ops">
    <Tooltip text="Create new markdown file" position="bottom">
      <button type="button" class="tool-btn" aria-label="New File" onclick={onNewFile}>
        <FilePlus size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </Tooltip>

    <Tooltip text="Create new folder" position="bottom">
      <button type="button" class="tool-btn" aria-label="New Folder" onclick={onNewFolder}>
        <FolderPlus size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </Tooltip>

    <Tooltip text="Refresh file tree" position="bottom">
      <button type="button" class="tool-btn" aria-label="Refresh explorer" onclick={onRefresh}>
        <RefreshCw size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </Tooltip>

    <Tooltip text="Collapse all folders" position="bottom">
      <button type="button" class="tool-btn" aria-label="Collapse all folders" onclick={onCollapse}>
        <FolderMinus size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </Tooltip>
  </div>

  <div class="search-wrap">
    <Search size={14} strokeWidth={1.5} class="search-icon" aria-hidden="true" />
    <input
      type="search"
      class="search-input"
      placeholder="Filter files…"
      aria-label="Filter files"
      bind:value={searchQuery}
    />
    {#if searchQuery}
      <button type="button" class="search-clear" aria-label="Clear filter" onclick={clearSearch}>
        <X size={12} strokeWidth={2} aria-hidden="true" />
      </button>
    {/if}
  </div>

  <div class="toolbar-divider" aria-hidden="true"></div>

  <div class="goal-anchor">
    <Tooltip text={aiDriftTooltip} position="bottom">
      <button
        type="button"
        class="tool-btn"
        class:spinning={aiDriftIsRunning}
        aria-label="Re-run AI Draft scan"
        aria-busy={aiDriftIsRunning}
        disabled={aiDriftIsRunning}
        onclick={onAiDrift}
      >
        <Bot size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </Tooltip>
    {#if aiDriftStatus !== 'idle'}
      {#if aiDriftStatus === 'done' && aiDriftIssueCount > 0 && !aiDriftIsStale}
        <button
          type="button"
          class="ai-drift-status clickable"
          onclick={handleDriftStatusClick}
        >
          {aiDriftStatusText}
        </button>
      {:else}
        <span class="ai-drift-status" class:error={aiDriftStatus === 'error'}>
          {aiDriftStatusText}
          {#if aiDriftIsStale}
            <span class="ai-drift-stale">(stale)</span>
          {/if}
        </span>
      {/if}
    {/if}
  </div>
</div>

<style>
  .file-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    padding: 4px 6px;
    border-bottom: 1px solid var(--border);
    position: relative;
    z-index: 5;
    overflow: visible;
  }

  .file-ops {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
  }

  .search-wrap :global(.search-icon) {
    position: absolute;
    left: 6px;
    color: var(--text-dim);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    height: 26px;
    padding: 0 24px 0 24px;
    border: 1px solid transparent;
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 12px;
    outline: none;
  }

  .search-input:focus {
    border-color: var(--accent);
    background: var(--surface);
  }

  .search-input::placeholder {
    color: var(--text-dim);
  }

  .search-clear {
    position: absolute;
    right: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: var(--radius);
    background: none;
    color: var(--text-dim);
    cursor: pointer;
  }

  .search-clear:hover {
    color: var(--text);
  }

  .toolbar-divider {
    width: 1px;
    height: 16px;
    margin: 0 2px;
    background: var(--border);
    flex-shrink: 0;
  }

  .goal-anchor {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }

  .tool-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .tool-btn:active {
    background: color-mix(in srgb, var(--surface) 88%, var(--text) 12%);
  }

  .tool-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ai-drift-status {
    position: absolute;
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
    z-index: 30;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: 0 2px 10px rgb(0 0 0 / 28%);
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--text-dim);
    white-space: nowrap;
    pointer-events: none;
  }

  button.ai-drift-status.clickable {
    pointer-events: auto;
    cursor: pointer;
    color: var(--text);
    font: inherit;
  }

  button.ai-drift-status.clickable:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .ai-drift-status.error {
    color: var(--crepe-color-error);
  }

  .ai-drift-stale {
    margin-left: 2px;
    opacity: 0.9;
  }

  .spinning {
    animation: spin 0.85s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
