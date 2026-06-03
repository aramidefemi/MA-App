<script>
  import { FilePlus, FolderMinus, FolderPlus, RefreshCw, Search, X } from '@lucide/svelte'
  import Tooltip from './Tooltip.svelte'

  let {
    onNewFile = () => {},
    onNewFolder = () => {},
    onRefresh = () => {},
    onCollapse = () => {},
    searchQuery = $bindable(''),
  } = $props()

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

</style>
