import { exportDocx, exportPdf, printDocument } from '../export.js'
import { getEditorCommands } from '../editor/editorCommands.js'
import { isUntitled } from '../modules/document'

/**
 * @param {{
 *   file: ReturnType<import('./fileActions.js').createFileActions>,
 *   document: import('../modules/document/document.svelte.ts').typeof document,
 *   workspace: import('../modules/workspace/workspace.svelte.ts').typeof workspace,
 *   session: import('../modules/session/session.svelte.ts').typeof session,
 *   settings: import('../modules/settings/settings.svelte.ts').typeof settings,
 *   getFileName: () => string | null,
 *   createWorkspaceFile: () => void | Promise<void>,
 *   toggleSidebar: () => void,
 *   openFind: () => void,
 * }} ctx
 */
export function createMenuHandlers(ctx) {
  const { file, document, workspace, session, settings, getFileName, createWorkspaceFile, toggleSidebar, openFind } =
    ctx

  return {
    newFile: () => file.newFile(),
    newWindow: () => file.newWindow(),
    openFile: () => file.openFile(),
    openFolder: () => file.openFolder(),
    openRecent: (project) => file.openRecent(project),
    revealInFileManager: () => file.revealInFileManager(),
    duplicateFile: () => file.duplicateFile(),
    newFileInFolder: () => createWorkspaceFile(),
    closeFolder: () => file.closeFolder(),
    saveFile: () => file.saveFile(),
    saveAs: () => file.saveAs(),
    exportDocx: () => exportDocx(document.content, getFileName()),
    exportPdf: () => exportPdf(document.content, getFileName()),
    print: () => printDocument(getFileName() ?? 'Document'),
    closeTab: () => file.closeTab(),
    goHome: () => file.goHome(),
    closeAll: () => file.closeAll(),
    toggleSidebar,
    toggleOutline: () => workspace.toggleOutline(),
    toggleFocusMode: () => session.toggleFocusMode(),
    toggleTypewriterScroll: () => session.toggleTypewriterScroll(),
    toggleTheme: () => settings.toggleTheme(),
    toggleSettings: () => {
      if (workspace.showSettings) workspace.closeSettings()
      else workspace.openSettings()
    },
    openFind,
    undo: () => getEditorCommands()?.undo(),
    redo: () => getEditorCommands()?.redo(),
  }
}

/**
 * @param {ReturnType<typeof createMenuHandlers>} handlers
 * @param {{
 *   revealTargetPath: () => string | null | undefined,
 *   document: import('../modules/document/document.svelte.ts').typeof document,
 *   workspace: import('../modules/workspace/workspace.svelte.ts').typeof workspace,
 * }} ctx
 */
export function menuSyncState(ctx) {
  const { revealTargetPath, document, workspace } = ctx
  return {
    canReveal: !!revealTargetPath(),
    canDuplicate: !!(
      document.filePath &&
      !isUntitled(document.filePath) &&
      !document.isPreview
    ),
    canNewFileInFolder: !!workspace.folderPath,
    canCloseFolder: !!workspace.folderPath,
  }
}
