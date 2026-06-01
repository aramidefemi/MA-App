import { exists } from '@tauri-apps/plugin-fs'

function joinPath(parent, name) {
  const separator = parent.includes('\\') && !parent.includes('/') ? '\\' : '/'
  return parent.endsWith('/') || parent.endsWith('\\')
    ? `${parent}${name}`
    : `${parent}${separator}${name}`
}

/** @param {string} folderPath @param {string} target */
export async function resolveWikilinkPath(folderPath, target) {
  if (!folderPath || !target?.trim()) return null
  const t = target.trim()
  const stem = t.replace(/\.(md|markdown|txt)$/i, '')
  const names = /\.(md|markdown|txt)$/i.test(t)
    ? [t]
    : [`${stem}.md`, `${stem}.markdown`, `${stem}.txt`, t]
  for (const name of names) {
    const path = joinPath(folderPath, name)
    if (await exists(path)) return path
  }
  return null
}
