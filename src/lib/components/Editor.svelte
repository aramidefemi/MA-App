<script>
  import { mount, unmount, onMount } from 'svelte'
  import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
  import { commonmark } from '@milkdown/kit/preset/commonmark'
  import { listener, listenerCtx } from '@milkdown/plugin-listener'
  import FormatBubbleToolbar from './FormatBubbleToolbar.svelte'
  import { createFormatBubblePlugin } from '../editor/formatBubble.js'

  /**
   * @type {{ initialContent: string, onContentChange: (md: string) => void }}
   */
  let { initialContent = '', onContentChange } = $props()

  let containerEl = $state()
  /** @type {import('@milkdown/core').Editor | undefined} */
  let editor

  onMount(() => {
    const root = containerEl
    let disposed = false

    ;(async () => {
      const instance = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, initialContent)

          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
            onContentChange?.(markdown)
          })
        })
        .use(commonmark)
        .use(listener)
        .use(
          createFormatBubblePlugin((target, props) => {
            const instance = mount(FormatBubbleToolbar, { target, props })
            return () => unmount(instance)
          })
        )
        .create()

      if (disposed) {
        instance.destroy()
        return
      }
      editor = instance
    })()

    return () => {
      disposed = true
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
