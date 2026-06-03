<script>
  import {
    Bot,
    FileText,
    Layers,
    Search,
    Share,
    Sparkles,
  } from '@lucide/svelte'
  import Tooltip from './Tooltip.svelte'
  import { ui } from '../modules/ui'
  import { workspace } from '../modules/workspace'
  import { research } from '../modules/research'
  import { aiDrift } from '../modules/aiDrift'
  import { getEditorCommands } from '../editor/editorCommands.js'

  let {
    visible = true,
    canUseEditor = false,
    onExportDocx = () => {},
    onExportPdf = () => {},
    onOpenFind = () => {},
  } = $props()

  let exportOpen = $state(false)

  function toggleExportMenu() {
    exportOpen = !exportOpen
  }

  function closeExportMenu() {
    exportOpen = false
  }

  function runExport(fn) {
    closeExportMenu()
    void fn()
  }

  function openResearch() {
    if (research.showResearch) {
      research.close()
      return
    }
    workspace.closeOutline()
    const text = getEditorCommands()?.getSelectionText() ?? ''
    research.openWithText(text)
  }

  function openFind() {
    if (!canUseEditor) return
    onOpenFind()
  }

  function toggleOutline() {
    if (!workspace.showOutline) research.close()
    workspace.toggleOutline()
  }

  let driftBadgeCount = $derived.by(() => {
    if (aiDrift.isRunning || aiDrift.isStale) return null
    const n = aiDrift.visibleIssues.length
    return n > 0 ? n : null
  })

  let aiDriftTooltip = $derived.by(() => {
    if (aiDrift.isRunning) return 'AI Draft scan running...'
    if (aiDrift.uiStatus === 'error') return 'AI Draft scan failed. Try again.'
    if (aiDrift.uiStatus === 'stale' || aiDrift.isStale) {
      return 'Document changed. Scan refreshes after you pause typing, or click the bot to scan now.'
    }
    if (aiDrift.uiStatus === 'done') {
      const count = aiDrift.issueCount ?? 0
      const nav = driftBadgeCount ? ' Click the badge to jump between highlights.' : ''
      return `AI Draft: ${count} drifty passage${count === 1 ? '' : 's'}.${nav}`
    }
    return 'Re-run AI Draft scan'
  })

  function runAiDrift() {
    if (!canUseEditor || aiDrift.isRunning) return
    void aiDrift.runCheck()
  }

  function goToNextDriftIssue(e) {
    e.stopPropagation()
    aiDrift.goToNextIssue()
  }
</script>

{#if visible}
  <div class="right-rail-shell" class:expanded={ui.rightRailChromeVisible}>
    <div
      class="right-rail-hover-zone"
      class:active={!ui.rightRailChromeVisible}
      role="presentation"
      onmouseenter={ui.revealRightRailOnHover}
      onmouseleave={ui.endRightRailHover}
    ></div>
    <aside
      class="right-rail"
      onmouseenter={ui.revealRightRailOnHover}
      onmouseleave={ui.endRightRailHover}
    >
      <nav class="rail-actions" aria-label="Editor actions">
        <div class="export-anchor">
          <Tooltip text="Export document" position="left">
            <button
              type="button"
              class="rail-btn"
              aria-label="Export document"
              aria-expanded={exportOpen}
              aria-haspopup="menu"
              disabled={!canUseEditor}
              onclick={toggleExportMenu}
            >
              <Share size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </Tooltip>
          {#if exportOpen}
            <div class="export-backdrop" onclick={closeExportMenu} role="presentation"></div>
            <div class="export-menu" role="menu">
              <button
                type="button"
                class="export-item"
                role="menuitem"
                onclick={() => runExport(onExportDocx)}
              >
                <FileText size={14} strokeWidth={1.5} aria-hidden="true" />
                Word (.docx)
              </button>
              <button
                type="button"
                class="export-item"
                role="menuitem"
                onclick={() => runExport(onExportPdf)}
              >
                <FileText size={14} strokeWidth={1.5} aria-hidden="true" />
                PDF (.pdf)
              </button>
            </div>
          {/if}
        </div>

        <Tooltip text="Find in document (⌘F)" position="left">
          <button
            type="button"
            class="rail-btn"
            aria-label="Find in document"
            disabled={!canUseEditor}
            onclick={openFind}
          >
            <Search size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </Tooltip>

        <div class="drift-anchor">
          <Tooltip text={aiDriftTooltip} position="left">
            <div class="drift-btn-wrap">
              {#if driftBadgeCount}
                <button
                  type="button"
                  class="drift-badge"
                  aria-label="Jump to next drifty passage ({driftBadgeCount})"
                  onclick={goToNextDriftIssue}
                >
                  {driftBadgeCount > 99 ? '99+' : driftBadgeCount}
                </button>
              {/if}
              <button
                type="button"
                class="rail-btn"
                class:spinning={aiDrift.isRunning}
                aria-label="Re-run AI Draft scan"
                aria-busy={aiDrift.isRunning}
                disabled={!canUseEditor || aiDrift.isRunning}
                onclick={runAiDrift}
              >
                <Bot size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </Tooltip>
        </div>

        <Tooltip text="AI research (⌘E)" position="left">
          <button
            type="button"
            class="rail-btn"
            class:active={research.showResearch}
            aria-label="AI research"
            disabled={!canUseEditor}
            onclick={openResearch}
          >
            <Sparkles size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </Tooltip>

        <Tooltip text="Document outline (⌘\\)" position="left">
          <button
            type="button"
            class="rail-btn"
            class:active={workspace.showOutline}
            aria-label="Document outline"
            disabled={!canUseEditor}
            onclick={toggleOutline}
          >
            <Layers size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </Tooltip>
      </nav>
    </aside>
  </div>
{/if}

<style>
  .right-rail-shell {
    width: 0;
    flex-shrink: 0;
    position: relative;
    z-index: 18;
    height: 100%;
    overflow: visible;
    transition: width 0.24s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .right-rail-shell.expanded {
    width: 44px;
    overflow: visible;
  }

  .right-rail-hover-zone {
    display: none;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 12px;
    z-index: 2;
  }

  .right-rail-hover-zone.active {
    display: block;
  }

  .right-rail {
    width: 44px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--surface);
    border-left: 1px solid var(--border);
    position: absolute;
    right: 0;
    top: 0;
    transform: translateX(100%);
    transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  .right-rail-shell.expanded .right-rail {
    position: relative;
    transform: translateX(0);
    pointer-events: auto;
  }

  .rail-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    width: 100%;
  }

  .export-anchor,
  .drift-anchor {
    position: relative;
    display: flex;
    justify-content: center;
  }

  .drift-btn-wrap {
    position: relative;
    display: flex;
    justify-content: center;
  }

  .drift-badge {
    position: absolute;
    top: -3px;
    right: -4px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 15px;
    height: 15px;
    padding: 0 4px;
    border: 1.5px solid var(--surface);
    border-radius: 999px;
    background: var(--accent);
    color: var(--surface);
    font-family: var(--font-ui);
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 5px rgb(0 0 0 / 18%);
    pointer-events: auto;
  }

  .drift-badge:hover {
    filter: brightness(1.08);
    box-shadow: 0 2px 7px rgb(0 0 0 / 22%);
  }

  .rail-btn.spinning {
    animation: spin 0.85s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .rail-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-dim);
    border-radius: var(--radius);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }

  .rail-btn:hover:not(:disabled) {
    color: var(--text);
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .rail-btn.active {
    color: var(--accent);
  }

  .rail-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .export-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
  }

  .export-menu {
    position: absolute;
    right: calc(100% + 6px);
    top: 0;
    z-index: 40;
    min-width: 140px;
    padding: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
  }

  .export-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: calc(var(--radius) - 2px);
    background: none;
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 11px;
    cursor: pointer;
    text-align: left;
  }

  .export-item:hover {
    background: color-mix(in srgb, var(--surface) 88%, var(--text) 12%);
  }
</style>
