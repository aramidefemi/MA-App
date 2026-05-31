# Settings Panel Spec

## Overview

A centered overlay modal for app preferences, opened from the topbar ⚙ icon or `⌘,`. Replaces the current full-page `Settings.svelte` overlay inside the editor column.

## Entry Points

| Trigger | Action |
|---------|--------|
| Topbar ⚙ icon (right side) | `workspace.openSettings()` |
| Sidebar meta-bar ⚙ (existing) | `workspace.openSettings()` |
| `⌘,` | Toggle settings open/close globally |
| `Esc` | Close if open (existing handler in `App.svelte`) |

## Overlay Structure

```
┌─────────────────────────────────────────────┐
│  backdrop (fixed inset:0, semi-transparent) │  ← click closes
│                                             │
│         ┌─────────────────────┐             │
│         │  settings      ✕    │             │  ← centered modal
│         │─────────────────────│             │
│         │  WRITING            │             │
│         │  …options…          │             │
│         │                     │             │
│         │  APPEARANCE         │             │
│         │  …options…          │             │
│         │                     │             │
│         │  AI                 │             │
│         │  …options…          │             │
│         │                     │             │
│         │  ACCOUNT            │             │
│         │  …options…          │             │
│         └─────────────────────┘             │
└─────────────────────────────────────────────┘
```

- **Backdrop**: `position: fixed; inset: 0; z-index: 50` — same dismiss-on-click pattern as `OutlinePanel.svelte`.
- **Panel**: centered (`top: 50%; left: 50%; transform: translate(-50%, -50%)`), max-width ~480px, max-height ~80vh, scrollable body.
- **Click inside panel**: does not close (`stopPropagation` on panel).
- **Esc**: closes via global keydown in `App.svelte`.
- **Rendered at app root** (not inside `editor-wrap`) so settings work on welcome screen and editor.

## Sections (not tabs)

Vertical stack of labeled sections. Max 6 options per section.

### Writing (2 options)

| Option | Type | Storage | Notes |
|--------|------|---------|-------|
| Typewriter scrolling | Toggle | `session` key in `ma.json` via `persistSession()` | Existing `session.typewriterScroll`; shortcut `⌘⇧T` |
| Font | Segmented (3) | `settings.fontFamily` in `ma.json` | `monospace` \| `serif` \| `sans`; applies `--font-prose` on `<html>` |

### Appearance (1 option)

| Option | Type | Storage | Notes |
|--------|------|---------|-------|
| Theme | Segmented Light/Dark | `settings.theme` in `ma.json` | Toggle via panel or `⌘⇧L`; sets `data-theme="light"` on `<html>`; default dark (no attribute) |

### AI (1 option)

| Option | Type | Storage | Notes |
|--------|------|---------|-------|
| NVIDIA API key | Password input + clear | Supabase RPC (`keys.js`) | Moved from `KeySetup.svelte`; masked input, clear button |

### Account (2 placeholders)

| Option | Type | Status |
|--------|------|--------|
| Connect Google Drive | Button | Coming soon (disabled) |
| Sign in with Supabase | Button | Coming soon (disabled) |

## Persistence (tauri-plugin-store)

Same store file as session memory:

```ts
// src/lib/modules/session/session.ts
export const STORE_FILE = 'ma.json'
```

New key alongside `session`:

```ts
// src/lib/modules/settings/settings.ts
export const SETTINGS_KEY = 'settings'

export type SettingsState = {
  theme: 'light' | 'dark'
  fontFamily: 'monospace' | 'serif' | 'sans'
}
```

Pattern mirrors `session.svelte.ts`:
1. `load(STORE_FILE)` → `store.get(SETTINGS_KEY)` → `parseSettings(raw)`
2. On change → `store.set(SETTINGS_KEY, snapshot())` → `store.save()`
3. Init in `main.js` via `initSettings(isMainWindow)` before app mount
4. Apply to DOM immediately on load and on every change

## Theme System

### CSS tokens (`src/app.css`)

Dark tokens remain on `:root` (default). Light overrides on `[data-theme="light"]`:

| Token | Dark (default) | Light |
|-------|----------------|-------|
| `--bg` | `#0f0f0f` | `#f5f5f5` |
| `--surface` | `#161616` | `#ffffff` |
| `--border` | `#1f1f1f` | `#e0e0e0` |
| `--text` | `#c8c8c8` | `#3a3a3a` |
| `--text-dim` | `#555` | `#888` |
| `--text-heading` | `#f0f0f0` | `#1a1a1a` |
| `--accent` | `#4ade80` | `#16a34a` |
| `--accent-dim` | `rgba(74,222,128,0.15)` | `rgba(22,163,74,0.12)` |
| `--danger` | `#f87171` | `#dc2626` |
| `--text-muted` | `#aaa` | `#666` |

Scrollbar thumb and milkdown `h3`/`em` use `--text-muted` instead of hardcoded `#aaa`.

### Application

```js
// dark (default)
document.documentElement.removeAttribute('data-theme')

// light
document.documentElement.setAttribute('data-theme', 'light')
```

No transition animation in V1. `⌘⇧L` toggles instantly.

## Font Application

```js
const FONT_FAMILIES = {
  monospace: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
  serif: "'Georgia', 'Cambria', 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
}
document.documentElement.style.setProperty('--font-prose', FONT_FAMILIES[choice])
```

Editor prose (`.milkdown .ProseMirror`) already uses `var(--font-prose)`.

## Topbar Integration

Add ⚙ button to `.topbar-actions` (right side, alongside save indicator):

```svelte
<button class="topbar-btn" onclick={() => workspace.openSettings()} aria-label="Settings" title="Settings (⌘,)">
  <!-- gear SVG -->
</button>
```

Visible when topbar is visible (editor mode only; welcome screen uses keyboard shortcut).

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘,` | Open/close settings |
| `⌘⇧L` | Toggle light/dark theme |
| `⌘⇧T` | Toggle typewriter scroll (existing) |
| `Esc` | Close settings if open (existing) |

## Svelte 5 Conventions

Follow existing project patterns:
- `$props()` for component inputs (`onClose`)
- `$state` / `$derived` in `.svelte.ts` modules
- `onclick` handlers (not `on:click`)
- Scoped `<style>` with CSS variables
- Pure parse/build functions in `.ts` sibling files

## Files

| File | Purpose |
|------|---------|
| `docs/settings-panel-spec.md` | This spec |
| `src/lib/modules/settings/settings.ts` | Types, parse, build, font map |
| `src/lib/modules/settings/settings.svelte.ts` | Reactive store + persistence |
| `src/lib/modules/settings/index.ts` | Public exports |
| `src/lib/components/SettingsPanel.svelte` | Modal UI |
| `src/app.css` | Light theme tokens |
| `src/main.js` | Init settings on boot |
| `src/App.svelte` | Topbar icon, shortcuts, overlay mount |

Remove/replace `src/lib/components/Settings.svelte` (superseded by `SettingsPanel.svelte`).

## Out of Scope (V1)

- Theme transition animations
- Google Drive / Supabase sign-in (placeholders only)
- Tabbed settings navigation
- Moving typewriter preference out of session store
