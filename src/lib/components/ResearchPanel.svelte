<script>
  import { onMount } from 'svelte'
  import { streamResponse } from '../services/ai.js'
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
    draftInput = research.researchInput
    aiLog('ResearchPanel.mounted', {
      input: research.researchInput.slice(0, 80),
      inputLength: research.researchInput.length,
      draftLength: draftInput.length,
    })
    queueMicrotask(() => {
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

  function resizeChatInput(el = chatInputEl) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function resetChatInputHeight() {
    if (chatInputEl) chatInputEl.style.height = 'auto'
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
    response    = ''
    isStreaming = true
    isDone      = false
    error       = null

    await streamResponse({
      mode,
      input: query,
      context,
      documentText: document.content,
      onToken: (token) => {
        if (!isCancelled()) response += token
      },
      onDone: () => {
        if (!isCancelled()) {
          aiLog('ResearchPanel.startStream onDone', { mode })
          isStreaming = false
          isDone = true
          if (mode === 'explain') initialDone = true
        }
      },
      onError: (e) => {
        if (!isCancelled()) {
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

      {:else if isStreaming}
        <div class="thinking">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
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
    <textarea
      bind:this={chatInputEl}
      bind:value={draftInput}
      class="chat-input"
      placeholder={initialDone ? 'ask a follow-up...' : 'add context or a question...'}
      rows="1"
      oninput={() => resizeChatInput()}
      onkeydown={onChatKeydown}
    ></textarea>
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
    background: rgba(74, 222, 128, 0.35);
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

  .thinking {
    display: flex;
    gap: 5px;
    padding: 8px 0;
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
    border-color: rgba(74, 222, 128, 0.4);
  }

  .chat-input-wrap {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    padding: 10px 14px;
  }

  .chat-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 11px;
    line-height: 1.5;
    padding: 8px 10px;
    resize: none;
    overflow: hidden;
    min-height: 36px;
    outline: none;
  }

  .chat-input::placeholder {
    color: var(--text-dim);
  }

  .chat-input:focus {
    border-color: rgba(74, 222, 128, 0.4);
  }
</style>
