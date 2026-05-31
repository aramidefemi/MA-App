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
import { aiLog } from '../debug/aiFlowLog.js'
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

/** @param {import('@milkdown/prose/view').EditorView} view @param {HTMLElement} bubbleEl @param {string} cachedText */
function shouldShowBubble(view, bubbleEl, cachedText) {
  const focusInBubble = bubbleEl.contains(document.activeElement)

  const { selection, doc } = view.state
  if (selection.empty || !view.editable) {
    if (focusInBubble && cachedText.trim()) {
      aiLog('shouldShowBubble: true — toolbar focus, cached selection', {
        cached: cachedText.slice(0, 80),
        length: cachedText.length,
      })
      return true
    }
    aiLog('shouldShowBubble: false — empty selection or not editable', {
      empty: selection.empty,
      editable: view.editable,
    })
    return false
  }
  if (!(selection instanceof TextSelection)) {
    aiLog('shouldShowBubble: false — not TextSelection')
    return false
  }

  const text = doc.textBetween(selection.from, selection.to, ' ')
  if (!text.trim().length) {
    aiLog('shouldShowBubble: false — selection text empty')
    return false
  }

  const domSel = window.getSelection()
  const anchorInEditor =
    domSel?.anchorNode != null && view.dom.contains(domSel.anchorNode)

  if (!view.hasFocus() && !anchorInEditor && !focusInBubble) {
    aiLog('shouldShowBubble: false — no editor/bubble focus', {
      hasFocus: view.hasFocus(),
      anchorInEditor,
      focusInBubble,
      activeElement: document.activeElement?.className,
    })
    return false
  }

  aiLog('shouldShowBubble: true', { text: text.slice(0, 80), length: text.length })

  return true
}

/**
 * Anchor rect for the bubble — uses live DOM selection when it matches the editor
 * so coords stay viewport-correct inside a scrolling editor root.
 * @param {import('@milkdown/prose/view').EditorView} view
 * @param {number} from
 * @param {number} to
 */
function getSelectionAnchorRect(view, from, to) {
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const range = sel.getRangeAt(0)
    if (view.dom.contains(range.commonAncestorContainer)) {
      const rect = range.getBoundingClientRect()
      if (rect.width > 0 || rect.height > 0) return rect
    }
  }
  return posToDOMRect(view, from, to)
}

/** Scroll container for the editor (used by floating-ui autoUpdate). */
function getEditorScrollRoot(view) {
  return view.dom.closest('.editor-root') ?? view.dom.parentElement ?? view.dom
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
    let selectionText = ''
    /** Text cached while bubble is visible — survives selection collapse on toolbar click */
    let bubbleSelectionText = ''
    /** Doc positions for the last non-empty selection — used when toolbar keeps focus */
    let bubbleFrom = 0
    let bubbleTo = 0
    const actions = createActions(ctx)
    /** @param {string} [textOverride] */
    let refreshActive = (_textOverride) => {}

    const readSelectionText = () => {
      const view = editorView
      if (view) {
        const { from, to, doc, selection } = view.state
        if (!selection.empty) {
          const live = doc.textBetween(from, to, ' ').trim()
          if (live) {
            aiLog('readSelectionText: live selection', { live: live.slice(0, 80), length: live.length })
            return live
          }
        }
      }
      const cached = bubbleSelectionText || selectionText
      aiLog('readSelectionText: cached fallback', {
        cached: cached.slice(0, 80),
        length: cached.length,
        bubbleSelectionTextLen: bubbleSelectionText.length,
        selectionTextLen: selectionText.length,
      })
      return cached
    }

    const hideBubble = () => {
      if (content.dataset.show === 'false') return
      aiLog('hideBubble', {
        activeElement: document.activeElement?.className,
        bubbleSelectionTextLen: bubbleSelectionText.length,
      })
      content.dataset.show = 'false'
      cleanupAutoUpdate?.()
      cleanupAutoUpdate = null
    }

    /** @param {import('@milkdown/prose/view').EditorView} view */
    const syncBubble = (view) => {
      if (!shouldShowBubble(view, content, bubbleSelectionText)) {
        hideBubble()
        return
      }

      const { from, to, doc, selection } = view.state
      active = getActiveState(ctx)
      const liveText = selection.empty
        ? ''
        : doc.textBetween(from, to, ' ').trim()
      if (liveText) {
        selectionText = liveText
        bubbleSelectionText = liveText
        bubbleFrom = from
        bubbleTo = to
      }
      const anchorFrom = selection.empty ? bubbleFrom : from
      const anchorTo = selection.empty ? bubbleTo : to
      const textForToolbar = liveText || bubbleSelectionText || selectionText
      aiLog('syncBubble: selection synced', {
        text: textForToolbar.slice(0, 80),
        length: textForToolbar.length,
        liveText: liveText.slice(0, 80),
        cached: bubbleSelectionText.slice(0, 80),
        from: anchorFrom,
        to: anchorTo,
        selectionEmpty: selection.empty,
      })
      refreshActive(textForToolbar)
      const virtualEl = {
        getBoundingClientRect: () => getSelectionAnchorRect(view, anchorFrom, anchorTo),
        contextElement: getEditorScrollRoot(view),
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

    const scheduleUpdate = (immediate = false) => {
      if (!editorView) return
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = null
      const run = () => {
        if (editorView) syncBubble(editorView)
      }
      if (immediate) {
        // mouseup/keyup fire before ProseMirror applies the new selection
        requestAnimationFrame(run)
        return
      }
      debounceTimer = setTimeout(run, 50)
    }

    const destroyMount = mountToolbar(content, {
      getSelectionText: readSelectionText,
      actions,
      registerRefresh: (refresh) => {
        refreshActive = (textOverride) => {
          const text = textOverride ?? (bubbleSelectionText || selectionText)
          refresh(active, text)
        }
        aiLog('registerRefresh: toolbar wired', {
          text: (bubbleSelectionText || selectionText).slice(0, 80),
          length: (bubbleSelectionText || selectionText).length,
        })
      },
    })

    return new Plugin({
      key: BUBBLE_KEY,
      props: {
        handleDOMEvents: {
          mouseup: (view) => {
            editorView = view
            scheduleUpdate(true)
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
            refreshActive = (_textOverride) => {}
            destroyMount()
            content.remove()
            editorView = null
          },
        }
      },
    })
  })
}
