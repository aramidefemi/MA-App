<script>
  import { mount, unmount, onMount } from 'svelte'
  import { Editor, editorViewCtx, rootCtx, defaultValueCtx } from '@milkdown/core'
  import { session } from '../modules/session'
  import { commonmarkIntegration } from '../editor/commonmarkIntegration.js'
  import { history } from '@milkdown/kit/plugin/history'
  import { clipboard } from '@milkdown/kit/plugin/clipboard'
  import { listener, listenerCtx } from '@milkdown/plugin-listener'
  import FormatBubbleToolbar from './FormatBubbleToolbar.svelte'
  import SlashMenu from './SlashMenu.svelte'
  import {
    configureFormatBubble,
    formatBubbleTooltip,
  } from '../editor/formatBubble.js'
  import { slash, applySlashMenu } from '../editor/slashIntegration.js'
  import { cursorIntegration, configureCursor } from '../editor/cursorIntegration.js'
  import { createImageDisplayPlugin } from '../editor/imageDrop.js'
  import { upload, configureUpload } from '../editor/uploadIntegration.js'
  import { setupTauriImageDrop } from '../editor/tauriImageDrop.js'
  import { createTypewriterScrollPlugin } from '../editor/typewriterScroll.js'
  import { indent, applyIndentConfig } from '../editor/indentIntegration.js'
  import { trailingIntegration } from '../editor/trailingIntegration.js'
  import { wikilinkIntegration, configureWikilink } from '../editor/wikilinkIntegration.js'
  import { focusIntegration } from '../editor/focusIntegration.js'
  import { resolveWikilinkPath } from '../wikilinkResolve.js'
  import { workspace } from '../modules/workspace'
  import { aiLog, aiWarn } from '../debug/aiFlowLog.js'
  import { document } from '../modules/document'

  /**
   * @type {{
   *   onContentChange?: (md: string) => void
   *   onAiClick?: (text: string) => void
   * }}
   */
  let props = $props()

  let containerEl = $state()
  /** @type {import('@milkdown/core').Editor | undefined} */
  let editor

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
    let cleanupTauriDrop = () => {}
    root?.addEventListener('scroll', handleScroll, { passive: true })

    cleanupTauriDrop = setupTauriImageDrop({
      getEditor: () => editor,
      getDocumentPath: () => document.filePath,
      onSaveRequired: () => document.saveAs(),
    })

    ;(async () => {
      const instance = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, document.content)

          configureCursor(ctx)
          applyIndentConfig(ctx)
          configureUpload(ctx, {
            getDocumentPath: () => document.filePath,
            onSaveRequired: () => document.saveAs(),
          })

          configureWikilink(ctx, {
            onNavigate: async (target) => {
              const path = await resolveWikilinkPath(workspace.folderPath, target)
              if (path) await document.openFileFromTree(path)
            },
          })

          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
            document.setContent(markdown)
            props.onContentChange?.(markdown)
          })

          applySlashMenu(ctx, (target, slashProps) => {
            const instance = mount(SlashMenu, {
              target,
              props: slashProps,
            })
            return () => unmount(instance)
          })

          configureFormatBubble(ctx, (target, bubbleProps) => {
            aiLog('Editor: mounting FormatBubbleToolbar', {
              hasOnAiClick: !!props.onAiClick,
              onAiClickType: typeof props.onAiClick,
              filePath: document.filePath,
            })
            const instance = mount(FormatBubbleToolbar, {
              target,
              props: {
                getSelectionText: bubbleProps.getSelectionText,
                actions: bubbleProps.actions,
                registerRefresh: bubbleProps.registerRefresh,
                onAiClick: (text) => {
                  aiLog('Editor.onAiClick invoked', {
                    text: text.slice(0, 80),
                    length: text.length,
                    hasParentCallback: !!props.onAiClick,
                    parentType: typeof props.onAiClick,
                  })
                  if (!props.onAiClick) {
                    aiWarn('Editor.onAiClick ABORT — parent callback missing')
                    return
                  }
                  try {
                    props.onAiClick(text)
                    aiLog('Editor.onAiClick parent callback returned OK')
                  } catch (err) {
                    aiWarn('Editor.onAiClick parent callback THREW', {
                      message: err?.message,
                      stack: err?.stack,
                    })
                  }
                },
              },
            })
            return () => {
              aiLog('Editor: unmounting FormatBubbleToolbar')
              unmount(instance)
            }
          })
        })
        .use(commonmarkIntegration)
        .use(slash)
        .use(wikilinkIntegration)
        .use(focusIntegration)
        .use(indent)
        .use(history)
        .use(clipboard)
        .use(trailingIntegration)
        .use(cursorIntegration)
        .use(upload)
        .use(listener)
        .use(formatBubbleTooltip)
        .use(createImageDisplayPlugin(() => document.filePath))
        .use(createTypewriterScrollPlugin())
        .create()

      if (disposed) {
        instance.destroy()
        return
      }
      editor = instance
      applyScrollTop()
    })().catch((err) => {
      console.error('[Editor] Milkdown failed to start:', err)
    })

  $effect(() => {
    session.focusMode
    editor?.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr)
    })
  })

    return () => {
      disposed = true
      cleanupTauriDrop()
      root?.removeEventListener('scroll', handleScroll)
      editor?.destroy()
      editor = undefined
    }
  })
</script>

<!-- bind:this works even with $state for DOM refs in Svelte 5 -->
<div class="editor-root" bind:this={containerEl}></div>

<style>
  .editor-root {
    flex: 1;
    height: 100%;
    overflow-y: auto;
  }
</style>
