import { printDocument } from '../export.js'
import { getEditorCommands } from '../editor/editorCommands.js'

/** @param {KeyboardEvent} e */
function isEditorTarget(e) {
  const t = e.target
  if (!(t instanceof Element)) return false
  return !!(t.closest('.editor-root') || t.closest('.ProseMirror'))
}

/**
 * @param {{
 *   workspace: import('../modules/workspace/workspace.svelte.ts').typeof workspace,
 *   session: import('../modules/session/session.svelte.ts').typeof session,
 *   settings: import('../modules/settings/settings.svelte.ts').typeof settings,
 *   document: import('../modules/document/document.svelte.ts').typeof document,
 *   research: import('../modules/research/research.svelte.ts').typeof research,
 *   actions: {
 *     newFile: () => void,
 *     saveFile: () => void | Promise<void>,
 *     openFile: () => void | Promise<void>,
 *     openFolder: () => void | Promise<void>,
 *     closeTab: () => void | Promise<void>,
 *     closeAll: () => void | Promise<void>,
 *     toggleFind: () => void,
 *   },
 *   getFileName: () => string | null,
 * }} ctx
 */
export function createKeyboardHandler(ctx) {
  const { workspace, session, settings, document, research, actions, getFileName } = ctx

  return function handleKeydown(e) {
    const mod = e.metaKey || e.ctrlKey
    const inEditor = isEditorTarget(e)
    if (mod && e.key === 'n') {
      e.preventDefault()
      actions.newFile()
    }
    if (mod && e.key === 's' && !e.shiftKey) {
      e.preventDefault()
      void actions.saveFile()
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault()
      void actions.openFolder()
    }
    if (mod && e.key === 'o' && !e.shiftKey) {
      e.preventDefault()
      void actions.openFile()
    }
    if (mod && e.key === 'p') {
      e.preventDefault()
      printDocument(getFileName() ?? 'Document')
    }
    if (mod && e.altKey && e.key.toLowerCase() === 'w') {
      e.preventDefault()
      void actions.closeAll()
    }
    if (mod && e.key === 'w' && !e.altKey) {
      e.preventDefault()
      void actions.closeTab()
    }
    if (
      (e.metaKey || e.ctrlKey) &&
      e.shiftKey &&
      e.key.toLowerCase() === 'b' &&
      workspace.folderPath &&
      !inEditor
    ) {
      e.preventDefault()
      workspace.toggleSidebar()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === '\\' && !inEditor) {
      e.preventDefault()
      if (!workspace.showOutline) research.close()
      workspace.toggleOutline()
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault()
      session.toggleTypewriterScroll()
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      session.toggleFocusMode()
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      settings.toggleTheme()
    }
    if (mod && e.key === ',') {
      e.preventDefault()
      if (workspace.showSettings) workspace.closeSettings()
      else workspace.openSettings()
    }
    if (mod && e.key === 'f' && !e.shiftKey) {
      e.preventDefault()
      if (document.filePath && !document.isPreview) actions.toggleFind()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault()
      workspace.closeOutline()
      const text = getEditorCommands()?.getSelectionText() ?? ''
      research.openWithText(text)
    }
    if (e.key === 'Escape') {
      actions.onEscape?.()
    }
  }
}
