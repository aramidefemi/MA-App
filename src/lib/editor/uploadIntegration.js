import { upload, uploadConfig } from '@milkdown/kit/plugin/upload'
import { editorViewCtx } from '@milkdown/core'
import { Fragment } from '@milkdown/prose/model'
import { TextSelection } from '@milkdown/prose/state'
import { Decoration } from '@milkdown/prose/view'
import {
  canAttachImages,
  isImageFile,
  saveDroppedImage,
} from '../imageAssets.js'

export { upload }

/**
 * @param {import('@milkdown/ctx').Ctx} ctx
 * @param {{
 *   getDocumentPath: () => string | null | undefined
 *   onSaveRequired?: () => void | Promise<void>
 * }} options
 */
export function configureUpload(ctx, options) {
  const { getDocumentPath, onSaveRequired } = options
  const defaults = ctx.get(uploadConfig.key)

  ctx.set(uploadConfig.key, {
    ...defaults,
    enableHtmlFileUploader: true,
    uploader: async (files, schema) => {
      let documentPath = getDocumentPath()
      if (!canAttachImages(documentPath)) {
        await onSaveRequired?.()
        documentPath = getDocumentPath()
      }
      if (!canAttachImages(documentPath)) return Fragment.empty

      const { image } = schema.nodes
      if (!image) return Fragment.empty

      const nodes = []
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i)
        if (!file || !isImageFile(file)) continue
        const { markdownPath, alt } = await saveDroppedImage(file, documentPath)
        const node = image.createAndFill({ src: markdownPath, alt })
        if (node) nodes.push(node)
      }

      return nodes.length ? nodes : Fragment.empty
    },
    uploadWidgetFactory: (pos, spec) => {
      const el = document.createElement('span')
      el.className = 'calm-upload-widget'
      el.textContent = 'Adding image…'
      return Decoration.widget(pos, el, spec)
    },
  })
}

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
