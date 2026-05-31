import { load } from '@tauri-apps/plugin-store'
import { exists } from '@tauri-apps/plugin-fs'
import { document, isUntitled } from '../document'
import { workspace } from '../workspace'
import { research } from '../research'
import {
  STORE_FILE,
  SESSION_KEY,
  DEFAULT_SESSION,
  parseSession,
  buildSessionSnapshot,
  type SessionState,
} from './session'

let scrollTop = $state(0)
let ready = $state(false)
let restoring = false
let persistEnabled = false

export function snapshot(): SessionState {
  return buildSessionSnapshot({
    filePath: document.filePath,
    scrollTop,
    showSidebar: workspace.showSidebar,
    showOutline: workspace.showOutline,
    showResearch: research.showResearch,
    folderPath: workspace.folderPath,
  })
}

async function readStoredSession(): Promise<SessionState | null> {
  try {
    const store = await load(STORE_FILE)
    return parseSession(await store.get(SESSION_KEY))
  } catch {
    return null
  }
}

async function writeSession(state: SessionState): Promise<void> {
  try {
    const store = await load(STORE_FILE)
    await store.set(SESSION_KEY, state)
    await store.save()
  } catch {
    // fail silently
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    return await exists(path)
  } catch {
    return false
  }
}

async function resolveForRestore(raw: SessionState): Promise<SessionState> {
  const resolved = { ...DEFAULT_SESSION, showOutline: raw.showOutline, showResearch: raw.showResearch }

  if (raw.folderPath && (await pathExists(raw.folderPath))) {
    resolved.folderPath = raw.folderPath
    resolved.showSidebar = raw.showSidebar
  }

  if (
    raw.filePath &&
    !isUntitled(raw.filePath) &&
    (await pathExists(raw.filePath))
  ) {
    resolved.filePath = raw.filePath
    resolved.scrollTop = raw.scrollTop
  }

  return resolved
}

async function applySession(state: SessionState): Promise<void> {
  if (state.folderPath) workspace.restoreFolder(state.folderPath, state.showSidebar)
  if (state.filePath) await document.loadFileAt(state.filePath)
  workspace.restorePanels(state.showOutline)
  research.restorePanel(state.showResearch)
  scrollTop = state.scrollTop
}

export async function initSession(shouldPersist: boolean): Promise<void> {
  persistEnabled = shouldPersist
  restoring = true
  try {
    const stored = await readStoredSession()
    if (stored) await applySession(await resolveForRestore(stored))
  } catch {
    // fail silently
  } finally {
    restoring = false
    ready = true
  }
}

function setScrollTop(value: number) {
  scrollTop = Math.max(0, value)
}

export function persistSession(): void {
  if (!ready || restoring || !persistEnabled) return
  void writeSession(snapshot())
}

export const session = {
  get scrollTop() { return scrollTop },
  get ready() { return ready },
  setScrollTop,
  initSession,
}
