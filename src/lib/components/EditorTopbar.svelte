<script>
  import { Settings, Pencil } from '@lucide/svelte'
  import Tooltip from './Tooltip.svelte'

  let {
    fileName = null,
    folderName = null,
    isDirty = false,
    canRenameTitle = false,
    topbarVisible = false,
    hasSidebar = false,
    saveStatus = 'idle',
    onOpenSettings,
    onNameUntitled,
  } = $props()

  let isEditingName = $state(false)
  let draftName = $state('')
  let nameInput = $state(null)

  let fullTitle = $derived(
    fileName ? (folderName ? `${folderName} / ${fileName}` : fileName) : '',
  )

  $effect(() => {
    if (!canRenameTitle && isEditingName) {
      isEditingName = false
      draftName = ''
    }
  })

  function handleToolbarMouseDown(e) {
    e.preventDefault()
  }

  function handleTitleMouseDown(e) {
    e.stopPropagation()
  }

  function startEditing() {
    draftName = fileName ?? ''
    isEditingName = true
    queueMicrotask(() => {
      nameInput?.focus()
      nameInput?.select()
    })
  }

  async function commitEditing() {
    if (!isEditingName) return
    const next = draftName.trim()
    isEditingName = false
    if (!next || next === fileName) return
    onNameUntitled?.(next)
  }

  function cancelEditing() {
    isEditingName = false
    draftName = ''
  }

  function handlePencilClick(e) {
    e.stopPropagation()
    if (isEditingName) void commitEditing()
    else startEditing()
  }

  /** @param {KeyboardEvent} e */
  function handleNameKeydown(e) {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      void commitEditing()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    }
  }
</script>

<header class="topbar" class:visible={topbarVisible}>
  <div class="topbar-drag" data-tauri-drag-region></div>

  <div class="topbar-inner">
    {#if !hasSidebar}
      <div class="traffic-light-spacer"></div>
    {/if}

    {#if fileName}
      <div
        class="doc-title-center"
        class:visible={topbarVisible}
        class:renameable={canRenameTitle}
        title={fullTitle}
      >
        {#if folderName}
          <span class="folder-prefix">{folderName} / </span>
        {/if}
        {#if isEditingName}
          <input
            bind:this={nameInput}
            class="file-name-input"
            type="text"
            bind:value={draftName}
            aria-label="File name"
            onclick={(e) => e.stopPropagation()}
            onkeydown={handleNameKeydown}
            onblur={() => void commitEditing()}
          />
        {:else if canRenameTitle}
          <button
            type="button"
            class="file-name-btn"
            onmousedown={handleTitleMouseDown}
            onclick={startEditing}
          >
            {fileName}
          </button>
        {:else}
          <span class="file-name">{fileName}</span>
        {/if}
        {#if canRenameTitle}
          <Tooltip text={isEditingName ? 'Save name (Enter)' : 'Rename file'} position="bottom">
            <button
              type="button"
              class="rename-btn"
              aria-label={isEditingName ? 'Save file name' : 'Rename file'}
              onmousedown={handleTitleMouseDown}
              onclick={handlePencilClick}
            >
              <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </Tooltip>
        {/if}
        {#if isDirty}<span class="dirty-dot" aria-hidden="true"></span>{/if}
      </div>
    {/if}

    <div
      class="topbar-actions"
      role="toolbar"
      aria-label="Document actions"
      tabindex="-1"
      onmousedown={handleToolbarMouseDown}
    >
      <span
        class="save-indicator"
        class:visible={saveStatus !== 'idle'}
        class:saved={saveStatus === 'saved'}
        class:error={saveStatus === 'error'}
      >
        {#if saveStatus === 'saving'}Saving…
        {:else if saveStatus === 'saved'}Saved
        {:else if saveStatus === 'error'}Save failed
        {/if}
      </span>

      {#if saveStatus !== 'idle'}
        <div class="toolbar-divider" aria-hidden="true"></div>
      {/if}

      <Tooltip text="Settings (⌘,)" position="bottom">
        <button
          type="button"
          class="topbar-btn"
          aria-label="Settings"
          onclick={() => onOpenSettings?.()}
        >
          <Settings size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  </div>
</header>

<style>
  .topbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 38px;
    background: color-mix(in srgb, var(--surface) 82%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    overflow: visible;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  .topbar.visible {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .topbar-drag {
    position: absolute;
    inset: 0;
    z-index: 0;
    -webkit-app-region: drag;
  }

  .topbar-inner {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    height: 100%;
    pointer-events: none;
  }

  .traffic-light-spacer {
    width: 80px;
    flex-shrink: 0;
  }

  .doc-title-center {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: min(420px, calc(100% - 180px));
    padding: 0 8px;
    font-family: var(--font-ui);
    font-size: 12px;
    line-height: 1;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.25s ease 0.05s;
  }

  .doc-title-center.visible {
    opacity: 1;
  }

  .doc-title-center.renameable {
    pointer-events: auto;
    -webkit-app-region: no-drag;
  }

  .folder-prefix {
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .file-name {
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .file-name-btn {
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    color: var(--text);
    font: inherit;
    line-height: inherit;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: text;
    -webkit-app-region: no-drag;
  }

  .file-name-btn:hover {
    color: var(--text-heading);
  }

  .file-name-input {
    min-width: 0;
    width: min(180px, 100%);
    padding: 2px 6px;
    margin: 0;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    line-height: 1.2;
    -webkit-app-region: no-drag;
  }

  .file-name-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .rename-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    flex-shrink: 0;
    background: none;
    border: none;
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    -webkit-app-region: no-drag;
    transition: color 0.15s, background 0.15s;
  }

  .rename-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .dirty-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
    opacity: 0.9;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    margin-left: auto;
    pointer-events: auto;
  }

  .topbar.visible .topbar-actions > * {
    animation: action-in 0.22s ease forwards;
    opacity: 0;
  }

  .topbar.visible .topbar-actions > *:nth-child(1) {
    animation-delay: 50ms;
  }

  .topbar.visible .topbar-actions > *:nth-child(2) {
    animation-delay: 65ms;
  }

  .topbar.visible .topbar-actions > *:nth-child(3) {
    animation-delay: 80ms;
  }

  @keyframes action-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .save-indicator {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 0.02em;
    color: var(--text-dim);
    opacity: 0;
    transition: opacity 0.2s ease, color 0.2s ease;
    white-space: nowrap;
  }

  .save-indicator.visible {
    opacity: 1;
  }

  .save-indicator.saved {
    color: var(--accent);
    animation: saved-pulse 1.5s ease;
  }

  .save-indicator.error {
    color: var(--crepe-color-error);
  }

  @keyframes saved-pulse {
    0%,
    100% {
      opacity: 1;
    }
    40% {
      opacity: 0.55;
    }
  }

  .toolbar-divider {
    width: 1px;
    height: 16px;
    margin: 0 2px;
    background: var(--border);
    flex-shrink: 0;
  }

  .topbar-btn {
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

  .topbar-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .topbar-btn:active {
    background: color-mix(in srgb, var(--surface) 88%, var(--text) 12%);
  }
</style>
