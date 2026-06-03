<script>
  import { onMount, tick } from 'svelte'
  import { editorViewCtx } from '@milkdown/core'
  import { session } from '../modules/session'
  import { createCrepe, uploadImageFile } from '../editor/crepeConfig.js'
  import { clearCrepeApis, wireCrepeApis } from '../editor/crepeBridge.js'
  import '../editor/crepeTheme.css'
  import { getEditorPlugins } from '../editor/editorPlugins.js'
  import { setupTauriImageDrop } from '../editor/tauriImageDrop.js'
  import { setDriftHighlightIssues } from '../editor/driftHighlightIntegration.js'
  import { setDriftNavigationIssues } from '../editor/driftNavigation.js'
  import {
    dispatchWikilinkDecorationRefresh,
    syncWikilinkIndex,
    wikilinkNearPathCtx,
    wikilinkWorkspaceCtx,
  } from '../editor/wikilinkStatus.js'
  import { workspace } from '../modules/workspace'
  import { document } from '../modules/document'

  /**
   * @type {{
   *   onContentChange?: (md: string) => void
   *   onAiClick?: (text: string) => void
   *   onOpenWikilink?: (target: string) => void | Promise<void>
   *   wikilinkSyncToken?: number
   *   driftIssues?: import('../modules/aiDrift/types').AiDriftIssue[]
   * }}
   */
  let {
    onContentChange,
    onAiClick,
    onOpenWikilink,
    wikilinkSyncToken = 0,
    driftIssues = [],
  } = $props()

  let containerEl = $state()
  /** @type {import('@milkdown/crepe').Crepe | undefined} */
  let crepe = $state()
  let initError = $state(null)

  function applyScrollTop() {
    if (containerEl && session.scrollTop > 0) {
      containerEl.scrollTop = session.scrollTop
    }
  }

  function handleScroll() {
    if (containerEl) session.setScrollTop(containerEl.scrollTop)
  }

  function refreshEditorDecorations() {
    crepe?.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr)
    })
  }

  async function syncWikilinkSurface() {
    const root = workspace.folderPath
    if (!crepe) return
    await crepe.editor.action(async (ctx) => {
      ctx.set(wikilinkWorkspaceCtx.key, root)
      ctx.set(wikilinkNearPathCtx.key, document.filePath)
      await syncWikilinkIndex(ctx, root)
      dispatchWikilinkDecorationRefresh(ctx)
    })
  }

  $effect(() => {
    session.focusMode
    refreshEditorDecorations()
  })

  $effect(() => {
    const issues = driftIssues ?? []
    setDriftHighlightIssues(issues)
    setDriftNavigationIssues(issues)
    refreshEditorDecorations()
  })

  $effect(() => {
    workspace.folderPath
    document.filePath
    wikilinkSyncToken
    void syncWikilinkSurface()
  })

  onMount(() => {
    let disposed = false
    /** @type {import('@milkdown/crepe').Crepe | undefined} */
    let active
    let cleanupTauriDrop = () => {}
    /** @type {HTMLElement | undefined} */
    let root

    void (async () => {
      await tick()
      root = containerEl
      if (!root || disposed) {
        if (!root && !disposed) initError = 'Editor failed to mount'
        return
      }

      root.addEventListener('scroll', handleScroll, { passive: true })

      cleanupTauriDrop = setupTauriImageDrop({
        getEditor: () => crepe?.editor,
        getDocumentPath: () => document.filePath,
        onSaveRequired: () => document.saveAs(),
      })

      const instance = createCrepe({
        root,
        defaultValue: document.content,
        onAiClick,
        workspaceRoot: workspace.folderPath,
        nearPath: document.filePath,
        onNavigateWikilink: (target) => onOpenWikilink?.(target),
        onUploadImage: (file) =>
          uploadImageFile(
            {
              getDocumentPath: () => document.filePath,
              onSaveRequired: () => document.saveAs(),
            },
            file,
          ),
      })
      active = instance

      for (const plugin of getEditorPlugins()) {
        instance.editor.use(plugin)
      }

      instance.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          document.setContent(markdown)
          onContentChange?.(markdown)
        })
      })

      try {
        await instance.create()
        if (disposed) {
          void instance.destroy()
          return
        }
        wireCrepeApis(instance.editor)
        crepe = active
        initError = null
        applyScrollTop()
        await syncWikilinkSurface()
      } catch (err) {
        console.error('[Editor] Crepe failed to start:', err)
        initError = err instanceof Error ? err.message : String(err)
      }
    })()

    return () => {
      disposed = true
      cleanupTauriDrop()
      root?.removeEventListener('scroll', handleScroll)
      if (active) {
        clearCrepeApis(active.editor)
        void active.destroy()
        active = undefined
        crepe = undefined
      }
    }
  })
</script>

<div class="editor-root milkdown" bind:this={containerEl}>
  {#if initError}
    <p class="editor-error">Editor failed to load: {initError}</p>
  {/if}
</div>

<style>
  .editor-root {
    flex: 1;
    height: 100%;
    overflow-y: auto;
    background: var(--crepe-color-background);
  }

  .editor-error {
    margin: 24px;
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--crepe-color-error);
  }
</style>
