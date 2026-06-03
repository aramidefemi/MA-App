import { getKey, setKey } from './modules/persistence/store.js'

const RECENT_KEY = 'recentProjects'
export const MAX_ENTRIES = 10

/** @typedef {{ type: 'file' | 'folder', path: string, name: string, openedAt: number }} RecentProject */

export async function loadRecentProjects() {
  const list = await getKey(RECENT_KEY, [])
  return Array.isArray(list) ? list : []
}

/** @param {Omit<RecentProject, 'openedAt'>} entry */
export async function addRecentProject(entry) {
  const list = await loadRecentProjects()
  const next = [
    { ...entry, openedAt: Date.now() },
    ...list.filter((p) => p.path !== entry.path),
  ].slice(0, MAX_ENTRIES)

  await setKey(RECENT_KEY, next)
  return next
}

export function projectName(path) {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}
