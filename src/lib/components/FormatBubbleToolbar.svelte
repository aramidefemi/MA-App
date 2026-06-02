<script>
  import { Code, Ellipsis, Link, List, ListOrdered, Quote } from '@lucide/svelte'
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

  onMount(() => {
    registerRefresh(refresh)
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
        <Code size={12} strokeWidth={1.75} aria-hidden="true" />
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
        <Link size={12} strokeWidth={1.75} aria-hidden="true" />
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
      <Quote size={12} strokeWidth={1.75} aria-hidden="true" />
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
      <List size={12} strokeWidth={1.75} aria-hidden="true" />
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
      <ListOrdered size={12} strokeWidth={1.75} aria-hidden="true" />
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
    <Ellipsis size={12} strokeWidth={1.75} aria-hidden="true" />
  </button>

  <div class="caret" aria-hidden="true"></div>
</div>

<style>
  .bubble {
    --bubble-bg: var(--crepe-color-surface);
    --bubble-border: color-mix(in srgb, var(--crepe-color-outline) 25%, var(--crepe-color-surface));
    --bubble-hover: var(--crepe-color-hover);
    --bubble-text: var(--crepe-color-on-surface-variant);
    --bubble-text-hover: var(--crepe-color-on-surface);
    --bubble-btn-h: 34px;
    --bubble-btn-min: 34px;
    --bubble-heading-fs: 12px;
    --bubble-icon-fs: 14px;
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
    box-shadow: var(--crepe-shadow-2);
    position: relative;
    font-family: var(--crepe-font-default);
    font-weight: var(--crepe-weight-regular);
  }

  .group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .sep {
    width: 1px;
    height: calc(var(--bubble-btn-h) - 8px);
    background: color-mix(in srgb, var(--crepe-color-outline) 50%, transparent);
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
    font-weight: var(--crepe-weight-semibold);
    letter-spacing: var(--crepe-tracking-normal);
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
    font-weight: var(--crepe-weight-bold);
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
    font-weight: var(--crepe-weight-bold);
  }

  .btn em {
    font-style: italic;
    font-weight: var(--crepe-weight-medium);
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
