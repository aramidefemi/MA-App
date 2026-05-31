import { load } from '@tauri-apps/plugin-store'
import { STORE_FILE } from '../session/session.ts'
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
    const store = await load(STORE_FILE)
    return parseSettings(await store.get(SETTINGS_KEY))
  } catch {
    return null
  }
}

async function writeSettings(state: SettingsState): Promise<void> {
  try {
    const store = await load(STORE_FILE)
    await store.set(SETTINGS_KEY, state)
    await store.save()
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
