import { dirname, basename, join } from '@tauri-apps/api/path'
import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
  rename,
  remove,
  stat,
} from '@tauri-apps/plugin-fs'
import { isWriterSourceFile } from './workspaceFileTypes.js'
import {
  assertInsideRoot,
  isDescendantOrSelf,
  isPathInsideRoot,
  joinPath,
  normalizePath,
} from './pathUtils.js'

export {
  assertInsideRoot,
  fileName,
  isDescendantOrSelf,
  isPathInsideRoot,
  joinPath,
  normalizePath,
  parentDir,
} from './pathUtils.js'

export async function uniquePath(folderPath, baseName, isDir = false) {
  let candidate = joinPath(folderPath, baseName)
  if (!(await exists(candidate))) return candidate

  const dot = baseName.lastIndexOf('.')
  const stem = dot > 0 && !isDir ? baseName.slice(0, dot) : baseName
  const ext = dot > 0 && !isDir ? baseName.slice(dot) : ''

  for (let n = 1; n < 1000; n++) {
    const nextName = isDir ? `${baseName} ${n}` : `${stem} ${n}${ext}`
    candidate = joinPath(folderPath, nextName)
    if (!(await exists(candidate))) return candidate
  }

  return joinPath(folderPath, `${stem}-${Date.now()}${ext}`)
}

/** @param {string} sourcePath */
export async function duplicateFilePath(sourcePath) {
  const dir = await dirname(sourcePath)
  const name = await basename(sourcePath)
  const dot = name.lastIndexOf('.')
  const copyName = dot > 0 ? `${name.slice(0, dot)}-copy${name.slice(dot)}` : `${name}-copy`
  return uniquePath(dir, copyName)
}

/** @param {string} sourcePath @param {string} [content] @returns {Promise<string>} */
export async function duplicateWorkspaceFile(sourcePath, content) {
  const newPath = await duplicateFilePath(sourcePath)
  await writeTextFile(newPath, content ?? (await readTextFile(sourcePath)))
  return newPath
}

/** @param {string} folderPath */
export async function createMarkdownInFolder(folderPath) {
  const path = await uniquePath(folderPath, 'untitled.md')
  await writeTextFile(path, '')
  return path
}

/** @param {string} folderPath */
export async function createFolderInWorkspace(folderPath) {
  const path = await uniquePath(folderPath, 'New Folder', true)
  await mkdir(path, { recursive: true })
  return path
}

/** @param {string} text */
export function slugifyNoteName(text) {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || 'note'
}

/** @param {string} context @param {string} response */
export function formatAiNoteContent(context, response) {
  const ctx = context.trim()
  const body = response.trim()
  if (!ctx) return `${body}\n`
  return `## context\n\n${ctx}\n\n---\n\n${body}\n`
}

/** @param {string} folderPath @param {string} context @param {string} response */
export async function saveAiNoteInFolder(folderPath, context, response) {
  const path = await uniquePath(folderPath, `${slugifyNoteName(context)}.md`)
  await writeTextFile(path, formatAiNoteContent(context, response))
  return path
}

/** @param {string} fromPath @param {string} destFolderPath @param {string} rootPath */
export async function moveEntryToFolder(fromPath, destFolderPath, rootPath) {
  assertInsideRoot(rootPath, fromPath, 'Source')
  assertInsideRoot(rootPath, destFolderPath, 'Destination')

  const { isDirectory: isDir } = await stat(fromPath)
  if (isDir && isDescendantOrSelf(fromPath, destFolderPath)) {
    throw new Error('Cannot move a folder into itself or a descendant')
  }

  const name = await basename(fromPath)
  let destPath = await join(destFolderPath, name)
  if (await exists(destPath)) destPath = await uniquePath(destFolderPath, name, isDir)

  await rename(fromPath, destPath)
  return destPath
}

/**
 * @param {string} entryPath
 * @param {string} newName
 * @param {string} rootPath
 * @param {{ isDir: boolean }} options
 */
export async function renameEntry(entryPath, newName, rootPath, { isDir }) {
  assertInsideRoot(rootPath, entryPath)

  const trimmed = newName.trim()
  if (!trimmed || /[/\\]/.test(trimmed)) throw new Error('Invalid name')
  if (!isDir && !isWriterSourceFile(trimmed)) throw new Error('Unsupported file extension')

  const parent = await dirname(entryPath)
  const newPath = await join(parent, trimmed)
  await rename(entryPath, newPath)
  return newPath
}

/**
 * @param {string} entryPath
 * @param {string} rootPath
 * @param {{ isDir: boolean }} options
 */
export async function deleteEntry(entryPath, rootPath, { isDir }) {
  assertInsideRoot(rootPath, entryPath)
  await remove(entryPath, { recursive: isDir })
}
