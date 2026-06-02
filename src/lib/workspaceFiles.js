import { exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs'

function joinPath(parent, name) {
  const separator = parent.includes('\\') && !parent.includes('/') ? '\\' : '/'
  return parent.endsWith('/') || parent.endsWith('\\')
    ? `${parent}${name}`
    : `${parent}${separator}${name}`
}

async function uniquePath(folderPath, baseName, isDir = false) {
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
