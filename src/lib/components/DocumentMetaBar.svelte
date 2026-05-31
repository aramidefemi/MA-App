<script>
  import {
    getDocumentStats,
    formatReadingTime,
  } from '../documentStats.js'
  import { document } from '../modules/document'
  import { workspace } from '../modules/workspace'
  import Tooltip from './Tooltip.svelte'

  let stats = $derived(getDocumentStats(document.content))
  let readingTime = $derived(formatReadingTime(stats.readingSeconds))

  function openProfile() {
    workspace.openSettings()
  }
</script>

<div class="sidebar-stats" aria-label="Document statistics">
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

  <div class="meta-actions" role="group" aria-label="Account and settings">
    <Tooltip text="Account & API keys" fill>
      <button type="button" class="meta-btn" aria-label="Profile" onclick={openProfile}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.75" />
          <path
            d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </Tooltip>

    <Tooltip text="App settings" fill>
      <button
        type="button"
        class="meta-btn"
        aria-label="Settings"
        onclick={() => workspace.openSettings()}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            stroke-width="1.75"
          />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </Tooltip>
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

  .stat-lines {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
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

  .meta-actions {
    display: flex;
    gap: 8px;
  }

  .meta-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 52px;
    padding: 12px;
    background: color-mix(in srgb, var(--surface) 88%, var(--text) 4%);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }

  .meta-btn:hover {
    border-color: #333;
    background: color-mix(in srgb, var(--surface) 82%, var(--text) 12%);
  }
</style>
