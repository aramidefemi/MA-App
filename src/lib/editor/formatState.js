import { commandsCtx, editorViewCtx } from '@milkdown/core'
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

/** @typedef {ReturnType<typeof createFormatActions>} FormatActions */

/** @param {import('@milkdown/ctx').Ctx} ctx */
export function getFormatActiveState(ctx) {
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
export function createFormatActions(ctx) {
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
