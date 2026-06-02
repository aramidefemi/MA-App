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
  monospace: "'Fira Code', Menlo, Monaco, 'Courier New', Courier, monospace",
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  sans: "'Open Sans', Arial, Helvetica, sans-serif",
}

/** Crepe font roles per user writing-font preference */
export const CREPE_FONT_PROFILES: Record<
  FontChoice,
  { default: string; title: string }
> = {
  monospace: {
    default: FONT_FAMILIES.monospace,
    title: FONT_FAMILIES.monospace,
  },
  serif: {
    default: FONT_FAMILIES.serif,
    title: FONT_FAMILIES.serif,
  },
  sans: {
    default: FONT_FAMILIES.sans,
    title: "Georgia, Cambria, 'Times New Roman', Times, serif",
  },
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
  const fonts = CREPE_FONT_PROFILES[state.fontFamily]
  html.style.setProperty('--crepe-font-default', fonts.default)
  html.style.setProperty('--crepe-font-title', fonts.title)
  html.style.setProperty('--font-prose', fonts.default)
  html.style.setProperty('--font-ui', fonts.default)
}
