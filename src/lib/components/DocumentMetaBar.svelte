<script>
  import {
    getDocumentStats,
    formatReadingTime,
  } from '../documentStats.js'
  import { exportDocx, exportPdf, printDocument } from '../export.js'

  let { content = '', fileName = null, onOpenSettings } = $props()

  let exportOpen = $state(false)

  let stats = $derived(getDocumentStats(content))
  let readingTime = $derived(formatReadingTime(stats.readingSeconds))

  function toggleExport(event) {
    event.stopPropagation()
    exportOpen = !exportOpen
  }

  function closeExport() {
    exportOpen = false
  }

  async function handleExport(format) {
    closeExport()
    if (format === 'docx') await exportDocx(content, fileName)
    else if (format === 'pdf') await exportPdf(content, fileName)
  }

  function handlePrint() {
    printDocument(fileName ?? 'Document')
  }

  function handleWindowClick(event) {
    if (!exportOpen) return
    if (event.target instanceof Element && event.target.closest('.export-wrap')) return
    closeExport()
  }

  function handleWindowKeydown(event) {
    if (event.key === 'Escape' && exportOpen) {
      event.stopPropagation()
      closeExport()
    }
  }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div class="sidebar-stats" aria-label="Document statistics">
  <div class="toolbar">
    <button type="button" class="icon-btn" title="Word target (coming soon)" aria-label="Word target">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/>
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.2"/>
        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
    </button>

    <div class="export-wrap">
      <button
        type="button"
        class="icon-btn"
        class:active={exportOpen}
        title="Export"
        aria-label="Export document"
        aria-expanded={exportOpen}
        aria-haspopup="menu"
        onclick={toggleExport}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M7 1.5v7M4.5 6 7 8.5 9.5 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2.5 10v1.5h9V10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      {#if exportOpen}
        <div class="export-menu" role="menu" aria-label="Export format">
          <button type="button" class="export-option" role="menuitem" onclick={() => handleExport('docx')}>
            DOCX
          </button>
          <button type="button" class="export-option" role="menuitem" onclick={() => handleExport('pdf')}>
            PDF
          </button>
        </div>
      {/if}
    </div>

    <button
      type="button"
      class="icon-btn"
      title="Print"
      aria-label="Print document"
      onclick={handlePrint}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3.5 5V2h7v3" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
        <rect x="2.5" y="5" width="9" height="4.5" rx="1" stroke="currentColor" stroke-width="1.2"/>
        <path d="M4 9.5h6V12H4z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
        <circle cx="10.5" cy="7" r="0.6" fill="currentColor"/>
      </svg>
    </button>

    <button
      type="button"
      class="icon-btn"
      title="Settings"
      aria-label="Settings"
      onclick={() => onOpenSettings?.()}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M5.6 1.8 5.9 3.4a3.2 3.2 0 0 1 1.1.6l1.5-.6 1.2 2.1-1.3 1a3.2 3.2 0 0 1 0 1.2l1.3 1-1.2 2.1-1.5-.6a3.2 3.2 0 0 1-1.1.6l-.3 1.6H6.4l-.3-1.6a3.2 3.2 0 0 1-1.1-.6l-1.5.6-1.2-2.1 1.3-1a3.2 3.2 0 0 1 0-1.2l-1.3-1 1.2-2.1 1.5.6c.35-.25.73-.45 1.1-.6l.3-1.6h1.2Z"
          stroke="currentColor"
          stroke-width="1.1"
          stroke-linejoin="round"
        />
        <circle cx="7" cy="7" r="1.6" stroke="currentColor" stroke-width="1.1"/>
      </svg>
    </button>
  </div>

  <div class="stat-lines">
    <p class="stat-line">
      <span class="stat-value">{stats.words.toLocaleString()}</span>
      <span class="stat-label">words</span>
    </p>
    <p class="stat-line">
      <span class="stat-value">{stats.chars.toLocaleString()}</span>
      <span class="stat-label">characters</span>
    </p>
    <p class="stat-line">
      <span class="stat-value">{readingTime}</span>
      <span class="stat-label">reading time</span>
    </p>
  </div>
</div>

<style>
  .sidebar-stats {
    flex-shrink: 0;
    padding: 10px 12px 12px;
    border-top: 1px solid var(--border);
    font-family: var(--font-ui);
    font-size: 10px;
  }

  .toolbar {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
  }

  .export-wrap {
    position: relative;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }

  .icon-btn:hover,
  .icon-btn.active {
    color: var(--text);
    border-color: #333;
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .export-menu {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    min-width: 72px;
    padding: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  }

  .export-option {
    padding: 5px 8px;
    background: none;
    border: none;
    border-radius: calc(var(--radius) - 1px);
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-align: left;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }

  .export-option:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface) 88%, var(--text) 12%);
  }

  .stat-lines {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-line {
    display: flex;
    align-items: baseline;
    gap: 0.35em;
    letter-spacing: 0.02em;
    line-height: 1.4;
  }

  .stat-value {
    font-weight: 600;
    color: var(--text-heading);
    font-variant-numeric: tabular-nums;
  }

  .stat-label {
    color: var(--text-dim);
    font-weight: 400;
  }
</style>
