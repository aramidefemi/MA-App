<script>
  import { onMount, tick } from 'svelte'
  import { editorViewCtx } from '@milkdown/core'
  import { session } from '../modules/session'
  import { createCrepe, uploadImageFile } from '../editor/crepeConfig.js'
  import { clearCrepeApis, wireCrepeApis } from '../editor/crepeBridge.js'
  import '../editor/crepeTheme.css'
  import { focusIntegration } from '../editor/focusIntegration.js'
  import { setupTauriImageDrop } from '../editor/tauriImageDrop.js'
  import { createTypewriterScrollPlugin } from '../editor/typewriterScroll.js'
  import { wikilinkIntegration } from '../editor/wikilinkIntegration.js'
  import { resolveWikilinkPath } from '../wikilinkResolve.js'
  import { workspace } from '../modules/workspace'
  import { document } from '../modules/document'

  /**
   * @type {{
   *   onContentChange?: (md: string) => void
   *   onAiClick?: (text: string) => void
   * }}
   */
  let props = $props()

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

  $effect(() => {
    session.focusMode
    crepe?.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr)
    })
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
        onAiClick: props.onAiClick,
        onNavigateWikilink: async (target) => {
          const path = await resolveWikilinkPath(workspace.folderPath, target)
          if (path) await document.openFileFromTree(path)
        },
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

      instance.editor
        .use(wikilinkIntegration)
        .use(focusIntegration)
        .use(createTypewriterScrollPlugin())

      instance.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          document.setContent(markdown)
          props.onContentChange?.(markdown)
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
