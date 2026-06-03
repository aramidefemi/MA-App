import { editorViewCtx } from '@milkdown/core'
import { TextSelection } from '@milkdown/prose/state'

/**
 * @param {import('@milkdown/core').Editor} editor
 * @param {{ src: string, alt: string, title?: string }[]} images
 * @param {number | null | undefined} pos
 */
export function insertImagesAt(editor, images, pos) {
  if (!images.length) return

  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const imageBlock = view.state.schema.nodes['image-block']
    const image = view.state.schema.nodes.image
    const nodeType = imageBlock ?? image
    if (!nodeType) return

    let tr = view.state.tr
    if (pos != null) {
      tr = tr.setSelection(TextSelection.create(view.state.doc, pos))
    }

    for (const { src, alt, title = '' } of images) {
      const attrs = imageBlock ? { src } : { src, alt, title }
      const node = nodeType.createAndFill(attrs)
      if (node) tr = tr.replaceSelectionWith(node)
    }

    view.dispatch(tr.scrollIntoView())
    view.focus()
  })
}
