import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

const STORE_FILE = 'recent-projects.json'
const MAX_ENTRIES = 10

/** @typedef {{ type: 'file' | 'folder', path: string, name: string, openedAt: number }} RecentProject */

export async function loadRecentProjects() {
  try {
    if (!(await exists(STORE_FILE, { baseDir: BaseDirectory.AppData }))) return []
    const raw = await readTextFile(STORE_FILE, { baseDir: BaseDirectory.AppData })
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** @param {Omit<RecentProject, 'openedAt'>} entry */
export async function addRecentProject(entry) {
  const list = await loadRecentProjects()
  const next = [
    { ...entry, openedAt: Date.now() },
    ...list.filter((p) => p.path !== entry.path),
  ].slice(0, MAX_ENTRIES)

  await ensureAppDataDir()
  await writeTextFile(STORE_FILE, JSON.stringify(next), {
    baseDir: BaseDirectory.AppData,
  })
  return next
}

async function ensureAppDataDir() {
  try {
    await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
  } catch {
    // directory already exists
  }
}

export function projectName(path) {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}
