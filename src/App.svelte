<script>
  import { open } from '@tauri-apps/plugin-dialog'
  import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
  import Editor from './lib/components/Editor.svelte'
  import OutlinePanel from './lib/components/OutlinePanel.svelte'
  import { app } from './lib/app.js'

  // ─── State ────────────────────────────────────────────────────
  let filePath     = $state(null)
  let content      = $state('')
  let savedContent = $state('')
  let saveStatus   = $state('idle') // 'idle' | 'saving' | 'saved' | 'error'
  let showOutline  = $state(false)

  // ─── Derived ──────────────────────────────────────────────────
  let isDirty  = $derived(content !== savedContent)
  let fileName = $derived(
    filePath
      ? filePath.split('/').pop().split('\\').pop()
      : null
  )

  // ─── File ops ─────────────────────────────────────────────────
  async function openFile() {
    const selected = await open({
      filters: [{
        name: app.fileDialog.filterName,
        extensions: app.fileDialog.extensions,
      }],
      multiple: false,
    })
    if (!selected) return

    const text = await readTextFile(selected)
    filePath     = selected
    content      = text
    savedContent = text
  }

  async function saveFile() {
    if (!filePath || !isDirty) return
    saveStatus = 'saving'
    try {
      await writeTextFile(filePath, content)
      savedContent = content
      saveStatus = 'saved'
      setTimeout(() => (saveStatus = 'idle'), 1400)
    } catch (e) {
      saveStatus = 'error'
      console.error('Save failed:', e)
    }
  }

  // ─── Keyboard ─────────────────────────────────────────────────
  function handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      saveFile()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
      e.preventDefault()
      openFile()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
      e.preventDefault()
      showOutline = !showOutline
    }
    if (e.key === 'Escape' && showOutline) {
      showOutline = false
    }
  }

  // ─── Content sync from editor ─────────────────────────────────
  function handleContentChange(markdown) {
    content = markdown
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app">

  <!-- ─── Empty state ─────────────────────────────────── -->
  {#if !filePath}
    <div class="titlebar-drag"></div>
    <div class="empty">
      <div class="empty-inner">
        <div class="logo">{app.emptyState.logo}</div>
        <h1>{app.emptyState.title}</h1>
        <p>
          {#each app.emptyState.subtitle as line, i}
            {line}{#if i < app.emptyState.subtitle.length - 1}<br/>{/if}
          {/each}
        </p>
        <button class="open-btn" onclick={openFile}>
          Open file
        </button>
        <div class="hints">
          <kbd>⌘O</kbd> open &nbsp;·&nbsp; <kbd>⌘S</kbd> save
        </div>
      </div>
    </div>

  <!-- ─── Editor ──────────────────────────────────────── -->
  {:else}
    <header class="topbar">
      <!-- traffic lights live here on macOS overlay mode (~80px) -->
      <div class="traffic-light-spacer"></div>

      <!-- tab strip -->
      <div class="tabs">
        <div class="tab active">
          <span class="tab-name">{fileName}</span>
          {#if isDirty}<span class="tab-dot"></span>{/if}
        </div>
      </div>

      <!-- right actions -->
      <div class="topbar-actions">
        <span class="save-indicator" class:visible={saveStatus !== 'idle'}>
          {#if saveStatus === 'saving'}saving…
          {:else if saveStatus === 'saved'}saved
          {:else if saveStatus === 'error'}error
          {/if}
        </span>
        <button class="action" onclick={openFile} title="Open file (⌘O)">
          open
        </button>
        <button
          class="action outline-toggle"
          class:active={showOutline}
          onclick={() => showOutline = !showOutline}
          title="Document outline (⌘\)"
          aria-label="Toggle outline"
        >
          <svg width="13" height="11" viewBox="0 0 13 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="13" height="1.5" rx="0.75" fill="currentColor"/>
            <rect x="2" y="4" width="9" height="1.5" rx="0.75" fill="currentColor"/>
            <rect x="4" y="8" width="6" height="1.5" rx="0.75" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- key block destroys + remounts Editor when file changes -->
    {#key filePath}
      <div class="editor-wrap">
        <Editor
          initialContent={content}
          onContentChange={handleContentChange}
        />
      </div>
    {/key}

    <!-- outline panel -->
    {#if showOutline}
      <OutlinePanel
        {content}
        onClose={() => showOutline = false}
      />
    {/if}
  {/if}

</div>

<style>
  /* ─── App shell ─────────────────────────────────────── */
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg);
  }

  /* drag region when no file is open */
  .titlebar-drag {
    height: 38px;
    flex-shrink: 0;
    -webkit-app-region: drag;
  }

  /* ─── Topbar ─────────────────────────────────────────── */
  .topbar {
    display: flex;
    align-items: stretch;
    height: 38px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    -webkit-app-region: drag;
  }

  /* space for macOS traffic lights (red/yellow/green) */
  .traffic-light-spacer {
    width: 80px;
    flex-shrink: 0;
  }

  /* ─── Tab strip ──────────────────────────────────────── */
  .tabs {
    display: flex;
    align-items: stretch;
    flex: 1;
    min-width: 0;
    -webkit-app-region: no-drag;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px;
    font-size: 11px;
    font-family: var(--font-ui);
    color: var(--text-dim);
    border-right: 1px solid var(--border);
    cursor: default;
    position: relative;
    max-width: 200px;
    transition: background 0.1s;
  }

  .tab.active {
    background: var(--bg);
    color: var(--text);
    /* bottom line to indicate active tab */
    box-shadow: inset 0 -1px 0 0 var(--bg);
  }

  /* cancel the border-bottom of topbar under the active tab */
  .tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--bg);
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0.02em;
  }

  .tab-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
    opacity: 0.9;
  }

  /* ─── Right actions ──────────────────────────────────── */
  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    margin-left: auto;
    -webkit-app-region: no-drag;
  }

  .save-indicator {
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .save-indicator.visible { opacity: 1; }

  .action {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-size: 10px;
    letter-spacing: 0.08em;
    padding: 3px 8px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .action:hover {
    color: var(--text);
    border-color: #333;
  }

  .outline-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3px 7px;
  }

  .outline-toggle.active {
    color: var(--accent);
    border-color: rgba(74, 222, 128, 0.4);
    background: var(--accent-dim);
  }

  /* ─── Editor wrapper ─────────────────────────────────── */
  .editor-wrap {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ─── Empty state ─────────────────────────────────────── */
  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-inner {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .logo {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 0.2em;
    color: var(--accent);
    border: 1px solid rgba(74, 222, 128, 0.3);
    padding: 5px 10px;
    border-radius: var(--radius);
    margin-bottom: 8px;
  }

  .empty-inner h1 {
    font-family: var(--font-ui);
    font-size: 18px;
    font-weight: 600;
    color: var(--text-heading);
    letter-spacing: -0.02em;
  }

  .empty-inner p {
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.7;
  }

  .open-btn {
    margin-top: 8px;
    background: var(--accent-dim);
    border: 1px solid rgba(74, 222, 128, 0.4);
    color: var(--accent);
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 0.06em;
    padding: 8px 20px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background 0.15s;
  }
  .open-btn:hover {
    background: rgba(74, 222, 128, 0.25);
  }

  .hints {
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.05em;
  }

  kbd {
    font-family: var(--font-ui);
    font-size: 9px;
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--text-dim);
  }
</style>