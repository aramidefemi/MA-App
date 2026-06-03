# ADR — Editor Customization Path (Crepe-first)

**Date:** 2026-06-02  
**Status:** Accepted

## Context

The editor layer was mid-migration: Milkdown **Crepe** is the production shell, but a parallel set of custom Milkdown kit integrations (slash menu, format bubble, commonmark/cursor/indent/trailing/upload plugins) was built and never wired. Placeholder text promised slash commands that did not exist.

## Decision

**Option A — Crepe-first.** Keep Crepe built-in toolbar, placeholder, image upload, commonmark, and cursor behavior. Retain only custom plugins that Crepe does not provide.

## Retained custom plugins

| Plugin | Why kept |
|--------|----------|
| `wikilinkIntegration.js` | `[[note]]` navigation — app-specific |
| `focusIntegration.js` | Focus sentence mode — app-specific |
| `typewriterScroll.js` | Typewriter scroll — app-specific |
| `driftHighlightIntegration.js` | AI Draft issue decorations — app-specific |
| `tauriImageDrop.js` | OS drag-drop in Tauri bypasses HTML5 dataTransfer |
| `crepeConfig.js` research toolbar item | Custom AI research via Crepe Toolbar API |

## Deleted files

- `src/lib/editor/slashIntegration.js`
- `src/lib/editor/formatBubble.js`
- `src/lib/editor/formatEditorApi.js`
- `src/lib/editor/formatState.js`
- `src/lib/editor/commonmarkIntegration.js`
- `src/lib/editor/cursorIntegration.js`
- `src/lib/editor/indentIntegration.js`
- `src/lib/editor/trailingIntegration.js`
- `src/lib/editor/uploadIntegration.js` (Crepe `ImageBlock.onUpload` covers browser upload; `insertImagesAt` moved to `imageInsert.js` for Tauri drops)
- `src/lib/components/SlashMenu.svelte`
- `src/lib/components/FormatBubbleToolbar.svelte`

## Crepe feature map

| Crepe feature | Setting | App dependency |
|---------------|---------|----------------|
| AI | `false` | Custom research via Toolbar buildToolbar |
| TopBar | `false` | App has `EditorTopbar` |
| Toolbar | default on | Bold, italic, link, headings |
| Placeholder | custom text | Honest copy — no slash promise |
| ImageBlock | `onUpload` wired | Toolbar + paste upload |
| CodeBlock, List, Blockquote, etc. | default on | Standard markdown editing |

## Consequences

- ~1,200 lines removed; smaller bundle (dropped `@milkdown/plugin-tooltip`, `@milkdown/plugin-upload`)
- Formatting UX is Crepe's floating toolbar — no custom Svelte bubble
- Slash commands remain V2 roadmap item (see `.agent/ARCHITECTURE.md`)
- New ProseMirror plugins register in `src/lib/editor/editorPlugins.js`
