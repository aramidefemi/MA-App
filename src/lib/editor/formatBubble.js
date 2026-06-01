import { commandsCtx, editorViewCtx } from '@milkdown/core'
import { posToDOMRect } from '@milkdown/prose'
import { TextSelection } from '@milkdown/prose/state'
import { tooltipFactory, TooltipProvider } from '@milkdown/plugin-tooltip'
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
import { aiLog } from '../debug/aiFlowLog.js'
import { createEditorCommands, setEditorCommands } from './editorCommands.js'
import { pushFormatState, setFormatActions } from './formatEditorApi.js'

/** @typedef {{
 *   bold: boolean,
 *   italic: boolean,
 *   code: boolean,
 *   link: boolean,
 *   heading: number,
 *   blockquote: boolean,
 *   bulletList: boolean,
 *   orderedList: boolean,
 * }} FormatActiveState */

/** @typedef {ReturnType<typeof createActions>} FormatActions */

export const formatBubbleTooltip = tooltipFactory('FORMAT_BUBBLE')
const [formatBubbleTooltipSpec] = formatBubbleTooltip

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

/** @param {import('@milkdown/prose/view').EditorView} view @param {number} from @param {number} to */
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

/** @param {import('@milkdown/prose/view').EditorView} view */
function getEditorScrollRoot(view) {
  return view.dom.closest('.editor-root') ?? view.dom.parentElement ?? view.dom
}

/**
 * @param {import('@milkdown/prose/view').EditorView} view
 * @param {HTMLElement} bubbleEl
 * @param {string} cachedText
 */
function shouldShowFormatBubble(view, bubbleEl, cachedText) {
  const focusInBubble = bubbleEl.contains(document.activeElement)
  const { selection, doc } = view.state

  if (selection.empty || !view.editable) {
    return focusInBubble && cachedText.trim().length > 0
  }
  if (!(selection instanceof TextSelection)) return false

  return doc.textBetween(selection.from, selection.to, ' ').trim().length > 0
}

class FormatBubbleView {
  /** @type {import('@milkdown/prose/view').EditorView} */
  #view
  /** @type {HTMLElement} */
  #content
  /** @type {TooltipProvider} */
  #provider
  /** @type {FormatActions} */
  #actions
  /** @type {ReturnType<typeof createEditorCommands>} */
  #editorCommands

  /** @type {FormatActiveState} */
  #active = {
    bold: false,
    italic: false,
    code: false,
    link: false,
    heading: 0,
    blockquote: false,
    bulletList: false,
    orderedList: false,
  }

  #selectionText = ''
  #bubbleSelectionText = ''
  #bubbleFrom = 0
  #bubbleTo = 0
  /** @param {string} [textOverride] */
  #refreshToolbar = (_textOverride) => {}
  /** @type {(() => void) | null} */
  #destroyMount = null

  /**
   * @param {import('@milkdown/ctx').Ctx} ctx
   * @param {import('@milkdown/prose/view').EditorView} view
   * @param {(target: HTMLElement, props: object) => () => void} mountToolbar
   */
  constructor(ctx, view, mountToolbar) {
    this.#view = view
    this.#actions = createActions(ctx)
    this.#editorCommands = createEditorCommands(ctx)
    setFormatActions(this.#actions)
    setEditorCommands(this.#editorCommands)

    this.#content = document.createElement('div')
    this.#content.className = 'format-bubble-root'

    this.#provider = new TooltipProvider({
      content: this.#content,
      debounce: 50,
      offset: 10,
      shift: { padding: 8 },
      root: document.body,
      shouldShow: (editorView) =>
        shouldShowFormatBubble(editorView, this.#content, this.#bubbleSelectionText),
      floatingUIOptions: { placement: 'top' },
    })

    this.#provider.onShow = () => this.#onProviderShow()
    this.#provider.onHide = () => {
      aiLog('formatBubble: hidden')
    }

    this.#destroyMount = mountToolbar(this.#content, {
      getSelectionText: () => this.#readSelectionText(),
      actions: this.#actions,
      registerRefresh: (refresh) => {
        this.#refreshToolbar = (textOverride) => {
          const text = textOverride ?? (this.#bubbleSelectionText || this.#selectionText)
          refresh(this.#active, text)
        }
      },
    })

    this.#provider.update(view)
    this.#emitFormatState(ctx)
  }

  /** @param {import('@milkdown/ctx').Ctx} ctx */
  #emitFormatState(ctx) {
    this.#active = getActiveState(ctx)
    pushFormatState(this.#active)
  }

  #readSelectionText() {
    const { state } = this.#view
    const { from, to, doc, selection } = state
    if (!selection.empty) {
      const live = doc.textBetween(from, to, ' ').trim()
      if (live) return live
    }
    return this.#bubbleSelectionText || this.#selectionText
  }

  #cacheSelection() {
    const { from, to, doc, selection } = this.#view.state
    if (selection.empty) return

    const liveText = doc.textBetween(from, to, ' ').trim()
    if (!liveText) return

    this.#selectionText = liveText
    this.#bubbleSelectionText = liveText
    this.#bubbleFrom = from
    this.#bubbleTo = to
  }

  #syncToolbarText() {
    const { selection } = this.#view.state
    const text =
      selection.empty
        ? this.#bubbleSelectionText || this.#selectionText
        : this.#view.state.doc
            .textBetween(selection.from, selection.to, ' ')
            .trim() ||
          this.#bubbleSelectionText ||
          this.#selectionText
    this.#refreshToolbar(text)
  }

  #onProviderShow() {
    this.#syncToolbarText()
    const { selection } = this.#view.state
    if (!selection.empty || this.#bubbleFrom >= this.#bubbleTo) return

    const virtualEl = {
      getBoundingClientRect: () =>
        getSelectionAnchorRect(this.#view, this.#bubbleFrom, this.#bubbleTo),
      contextElement: getEditorScrollRoot(this.#view),
    }
    this.#provider.show(virtualEl, this.#view)
  }

  /**
   * @param {import('@milkdown/prose/view').EditorView} view
   * @param {import('@milkdown/ctx').Ctx} ctx
   */
  update(view, ctx) {
    this.#view = view
    this.#cacheSelection()
    this.#emitFormatState(ctx)
    this.#provider.update(view)
    if (this.#content.dataset.show === 'true') this.#syncToolbarText()
  }

  /** @param {import('@milkdown/prose/view').EditorView} view */
  onMouseUp(view) {
    this.#view = view
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.#cacheSelection()
        this.#provider.update(view)
      })
    })
  }

  /** @param {import('@milkdown/prose/view').EditorView} view */
  onKeyUp(view) {
    this.#view = view
    this.#provider.update(view)
  }

  destroy() {
    this.#provider.destroy()
    this.#destroyMount?.()
    this.#content.remove()
    this.#refreshToolbar = (_textOverride) => {}
    setFormatActions(null)
    setEditorCommands(null)
  }
}

/**
 * Wire @milkdown/plugin-tooltip with FormatBubbleToolbar (Svelte).
 * @param {(target: HTMLElement, props: object) => () => void} mountToolbar
 */
export function configureFormatBubble(ctx, mountToolbar) {
  /** @type {FormatBubbleView | undefined} */
  let bubbleView

  ctx.set(formatBubbleTooltipSpec.key, {
    props: {
      handleDOMEvents: {
        mouseup: (view) => {
          bubbleView?.onMouseUp(view)
          return false
        },
        keyup: (view) => {
          bubbleView?.onKeyUp(view)
          return false
        },
      },
    },
    view: (view) => {
      bubbleView = new FormatBubbleView(ctx, view, mountToolbar)
      return {
        update: (nextView) => bubbleView?.update(nextView, ctx),
        destroy: () => {
          bubbleView?.destroy()
          bubbleView = undefined
        },
      }
    },
  })
}
