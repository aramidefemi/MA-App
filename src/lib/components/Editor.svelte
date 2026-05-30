<script>
  import { onMount, onDestroy } from 'svelte'
  import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
  import { commonmark } from '@milkdown/kit/preset/commonmark'
  import { listener, listenerCtx } from '@milkdown/plugin-listener'

  /**
   * @type {{ initialContent: string, onContentChange: (md: string) => void }}
   */
  let { initialContent = '', onContentChange } = $props()

  let containerEl = $state()
  let editor

  onMount(async () => {
    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, containerEl)
        ctx.set(defaultValueCtx, initialContent)

        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          onContentChange?.(markdown)
        })
      })
      .use(commonmark)
      .use(listener)
      .create()
  })

  onDestroy(() => {
    editor?.destroy()
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
