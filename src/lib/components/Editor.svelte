<script>
  import { mount, unmount, onMount } from 'svelte'
  import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
  import { commonmark } from '@milkdown/kit/preset/commonmark'
  import { history } from '@milkdown/kit/plugin/history'
  import { clipboard } from '@milkdown/kit/plugin/clipboard'
  import { listener, listenerCtx } from '@milkdown/plugin-listener'
  import FormatBubbleToolbar from './FormatBubbleToolbar.svelte'
  import { createFormatBubblePlugin } from '../editor/formatBubble.js'
  import { createImageDisplayPlugin, createImageDropPlugin } from '../editor/imageDrop.js'
  import { createTypewriterScrollPlugin } from '../editor/typewriterScroll.js'
  import { aiLog, aiWarn } from '../debug/aiFlowLog.js'
  import { document } from '../modules/document'
  import { session } from '../modules/session'

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
    root?.addEventListener('scroll', handleScroll, { passive: true })

    ;(async () => {
      const instance = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, document.content)

          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
            document.setContent(markdown)
            props.onContentChange?.(markdown)
          })
        })
        .use(commonmark)
        .use(history)
        .use(clipboard)
        .use(listener)
        .use(
          createFormatBubblePlugin((target, bubbleProps) => {
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
        )
        .use(createImageDisplayPlugin(() => document.filePath))
        .use(createImageDropPlugin({
          getDocumentPath: () => document.filePath,
          onSaveRequired: () => document.saveAs(),
        }))
        .use(createTypewriterScrollPlugin())
        .create()

      if (disposed) {
        instance.destroy()
        return
      }
      editor = instance
      applyScrollTop()
    })()

    return () => {
      disposed = true
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
