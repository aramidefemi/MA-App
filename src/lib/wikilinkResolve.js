import { exists, mkdir, readDir, writeTextFile } from '@tauri-apps/plugin-fs'
import {
  assertInsideRoot,
  fileName,
  joinPath,
  normalizePath,
  parentDir,
} from './pathUtils.js'
import { isEditableInEditor } from './workspaceFileTypes.js'

/** @param {string} name */
function shouldIgnoreEntry(name) {
  return name.startsWith('.') || name === 'node_modules'
}

/** @param {string} path */
export function noteStem(path) {
  const name = fileName(path)
  return name.replace(/\.(md|markdown|txt)$/i, '').toLowerCase()
}

/** @param {string} target */
export function targetStem(target) {
  const trimmed = target.trim().replace(/\.(md|markdown|txt)$/i, '')
  const last = trimmed.split(/[/\\]/).pop() ?? trimmed
  return last.toLowerCase()
}

/** @param {string} target */
export function wikilinkTargetToFileName(target) {
  const trimmed = target.trim()
  if (!trimmed) return 'note.md'
  if (/\.(md|markdown|txt)$/i.test(trimmed)) return trimmed.replace(/\\/g, '/')
  return `${trimmed.replace(/\\/g, '/')}.md`
}

/**
 * @param {string} rootPath
 * @returns {Promise<string[]>}
 */
export async function collectEditableNotePaths(rootPath) {
  if (!rootPath) return []
  /** @type {string[]} */
  const paths = []

  /** @param {string} dir */
  async function walk(dir) {
    let entries = []
    try {
      entries = await readDir(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      if (shouldIgnoreEntry(entry.name)) continue
      const path = normalizePath(joinPath(dir, entry.name))
      if (entry.isDirectory) await walk(path)
      else if (entry.isFile && isEditableInEditor(entry.name)) paths.push(path)
    }
  }

  await walk(normalizePath(rootPath))
  return paths
}

/** @param {string[]} paths @returns {Map<string, string[]>} */
export function buildWikilinkStemIndex(paths) {
  /** @type {Map<string, string[]>} */
  const index = new Map()
  for (const path of paths) {
    const stem = noteStem(path)
    const list = index.get(stem) ?? []
    list.push(path)
    index.set(stem, list)
  }
  return index
}

/** @param {string[]} matches @param {string | null | undefined} nearPath */
export function pickWikilinkMatch(matches, nearPath) {
  if (matches.length <= 1) return matches[0] ?? null
  if (nearPath) {
    const nearDir = parentDir(normalizePath(nearPath))
    const sameDir = matches.filter((p) => parentDir(p) === nearDir)
    if (sameDir.length === 1) return sameDir[0]
    if (sameDir.length > 1) return [...sameDir].sort()[0]
  }
  return [...matches].sort((a, b) => a.length - b.length)[0]
}

let cachedRoot = /** @type {string | null} */ (null)
/** @type {Map<string, string[]> | null} */
let cachedIndex = null

export function invalidateWikilinkIndex() {
  cachedRoot = null
  cachedIndex = null
}

/** @param {string} rootPath */
export async function getWikilinkIndex(rootPath) {
  const root = normalizePath(rootPath)
  if (cachedRoot === root && cachedIndex) return cachedIndex
  const paths = await collectEditableNotePaths(root)
  cachedIndex = buildWikilinkStemIndex(paths)
  cachedRoot = root
  return cachedIndex
}

/**
 * @param {string} rootPath
 * @param {string} target
 * @param {{ nearPath?: string | null, index?: Map<string, string[]> }} [opts]
 */
export function resolveWikilinkFromIndex(rootPath, target, opts = {}) {
  if (!rootPath || !target?.trim()) return null
  const index = opts.index
  if (!index) return null

  const stem = targetStem(target)
  const matches = index.get(stem) ?? []
  return pickWikilinkMatch(matches, opts.nearPath)
}

/**
 * @param {string} rootPath
 * @param {string} target
 * @param {{ nearPath?: string | null, index?: Map<string, string[]> }} [opts]
 */
export async function resolveWikilinkPath(rootPath, target, opts = {}) {
  if (!rootPath || !target?.trim()) return null
  const root = normalizePath(rootPath)
  const t = target.trim()

  if (/[/\\]/.test(t)) {
    const rel = wikilinkTargetToFileName(t)
    const direct = normalizePath(joinPath(root, rel))
    if (await exists(direct)) return direct
  }

  const index = opts.index ?? (await getWikilinkIndex(root))
  const fromIndex = resolveWikilinkFromIndex(root, t, { ...opts, index })
  if (fromIndex) return fromIndex

  const stem = t.replace(/\.(md|markdown|txt)$/i, '')
  const names = /\.(md|markdown|txt)$/i.test(t)
    ? [t]
    : [`${stem}.md`, `${stem}.markdown`, `${stem}.txt`, t]
  for (const name of names) {
    const path = joinPath(root, name)
    if (await exists(path)) return normalizePath(path)
  }
  return null
}

/**
 * @param {string} rootPath
 * @param {string} target
 * @param {string | null | undefined} nearPath
 */
export function pathForNewWikilinkNote(rootPath, target, nearPath) {
  const root = normalizePath(rootPath)
  const rel = wikilinkTargetToFileName(target)
  if (rel.includes('/')) return normalizePath(joinPath(root, rel))

  const dir =
    nearPath && !nearPath.includes('untitled')
      ? parentDir(normalizePath(nearPath))
      : root
  return normalizePath(joinPath(dir, rel))
}

/**
 * @param {string} rootPath
 * @param {string} target
 * @param {string | null | undefined} nearPath
 */
export async function createNoteFromWikilinkTarget(rootPath, target, nearPath) {
  const path = pathForNewWikilinkNote(rootPath, target, nearPath)
  assertInsideRoot(rootPath, path)
  const dir = parentDir(path)
  if (!(await exists(dir))) await mkdir(dir, { recursive: true })
  if (!(await exists(path))) await writeTextFile(path, '')
  invalidateWikilinkIndex()
  return path
}

/**
 * @param {string} rootPath
 * @param {string} target
 * @param {{ nearPath?: string | null, openFileFromTree: (path: string) => Promise<void>, refreshFileTree?: () => void }} deps
 */
export async function navigateWikilink(rootPath, target, deps) {
  const { nearPath, openFileFromTree, refreshFileTree } = deps
  if (!rootPath || !target?.trim()) return

  let path = await resolveWikilinkPath(rootPath, target, { nearPath })
  if (!path) {
    path = await createNoteFromWikilinkTarget(rootPath, target, nearPath)
    refreshFileTree?.()
  }
  await openFileFromTree(path)
}
