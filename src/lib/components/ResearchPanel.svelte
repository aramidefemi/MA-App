<script>
  import { ArrowUp } from '@lucide/svelte'
  import { onMount } from 'svelte'
  import { streamResponse, formatAiTiming } from '../services/ai.js'
  import { aiLog, aiWarn } from '../debug/aiFlowLog.js'
  import { research } from '../modules/research'
  import { document } from '../modules/document'

  let { onSaveNote } = $props()

  const DEFAULT_WIDTH = 280
  const MIN_WIDTH = 240
  const MAX_VIEWPORT_RATIO = 0.55
  const EDITOR_MIN_PX = 320

  let response     = $state('')
  let isStreaming  = $state(false)
  let isDone       = $state(false)
  let initialDone  = $state(false)
  let error        = $state(null)
  let panelWidth   = $state(DEFAULT_WIDTH)
  let resizing     = $state(false)
  let draftInput   = $state('')
  let chatInputEl  = $state(null)
  let submittedContext = $state('')
  let deepThinking   = $state(false)
  /** @type {{ totalMs: number, ttftMs: number } | null} */
  let timing         = $state(null)

  const DEEP_THINKING_MS = 2_500
  /** @type {ReturnType<typeof setTimeout> | null} */
  let deepThinkingTimer = null

  const maxWidth = () =>
    Math.max(
      MIN_WIDTH,
      Math.min(
        Math.floor(window.innerWidth * MAX_VIEWPORT_RATIO),
        window.innerWidth - EDITOR_MIN_PX
      )
    )

  const clampWidth = (w) => Math.min(maxWidth(), Math.max(MIN_WIDTH, w))

  onMount(() => {
    const text = research.researchInput.trim()
    draftInput = research.researchInput
    aiLog('ResearchPanel.mounted', {
      input: research.researchInput.slice(0, 80),
      inputLength: research.researchInput.length,
      draftLength: draftInput.length,
      autoExplain: text.length > 0,
    })
    queueMicrotask(() => {
      if (text) {
        submittedContext = text
        draftInput = ''
        resetChatInputHeight()
        startStream(text, () => false, 'explain')
        return
      }
      resizeChatInput()
      chatInputEl?.focus()
    })
  })

  function startResize(e) {
    e.preventDefault()
    const startX = e.clientX
    const startW = panelWidth
    resizing = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev) => {
      panelWidth = clampWidth(startW + (startX - ev.clientX))
    }

    const onUp = () => {
      resizing = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const CHAT_INPUT_MIN = 72
  const CHAT_INPUT_MAX = 160

  function resizeChatInput(el = chatInputEl) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(CHAT_INPUT_MAX, Math.max(CHAT_INPUT_MIN, el.scrollHeight))}px`
  }

  function resetChatInputHeight() {
    if (chatInputEl) chatInputEl.style.height = 'auto'
  }

  function clearDeepThinkingTimer() {
    if (deepThinkingTimer != null) {
      clearTimeout(deepThinkingTimer)
      deepThinkingTimer = null
    }
  }

  function scheduleDeepThinking() {
    clearDeepThinkingTimer()
    deepThinking = false
    deepThinkingTimer = setTimeout(() => {
      if (isStreaming && !response) deepThinking = true
    }, DEEP_THINKING_MS)
  }

  async function startStream(query, isCancelled, mode = 'explain', context) {
    aiLog('ResearchPanel.startStream', {
      mode,
      query: query.slice(0, 80),
      queryLength: query.length,
      hasContext: !!context,
      contextLength: context?.length ?? 0,
      documentLength: document.content.length,
    })
    response     = ''
    isStreaming  = true
    isDone       = false
    error        = null
    timing       = null
    deepThinking = false
    scheduleDeepThinking()

    await streamResponse({
      mode,
      input: query,
      context,
      documentText: document.content,
      onFirstToken: () => {
        if (!isCancelled()) {
          clearDeepThinkingTimer()
          deepThinking = false
        }
      },
      onToken: (token) => {
        if (!isCancelled()) response += token
      },
      onDone: (stats) => {
        if (!isCancelled()) {
          clearDeepThinkingTimer()
          deepThinking = false
          aiLog('ResearchPanel.startStream onDone', { mode, ...stats })
          isStreaming = false
          isDone = true
          timing = stats
          if (mode === 'explain') initialDone = true
        }
      },
      onError: (e) => {
        if (!isCancelled()) {
          clearDeepThinkingTimer()
          deepThinking = false
          aiWarn('ResearchPanel.startStream onError', {
            mode,
            message: e.message,
          })
          isStreaming = false
          error = e.message
        }
      },
    })
  }

  function submitChat() {
    const text = draftInput.trim()
    if (!text || isStreaming) return

    if (!initialDone) {
      submittedContext = text
      draftInput = ''
      resetChatInputHeight()
      startStream(text, () => false, 'explain')
      return
    }

    const question = text
    draftInput = ''
    resetChatInputHeight()
    startStream(question, () => false, 'ask', submittedContext)
  }

  function onChatKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitChat()
    }
  }
</script>

<div
  class="research-panel"
  class:resizing
  style="width: {panelWidth}px"
>
  <div
    class="resize-handle"
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize AI panel"
    tabindex="-1"
    onpointerdown={startResize}
  ></div>

  <div class="panel-header">
    <span class="panel-logo">✦ ma</span>
    <button class="close-btn" onclick={research.close}>✕</button>
  </div>

  <div class="panel-body">

    {#if submittedContext}
      <div class="context-chip">
        <span class="context-label">{initialDone ? 'context' : 'explaining'}</span>
        <span class="context-text">
          {submittedContext.length > 60 ? submittedContext.slice(0, 60) + '…' : submittedContext}
        </span>
      </div>
    {/if}

    <div class="response-area">
      {#if error}
        <p class="error-msg">{error}</p>

      {:else if response}
        <p class="response-text">{response}{#if isStreaming}<span class="cursor">▌</span>{/if}</p>
        {#if timing && isDone}
          <p class="response-timing" aria-live="polite">
            {formatAiTiming(timing.totalMs)}
            {#if timing.ttftMs < timing.totalMs}
              <span class="timing-detail"> · first words {formatAiTiming(timing.ttftMs)}</span>
            {/if}
          </p>
        {/if}

      {:else if isStreaming}
        <div class="thinking" aria-busy="true" aria-label={deepThinking ? 'Thinking' : 'Loading'}>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          {#if deepThinking}
            <span class="thinking-label">thinking</span>
          {/if}
        </div>

      {:else}
        <p class="empty-prompt">
          Highlight text and click ✦, or type a question below and press Enter to send.
        </p>
      {/if}
    </div>

    {#if isDone && response}
      <div class="panel-actions">
        <button class="save-note-btn" onclick={() => onSaveNote?.(submittedContext, response)}>
          save as note ↗
        </button>
      </div>
    {/if}

  </div>

  <div class="chat-input-wrap">
    <div class="chat-input-box">
      <textarea
        bind:this={chatInputEl}
        bind:value={draftInput}
        class="chat-input"
        placeholder={initialDone ? 'ask a follow-up...' : 'add context or a question...'}
        rows="3"
        oninput={() => resizeChatInput()}
        onkeydown={onChatKeydown}
      ></textarea>
      <button
        type="button"
        class="send-btn"
        aria-label="Send message"
        disabled={!draftInput.trim() || isStreaming}
        onclick={submitChat}
      >
        <ArrowUp size={14} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  </div>
</div>

<style>
  .research-panel {
    position: relative;
    flex-shrink: 0;
    background: var(--surface);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    transform: translateX(-50%);
    cursor: col-resize;
    z-index: 3;
    touch-action: none;
  }

  .resize-handle::after {
    content: '';
    position: absolute;
    inset: 0;
    left: 50%;
    width: 1px;
    transform: translateX(-50%);
    background: transparent;
    transition: background 0.15s;
  }

  .resize-handle:hover::after,
  .research-panel.resizing .resize-handle::after {
    background: color-mix(in srgb, var(--crepe-color-primary) 35%, transparent);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    -webkit-app-region: no-drag;
  }

  .panel-logo {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 0.08em;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 10px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
  }
  .close-btn:hover { color: var(--text); }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 14px;
  }

  .context-chip {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 8px 10px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .context-label {
    font-family: var(--font-ui);
    font-size: 9px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    text-transform: uppercase;
  }

  .context-text {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--text);
    line-height: 1.5;
    word-break: break-word;
  }

  .response-area {
    flex: 1;
  }

  .response-text {
    font-family: var(--font-prose);
    font-size: 13px;
    line-height: 1.75;
    color: var(--text);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .cursor {
    color: var(--accent);
    animation: blink 0.8s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  .response-timing {
    margin: 10px 0 0;
    font-family: var(--font-ui);
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.04em;
  }

  .timing-detail {
    opacity: 0.85;
  }

  .thinking {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 0;
  }

  .thinking-label {
    margin-left: 6px;
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    font-style: italic;
    animation: thinking-fade 0.4s ease-out;
  }

  @keyframes thinking-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-dim);
    animation: pulse 1.2s ease-in-out infinite;
  }

  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes pulse {
    0%, 100% { opacity: 0.2; }
    50%       { opacity: 1; }
  }

  .error-msg {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--danger);
    line-height: 1.6;
  }

  .empty-prompt {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.6;
  }

  .panel-actions {
    padding-top: 16px;
    border-top: 1px solid var(--border);
    margin-top: 16px;
  }

  .save-note-btn {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-size: 10px;
    letter-spacing: 0.06em;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    width: 100%;
  }

  .save-note-btn:hover {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--crepe-color-primary) 40%, transparent);
  }

  .chat-input-wrap {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    padding: 10px 14px;
  }

  .chat-input-box {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: var(--bg);
    border: 1px solid #555;
    border-radius: 10px;
    padding: 8px 8px 8px 12px;
    transition: border-color 0.15s;
  }

  .chat-input-box:focus-within {
    border-color: #888;
  }

  .chat-input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    background: transparent;
    border: none;
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 11px;
    line-height: 1.5;
    padding: 2px 0;
    resize: none;
    overflow-y: auto;
    min-height: 72px;
    max-height: 160px;
    outline: none;
  }

  .chat-input::placeholder {
    color: var(--text-dim);
  }

  .send-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: #d4d4d4;
    color: #1a1a1a;
    cursor: pointer;
    transition: opacity 0.15s, background 0.15s;
  }

  .send-btn:hover:not(:disabled) {
    background: #e8e8e8;
  }

  .send-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }
</style>
