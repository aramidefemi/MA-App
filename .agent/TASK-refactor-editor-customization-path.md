# Task — Pick One Editor Customization Path (Crepe vs Custom Integrations)

**Priority:** P1  
**Status:** Planned  
**Depends on:** None (decision should be recorded before deleting code)  
**Reads:** `src/lib/editor/crepeConfig.js`, `src/lib/components/Editor.svelte`, all `src/lib/editor/*Integration.js`  
**Produces:** ADR decision file, cleaned editor layer, updated placeholder/copy

---

## Problem

The editor layer is in a **mid-migration state**. Milkdown **Crepe** is the production editor shell, but a parallel set of **custom Milkdown kit integrations** was built and never wired.

### Currently wired (Editor.svelte)

| Integration | File | Purpose |
|-------------|------|---------|
| Wikilink | `wikilinkIntegration.js` | `[[note]]` navigation |
| Focus mode | `focusIntegration.js` | Dim non-focused blocks |
| Typewriter scroll | `typewriterScroll.js` | Keep cursor vertically centered |
| Drift highlight | `driftHighlightIntegration.js` | AI Draft issue decorations |
| Tauri image drop | `tauriImageDrop.js` | OS drag-drop images |
| Crepe toolbar AI | `crepeConfig.js` | Research button on selection |

### Built but NOT wired

| Integration | File | Lines | Overlaps with |
|-------------|------|-------|---------------|
| Slash menu | `slashIntegration.js` + `SlashMenu.svelte` | ~93 + ~120 | Crepe placeholder says “Type / for commands” |
| Format bubble | `formatBubble.js` + `FormatBubbleToolbar.svelte` | ~343 + ~408 | Crepe built-in floating toolbar |
| Commonmark preset | `commonmarkIntegration.js` | ~30 | Crepe includes commonmark |
| Cursor plugin | `cursorIntegration.js` | ~10 | Crepe default |
| Indent plugin | `indentIntegration.js` | ~15 | Crepe default |
| Trailing plugin | `trailingIntegration.js` | ~20 | Crepe default |
| Upload plugin | `uploadIntegration.js` | ~40 | Crepe `ImageBlock.onUpload` in crepeConfig |

### User-visible lie

```js
// crepeConfig.js
[Crepe.Feature.Placeholder]: {
  text: 'Type / for commands…',
}
```

No slash menu is mounted. Users see a promise the app doesn't keep.

---

## Decision required (ADR)

**Create:** `.agent/DECISIONS-editor-customization-path.md`

Choose **one** path and document trade-offs:

### Option A — Crepe-first (recommended)

**Keep:** Crepe built-in toolbar, placeholder, image upload, commonmark, cursor behavior.  
**Keep custom:** wikilink, focus, typewriter, drift highlight, tauri image drop, research AI toolbar item.  
**Delete:** slashIntegration, formatBubble, formatBubbleToolbar, commonmarkIntegration, cursorIntegration, indentIntegration, trailingIntegration, uploadIntegration (if Crepe upload covers all cases).

**Pros:** Less code to maintain; Crepe updates bring fixes; smaller bundle.  
**Cons:** Less control over slash UX and format bubble styling; must use Crepe feature flags/API for customization.

### Option B — Custom integrations-first

**Disable** Crepe toolbar and wire custom format bubble + slash menu.  
**Wire** slashIntegration with SlashMenu.svelte mounted via Svelte 5 `mount()`.  
**Keep** Crepe as shell but turn off overlapping Crepe features.

**Pros:** Full UI control; slash menu matches app design system.  
**Cons:** ~750+ lines of maintenance; must track Crepe/Milkdown API changes; higher bug surface.

### Option C — Hybrid (minimal)

Crepe toolbar for formatting; add slash menu only (no format bubble).  
Delete formatBubble stack; wire slashIntegration.

**Pros:** Delivers on placeholder text; keeps Crepe formatting.  
**Cons:** Two command surfaces (/ menu vs toolbar).

---

## Recommended choice: Option A (Crepe-first)

Rationale aligned with guardrails:

1. **Speed is a feature** — fewer plugins = faster editor init
2. **Editor is sacred** — Crepe's toolbar is battle-tested; custom bubble adds DOM outside Svelte tree (`document.body`)
3. **One concern per file** — formatBubble mixes tooltip plugin, DOM creation, and Svelte mounting

**Required follow-up if Option A:** Change placeholder to honest copy, e.g. `Start writing…` or `Select text and use ✦ for research`.

---

## Implementation plan (Option A — Crepe-first)

### Step 1 — Record ADR

Create `.agent/DECISIONS-editor-customization-path.md` with:

- Status: Accepted
- Decision: Crepe-first
- List of deleted files
- List of retained custom plugins and why each is Crepe-incompatible

### Step 2 — Audit Crepe feature coverage

In `crepeConfig.js`, explicitly set Crepe features:

```js
features: {
  [Crepe.Feature.AI]: false,        // custom research via toolbar item
  [Crepe.Feature.TopBar]: false,    // app has EditorTopbar
  // Document which Crepe features remain default-on:
  // Toolbar, ImageBlock, Placeholder, CodeBlock, etc.
}
```

Document in ADR which app features depend on which Crepe feature.

### Step 3 — Delete unwired custom integrations

**Delete these files** (after confirming no imports):

```
src/lib/editor/slashIntegration.js
src/lib/editor/formatBubble.js
src/lib/editor/formatEditorApi.js      ← only if format bubble deleted
src/lib/editor/formatState.js          ← only if format bubble deleted
src/lib/editor/commonmarkIntegration.js
src/lib/editor/cursorIntegration.js
src/lib/editor/indentIntegration.js
src/lib/editor/trailingIntegration.js
src/lib/editor/uploadIntegration.js    ← if crepeConfig onUpload is sufficient
src/lib/components/SlashMenu.svelte
src/lib/components/FormatBubbleToolbar.svelte
```

**Keep:**

```
src/lib/editor/crepeConfig.js
src/lib/editor/crepeBridge.js
src/lib/editor/editorCommands.js
src/lib/editor/focusIntegration.js
src/lib/editor/wikilinkIntegration.js
src/lib/editor/typewriterScroll.js
src/lib/editor/driftHighlightIntegration.js
src/lib/editor/driftFindInDoc.js
src/lib/editor/driftNavigation.js
src/lib/editor/findInEditor.js
src/lib/editor/tauriImageDrop.js
src/lib/editor/imageDrop.js            ← verify used by crepeConfig upload path
```

Run `grep -r` for each deleted filename before removal.

### Step 4 — Create editor plugin registry

**Create:** `src/lib/editor/editorPlugins.js`

Single export used by Editor.svelte:

```js
import { wikilinkIntegration } from './wikilinkIntegration.js'
import { focusIntegration } from './focusIntegration.js'
import { createTypewriterScrollPlugin } from './typewriterScroll.js'
import { driftHighlightIntegration } from './driftHighlightIntegration.js'

/** @returns {import('@milkdown/kit').MilkdownPlugin[]} */
export function getEditorPlugins() {
  return [
    wikilinkIntegration,
    focusIntegration,
    createTypewriterScrollPlugin(),
    driftHighlightIntegration,
  ]
}
```

**Update Editor.svelte:**

```js
import { getEditorPlugins } from '../editor/editorPlugins.js'

const plugins = getEditorPlugins()
for (const plugin of plugins) instance.editor.use(plugin)
```

Future plugins get added in one file — not scattered across Editor.svelte.

### Step 5 — Fix placeholder and copy

| Location | Change |
|----------|--------|
| `crepeConfig.js` Placeholder text | Remove “Type / for commands” unless slash is wired |
| `feature-list.md` | Mark slash commands as future or remove |
| `.agent/ARCHITECTURE.md` V2 roadmap | Update slash command status |

### Step 6 — Verify format actions still work

If App menu or shortcuts expose bold/italic/heading:

- Confirm Crepe toolbar provides them, **or**
- Keep `editorCommands.js` commands that dispatch ProseMirror transactions directly (without format bubble)

Test: select text → Crepe floating toolbar appears → bold/italic/link work.

### Step 7 — Clean package.json (optional)

If `@milkdown/plugin-tooltip` was only used by formatBubble:

- Remove from dependencies after deletion
- Verify `@milkdown/kit` still satisfies editorCommands (history, commonmark)

**Do not remove `@milkdown/kit`** — still used by editorCommands and formatState if retained.

---

## Implementation plan (Option C — if product requires slash)

Only if ADR chooses slash menu:

### Wire slashIntegration

1. In `Editor.svelte` `onMount`, after `instance.create()`:
   - Import `applySlashMenu` from `slashIntegration.js`
   - Mount `SlashMenu.svelte` into a portal element
2. Add `.use(slashIntegration)` to plugin chain
3. Keep placeholder “Type / for commands”
4. Still delete formatBubble stack (Crepe toolbar handles formatting)

Reference: `slashIntegration.js` exports `applySlashMenu(root, actions)` — read file for exact API before wiring.

---

## Files to modify

| File | Action |
|------|--------|
| `src/lib/components/Editor.svelte` | Use `getEditorPlugins()` |
| `src/lib/editor/crepeConfig.js` | Update placeholder; document Crepe features |
| `.agent/ARCHITECTURE.md` | Update editor section |
| `.agent/DECISIONS.md` | Link to new ADR |
| `feature-list.md` | Align feature claims |

## Files to create

| File | Purpose |
|------|---------|
| `.agent/DECISIONS-editor-customization-path.md` | Record decision |
| `src/lib/editor/editorPlugins.js` | Plugin registry |

## Files to delete (Option A)

See Step 3 list above (~10 files, ~1,200 lines removed).

---

## Acceptance criteria

- [ ] ADR recorded with chosen path and rationale
- [ ] No orphaned imports to deleted files (`npm run build` clean)
- [ ] Editor mounts without console errors
- [ ] Wikilinks, focus mode, typewriter scroll, drift highlights still work
- [ ] Image upload (toolbar + drag-drop) still works
- [ ] Research AI toolbar button still opens panel with selection
- [ ] Placeholder text matches actual capabilities
- [ ] Bundle size same or smaller (check `dist/` asset sizes)
- [ ] `editorPlugins.js` is the single place to register ProseMirror plugins

---

## What NOT to do

- Do not delete `findInEditor.js` or drift plugins — those are wired and distinct from Crepe
- Do not refactor Editor.svelte lifecycle beyond plugin registry in this task
- Do not add new editor features (ghost text, inline AI) during cleanup
- Do not remove `@milkdown/crepe` — it is the editor shell

---

## Estimated effort

- **Option A:** 1–2 days (mostly deletion + verification)
- **Option C:** 2–3 days (slash wiring + testing)

---

## Verification script

After changes, manually test in Tauri dev:

1. Open markdown file — editor loads
2. Type `## Heading` — converts to H2
3. Select text — Crepe toolbar visible
4. Click research ✦ — Research panel opens
5. Type `[[other-note]]` — wikilink click navigates (if note exists)
6. Toggle focus mode (⌘⇧F) — non-active blocks dim
7. Run AI Draft scan — highlights appear
8. Drag image from Finder — inserts image block
9. Undo/redo from menu — works via editorCommands
