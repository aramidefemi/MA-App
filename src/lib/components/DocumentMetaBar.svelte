<script>
  import { Settings, User } from '@lucide/svelte'
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
        <User size={22} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </Tooltip>

    <Tooltip text="App settings" fill>
      <button
        type="button"
        class="meta-btn"
        aria-label="Settings"
        onclick={() => workspace.openSettings()}
      >
        <Settings size={22} strokeWidth={1.75} aria-hidden="true" />
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

    background: color-mix(in srgb, var(--surface) 88%, var(--text) 4%);
    border: none;
    border-radius: var(--radius);
    color: var(--text);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }

  .meta-btn:hover {
    background: color-mix(in srgb, var(--surface) 82%, var(--text) 12%);
  }
</style>
