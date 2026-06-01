<script>
  import { List, ListTree, Redo2, Settings, Undo2 } from '@lucide/svelte'
  import { getEditorCommands } from '../editor/editorCommands.js'
  import { onMount } from 'svelte'
  import { document as doc } from '../modules/document'
  import {
    getFormatActions,
    subscribeFormatReady,
    subscribeFormatState,
  } from '../editor/formatEditorApi.js'
  import { headingIndentPx, jumpToHeading, parseHeadings } from '../markdown/headings.js'

  let {
    fileName = null,
    isDirty = false,
    topbarVisible = false,
    hasSidebar = false,
    saveStatus = 'idle',
    onOpenSettings,
  } = $props()

  const empty = {
    bold: false,
    italic: false,
    code: false,
    link: false,
    heading: 0,
    blockquote: false,
    bulletList: false,
    orderedList: false,
  }

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/i.test(navigator.userAgent)

  let snapshot = $state(empty)
  let openMenu = $state(/** @type {null | 'toc' | 'headings' | 'lists'} */ (null))
  let headings = $derived(parseHeadings(doc.content))
  let formatReady = $state(false)

  function mod(n) {
    return isMac ? `⌘${n}` : `Ctrl+${n}`
  }

  function modAlt(n) {
    return isMac ? `⌘⌥${n}` : `Ctrl+Alt+${n}`
  }

  function handleToolbarMouseDown(e) {
    e.preventDefault()
  }

  /** @param {(actions: NonNullable<ReturnType<typeof getFormatActions>>) => void} fn */
  function act(fn) {
    const actions = getFormatActions()
    if (!actions) return
    fn(actions)
    closeMenus()
  }

  function closeMenus() {
    openMenu = null
  }

  /** @param {null | 'toc' | 'headings' | 'lists'} id */
  function toggleMenu(id) {
    openMenu = openMenu === id ? null : id
  }

  /** @param {string} text */
  function jumpTo(text) {
    jumpToHeading(text)
    closeMenus()
  }

  function handleWindowPointerDown(e) {
    if (!openMenu) return
    const root = e.target instanceof Element ? e.target.closest('.topbar-actions') : null
    if (!root) closeMenus()
  }

  onMount(() => {
    const offState = subscribeFormatState((s) => (snapshot = { ...s }))
    const offReady = subscribeFormatReady((ready) => (formatReady = ready))
    window.addEventListener('pointerdown', handleWindowPointerDown, true)
    return () => {
      offState()
      offReady()
      window.removeEventListener('pointerdown', handleWindowPointerDown, true)
    }
  })
</script>

<header class="topbar" class:visible={topbarVisible}>
  <div class="topbar-drag" data-tauri-drag-region></div>

  <div class="topbar-inner">
    {#if !hasSidebar}
      <div class="traffic-light-spacer"></div>
    {/if}

    {#if fileName}
      <div class="tabs">
        <div class="tab active">
          <span class="tab-name">{fileName}</span>
          {#if isDirty}<span class="tab-dot"></span>{/if}
        </div>
      </div>
    {/if}

    

    <div
      class="topbar-actions"
      role="toolbar"
      aria-label="Text formatting"
      onmousedown={handleToolbarMouseDown}
    >
      <button
        type="button"
        class="fmt-btn"
        title="Undo ({mod('Z')})"
        aria-label="Undo"
        onclick={() => getEditorCommands()?.undo()}
        disabled={!formatReady}
      >
        <Undo2 size={13} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <button
        type="button"
        class="fmt-btn"
        title="Redo ({isMac ? '⌘⇧Z' : 'Ctrl+Shift+Z'})"
        aria-label="Redo"
        onclick={() => getEditorCommands()?.redo()}
        disabled={!formatReady}
      >
        <Redo2 size={13} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <div class="menu-anchor">
        <button
          type="button"
          class="fmt-btn split"
          title="Table of contents"
          aria-label="Table of contents"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'toc'}
          onclick={() => toggleMenu('toc')}
          disabled={!formatReady}
        >
          <ListTree size={13} strokeWidth={1.75} aria-hidden="true" />
          <span class="chev" aria-hidden="true">▾</span>
        </button>
        {#if openMenu === 'toc'}
          <div class="dropdown" role="menu" aria-label="Table of Contents">
            <div class="dropdown-title">Table of Contents</div>
            <div class="dropdown-scroll">
              {#if headings.length === 0}
                <p class="dropdown-empty">No headings yet</p>
              {:else}
                {#each headings as h (h.text + h.index)}
                  <button
                    type="button"
                    class="dropdown-item toc-item"
                    style="padding-left: {12 + headingIndentPx(h.level)}px"
                    role="menuitem"
                    onclick={() => jumpTo(h.text)}
                  >
                    {h.text}
                  </button>
                {/each}
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <div class="menu-anchor">
        <button
          type="button"
          class="fmt-btn split"
          title="Headings"
          aria-label="Headings"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'headings'}
          onclick={() => toggleMenu('headings')}
          disabled={!formatReady}
        >
          <span class="hash" aria-hidden="true">#</span>
          <span class="chev" aria-hidden="true">▾</span>
        </button>
        {#if openMenu === 'headings'}
          <div class="dropdown" role="menu" aria-label="Headings">
            {#each [1, 2, 3, 4, 5, 6] as level (level)}
              <button
                type="button"
                class="dropdown-item"
                class:active={snapshot.heading === level}
                role="menuitem"
                onclick={() => act((a) => a.heading(level))}
              >
                <span>Heading {level}</span>
                <kbd>{modAlt(level)}</kbd>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <button
        type="button"
        class="fmt-btn"
        class:active={snapshot.bold}
        title="Bold ({mod('B')})"
        aria-label="Bold"
        aria-pressed={snapshot.bold}
        onclick={() => act((a) => a.bold())}
        disabled={!formatReady}
      >
        <strong>B</strong>
      </button>

      <button
        type="button"
        class="fmt-btn"
        class:active={snapshot.italic}
        title="Italic ({mod('I')})"
        aria-label="Italic"
        aria-pressed={snapshot.italic}
        onclick={() => act((a) => a.italic())}
        disabled={!formatReady}
      >
        <em>I</em>
      </button>

      <div class="menu-anchor">
        <button
          type="button"
          class="fmt-btn split"
          title="Lists"
          aria-label="Lists"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'lists'}
          onclick={() => toggleMenu('lists')}
          disabled={!formatReady}
        >
          <List size={13} strokeWidth={1.75} aria-hidden="true" />
          <span class="chev" aria-hidden="true">▾</span>
        </button>
        {#if openMenu === 'lists'}
          <div class="dropdown" role="menu" aria-label="Lists">
            <button
              type="button"
              class="dropdown-item"
              class:active={snapshot.bulletList}
              role="menuitem"
              onclick={() => act((a) => a.bulletList())}
            >
              <span>List</span>
              <kbd>{modAlt(8)}</kbd>
            </button>
            <button
              type="button"
              class="dropdown-item"
              class:active={snapshot.orderedList}
              role="menuitem"
              onclick={() => act((a) => a.orderedList())}
            >
              <span>Ordered List</span>
              <kbd>{modAlt(7)}</kbd>
            </button>
          </div>
        {/if}
      </div>
 
      <span class="save-indicator" class:visible={saveStatus !== 'idle'}>
        {#if saveStatus === 'saving'}saving…
        {:else if saveStatus === 'saved'}saved
        {:else if saveStatus === 'error'}error
        {/if}
      </span>
      <button
        type="button"
        class="topbar-btn"
        onclick={() => onOpenSettings?.()}
        title="Settings (⌘,)"
        aria-label="Settings"
      >
        <Settings size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>

      
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
    background: var(--surface);
    border-bottom: 1px solid var(--border);
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
    align-items: stretch;
    height: 100%;
    pointer-events: none;
  }

  .traffic-light-spacer {
    width: 80px;
    flex-shrink: 0;
  }

  .tabs {
    display: flex;
    align-items: stretch;
    flex: 0 1 auto;
    min-width: 0;
    max-width: 200px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 10px;
    font-size: 14px;
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
    box-shadow: inset 0 -1px 0 0 var(--bg);
  }

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

  .format-strip {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 8px;
    margin-left: 4px;
    pointer-events: auto;
    flex: 1;
    min-width: 0;
    justify-content: center;
  }

  .menu-anchor {
    position: relative;
  }

  .fmt-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 26px;
    min-width: 26px;
    padding: 0 6px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .fmt-btn.split {
    padding-right: 4px;
  }

  .fmt-btn:hover {
    background: color-mix(in srgb, var(--surface) 70%, var(--text) 10%);
    color: var(--text);
  }

  .fmt-btn.active {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .fmt-btn:disabled {
    opacity: 0.35;
    cursor: default;
    pointer-events: none;
  }

  .fmt-btn strong,
  .fmt-btn em {
    font-size: 12px;
    font-style: normal;
    font-weight: 700;
  }

  .fmt-btn em {
    font-style: italic;
    font-weight: 500;
  }

  .hash {
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
  }

  .chev {
    font-size: 8px;
    opacity: 0.65;
    margin-left: 1px;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    min-width: 180px;
    max-width: 280px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
    z-index: 30;
    padding: 4px 0;
    pointer-events: auto;
  }

  .dropdown-title {
    padding: 8px 12px 6px;
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }

  .dropdown-scroll {
    max-height: 240px;
    overflow-y: auto;
  }

  .dropdown-empty {
    margin: 0;
    padding: 12px;
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--text-dim);
    text-align: center;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 7px 12px;
    border: none;
    background: none;
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .dropdown-item:hover {
    background: color-mix(in srgb, var(--surface) 88%, var(--text) 12%);
  }

  .dropdown-item.active {
    color: var(--accent);
    background: var(--accent-dim);
  }

  .toc-item {
    justify-content: flex-start;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-item kbd {
    font-family: var(--font-ui);
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    margin-left: auto;
    pointer-events: auto;
    overflow: visible;
  }

  .topbar-actions .dropdown {
    left: auto;
    right: 0;
  }

  .save-indicator {
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .save-indicator.visible {
    opacity: 1;
  }

  .topbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: none;
    border: none;
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }

  .topbar-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface) 70%, var(--text) 8%);
  }
</style>
