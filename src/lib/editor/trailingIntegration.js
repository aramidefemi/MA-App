import {
  trailingConfig,
  trailingPlugin,
} from '@milkdown/kit/plugin/trailing'

/**
 * Append an empty paragraph when the doc does not already end with one.
 * Matches Tiptap-style trailing behavior (notAfter: ['paragraph'] only).
 *
 * @param {import('@milkdown/prose/model').Node | null} lastNode
 */
function shouldAppendTrailing(lastNode) {
  if (!lastNode) return true
  return lastNode.type.name !== 'paragraph'
}

/** @param {import('@milkdown/ctx').Ctx} ctx */
function setTrailingDefaults(ctx) {
  ctx.set(trailingConfig.key, {
    shouldAppend: (lastNode) => shouldAppendTrailing(lastNode),
    getNode: (state) => state.schema.nodes.paragraph.create(),
  })
}

/** Registers trailing config slice, then applies calm-writer defaults. */
const trailingDefaultsPlugin = (ctx) => {
  const cleanup = trailingConfig(ctx)
  setTrailingDefaults(ctx)
  return cleanup
}

/** Trailing empty paragraph at doc end (when last block is not a paragraph). */
export const trailingIntegration = [trailingDefaultsPlugin, trailingPlugin]
