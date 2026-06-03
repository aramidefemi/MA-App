import { BaseDirectory, exists, readTextFile, remove } from '@tauri-apps/plugin-fs'
import { load } from '@tauri-apps/plugin-store'

export const STORE_FILE = 'ma.json'
const LEGACY_RECENT_FILE = 'recent-projects.json'
const RECENT_KEY = 'recentProjects'

/** @type {Promise<import('@tauri-apps/plugin-store').Store> | null} */
let storePromise = null

export async function getStore() {
  if (!storePromise) storePromise = load(STORE_FILE, { autoSave: true })
  return storePromise
}

/** @template T @param {string} key @param {T} defaultValue */
export async function getKey(key, defaultValue) {
  const store = await getStore()
  const value = await store.get(key)
  return value ?? defaultValue
}

/** @param {string} key @param {unknown} value */
export async function setKey(key, value) {
  const store = await getStore()
  await store.set(key, value)
}

export async function migrateRecentProjectsIfNeeded() {
  const store = await getStore()
  const existing = await store.get(RECENT_KEY)
  if (Array.isArray(existing)) return

  try {
    if (!(await exists(LEGACY_RECENT_FILE, { baseDir: BaseDirectory.AppData }))) return
    const raw = await readTextFile(LEGACY_RECENT_FILE, { baseDir: BaseDirectory.AppData })
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return
    await store.set(RECENT_KEY, parsed)
    try {
      await remove(LEGACY_RECENT_FILE, { baseDir: BaseDirectory.AppData })
    } catch {
      // legacy file may remain; store is authoritative
    }
  } catch {
    // migration is best-effort
  }
}
