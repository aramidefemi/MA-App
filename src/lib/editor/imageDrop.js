import { commandsCtx, editorViewCtx } from '@milkdown/core'
import { insertImageCommand, imageSchema } from '@milkdown/kit/preset/commonmark'
import { Plugin } from '@milkdown/prose/state'
import { TextSelection } from '@milkdown/prose/state'
import { $prose } from '@milkdown/utils'
import {
  canAttachImages,
  isImageFile,
  resolveImageDisplaySrc,
  saveDroppedImage,
} from '../imageAssets.js'

/**
 * Resolve local image paths for in-editor preview while keeping relative paths in markdown.
 * @param {() => string | null | undefined} getDocumentPath
 */
export function createImageDisplayPlugin(getDocumentPath) {
  return $prose((ctx) => {
    const imageType = imageSchema.type(ctx)

    return new Plugin({
      props: {
        nodeViews: {
          image: (node) => {
            const dom = document.createElement('img')
            dom.className = 'editor-image'
            dom.draggable = true

            const sync = async (current) => {
              dom.alt = current.attrs.alt || ''
              dom.title = current.attrs.title || ''
              dom.src = await resolveImageDisplaySrc(getDocumentPath(), current.attrs.src)
            }

            sync(node)

            return {
              dom,
              update: (updated) => {
                if (updated.type !== imageType) return false
                sync(updated)
                return true
              },
            }
          },
        },
      },
    })
  })
}

/**
 * @param {{
 *   getDocumentPath: () => string | null | undefined
 *   onSaveRequired?: () => void | Promise<void>
 * }} options
 */
export function createImageDropPlugin({ getDocumentPath, onSaveRequired }) {
  return $prose((ctx) => {
    const insertAt = (view, pos) => {
      if (pos == null) return
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)))
    }

    const insertImage = async (view, file, pos) => {
      const documentPath = getDocumentPath()
      if (!canAttachImages(documentPath)) {
        await onSaveRequired?.()
        return
      }

      const { markdownPath, alt } = await saveDroppedImage(file, documentPath)
      insertAt(view, pos)
      ctx.get(commandsCtx).call(insertImageCommand.key, { src: markdownPath, alt })
      view.focus()
    }

    return new Plugin({
      props: {
        handleDOMEvents: {
          dragover: (_view, event) => {
            if ([...event.dataTransfer?.types ?? []].includes('Files')) {
              event.preventDefault()
              if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
            }
            return false
          },
          drop: (view, event) => {
            const files = [...event.dataTransfer?.files ?? []].filter(isImageFile)
            if (!files.length) return false

            event.preventDefault()
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos

            ;(async () => {
              for (const file of files) {
                await insertImage(view, file, pos)
              }
            })().catch(console.error)

            return true
          },
        },
      },
    })
  })
}
