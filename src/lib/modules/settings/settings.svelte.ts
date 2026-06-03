import { getKey, setKey, STORE_FILE } from '../persistence/store.js'
import {
  SETTINGS_KEY,
  DEFAULT_SETTINGS,
  parseSettings,
  buildSettingsSnapshot,
  applySettingsToDom,
  type SettingsState,
  type Theme,
  type FontChoice,
} from './settings.ts'

export { STORE_FILE }

let theme = $state<Theme>('dark')
let fontFamily = $state<FontChoice>('serif')
let ready = $state(false)
let restoring = false
let persistEnabled = false

function snapshot(): SettingsState {
  return buildSettingsSnapshot({ theme, fontFamily })
}

async function readStoredSettings(): Promise<SettingsState | null> {
  try {
    return parseSettings(await getKey(SETTINGS_KEY, null))
  } catch {
    return null
  }
}

async function writeSettings(state: SettingsState): Promise<void> {
  try {
    await setKey(SETTINGS_KEY, state)
  } catch {
    // fail silently
  }
}

function applyCurrent(): void {
  applySettingsToDom({ theme, fontFamily })
}

export async function initSettings(shouldPersist: boolean): Promise<void> {
  persistEnabled = shouldPersist
  restoring = true
  try {
    const stored = await readStoredSettings()
    if (stored) {
      theme = stored.theme
      fontFamily = stored.fontFamily
    }
    applyCurrent()
  } catch {
    applyCurrent()
  } finally {
    restoring = false
    ready = true
  }
}

export function persistSettings(): void {
  if (!ready || restoring || !persistEnabled) return
  void writeSettings(snapshot())
}

function setTheme(value: Theme): void {
  theme = value
  applyCurrent()
  persistSettings()
}

function toggleTheme(): void {
  setTheme(theme === 'light' ? 'dark' : 'light')
}

function setFontFamily(value: FontChoice): void {
  fontFamily = value
  applyCurrent()
  persistSettings()
}

export const settings = {
  get theme() {
    return theme
  },
  get fontFamily() {
    return fontFamily
  },
  get ready() {
    return ready
  },
  setTheme,
  toggleTheme,
  setFontFamily,
  initSettings,
}
