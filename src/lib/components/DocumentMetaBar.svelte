<script>
  import {
    getDocumentStats,
    formatReadingTime,
  } from '../documentStats.js'

  let { content = '' } = $props()

  let stats = $derived(getDocumentStats(content))
  let readingTime = $derived(formatReadingTime(stats.readingSeconds))
</script>

<footer class="meta-bar" aria-label="Document statistics">
  <span class="meta-item">
    <span class="meta-value">{stats.words.toLocaleString()}</span>
    <span class="meta-label">words</span>
  </span>
  <span class="meta-item">
    <span class="meta-value">{stats.chars.toLocaleString()}</span>
    <span class="meta-label">characters</span>
  </span>
  <span class="meta-item">
    <span class="meta-value">{readingTime}</span>
    <span class="meta-label">reading time</span>
  </span>
</footer>

<style>
  .meta-bar {
    display: flex;
    align-items: center;
    justify-content: space-around;
    flex-shrink: 0;
    padding: 10px 24px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    font-family: var(--font-ui);
    font-size: 11px;
  }

  .meta-item {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35em;
    letter-spacing: 0.02em;
  }

  .meta-value {
    font-weight: 600;
    color: var(--text-heading);
    font-variant-numeric: tabular-nums;
  }

  .meta-label {
    color: var(--text-dim);
    font-weight: 400;
  }
</style>
