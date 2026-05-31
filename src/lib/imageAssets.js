import { convertFileSrc } from '@tauri-apps/api/core'
import { dirname, join } from '@tauri-apps/api/path'
import { exists, mkdir, writeFile } from '@tauri-apps/plugin-fs'

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif',
])

const UNTITLED_PATH = 'untitled.md'

/** @param {File} file */
export function isImageFile(file) {
  if (file.type?.startsWith('image/')) return true
  const ext = file.name.split('.').pop()?.toLowerCase()
  return !!ext && IMAGE_EXTENSIONS.has(ext)
}

/** @param {string | null | undefined} documentPath */
export function canAttachImages(documentPath) {
  return !!documentPath && documentPath !== UNTITLED_PATH
}

/** @param {string} name */
export function altFromFileName(name) {
  const base = name.replace(/\.[^.]+$/, '')
  return base.replace(/[-_]+/g, ' ').trim() || 'image'
}

/** @param {string} fromDir @param {string} toPath */
export function relativePath(fromDir, toPath) {
  const norm = (p) => p.replace(/\\/g, '/').replace(/\/+$/, '')
  const from = norm(fromDir).split('/').filter(Boolean)
  const to = norm(toPath).split('/').filter(Boolean)

  while (from.length && to.length && from[0] === to[0]) {
    from.shift()
    to.shift()
  }

  const prefix = from.length ? '../'.repeat(from.length) : './'
  return `${prefix}${to.join('/')}`
}

/** @param {string} path */
export function toMarkdownPath(path) {
  return path.replace(/\\/g, '/')
}

/** @param {string} dir @param {string} name */
async function uniqueName(dir, name) {
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''

  let candidate = name
  for (let i = 1; i < 1000; i += 1) {
    if (!(await exists(await join(dir, candidate)))) return candidate
    candidate = `${stem}-${i}${ext}`
  }
  return `${stem}-${Date.now()}${ext}`
}

/** @param {string} documentPath @param {string} imageAbsolutePath */
export async function markdownImagePath(documentPath, imageAbsolutePath) {
  const docDir = await dirname(documentPath)
  return toMarkdownPath(relativePath(docDir, imageAbsolutePath))
}

/** @param {string | null | undefined} documentPath @param {string} src */
export async function resolveImageDisplaySrc(documentPath, src) {
  if (!src || /^(https?:|data:|asset:|blob:)/.test(src)) return src
  if (!canAttachImages(documentPath)) return src

  const docDir = await dirname(documentPath)
  const absolute = src.startsWith('/') || /^[A-Za-z]:\\/.test(src)
    ? src
    : await join(docDir, src.replace(/^\.\//, ''))

  return convertFileSrc(absolute)
}

/**
 * Save a dropped image next to the document in an `assets/` folder.
 * @param {File} file
 * @param {string} documentPath
 * @returns {Promise<{ markdownPath: string, alt: string }>}
 */
export async function saveDroppedImage(file, documentPath) {
  const assetsDir = await join(await dirname(documentPath), 'assets')
  await mkdir(assetsDir, { recursive: true })

  const fileName = await uniqueName(assetsDir, file.name)
  const absolutePath = await join(assetsDir, fileName)
  const bytes = new Uint8Array(await file.arrayBuffer())

  await writeFile(absolutePath, bytes)

  return {
    markdownPath: await markdownImagePath(documentPath, absolutePath),
    alt: altFromFileName(fileName),
  }
}
