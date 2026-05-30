<script>
  /**
   * @type {{
   *   active: {
   *     bold: boolean
   *     italic: boolean
   *     code: boolean
   *     link: boolean
   *     heading: number
   *     blockquote: boolean
   *     bulletList: boolean
   *     orderedList: boolean
   *   }
   *   actions: Record<string, (...args: unknown[]) => void>
   *   registerRefresh?: (refresh: () => void) => void
   * }}
   */
  let { active, actions, registerRefresh } = $props()

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

  let snapshot = $state(empty)

  function refresh() {
    snapshot = { ...active }
  }

  $effect(() => {
    registerRefresh?.(refresh)
  })

  function handleMouseDown(e) {
    e.preventDefault()
  }

  /** @param {() => void} fn */
  function act(fn) {
    fn()
    requestAnimationFrame(refresh)
  }
</script>

<div
  class="bubble"
  role="toolbar"
  tabindex="-1"
  aria-label="Text formatting"
  onmousedown={handleMouseDown}
>
  <div class="group headings" role="group" aria-label="Headings">
    {#each [1, 2, 3] as level}
      <button
        type="button"
        class="btn"
        class:active={snapshot.heading === level}
        title="Heading {level}"
        aria-label="Heading {level}"
        aria-pressed={snapshot.heading === level}
        onclick={() => act(() => actions.heading(level))}
      >
        H{level}
      </button>
    {/each}
  </div>

  <span class="sep" aria-hidden="true"></span>

  <div class="group" role="group" aria-label="Inline styles">
    <button
      type="button"
      class="btn icon"
      class:active={snapshot.bold}
      title="Bold (⌘B)"
      aria-label="Bold"
      aria-pressed={snapshot.bold}
      onclick={() => act(() => actions.bold())}
    >
      <strong>B</strong>
    </button>
    <button
      type="button"
      class="btn icon"
      class:active={snapshot.italic}
      title="Italic (⌘I)"
      aria-label="Italic"
      aria-pressed={snapshot.italic}
      onclick={() => act(() => actions.italic())}
    >
      <em>I</em>
    </button>
    <button
      type="button"
      class="btn icon"
      title="Underline (not supported in markdown)"
      aria-label="Underline"
      disabled
    >
      <span class="underline">U</span>
    </button>
    <button
      type="button"
      class="btn icon"
      class:active={snapshot.link}
      title="Link"
      aria-label="Link"
      aria-pressed={snapshot.link}
      onclick={() => act(() => actions.link())}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M5.2 6.8a2.2 2.2 0 0 0 3.1 0l1.4-1.4a2.2 2.2 0 0 0-3.1-3.1L6.3 3.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M6.8 5.2a2.2 2.2 0 0 0-3.1 0L2.3 6.6a2.2 2.2 0 0 0 3.1 3.1l1.4-1.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <span class="sep" aria-hidden="true"></span>

  <div class="group" role="group" aria-label="Blocks">
    <button
      type="button"
      class="btn icon"
      class:active={snapshot.blockquote}
      title="Blockquote"
      aria-label="Blockquote"
      aria-pressed={snapshot.blockquote}
      onclick={() => act(() => actions.blockquote())}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M3 3h2v5H3V3zm4 0h2v5H7V3z" fill="currentColor"/>
      </svg>
    </button>
    <button
      type="button"
      class="btn icon"
      class:active={snapshot.code}
      title="Inline code"
      aria-label="Inline code"
      aria-pressed={snapshot.code}
      onclick={() => act(() => actions.code())}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M4.2 3 2 6l2.2 3M7.8 3 10 6 7.8 9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <button
      type="button"
      class="btn icon"
      class:active={snapshot.bulletList}
      title="Bullet list"
      aria-label="Bullet list"
      aria-pressed={snapshot.bulletList}
      onclick={() => act(() => actions.bulletList())}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="2" cy="3" r="1" fill="currentColor"/>
        <circle cx="2" cy="6" r="1" fill="currentColor"/>
        <circle cx="2" cy="9" r="1" fill="currentColor"/>
        <path d="M4.5 3h5.5M4.5 6h5.5M4.5 9h5.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
      </svg>
    </button>
    <button
      type="button"
      class="btn icon"
      class:active={snapshot.orderedList}
      title="Numbered list"
      aria-label="Numbered list"
      aria-pressed={snapshot.orderedList}
      onclick={() => act(() => actions.orderedList())}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 2.5v2M2 2.5h.8M1.5 6.5h1v1.5H2M2 9.5V11M1.5 9.5h1" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>
        <path d="M4.5 3h5.5M4.5 6h5.5M4.5 9h5.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <div class="caret" aria-hidden="true"></div>
</div>

<style>
  .bubble {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    background: #f5f5f2;
    border: 1px solid #e8e8e4;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.28), 0 1px 4px rgba(0, 0, 0, 0.12);
    position: relative;
    font-family: var(--font-ui);
  }

  .group {
    display: flex;
    align-items: center;
    gap: 1px;
  }

  .headings .btn {
    min-width: 26px;
    font-size: 10px;
    letter-spacing: 0.04em;
  }

  .sep {
    width: 1px;
    height: 18px;
    background: #ddd;
    margin: 0 4px;
    flex-shrink: 0;
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 26px;
    min-width: 26px;
    padding: 0 5px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: #444;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .btn:hover:not(:disabled) {
    background: #ebebe7;
    color: #111;
  }

  .btn.active {
    background: #e0e8e3;
    color: #1a5c34;
  }

  .btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .btn.icon {
    font-size: 12px;
    font-style: normal;
  }

  .btn strong,
  .btn em {
    font-size: 12px;
    font-style: normal;
    font-weight: 700;
  }

  .btn em {
    font-style: italic;
    font-weight: 500;
  }

  .underline {
    text-decoration: underline;
    font-size: 12px;
  }

  .caret {
    position: absolute;
    left: 50%;
    bottom: -6px;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid #f5f5f2;
    filter: drop-shadow(0 1px 0 #e8e8e4);
  }

  .caret::after {
    content: '';
    position: absolute;
    left: -7px;
    top: -7px;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 7px solid #e8e8e4;
    z-index: -1;
  }
</style>
