<script>
  import { document as doc } from '../modules/document'
  import { workspace } from '../modules/workspace'
  import { headingIndentPx, jumpToHeading, parseHeadings } from '../markdown/headings.js'

  const PANEL_WIDTH = 260

  let headings = $derived(parseHeadings(doc.content, 3))

  function jumpTo(text) {
    jumpToHeading(text)
  }

  function close() {
    workspace.closeOutline()
  }
</script>

<aside
  class="outline-panel"
  style="width: {PANEL_WIDTH}px"
  aria-label="Document outline"
>
  <div class="panel-header">
    <span class="panel-title">Outline</span>
    <button type="button" class="close-btn" onclick={close} aria-label="Close outline">✕</button>
  </div>

  <div class="headings">
    {#if headings.length === 0}
      <p class="empty">No headings yet</p>
    {:else}
      {#each headings as h (h.text + h.index)}
        <button
          type="button"
          class="heading-item"
          class:level-1={h.level === 1}
          class:level-2={h.level === 2}
          class:level-3={h.level === 3}
          style="padding-left: {headingIndentPx(h.level) + 14}px"
          onclick={() => jumpTo(h.text)}
        >
          <span class="h-text">{h.text}</span>
        </button>
      {/each}
    {/if}
  </div>
</aside>

<style>
  .outline-panel {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--surface);
    border-left: 1px solid var(--border);
    animation: outlineIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes outlineIn {
    from {
      opacity: 0;
      transform: translateX(8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .panel-title {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    color: var(--text);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 10px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--text);
  }

  .headings {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 12px;
  }

  .heading-item {
    display: block;
    width: 100%;
    padding: 6px 14px 6px 14px;
    background: none;
    border: none;
    color: var(--text);
    font-family: var(--font-ui);
    text-align: left;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    line-height: 1.4;
  }

  .heading-item:hover {
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
    color: var(--text-heading, var(--text));
  }

  .heading-item.level-1 .h-text {
    font-size: 12px;
    font-weight: 600;
  }

  .heading-item.level-2 .h-text {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.85;
  }

  .heading-item.level-3 .h-text {
    font-size: 10px;
    font-weight: 400;
    opacity: 0.65;
  }

  .h-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--text-dim);
    padding: 20px 14px;
    text-align: center;
    margin: 0;
  }
</style>
