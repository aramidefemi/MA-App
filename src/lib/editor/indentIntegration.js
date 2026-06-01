import { indentConfig } from '@milkdown/kit/plugin/indent'
import { $shortcut } from '@milkdown/utils'
import { AllSelection, TextSelection } from '@milkdown/prose/state'

/** @type {import('@milkdown/plugin-indent').IndentConfigOptions} */
export const defaultIndentOptions = { type: 'space', size: 2 }

/** @param {import('@milkdown/ctx').Ctx} ctx @param {import('@milkdown/plugin-indent').IndentConfigOptions} [options] */
export function applyIndentConfig(ctx, options = defaultIndentOptions) {
  ctx.set(indentConfig.key, options)
}

/** @param {import('@milkdown/prose/state').Transaction} tr @param {import('@milkdown/plugin-indent').IndentConfigOptions} options */
function insertIndent(tr, options) {
  const { doc, selection } = tr
  if (!doc || !selection) return tr
  if (!(selection instanceof TextSelection || selection instanceof AllSelection)) return tr
  const text = options.type === 'space' ? ' '.repeat(options.size) : '\t'
  return tr.insertText(text, selection.to)
}

/** Priority below list keymaps (50) so Tab nests/lifts lists before inserting spaces. */
const LIST_KEYMAP_PRIORITY = 50
const indentTabPriority = LIST_KEYMAP_PRIORITY - 1

const indentTabPlugin = $shortcut((ctx) => ({
  Tab: {
    key: 'Tab',
    priority: indentTabPriority,
    onRun: () => (state, dispatch) => {
      const config = ctx.get(indentConfig.key)
      const tr = insertIndent(state.tr, config)
      if (!tr.docChanged) return false
      dispatch?.(tr)
      return true
    },
  },
}))

export { indentConfig }
export const indent = [indentConfig, indentTabPlugin]
