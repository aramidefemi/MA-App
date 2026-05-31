export const SETTINGS_KEY = 'settings'

export type Theme = 'light' | 'dark'
export type FontChoice = 'monospace' | 'serif' | 'sans'

export type SettingsState = {
  theme: Theme
  fontFamily: FontChoice
}

export const DEFAULT_SETTINGS: SettingsState = {
  theme: 'dark',
  fontFamily: 'serif',
}

export const FONT_FAMILIES: Record<FontChoice, string> = {
  monospace: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
  serif: "'Georgia', 'Cambria', 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
}

export function parseSettings(raw: unknown): SettingsState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const theme = o.theme === 'light' ? 'light' : 'dark'
  const font = o.fontFamily
  const fontFamily =
    font === 'monospace' || font === 'serif' || font === 'sans' ? font : DEFAULT_SETTINGS.fontFamily
  return { theme, fontFamily }
}

export function buildSettingsSnapshot(input: SettingsState): SettingsState {
  return {
    theme: input.theme === 'light' ? 'light' : 'dark',
    fontFamily:
      input.fontFamily === 'monospace' || input.fontFamily === 'serif' || input.fontFamily === 'sans'
        ? input.fontFamily
        : DEFAULT_SETTINGS.fontFamily,
  }
}

export function applySettingsToDom(state: Pick<SettingsState, 'theme' | 'fontFamily'>): void {
  const html = document.documentElement
  if (state.theme === 'light') html.setAttribute('data-theme', 'light')
  else html.removeAttribute('data-theme')
  html.style.setProperty('--font-prose', FONT_FAMILIES[state.fontFamily])
}
