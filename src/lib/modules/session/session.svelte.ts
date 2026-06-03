import { exists } from '@tauri-apps/plugin-fs'
import { document, isUntitled } from '../document'
import { isPreviewFile } from '../../workspaceFileTypes.js'
import { workspace } from '../workspace'
import { research } from '../research'
import { getKey, setKey } from '../persistence/store.js'
import {
  SESSION_KEY,
  DEFAULT_SESSION,
  parseSession,
  buildSessionSnapshot,
  type SessionState,
} from './session'

let scrollTop = $state(0)
let typewriterScroll = $state(true)
let focusMode = $state(false)
let ready = $state(false)
let restoring = false
let persistEnabled = false
/** @type {ReturnType<typeof setTimeout> | null} */
let persistTimer = null

export function snapshot(): SessionState {
  return buildSessionSnapshot({
    filePath: document.filePath,
    scrollTop,
    typewriterScroll,
    focusMode,
    showSidebar: workspace.showSidebar,
    showOutline: workspace.showOutline,
    showResearch: research.showResearch,
    folderPath: workspace.folderPath,
  })
}

async function readStoredSession(): Promise<SessionState | null> {
  try {
    return parseSession(await getKey(SESSION_KEY, null))
  } catch {
    return null
  }
}

async function writeSession(state: SessionState): Promise<void> {
  try {
    await setKey(SESSION_KEY, state)
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
  const resolved = {
    ...DEFAULT_SESSION,
    showOutline: raw.showOutline,
    showResearch: raw.showResearch,
    typewriterScroll: raw.typewriterScroll,
    focusMode: raw.focusMode,
  }

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
  if (state.filePath) {
    const name = state.filePath.split(/[/\\]/).pop() ?? state.filePath
    if (isPreviewFile(name)) await document.openPreviewAt(state.filePath)
    else await document.loadFileAt(state.filePath)
  }
  workspace.restorePanels(state.showOutline)
  research.restorePanel(state.showResearch)
  scrollTop = state.scrollTop
  typewriterScroll = state.typewriterScroll
  focusMode = state.focusMode
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

function setTypewriterScroll(value: boolean) {
  typewriterScroll = value
}

function toggleTypewriterScroll() {
  typewriterScroll = !typewriterScroll
}

function setFocusMode(value: boolean) {
  focusMode = value
}

function toggleFocusMode() {
  focusMode = !focusMode
}

export function persistSession(): void {
  if (!ready || restoring || !persistEnabled) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void writeSession(snapshot())
  }, 500)
}

export const session = {
  get scrollTop() { return scrollTop },
  get typewriterScroll() { return typewriterScroll },
  get focusMode() { return focusMode },
  get ready() { return ready },
  setScrollTop,
  setTypewriterScroll,
  toggleTypewriterScroll,
  setFocusMode,
  toggleFocusMode,
  initSession,
}
