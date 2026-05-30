import { commandsCtx, editorViewCtx } from '@milkdown/core'
import { tooltipFactory, TooltipProvider } from '@milkdown/kit/plugin/tooltip'
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

export const formatBubbleTooltip = tooltipFactory('FORMAT_BUBBLE')

/**
 * Register tooltip spec immediately after the ctx slice is injected.
 * @param {(target: HTMLElement, props: object) => () => void} mountToolbar
 */
export function createFormatBubblePlugin(mountToolbar) {
  const [specCtx, prosePlugin] = formatBubbleTooltip
  const wrappedSpecCtx = (ctx) => {
    const cleanup = specCtx(ctx)
    configureFormatBubble(ctx, mountToolbar)
    return cleanup
  }
  wrappedSpecCtx.key = specCtx.key
  return [wrappedSpecCtx, prosePlugin]
}

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

/**
 * @param {import('@milkdown/ctx').Ctx} ctx
 * @param {(target: HTMLElement, props: object) => () => void} mountToolbar
 */
export function configureFormatBubble(ctx, mountToolbar) {
  ctx.set(formatBubbleTooltip.key, {
    view: (view) => {
      const content = document.createElement('div')
      content.className = 'format-bubble-root'

      let active = getActiveState(ctx)
      const actions = createActions(ctx)
      let refreshActive = () => {}

      const destroyMount = mountToolbar(content, {
        get active() {
          return active
        },
        actions,
        registerRefresh: (refresh) => {
          refreshActive = refresh
        },
      })

      const provider = new TooltipProvider({
        content,
        debounce: 80,
        offset: 10,
        floatingUIOptions: { placement: 'top' },
        root: document.body,
      })

      provider.onShow = () => {
        active = getActiveState(ctx)
        refreshActive()
      }

      provider.update(view)

      return {
        update: (v, prev) => {
          provider.update(v, prev)
          if (content.dataset.show === 'true') {
            active = getActiveState(ctx)
            refreshActive()
          }
        },
        destroy: () => {
          provider.destroy()
          destroyMount()
        },
      }
    },
  })
}
