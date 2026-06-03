import { basename, dirname, join } from '@tauri-apps/api/path'
import { exists, mkdir, readTextFile, rename, writeTextFile } from '@tauri-apps/plugin-fs'
import { assertInsideRoot, joinPath, normalizePath } from './pathUtils.js'
import { uniquePath } from './workspaceFiles.js'

const TRASH_DIR = '.calm-trash'
const MANIFEST = 'manifest.json'

/** @typedef {{ id: string, trashPath: string, originalPath: string, isDir: boolean, deletedAt: number }} TrashItem */

/** @param {string} rootPath */
async function trashDir(rootPath) {
  return join(rootPath, TRASH_DIR)
}

/** @param {string} rootPath */
async function manifestPath(rootPath) {
  return join(await trashDir(rootPath), MANIFEST)
}

/** @param {string} rootPath @returns {Promise<TrashItem[]>} */
async function readManifest(rootPath) {
  const path = await manifestPath(rootPath)
  if (!(await exists(path))) return []
  try {
    const raw = await readTextFile(path)
    const data = JSON.parse(raw)
    return Array.isArray(data?.items) ? data.items : []
  } catch {
    return []
  }
}

/** @param {string} rootPath @param {TrashItem[]} items */
async function writeManifest(rootPath, items) {
  const dir = await trashDir(rootPath)
  if (!(await exists(dir))) await mkdir(dir, { recursive: true })
  await writeTextFile(await manifestPath(rootPath), JSON.stringify({ items }, null, 2))
}

/** @param {string} rootPath @returns {Promise<TrashItem[]>} */
export async function listTrashedItems(rootPath) {
  return readManifest(rootPath)
}

/** @param {string} rootPath */
export async function hasTrashedItems(rootPath) {
  const items = await readManifest(rootPath)
  return items.length > 0
}

/**
 * @param {string} entryPath
 * @param {string} rootPath
 * @param {{ isDir: boolean }} options
 */
export async function trashEntry(entryPath, rootPath, { isDir }) {
  assertInsideRoot(rootPath, entryPath)
  const dir = await trashDir(rootPath)
  if (!(await exists(dir))) await mkdir(dir, { recursive: true })

  const name = await basename(entryPath)
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const trashName = `${id}__${name}`
  const trashPath = joinPath(dir, trashName)

  await rename(entryPath, trashPath)

  const items = await readManifest(rootPath)
  items.push({
    id,
    trashPath: normalizePath(trashPath),
    originalPath: normalizePath(entryPath),
    isDir,
    deletedAt: Date.now(),
  })
  await writeManifest(rootPath, items)
  return id
}

/** @param {string} rootPath @param {string} [itemId] */
export async function restoreFromTrash(rootPath, itemId) {
  const items = await readManifest(rootPath)
  if (!items.length) throw new Error('Trash is empty')

  let index = itemId ? items.findIndex((i) => i.id === itemId) : 0
  if (!itemId) {
    for (let i = 1; i < items.length; i++) {
      if (items[i].deletedAt > items[index].deletedAt) index = i
    }
  }

  if (index < 0) throw new Error('Trash item not found')

  const [item] = items.splice(index, 1)
  if (!(await exists(item.trashPath))) {
    await writeManifest(rootPath, items)
    throw new Error('Trashed file no longer exists')
  }

  let dest = item.originalPath
  if (await exists(dest)) {
    const parent = await dirname(dest)
    const name = await basename(dest)
    dest = await uniquePath(parent, name, item.isDir)
  }

  assertInsideRoot(rootPath, dest, 'Restore destination')
  await rename(item.trashPath, dest)
  await writeManifest(rootPath, items)
  return { restoredPath: dest, originalPath: item.originalPath, isDir: item.isDir }
}
