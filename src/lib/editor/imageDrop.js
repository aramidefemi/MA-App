import { imageSchema } from '@milkdown/kit/preset/commonmark'
import { Plugin } from '@milkdown/prose/state'
import { $prose } from '@milkdown/utils'
import { resolveImageDisplaySrc } from '../imageAssets.js'

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

