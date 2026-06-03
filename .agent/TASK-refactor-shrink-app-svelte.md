# Task — Shrink App.svelte to Composition Only

**Priority:** P1  
**Status:** Planned  
**Depends on:** None (can start immediately; pairs well with drift-stale and unify-utilities tasks)  
**Reads:** `GUARDRAILS.md`, `ARCHITECTURE.md`, `src/App.svelte`  
**Produces:** New modules/components listed below; refactored `App.svelte` (~150 lines script + thin layout)

---

## Problem

`App.svelte` is **1,074 lines** — roughly **682 lines of script** and **~225 lines of layout CSS**. It violates guardrail #3 (“one concern per file”) and the explicit rule “do not add state to App.svelte that belongs in a store.”

It currently owns:

| Concern | Approx. lines | Location in App.svelte |
|---------|---------------|------------------------|
| Keyboard shortcuts | ~80 | `handleKeydown`, `isEditorTarget` |
| Workspace tree CRUD | ~170 | `handleTreeMove/Rename/Delete/Duplicate`, `createFileInFolder`, etc. |
| AI Draft derived UI state | ~55 | `driftContentVersion`, `driftStatus`, `driftIssues`, `$effect` on file path |
| File open/save/folder ops | ~120 | `openFile`, `saveFile`, `openFolder`, `closeTab`, etc. |
| Menu handler wiring | ~80 | `onMount` → `setupAppMenu({ ... })` |
| Research note saving | ~40 | `saveResearchNote`, `resolveNoteDir` |
| Layout / shell CSS | ~225 | `.app`, `.editor-shell`, `.sidebar-shell`, etc. |
| Local UI state | ~30 | `recentProjects`, `showFind`, `fileTree` ref, `canUndoTrash` |

`App.svelte` should **compose** child components and **delegate** to modules — not implement business logic.

---

## Goal

Reduce `App.svelte` to:

- **~120–180 lines of `<script>`** — imports, thin wrappers, layout bindings only
- **~80–120 lines of markup** — structural slots, no inline handlers longer than one line
- **0 lines of layout CSS** — moved to `AppShell.svelte` or `app.css`

App becomes the **router between welcome vs editor shell**, wiring props/events between stores and components.

---

## Target structure

```
src/
├── App.svelte                          ← composition root (~150 lines total)
└── lib/
    ├── app/
    │   ├── AppShell.svelte             ← layout markup + shell CSS
    │   ├── keyboardShortcuts.js        ← global shortcut handler factory
    │   ├── workspaceTreeActions.js     ← tree CRUD handlers (pure async fns)
    │   ├── fileActions.js              ← open/save/new/close/export (optional split)
    │   └── menuHandlers.js             ← object passed to setupAppMenu
    └── components/
        └── EditorLayout.svelte         ← sidebar + editor + panels (optional)
```

---

## Extraction plan (ordered)

### Phase 1 — CSS and layout shell

**Create:** `src/lib/app/AppShell.svelte`

Move from `App.svelte`:

- All classes: `.app`, `.editor-shell`, `.sidebar-shell`, `.sidebar`, `.main-column`, `.panels-row`, etc.
- Structural markup wrappers (not panel content — those stay as child `<slot>`s or explicit component imports)

`App.svelte` becomes:

```svelte
<AppShell {hasSidebar} {topbarVisible} ...>
  {#snippet sidebar()} ... {/snippet}
  {#snippet main()} ... {/snippet}
</AppShell>
```

Use Svelte 5 snippets if that matches project patterns; otherwise pass slots via named snippet props or a simple wrapper div structure.

**Acceptance:** Visual layout unchanged; no CSS classes remain in `App.svelte`.

---

### Phase 2 — Keyboard shortcuts

**Create:** `src/lib/app/keyboardShortcuts.js`

Extract:

- `handleKeydown(e)` (lines ~372–449)
- `isEditorTarget(e)` helper

Export a factory:

```js
/**
 * @param {object} ctx — { document, workspace, session, settings, research, ui, actions }
 * @returns {(e: KeyboardEvent) => void}
 */
export function createKeyboardHandler(ctx) { ... }
```

`actions` is a bag of callbacks: `newFile`, `saveFile`, `openFile`, `openFolder`, `toggleFind`, `printDocument`, etc. — thin wrappers defined in App or imported from `fileActions.js`.

**Wire in App.svelte:**

```svelte
const onKeydown = createKeyboardHandler({ document, workspace, ... })
<svelte:window onkeydown={onKeydown} />
```

**Also fix while here:** Wire ⌘E to `research.openWithText(getEditorCommands()?.getSelectionText())` or remove the stub comment and menu item until wired (see editor task).

**Acceptance:** Every shortcut in current `handleKeydown` still works; no shortcut logic left in App beyond the factory call.

---

### Phase 3 — Workspace tree actions

**Create:** `src/lib/app/workspaceTreeActions.js`

Move these functions out of App (they are pure business logic):

| Function | Notes |
|----------|-------|
| `resolveRenameName` | Pure — stays here |
| `createFileInFolder` | Calls `createMarkdownInFolder`, returns new path |
| `createFolderIn` | Calls `createFolderInWorkspace` |
| `handleTreeMove` | Uses `moveEntryToFolder`, `document.retargetFilePath` |
| `handleTreeRename` | Uses `renameEntry` |
| `handleTreeDelete` | Uses `trashEntry`, `confirmAction` |
| `handleTreeCopyPath` | Uses `copyText` |
| `handleTreeCopyFile` | Uses `readTextFile`, `copyText` |
| `handleUndoDelete` | Uses `restoreFromTrash` |
| `handleTreeDuplicate` | **Fix:** delegate to `document.duplicateFile()` or `duplicateFilePath` in `workspaceFiles.js` — do not re-read disk in App |
| `handleTreeReveal` | Uses `revealItemInDir` |
| `refreshFileTree` | Accept `fileTreeRef` or callback `{ refresh, collapseAll }` |

Export a factory:

```js
/**
 * @param {{
 *   workspace, document,
 *   fileTree: { refresh(): void, collapseAll(): void } | null,
 *   refreshTrashState: () => Promise<void>,
 *   openFileFromTree: (path: string) => Promise<void>,
 * }} deps
 */
export function createWorkspaceTreeActions(deps) { ... }
```

**Acceptance:** App handlers become one-liners: `onMove={(a,b) => treeActions.move(a,b)}`. No `try/catch console.error` duplication — centralize error logging in the factory or a shared `logWorkspaceError`.

---

### Phase 4 — Menu handlers

**Create:** `src/lib/app/menuHandlers.js`

Extract the object passed to `setupAppMenu({ ... })` in `onMount`. Group by domain:

- File: new, open, save, export, print, close
- Edit: undo, redo, find
- View: sidebar, outline, focus, typewriter, settings
- Workspace: new file/folder, collapse tree, undo delete

Each handler is a thin delegate to `document`, `workspace`, `session`, or the extracted action modules.

**Acceptance:** `onMount` in App is ≤15 lines for menu setup.

---

### Phase 5 — AI Draft derived state (coordinate with drift task)

Move from App to `aiDrift.svelte.ts`:

- `driftContentVersion` counter
- All `drift*` `$derived` values (`driftStatus`, `driftIssues`, `driftStatusText`, etc.)
- `$effect` that triggers scan on file path change

App should only pass:

```svelte
<SidebarFileToolbar
  driftStatus={aiDrift.uiStatus}
  driftStatusText={aiDrift.uiStatusText}
  onAiDrift={() => aiDrift.runCheck(document.filePath, document.content)}
/>
```

See `TASK-refactor-drift-stale-semantics.md` for the full API design.

---

### Phase 6 — File actions (optional but recommended)

**Create:** `src/lib/app/fileActions.js`

Consolidate: `newFile`, `openFile`, `saveFile`, `openFolder`, `closeTab`, `closeAll`, `openFileFromTree`, export helpers.

These already call `document`, `workspace`, Tauri dialog/fs — they don't belong in a Svelte component.

---

### Phase 7 — Remove `fileTree` ref coupling (follow-up)

Today App calls `fileTree?.refresh()` in ~10 places. After tree actions extraction:

- Prefer **reactive refresh**: increment `workspace.treeRefreshToken` in the workspace module; FileTree `$effect` watches it
- Or pass `refreshFileTree` from a single place in `workspaceTreeActions`

This removes `bind:this={fileTree}` from App if FileTree subscribes to store token.

---

## Files to modify

| File | Action |
|------|--------|
| `src/App.svelte` | Gut script; keep composition only |
| `src/lib/modules/workspace/workspace.svelte.ts` | Optional: add `treeRefreshToken` |
| `src/lib/components/FileTree.svelte` | Optional: react to refresh token |

## Files to create

| File | Purpose |
|------|---------|
| `src/lib/app/AppShell.svelte` | Layout + CSS |
| `src/lib/app/keyboardShortcuts.js` | Global shortcuts |
| `src/lib/app/workspaceTreeActions.js` | Tree CRUD |
| `src/lib/app/menuHandlers.js` | Native menu callbacks |
| `src/lib/app/fileActions.js` | File open/save/new/close |

---

## Acceptance criteria

- [ ] `App.svelte` ≤ **200 lines total** (script + markup + style)
- [ ] `App.svelte` script ≤ **120 lines**
- [ ] No `readTextFile` / `writeTextFile` imports in App
- [ ] No `try/catch console.error` blocks in App (delegated to action modules)
- [ ] All keyboard shortcuts behave identically (manual QA checklist)
- [ ] All file tree context menu actions work
- [ ] Native menu items work
- [ ] No visual regression in layout (sidebar width, panel transitions, topbar)
- [ ] `npm run build` passes

---

## Manual QA checklist

After refactor, verify:

- [ ] ⌘N new file, ⌘O open, ⌘⇧O open folder, ⌘S save, ⌘W close, ⌘⌥W close all
- [ ] ⌘F find, ⌘⇧F focus mode, ⌘⇧T typewriter, ⌘⇧L theme, ⌘, settings
- [ ] Tree: create file/folder, rename, move (DnD), delete, duplicate, reveal, copy path
- [ ] Undo delete from sidebar menu
- [ ] Welcome screen → open folder → file tree populates
- [ ] Research panel open/close; save note to workspace

---

## What NOT to do

- Do not change visual design or add new features during this refactor
- Do not split FileTree in this task (separate future task)
- Do not touch `src-tauri/`
- Do not add new npm packages
- Do not introduce a state management library — keep Svelte 5 rune modules
- Do not move Editor.svelte logic — editor stays as-is

---

## Estimated effort

**3–5 days** for one developer, done in phases with a PR per phase to keep diffs reviewable.

**Suggested PR order:**

1. AppShell CSS extraction (low risk)
2. keyboardShortcuts + menuHandlers
3. workspaceTreeActions + fileActions
4. aiDrift state move (with drift-stale task)
