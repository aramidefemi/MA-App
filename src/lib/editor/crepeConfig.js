import { editorViewCtx } from '@milkdown/core'
import { Crepe } from '@milkdown/crepe'
import {
  canAttachImages,
  isImageFile,
  saveDroppedImage,
} from '../imageAssets.js'
import { configureWikilink } from './wikilinkIntegration.js'
import { readSelectionText } from './selectionText.js'

const researchAiIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`

/**
 * @param {{
 *   root: HTMLElement
 *   defaultValue: string
 *   onAiClick?: (text: string) => void
 *   onNavigateWikilink: (target: string) => void
 *   onUploadImage: (file: File) => Promise<string>
 *   workspaceRoot?: string | null
 *   nearPath?: string | null
 * }} options
 */
export function createCrepe(options) {
  const {
    root,
    defaultValue,
    onAiClick,
    onNavigateWikilink,
    onUploadImage,
    workspaceRoot = null,
    nearPath = null,
  } = options

  const crepe = new Crepe({
    root,
    defaultValue,
    features: {
      // Custom research button via Toolbar buildToolbar — not Crepe AI panel
      [Crepe.Feature.AI]: false,
      // App shell provides EditorTopbar
      [Crepe.Feature.TopBar]: false,
      // Default on: Toolbar, Placeholder, ImageBlock, CodeBlock, List, Blockquote, etc.
    },
    featureConfigs: {
      [Crepe.Feature.Placeholder]: {
        text: 'Start writing…',
        mode: 'block',
      },
      [Crepe.Feature.ImageBlock]: {
        onUpload: onUploadImage,
      },
      ...(onAiClick
        ? {
            [Crepe.Feature.Toolbar]: {
              buildToolbar: (builder) => {
                builder.addGroup('research', 'Research').addItem('ai', {
                  icon: researchAiIcon,
                  active: () => false,
                  onRun: (ctx) => {
                    const view = ctx.get(editorViewCtx)
                    onAiClick(readSelectionText(view))
                  },
                })
              },
            },
          }
        : {}),
    },
  })

  crepe.editor.config((ctx) => {
    configureWikilink(ctx, {
      onNavigate: onNavigateWikilink,
      workspaceRoot,
      nearPath,
    })
  })

  return crepe
}

/**
 * @param {{
 *   getDocumentPath: () => string | null | undefined
 *   onSaveRequired?: () => void | Promise<void>
 * }} options
 */
export async function uploadImageFile(options, file) {
  if (!isImageFile(file)) throw new Error('Not an image')
  let documentPath = options.getDocumentPath()
  if (!canAttachImages(documentPath)) {
    await options.onSaveRequired?.()
    documentPath = options.getDocumentPath()
  }
  if (!canAttachImages(documentPath)) throw new Error('Save document first')
  const { markdownPath } = await saveDroppedImage(file, documentPath)
  return markdownPath
}
