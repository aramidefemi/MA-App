import { editorViewCtx } from '@milkdown/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauri } from '../tauriEnv.js'
import {
  canAttachImages,
  isImagePath,
  saveImageFromPath,
} from '../imageAssets.js'
import { insertImagesAt } from './imageInsert.js'

/** @param {import('@milkdown/prose/view').EditorView} view @param {number} x @param {number} y */
function dropPosInEditor(view, x, y) {
  const root = view.dom.closest('.editor-root')
  if (root) {
    const rect = root.getBoundingClientRect()
    const inside =
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    if (!inside) return view.state.selection.from
  }
  return view.posAtCoords({ left: x, top: y })?.pos ?? view.state.selection.from
}

/**
 * OS file drops in Tauri bypass HTML5 dataTransfer; use webview drag-drop events.
 * @param {{
 *   getEditor: () => import('@milkdown/core').Editor | undefined
 *   getDocumentPath: () => string | null | undefined
 *   onSaveRequired?: () => void | Promise<void>
 * }} options
 * @returns {() => void}
 */
export function setupTauriImageDrop(options) {
  if (!isTauri()) return () => {}

  const { getEditor, getDocumentPath, onSaveRequired } = options

  const ready = getCurrentWebview().onDragDropEvent(async (event) => {
      if (event.payload.type !== 'drop') return

      const paths = event.payload.paths.filter(isImagePath)
      if (!paths.length) return

      const editor = getEditor()
      if (!editor) return

      let documentPath = getDocumentPath()
      if (!canAttachImages(documentPath)) {
        await onSaveRequired?.()
        documentPath = getDocumentPath()
      }
      if (!canAttachImages(documentPath)) return

      const scaleFactor = await getCurrentWindow().scaleFactor()
      const { x, y } = event.payload.position.toLogical(scaleFactor)

      const images = []
      for (const sourcePath of paths) {
        images.push(await saveImageFromPath(sourcePath, documentPath))
      }

      let pos
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        pos = dropPosInEditor(view, x, y)
      })

      insertImagesAt(editor, images, pos)
    })

  ready.catch(console.error)

  return () => {
    ready.then((unlisten) => unlisten()).catch(() => {})
  }
}
