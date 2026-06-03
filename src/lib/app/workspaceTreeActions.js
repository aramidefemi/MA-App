import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { readTextFile } from '@tauri-apps/plugin-fs'
import {
  createFolderInWorkspace,
  createMarkdownInFolder,
  duplicateWorkspaceFile,
  moveEntryToFolder,
  renameEntry,
} from '../workspaceFiles.js'
import { copyText } from '../clipboard.js'
import { confirmAction } from '../nativeDialog.js'
import { displayFileName } from '../fileDisplay.js'
import { restoreFromTrash, trashEntry } from '../workspaceTrash.js'

/** @param {string} newName @param {string} diskName @param {boolean} isDir */
export function resolveRenameName(newName, diskName, isDir) {
  if (isDir) return newName.trim()
  const trimmed = newName.trim()
  if (!trimmed) return trimmed
  if (trimmed.includes('.')) return trimmed
  const dot = diskName.lastIndexOf('.')
  return dot > 0 ? `${trimmed}${diskName.slice(dot)}` : `${trimmed}.md`
}

function logWorkspaceError(label, e) {
  console.error(`${label}:`, e)
}

/**
 * @param {{
 *   workspace: import('../modules/workspace/workspace.svelte.ts').typeof workspace,
 *   document: import('../modules/document/document.svelte.ts').typeof document,
 *   refreshFileTree: () => void,
 *   collapseFileTree: () => void,
 *   openFileFromTree: (path: string) => Promise<void>,
 *   refreshTrashState?: () => void | Promise<void>,
 * }} deps
 */
export function createWorkspaceTreeActions(deps) {
  const {
    workspace,
    document,
    refreshFileTree,
    collapseFileTree,
    openFileFromTree,
    refreshTrashState,
  } = deps

  async function createFileInFolder(folderPath) {
    if (!folderPath) return
    try {
      const path = await createMarkdownInFolder(folderPath)
      refreshFileTree()
      await openFileFromTree(path)
    } catch (e) {
      logWorkspaceError('New file in folder failed', e)
    }
  }

  async function createFolderIn(folderPath) {
    if (!folderPath) return
    try {
      await createFolderInWorkspace(folderPath)
      refreshFileTree()
    } catch (e) {
      logWorkspaceError('New folder failed', e)
    }
  }

  async function move(fromPath, toFolderPath) {
    const root = workspace.folderPath
    if (!root) return
    try {
      const newPath = await moveEntryToFolder(fromPath, toFolderPath, root)
      document.retargetFilePath(fromPath, newPath)
      refreshFileTree()
    } catch (e) {
      logWorkspaceError('Move failed', e)
    }
  }

  async function rename(path, newName, entry) {
    const root = workspace.folderPath
    if (!root) return
    const finalName = resolveRenameName(newName, entry.name, entry.isDir)
    try {
      const newPath = await renameEntry(path, finalName, root, { isDir: entry.isDir })
      document.retargetFilePath(path, newPath)
      refreshFileTree()
    } catch (e) {
      logWorkspaceError('Rename failed', e)
    }
  }

  async function removeTargets(targets) {
    const root = workspace.folderPath
    if (!root || !targets.length) return

    const label =
      targets.length === 1
        ? targets[0].isDir
          ? `folder “${targets[0].name}”`
          : `“${displayFileName(targets[0].name)}”`
        : `${targets.length} items`

    if (
      !(await confirmAction(`Move ${label} to Trash? You can undo from the sidebar menu.`, {
        title: 'Move to Trash',
      }))
    ) {
      return
    }

    try {
      for (const entry of targets) {
        await trashEntry(entry.path, root, { isDir: entry.isDir })
        document.clearIfRemoved(entry.path)
      }
      refreshFileTree()
      await refreshTrashState?.()
    } catch (e) {
      logWorkspaceError('Delete failed', e)
    }
  }

  async function copyPath(paths) {
    try {
      await copyText(paths.join('\n'))
    } catch (e) {
      logWorkspaceError('Copy path failed', e)
    }
  }

  async function copyFile(path) {
    try {
      const text = await readTextFile(path)
      await copyText(text)
    } catch (e) {
      logWorkspaceError('Copy file failed', e)
    }
  }

  async function undoDelete() {
    const root = workspace.folderPath
    if (!root) return
    try {
      const { restoredPath, isDir } = await restoreFromTrash(root)
      refreshFileTree()
      await refreshTrashState?.()
      if (!isDir) await openFileFromTree(restoredPath)
    } catch (e) {
      logWorkspaceError('Undo delete failed', e)
    }
  }

  async function duplicate(path) {
    try {
      const newPath = await duplicateWorkspaceFile(path)
      refreshFileTree()
      await openFileFromTree(newPath)
    } catch (e) {
      logWorkspaceError('Duplicate failed', e)
    }
  }

  async function reveal(path) {
    await revealItemInDir(path)
  }

  return {
    createFileInFolder,
    createFolderIn,
    move,
    rename,
    remove: removeTargets,
    copyPath,
    copyFile,
    undoDelete,
    duplicate,
    reveal,
    collapseFileTree,
  }
}
