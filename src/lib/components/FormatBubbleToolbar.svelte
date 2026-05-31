<script>
  import { onMount } from 'svelte'
  import { aiLog, aiWarn } from '../debug/aiFlowLog.js'

  let {
    getSelectionText,
    actions,
    registerRefresh,
    onAiClick,
  } = $props()

  const PRIMARY_HEADINGS = [1, 2, 3]
  const OVERFLOW_HEADINGS = [4, 5, 6]

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
  let selectedText = $state('')
  let expanded = $state(false)

  /** @param {typeof empty} activeState @param {string} text */
  function refresh(activeState, text) {
    snapshot = { ...activeState }
    const trimmed = text.trim()
    if (trimmed) selectedText = trimmed
    aiLog('FormatBubbleToolbar.refresh', {
      selectedText: selectedText.slice(0, 80),
      length: selectedText.length,
      fromArgs: trimmed.slice(0, 80),
      skippedEmpty: !trimmed && selectedText.length > 0,
      hasOnAiClick: !!onAiClick,
    })
    if (snapshot.heading >= 4 || snapshot.code || snapshot.link) expanded = true
  }

  $effect.pre(() => {
    registerRefresh(refresh)
  })

  onMount(() => {
    aiLog('FormatBubbleToolbar.mounted', {
      hasOnAiClick: !!onAiClick,
      onAiClickType: typeof onAiClick,
      hasGetSelectionText: typeof getSelectionText === 'function',
    })
  })

  function handleMouseDown(e) {
    e.preventDefault()
  }

  /** @param {() => void} fn */
  function act(fn) {
    fn()
  }

  function toggleMore() {
    expanded = !expanded
  }

  function handleAiMouseDown(e) {
    aiLog('FormatBubbleToolbar.handleAiMouseDown START', {
      eventType: e.type,
      target: e.target?.className,
      defaultPrevented: e.defaultPrevented,
    })
    e.preventDefault()
    const fromCache = getSelectionText?.()?.trim() ?? ''
    const text = fromCache || selectedText.trim()
    aiLog('FormatBubbleToolbar.handleAiMouseDown text resolved', {
      text: text.slice(0, 80),
      length: text.length,
      fromCache: fromCache.slice(0, 80),
      fromCacheLen: fromCache.length,
      selectedText: selectedText.slice(0, 80),
      selectedTextLen: selectedText.length,
      hasOnAiClick: !!onAiClick,
      onAiClickType: typeof onAiClick,
    })
    if (!onAiClick) {
      aiWarn('FormatBubbleToolbar.handleAiMouseDown ABORT — onAiClick missing')
      return
    }
    aiLog('FormatBubbleToolbar.handleAiMouseDown calling onAiClick', {
      text: text.slice(0, 80),
      length: text.length,
      emptySelection: !text,
    })
    try {
      onAiClick(text)
      aiLog('FormatBubbleToolbar.handleAiMouseDown onAiClick returned OK')
    } catch (err) {
      aiWarn('FormatBubbleToolbar.handleAiMouseDown onAiClick THREW', {
        message: err?.message,
        stack: err?.stack,
      })
    }
  }
</script>

<div
  class="bubble"
  class:expanded
  role="toolbar"
  tabindex="-1"
  aria-label="Text formatting"
  onmousedown={handleMouseDown}
>
  {#if onAiClick}
    <button
      type="button"
      class="btn icon ai"
      title="Explain with AI"
      aria-label="Explain with AI"
      onmousedown={handleAiMouseDown}
      onmouseup={() => aiLog('FormatBubbleToolbar.ai button mouseup')}
      onclick={() => aiLog('FormatBubbleToolbar.ai button click')}
    >
      ✦
    </button>
    <span class="sep" aria-hidden="true"></span>
  {/if}

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
    {#if expanded}
      <button
        type="button"
        class="btn icon"
        class:active={snapshot.code}
        title="Inline code"
        aria-label="Inline code"
        aria-pressed={snapshot.code}
        onclick={() => act(() => actions.code())}
      >
        <svg class="glyph" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M4.2 3 2 6l2.2 3M7.8 3 10 6 7.8 9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
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
        <svg class="glyph" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M5.2 6.8a2.2 2.2 0 0 0 3.1 0l1.4-1.4a2.2 2.2 0 0 0-3.1-3.1L6.3 3.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
          <path d="M6.8 5.2a2.2 2.2 0 0 0-3.1 0L2.3 6.6a2.2 2.2 0 0 0 3.1 3.1l1.4-1.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
        </svg>
      </button>
    {/if}
  </div>

  <span class="sep" aria-hidden="true"></span>

  <div class="group headings" role="group" aria-label="Headings">
    {#each PRIMARY_HEADINGS as level}
      <button
        type="button"
        class="btn heading"
        class:active={snapshot.heading === level}
        title="Heading {level}"
        aria-label="Heading {level}"
        aria-pressed={snapshot.heading === level}
        onclick={() => act(() => actions.heading(level))}
      >
        H{level}
      </button>
    {/each}
    {#if expanded}
      {#each OVERFLOW_HEADINGS as level}
        <button
          type="button"
          class="btn heading"
          class:active={snapshot.heading === level}
          title="Heading {level}"
          aria-label="Heading {level}"
          aria-pressed={snapshot.heading === level}
          onclick={() => act(() => actions.heading(level))}
        >
          H{level}
        </button>
      {/each}
    {/if}
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
      <svg class="glyph" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M3 3h2v5H3V3zm4 0h2v5H7V3z" fill="currentColor"/>
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
      <svg class="glyph" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
      <svg class="glyph" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 2.5v2M2 2.5h.8M1.5 6.5h1v1.5H2M2 9.5V11M1.5 9.5h1" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>
        <path d="M4.5 3h5.5M4.5 6h5.5M4.5 9h5.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <span class="sep" aria-hidden="true"></span>

  <button
    type="button"
    class="btn icon more"
    class:active={expanded}
    title="More options"
    aria-label="More options"
    aria-expanded={expanded}
    onclick={toggleMore}
  >
    <svg class="glyph ellipsis" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="2.5" cy="6" r="1.1" fill="currentColor"/>
      <circle cx="6" cy="6" r="1.1" fill="currentColor"/>
      <circle cx="9.5" cy="6" r="1.1" fill="currentColor"/>
    </svg>
  </button>

  <div class="caret" aria-hidden="true"></div>
</div>

<style>
  .bubble {
    --bubble-bg: #f5f5f2;
    --bubble-border: #e8e8e4;
    --bubble-hover: #ebebe7;
    --bubble-text: #444;
    --bubble-text-hover: #111;
    --bubble-btn-h: 34px;
    --bubble-btn-min: 34px;
    --bubble-heading-fs: 12px;
    --bubble-icon-fs: 14px;
    --bubble-glyph: 14px;
    --bubble-pad-y: 6px;
    --bubble-pad-x: 8px;
    --bubble-gap: 3px;
    --bubble-radius: 10px;
    --bubble-btn-radius: 6px;

    display: flex;
    align-items: center;
    gap: var(--bubble-gap);
    padding: var(--bubble-pad-y) var(--bubble-pad-x);
    background: var(--bubble-bg);
    border: 1px solid var(--bubble-border);
    border-radius: var(--bubble-radius);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.28), 0 1px 4px rgba(0, 0, 0, 0.12);
    position: relative;
    font-family: var(--font-ui);
  }

  .group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .sep {
    width: 1px;
    height: calc(var(--bubble-btn-h) - 8px);
    background: #ddd;
    margin: 0 5px;
    flex-shrink: 0;
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: var(--bubble-btn-h);
    min-width: var(--bubble-btn-min);
    padding: 0 7px;
    border: none;
    border-radius: var(--bubble-btn-radius);
    background: transparent;
    color: var(--bubble-text);
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .btn.heading {
    min-width: calc(var(--bubble-btn-min) + 2px);
    font-size: var(--bubble-heading-fs);
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .btn:hover:not(:disabled) {
    background: var(--bubble-hover);
    color: var(--bubble-text-hover);
  }

  .btn.active {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .btn.icon {
    font-size: var(--bubble-icon-fs);
    font-style: normal;
  }

  .btn.more {
    min-width: calc(var(--bubble-btn-min) - 2px);
    padding: 0 6px;
  }

  .btn.ai {
    color: var(--accent);
    font-size: 20px;
    font-weight: 800;
    line-height: 1;
    min-width: 38px;
    background: var(--accent-dim);
  }

  .btn.ai:hover {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent-dim) 70%, var(--accent) 30%);
  }

  .btn strong,
  .btn em {
    font-size: var(--bubble-icon-fs);
    font-style: normal;
    font-weight: 700;
  }

  .btn em {
    font-style: italic;
    font-weight: 500;
  }

  .glyph {
    width: var(--bubble-glyph);
    height: var(--bubble-glyph);
    flex-shrink: 0;
  }

  .ellipsis {
    width: calc(var(--bubble-glyph) + 2px);
  }

  .caret {
    position: absolute;
    left: 50%;
    bottom: -7px;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 7px solid var(--bubble-bg);
    filter: drop-shadow(0 1px 0 var(--bubble-border));
  }

  .caret::after {
    content: '';
    position: absolute;
    left: -8px;
    top: -8px;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid var(--bubble-border);
    z-index: -1;
  }
</style>
