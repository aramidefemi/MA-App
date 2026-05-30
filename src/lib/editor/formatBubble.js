import { commandsCtx, editorViewCtx } from '@milkdown/core'
import { posToDOMRect } from '@milkdown/prose'
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state'
import { $prose } from '@milkdown/utils'
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom'
import {
  blockquoteSchema,
  bulletListSchema,
  emphasisSchema,
  headingSchema,
  inlineCodeSchema,
  isMarkSelectedCommand,
  linkSchema,
  orderedListSchema,
  strongSchema,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark'

const BUBBLE_KEY = new PluginKey('FORMAT_BUBBLE')

/** @param {import('@milkdown/ctx').Ctx} ctx */
function getActiveState(ctx) {
  const view = ctx.get(editorViewCtx)
  const { state } = view
  const commands = ctx.get(commandsCtx)
  const headingType = headingSchema.type(ctx)

  let heading = 0
  const { $from } = state.selection
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type === headingType) {
      heading = node.attrs.level
      break
    }
  }

  const hasNode = (type) => {
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type === type) return true
    }
    return false
  }

  return {
    bold: commands.call(isMarkSelectedCommand.key, strongSchema.type(ctx)),
    italic: commands.call(isMarkSelectedCommand.key, emphasisSchema.type(ctx)),
    code: commands.call(isMarkSelectedCommand.key, inlineCodeSchema.type(ctx)),
    link: commands.call(isMarkSelectedCommand.key, linkSchema.type(ctx)),
    heading,
    blockquote: hasNode(blockquoteSchema.type(ctx)),
    bulletList: hasNode(bulletListSchema.type(ctx)),
    orderedList: hasNode(orderedListSchema.type(ctx)),
  }
}

/** @param {import('@milkdown/ctx').Ctx} ctx */
function createActions(ctx) {
  const run = (key, payload) => {
    ctx.get(commandsCtx).call(key, payload)
    ctx.get(editorViewCtx).focus()
  }

  return {
    bold: () => run(toggleStrongCommand.key),
    italic: () => run(toggleEmphasisCommand.key),
    code: () => run(toggleInlineCodeCommand.key),
    link: () => {
      const href = window.prompt('Link URL', 'https://')
      if (href == null || href === '') return
      run(toggleLinkCommand.key, { href })
    },
    heading: (level) => run(wrapInHeadingCommand.key, level),
    blockquote: () => run(wrapInBlockquoteCommand.key),
    bulletList: () => run(wrapInBulletListCommand.key),
    orderedList: () => run(wrapInOrderedListCommand.key),
  }
}

/** @param {import('@milkdown/prose/view').EditorView} view */
function shouldShowBubble(view, bubbleEl) {
  const { selection, doc } = view.state
  if (selection.empty || !view.editable) return false
  if (!(selection instanceof TextSelection)) return false

  const text = doc.textBetween(selection.from, selection.to, ' ')
  if (!text.trim().length) return false

  const domSel = window.getSelection()
  const anchorInEditor =
    domSel?.anchorNode != null && view.dom.contains(domSel.anchorNode)
  const focusInBubble = bubbleEl.contains(document.activeElement)

  if (!view.hasFocus() && !anchorInEditor && !focusInBubble) return false

  return true
}

/**
 * Custom ProseMirror bubble plugin — avoids Milkdown tooltipFactory ctx timing.
 * @param {(target: HTMLElement, props: object) => () => void} mountToolbar
 */
export function createFormatBubblePlugin(mountToolbar) {
  return $prose((ctx) => {
    /** @type {import('@milkdown/prose/view').EditorView | null} */
    let editorView = null
    /** @type {ReturnType<typeof setTimeout> | null} */
    let debounceTimer = null
    /** @type {(() => void) | null} */
    let cleanupAutoUpdate = null

    const content = document.createElement('div')
    content.className = 'format-bubble-root'
    content.dataset.show = 'false'

    let active = {
      bold: false,
      italic: false,
      code: false,
      link: false,
      heading: 0,
      blockquote: false,
      bulletList: false,
      orderedList: false,
    }
    const actions = createActions(ctx)
    let refreshActive = () => {}

    const hideBubble = () => {
      if (content.dataset.show === 'false') return
      content.dataset.show = 'false'
      cleanupAutoUpdate?.()
      cleanupAutoUpdate = null
    }

    /** @param {import('@milkdown/prose/view').EditorView} view */
    const syncBubble = (view) => {
      if (!shouldShowBubble(view, content)) {
        hideBubble()
        return
      }

      active = getActiveState(ctx)
      refreshActive()

      const { from, to } = view.state.selection
      const virtualEl = {
        getBoundingClientRect: () => posToDOMRect(view, from, to),
        contextElement: view.dom,
      }

      content.dataset.show = 'true'

      const updatePosition = () => {
        computePosition(virtualEl, content, {
          placement: 'top',
          middleware: [flip(), offset(10), shift({ padding: 8 })],
        })
          .then(({ x, y }) => {
            Object.assign(content.style, {
              left: `${x}px`,
              top: `${y}px`,
            })
          })
          .catch(console.error)
      }

      updatePosition()
      cleanupAutoUpdate?.()
      cleanupAutoUpdate = autoUpdate(virtualEl, content, updatePosition)
    }

    const scheduleUpdate = () => {
      if (!editorView) return
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => syncBubble(editorView), 50)
    }

    const destroyMount = mountToolbar(content, {
      get active() {
        return active
      },
      actions,
      registerRefresh: (refresh) => {
        refreshActive = refresh
      },
    })

    return new Plugin({
      key: BUBBLE_KEY,
      props: {
        handleDOMEvents: {
          mouseup: (view) => {
            editorView = view
            scheduleUpdate()
            return false
          },
          keyup: (view) => {
            editorView = view
            scheduleUpdate()
            return false
          },
        },
      },
      view(view) {
        editorView = view
        document.body.appendChild(content)
        scheduleUpdate()

        return {
          update: (nextView, prevState) => {
            editorView = nextView
            const { selection } = nextView.state
            const sameSelection =
              prevState && prevState.selection.eq(selection)
            if (!sameSelection) scheduleUpdate()
          },
          destroy: () => {
            if (debounceTimer) clearTimeout(debounceTimer)
            hideBubble()
            cleanupAutoUpdate?.()
            destroyMount()
            content.remove()
            editorView = null
          },
        }
      },
    })
  })
}
