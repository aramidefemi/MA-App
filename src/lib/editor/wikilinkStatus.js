import { editorViewCtx } from '@milkdown/core'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import { $ctx, $prose } from '@milkdown/utils'
import {
  getWikilinkIndex,
  resolveWikilinkFromIndex,
} from '../wikilinkResolve.js'

export const wikilinkStatusKey = new PluginKey('wikilinkStatus')

export const wikilinkWorkspaceCtx = $ctx(
  /** @type {string | null} */ (null),
  'wikilinkWorkspace',
)

export const wikilinkNearPathCtx = $ctx(
  /** @type {string | null} */ (null),
  'wikilinkNearPath',
)

export const wikilinkIndexCtx = $ctx(
  /** @type {Map<string, string[]> | null} */ (null),
  'wikilinkIndex',
)

/** @param {import('@milkdown/prose/model').Node} doc @param {import('@milkdown/ctx').Ctx} ctx */
function buildWikilinkDecorations(doc, ctx) {
  const root = ctx.get(wikilinkWorkspaceCtx.key)
  const nearPath = ctx.get(wikilinkNearPathCtx.key)
  const index = ctx.get(wikilinkIndexCtx.key)
  if (!root || !index) return DecorationSet.empty

  /** @type {import('@milkdown/prose/view').Decoration[]} */
  const decos = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'wikilink') return
    const target = String(node.attrs.target ?? '')
    const resolved = resolveWikilinkFromIndex(root, target, { nearPath, index })
    const cls = resolved ? 'wikilink-resolved' : 'wikilink-missing'
    decos.push(Decoration.node(pos, pos + node.nodeSize, { class: cls }))
  })
  return DecorationSet.create(doc, decos)
}

/** @param {import('@milkdown/ctx').Ctx} ctx @param {string | null} root */
export async function syncWikilinkIndex(ctx, root) {
  const index = root ? await getWikilinkIndex(root) : null
  ctx.set(wikilinkIndexCtx.key, index)
}

/** @param {import('@milkdown/ctx').Ctx} ctx */
export function dispatchWikilinkDecorationRefresh(ctx) {
  const view = ctx.get(editorViewCtx)
  const deco = buildWikilinkDecorations(view.state.doc, ctx)
  view.dispatch(view.state.tr.setMeta(wikilinkStatusKey, deco))
}

export const wikilinkStatusPlugin = $prose((ctx) => {
  return new Plugin({
    key: wikilinkStatusKey,
    state: {
      init(_, { doc }) {
        return buildWikilinkDecorations(doc, ctx)
      },
      apply(tr, set) {
        const meta = tr.getMeta(wikilinkStatusKey)
        if (meta) return meta
        if (tr.docChanged) return buildWikilinkDecorations(tr.doc, ctx)
        return set.map(tr.mapping, tr.doc)
      },
    },
    props: {
      decorations(state) {
        return wikilinkStatusKey.getState(state)
      },
    },
  })
})
