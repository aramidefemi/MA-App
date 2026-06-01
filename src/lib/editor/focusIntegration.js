import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import { session } from '../modules/session'

const FOCUS_KEY = new PluginKey('FOCUS_MODE')

/** @param {import('@milkdown/prose/state').EditorState} state */
export function buildFocusDecorations(state) {
  if (!session.focusMode) return DecorationSet.empty

  const { $head } = state.selection
  let activeFrom = -1
  let activeTo = -1
  for (let d = $head.depth; d > 0; d--) {
    if ($head.node(d).isTextblock) {
      activeFrom = $head.start(d)
      activeTo = $head.end(d)
      break
    }
  }
  if (activeFrom < 0) return DecorationSet.empty

  /** @type {import('@milkdown/prose/view').Decoration[]} */
  const decos = []
  state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return
    const from = pos + 1
    const to = pos + node.nodeSize - 1
    const active = from <= activeTo && to >= activeFrom
    if (!active) {
      decos.push(
        Decoration.node(pos, pos + node.nodeSize, { class: 'focus-dimmed' })
      )
    }
  })
  return DecorationSet.create(state.doc, decos)
}

export const focusIntegration = $prose(() => {
  return new Plugin({
    key: FOCUS_KEY,
    props: {
      decorations(state) {
        return buildFocusDecorations(state)
      },
    },
  })
})
