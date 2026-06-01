<script>
  import { loadDocumentPreview, revokePreviewPayload } from '../documentPreview.js'

  let { path = '' } = $props()

  let loading = $state(true)
  /** @type {import('../documentPreview.js').loadDocumentPreview extends (...args: any) => Promise<infer R> ? R : never} */
  let payload = $state(null)
  let loadToken = 0

  $effect(() => {
    const filePath = path
    const token = ++loadToken
    loading = true
    payload = null

    if (!filePath) {
      loading = false
      return
    }

    let cancelled = false
    let activePayload = null

    const finish = (result) => {
      if (cancelled || token !== loadToken) {
        revokePreviewPayload(result.status === 'ok' && result.kind === 'pdf' ? result : null)
        return
      }
      activePayload = result
      payload = result
      loading = false
    }

    loadDocumentPreview(filePath).then(finish).catch((e) => {
      finish({
        status: 'error',
        message: e instanceof Error ? e.message : 'Could not load file for preview.',
      })
    })

    return () => {
      cancelled = true
      revokePreviewPayload(activePayload?.status === 'ok' && activePayload.kind === 'pdf' ? activePayload : null)
    }
  })
</script>

<div class="preview-root" aria-label="Document preview">
  {#if loading}
    <p class="preview-status">Loading preview…</p>
  {:else if payload?.status === 'ok' && payload.kind === 'pdf'}
    <iframe
      class="preview-pdf"
      title="PDF preview"
      src={payload.url}
    ></iframe>
  {:else if payload?.status === 'ok' && payload.kind === 'html'}
    <div class="preview-html">{@html payload.html}</div>
  {:else if payload?.status === 'ok' && payload.kind === 'text'}
    <pre class="preview-text">{payload.text}</pre>
  {:else}
    <div class="preview-status">
      <p>{payload?.message ?? 'Preview unavailable.'}</p>
    </div>
  {/if}
</div>

<style>
  .preview-root {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
  }

  .preview-status {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-size: 13px;
    text-align: center;
    line-height: 1.5;
  }

  .preview-pdf {
    flex: 1;
    width: 100%;
    min-height: 0;
    border: 0;
    background: #525659;
  }

  .preview-html {
    flex: 1;
    overflow: auto;
    padding: 48px 56px;
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
    font-family: Georgia, Cambria, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.75;
    color: var(--text);
    user-select: text;
  }

  .preview-html :global(p) { margin: 0 0 1em; }
  .preview-html :global(h1),
  .preview-html :global(h2),
  .preview-html :global(h3) {
    font-family: var(--font-ui);
    margin: 1.2em 0 0.5em;
  }

  .preview-text {
    flex: 1;
    overflow: auto;
    margin: 0;
    padding: 24px 32px;
    font-family: 'SF Mono', 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text);
    white-space: pre-wrap;
    word-break: break-word;
    user-select: text;
  }
</style>
