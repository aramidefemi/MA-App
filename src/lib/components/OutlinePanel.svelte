<script>
    /**
     * OutlinePanel — floating document outline
     * Parses headings from markdown content, renders hierarchy,
     * scrolls to heading on click.
     */
    let { content = '', onClose } = $props()

    // ─── Parse headings from markdown ──────────────────────

    let headings = $derived(parseHeadings(content))
  
    function parseHeadings(markdown) {
      return markdown
        .split('\n')
        .filter(line => /^#{1,4}\s/.test(line))
        .map((line, i) => {
          const match = line.match(/^(#{1,4})\s+(.+)/)
          if (!match) return null
          return { level: match[1].length, text: match[2].trim(), index: i }
        })
        .filter(Boolean)
    }
  
    // ─── Scroll to heading in editor ───────────────────────
    function jumpTo(text) {
      const selectors = 'h1, h2, h3, h4'
      const nodes = document.querySelectorAll(`.milkdown .ProseMirror ${selectors}`)
      for (const node of nodes) {
        if (node.textContent.trim() === text) {
          node.scrollIntoView({ behavior: 'smooth', block: 'start' })
          break
        }
      }
      onClose?.()
    }
  
    // indent + style by heading level
    function levelStyle(level) {
      const indent = (level - 1) * 14
      const opacity = level === 1 ? 1 : level === 2 ? 0.7 : 0.45
      const size = level === 1 ? 12 : level === 2 ? 11 : 10
      const weight = level === 1 ? 600 : 400
      return `padding-left: ${indent}px; opacity: ${opacity}; font-size: ${size}px; font-weight: ${weight}`
    }
  </script>
  
  <!-- backdrop -->
  <div class="backdrop" onclick={onClose} role="none"></div>
  
  <!-- panel -->
  <div class="panel" role="dialog" aria-label="Document outline">
    <div class="panel-header">
      <span class="panel-title">outline</span>
      <button class="close-btn" onclick={onClose} aria-label="Close outline">✕</button>
    </div>
  
    <div class="headings">
      {#if headings.length === 0}
        <p class="empty">No headings yet</p>
      {:else}
        {#each headings as h (h.text + h.index)}
          <button
            class="heading-item"
            style={levelStyle(h.level)}
            onclick={() => jumpTo(h.text)}
          >
            <span class="h-level">h{h.level}</span>
            <span class="h-text">{h.text}</span>
          </button>
        {/each}
      {/if}
    </div>
  </div>
  
  <style>
    /* ─── Backdrop ─────────────────────────────────── */
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 10;
    }
  
    /* ─── Panel ────────────────────────────────────── */
    .panel {
      position: fixed;
      top: 68px;      /* below floating outline toggle */
      right: 12px;
      width: 240px;
      max-height: calc(100vh - 60px);
      background: #1c1c1c;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);
      z-index: 20;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideIn 0.15s ease-out;
    }
  
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-6px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
  
    /* ─── Header ────────────────────────────────────── */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px 8px;
      border-bottom: 1px solid #222;
      flex-shrink: 0;
    }
  
    .panel-title {
      font-family: var(--font-ui);
      font-size: 9px;
      letter-spacing: 0.12em;
      color: #444;
      text-transform: uppercase;
    }
  
    .close-btn {
      background: none;
      border: none;
      color: #444;
      font-size: 10px;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      transition: color 0.1s;
      line-height: 1;
    }
    .close-btn:hover { color: #888; }
  
    /* ─── Headings list ─────────────────────────────── */
    .headings {
      flex: 1;
      overflow-y: auto;
      padding: 6px 0;
    }
  
    .heading-item {
      display: flex;
      align-items: baseline;
      gap: 7px;
      width: 100%;
      padding: 5px 12px;
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
      background: #242424;
      color: var(--text-heading);
    }
  
    .h-level {
      font-size: 8px;
      color: #333;
      flex-shrink: 0;
      letter-spacing: 0.05em;
      width: 14px;
    }
  
    .h-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  
    .empty {
      font-family: var(--font-ui);
      font-size: 11px;
      color: #444;
      padding: 16px 12px;
      text-align: center;
    }
  </style>
