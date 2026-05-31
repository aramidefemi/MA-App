export const STORE_FILE = 'ma.json'
export const SESSION_KEY = 'session'

export type SessionState = {
  filePath: string | null
  scrollTop: number
  showSidebar: boolean
  showOutline: boolean
  showResearch: boolean
  folderPath: string | null
}

export const DEFAULT_SESSION: SessionState = {
  filePath: null,
  scrollTop: 0,
  showSidebar: false,
  showOutline: false,
  showResearch: false,
  folderPath: null,
}

export function parseSession(raw: unknown): SessionState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    filePath: typeof o.filePath === 'string' ? o.filePath : null,
    scrollTop: typeof o.scrollTop === 'number' && o.scrollTop >= 0 ? o.scrollTop : 0,
    showSidebar: o.showSidebar === true,
    showOutline: o.showOutline === true,
    showResearch: o.showResearch === true,
    folderPath: typeof o.folderPath === 'string' ? o.folderPath : null,
  }
}

export function buildSessionSnapshot(input: {
  filePath: string | null
  scrollTop: number
  showSidebar: boolean
  showOutline: boolean
  showResearch: boolean
  folderPath: string | null
}): SessionState {
  return {
    filePath: input.filePath,
    scrollTop: Math.max(0, input.scrollTop),
    showSidebar: input.showSidebar,
    showOutline: input.showOutline,
    showResearch: input.showResearch,
    folderPath: input.folderPath,
  }
}
