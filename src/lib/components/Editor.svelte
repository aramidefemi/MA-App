<script>
  import { onMount } from 'svelte'
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
  let crepe

  function applyScrollTop() {
    if (containerEl && session.scrollTop > 0) {
      containerEl.scrollTop = session.scrollTop
    }
  }

  function handleScroll() {
    if (containerEl) session.setScrollTop(containerEl.scrollTop)
  }

  onMount(() => {
    const root = containerEl
    let disposed = false
    root?.addEventListener('scroll', handleScroll, { passive: true })

    const cleanupTauriDrop = setupTauriImageDrop({
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
    /** @type {import('@milkdown/crepe').Crepe | undefined} */
    let active = instance

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

    instance
      .create()
      .then(() => {
        if (disposed) {
          void instance.destroy()
          return
        }
        wireCrepeApis(instance.editor)
        crepe = active
        applyScrollTop()
      })
      .catch((err) => {
        console.error('[Editor] Crepe failed to start:', err)
      })

    $effect(() => {
      session.focusMode
      crepe?.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(view.state.tr)
      })
    })

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

<div class="editor-root milkdown" bind:this={containerEl}></div>

<style>
  .editor-root {
    flex: 1;
    height: 100%;
    overflow-y: auto;
    background: var(--crepe-color-background);
  }
</style>
