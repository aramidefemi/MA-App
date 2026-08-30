import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { dirname, join } from '@tauri-apps/api/path'
import { save } from '@tauri-apps/plugin-dialog'
import { exists, rename, writeTextFile } from '@tauri-apps/plugin-fs'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import {
  formatAiNoteContent,
  renameEntry,
  saveAiNoteInFolder,
  slugifyNoteName,
} from '../workspaceFiles.js'
import { addRecentProject, loadRecentProjects, projectName } from '../recentProjects.js'
import { refreshRecentMenu } from '../appMenu.js'
import { aiLog } from '../debug/aiFlowLog.js'
import { isPathInsideRoot } from '../pathUtils.js'
import { research } from '../modules/research'
import { isUntitled } from '../modules/document'
import { resolveRenameName } from './workspaceTreeActions.js'
import { isEditableInEditor } from '../workspaceFileTypes.js'
import { invalidateWikilinkIndex, navigateWikilink } from '../wikilinkResolve.js'

/**
 * @param {{
 *   document: import('../modules/document/document.svelte.ts').typeof document,
 *   workspace: import('../modules/workspace/workspace.svelte.ts').typeof workspace,
 *   ui: import('../modules/ui/ui.svelte.ts').typeof ui,
 *   autosave: { cancel(): void },
 *   getRecentProjects: () => unknown[],
 *   setRecentProjects: (projects: unknown[]) => void,
 *   refreshFileTree: () => void,
 *   refreshTrashState: () => Promise<void>,
 * }} deps
 */
export function createFileActions(deps) {
  const {
    document,
    workspace,
    ui,
    autosave,
    setRecentProjects,
    refreshFileTree,
    refreshTrashState,
  } = deps

  async function rememberProject(type, path) {
    const projects = await addRecentProject({
      type,
      path,
      name: projectName(path),
    })
    setRecentProjects(projects)
    await refreshRecentMenu(projects)
  }

  function revealTargetPath() {
    if (document.filePath && !isUntitled(document.filePath)) return document.filePath
    return workspace.folderPath
  }

  async function revealInFileManager() {
    const path = revealTargetPath()
    if (!path) return
    await revealItemInDir(path)
  }

  async function duplicateFile() {
    await document.duplicateFile()
    const path = document.filePath
    if (path && !isUntitled(path)) await rememberProject('file', path)
    refreshFileTree()
  }

  function closeFolder() {
    workspace.closeFolder()
    ui.resetSidebar()
    ui.resetRightRail()
  }

  function resetTopbar() {
    ui.resetTopbar()
  }

  async function loadFileAt(path) {
    await document.loadFileAt(path)
    workspace.closeSettings()
    resetTopbar()
    await rememberProject('file', path)
  }

  async function loadFolderAt(path) {
    await workspace.loadFolderAt(path)
    ui.resetSidebar()
    ui.resetRightRail()
    await rememberProject('folder', path)
    await refreshTrashState()
  }

  async function openFile() {
    await document.openFile()
    workspace.closeSettings()
    resetTopbar()
    const path = document.filePath
    if (path && !isUntitled(path)) await rememberProject('file', path)
  }

  async function openFolder() {
    await workspace.openFolder()
    if (workspace.folderPath) {
      ui.resetSidebar()
      ui.resetRightRail()
      await rememberProject('folder', workspace.folderPath)
      await refreshTrashState()
    }
  }

  async function openRecent(project) {
    if (!(await exists(project.path))) return
    if (project.type === 'folder') {
      await loadFolderAt(project.path)
      return
    }
    await loadFileAt(project.path)
  }

  async function openFileFromTree(path) {
    await document.openFileFromTree(path)
    workspace.closeSettings()
    resetTopbar()
  }

  async function openWikilink(target) {
    const root = workspace.folderPath
    if (!root) return
    invalidateWikilinkIndex()
    await navigateWikilink(root, target, {
      nearPath: document.filePath,
      openFileFromTree,
      refreshFileTree,
    })
  }

  async function saveFile() {
    autosave.cancel()
    await document.saveFile()
  }

  async function saveAs() {
    await document.saveAs()
    workspace.closeSettings()
    resetTopbar()
  }

  async function nameUntitled(newName) {
    const path = document.filePath
    if (!path) return

    // Split on / or \ so we get the filename from full paths (e.g. /workspace/notes/a.md → a.md)
    const diskName = path.split(/[/\\]/).pop() ?? path
    const finalName = resolveRenameName(newName, diskName, false)
    if (!finalName || !isEditableInEditor(finalName)) return

    if (!document.hasDiskPath) {
      document.renameUntitled(newName)
      return
    }

    try {
      const root = workspace.folderPath
      let newPath
      if (root && isPathInsideRoot(root, path)) {
        newPath = await renameEntry(path, finalName, root, { isDir: false })
      } else {
        const parent = await dirname(path)
        newPath = await join(parent, finalName)
        await rename(path, newPath)
      }
      document.retargetFilePath(path, newPath)
      if (root && isPathInsideRoot(root, newPath)) refreshFileTree()
    } catch (e) {
      console.error('Rename failed:', e)
    }
  }

  function startWriting() {
    document.startWriting()
    workspace.closeSettings()
    resetTopbar()
  }

  function newFile() {
    document.newFile()
    workspace.closeSettings()
    resetTopbar()
  }

  async function newWindow() {
    const label = `window-${Date.now()}`
    new WebviewWindow(label, {
      url: '/',
      width: 1100,
      height: 760,
      minWidth: 600,
      minHeight: 400,
      titleBarStyle: 'Overlay',
      hiddenTitle: true,
      acceptFirstMouse: true,
    })
  }

  async function closeTab() {
    await document.closeTab()
    workspace.closeOutline()
    workspace.closeSettings()
    resetTopbar()
  }

  async function goHome() {
    autosave.cancel()
    await document.closeTab()
    closeFolder()
    workspace.closeOutline()
    workspace.closeSettings()
    research.close()
    resetTopbar()
  }

  async function closeAll() {
    if (document.isDirty) await saveFile()
    await getCurrentWindow().close()
  }

  async function resolveNoteDir() {
    if (workspace.folderPath) return workspace.folderPath
    if (document.filePath && !isUntitled(document.filePath)) {
      return dirname(document.filePath)
    }
    return null
  }

  async function saveResearchNote(context, response) {
    try {
      const dir = await resolveNoteDir()
      if (dir) {
        const path = await saveAiNoteInFolder(dir, context, response)
        if (workspace.folderPath) refreshFileTree()
        aiLog('handleSaveNote saved', { path })
        return
      }
      const selected = await save({
        defaultPath: `${slugifyNoteName(context)}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      })
      if (!selected) return
      await writeTextFile(selected, formatAiNoteContent(context, response))
      aiLog('handleSaveNote saved via dialog', { path: selected })
    } catch (e) {
      console.error('Save note failed:', e)
    }
  }

  async function loadRecentOnStartup() {
    const projects = await loadRecentProjects()
    setRecentProjects(projects)
    await refreshRecentMenu(projects)
    return projects
  }

  return {
    rememberProject,
    revealTargetPath,
    revealInFileManager,
    duplicateFile,
    closeFolder,
    resetTopbar,
    loadFileAt,
    loadFolderAt,
    openFile,
    openFolder,
    openRecent,
    openFileFromTree,
    openWikilink,
    saveFile,
    saveAs,
    nameUntitled,
    startWriting,
    newFile,
    newWindow,
    closeTab,
    goHome,
    closeAll,
    saveResearchNote,
    loadRecentOnStartup,
  }
}
