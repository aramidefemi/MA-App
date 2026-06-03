# Task — Unify Utilities (Paths, Text Search, Markdown Parsing, Persistence)

**Priority:** P1  
**Status:** Planned  
**Depends on:** Partial overlap with shrink-App and drift-stale tasks  
**Reads:** `workspaceFiles.js`, `FileTree.svelte`, `findInEditor.js`, `driftFindInDoc.js`, `recentProjects.js`, `modules/session/session.ts`  
**Produces:** Shared utility modules; deleted duplicate code; migrated persistence

---

## Problem

The same low-level logic is implemented **2–4 times** in different files. Changes in one place don't propagate, causing subtle bugs (e.g. path normalization mismatch on Windows, drift find vs find bar behaving differently).

### Duplication inventory

| Utility | Copies | Files |
|---------|--------|-------|
| Path normalize/join/inside-root | 3 | `workspaceFiles.js`, `FileTree.svelte` (~lines 419–448), `wikilinkResolve.js` |
| `assertInsideRoot` | 2 | `workspaceFiles.js`, `workspaceTrash.js` |
| ProseMirror text search (`norm`, find from pos) | 2 | `findInEditor.js`, `driftFindInDoc.js` |
| Markdown → plain / block parse | 4 | `export.js`, `documentStats.js`, `markdown/headings.js`, `aiDrift/detector.ts` |
| OS menu label helpers | 2 | `appMenu.js`, `fileTreeContextMenu.js` |
| App persistence | 2 styles | `plugin-store` (session/settings) vs raw JSON file (recent projects) |

---

## Goal

One canonical module per utility domain. All consumers import from shared location. No copy-pasted helpers in Svelte components.

---

## Part 1 — Path utilities

### Create: `src/lib/pathUtils.js`

**Canonical exports** (move from `workspaceFiles.js`):

```js
export function normalizePath(p) { ... }
export function joinPath(parent, name) { ... }
export function isPathInsideRoot(rootPath, targetPath) { ... }
export function assertInsideRoot(rootPath, targetPath, label?) { ... }
export function parentDir(path) { ... }           // from FileTree
export function isDescendantOrSelf(ancestor, descendant) { ... }  // from FileTree
export function fileName(path) { ... }             // basename helper
```

**Implementation notes:**

- Use Tauri `@tauri-apps/api/path` `join`, `basename`, `dirname` where async platform-correct paths are needed
- `joinPath` sync helper stays for tree building where paths are already normalized strings
- `normalizePath` must handle `\` → `/`, collapse `//`, strip trailing slash (except root)

### Migrate consumers

| File | Change |
|------|--------|
| `workspaceFiles.js` | Import from `pathUtils.js`; re-export if needed for backward compat during migration |
| `workspaceTrash.js` | Import `assertInsideRoot`, `normalizePath` from `pathUtils.js`; delete local copy |
| `FileTree.svelte` | Delete local `normalizePath`, `joinPath`, `parentDir`, `isDescendantOrSelf`; import from `pathUtils.js` |
| `wikilinkResolve.js` | Import `joinPath`, `normalizePath` from `pathUtils.js` |
| `App.svelte` | After shrink task: no path utils in App |

### Acceptance

- [ ] Single source for path normalization
- [ ] FileTree DnD move validation uses same `isPathInsideRoot` as workspaceFiles
- [ ] Windows paths with `\` still work (manual or unit test)

---

## Part 2 — ProseMirror text search

### Create: `src/lib/editor/proseTextSearch.js`

Extract shared logic from `findInEditor.js` and `driftFindInDoc.js`:

```js
/** @param {string} text @param {string} query @param {boolean} caseSensitive */
export function normalizeSearch(text, query, caseSensitive) { ... }

/**
 * Find next match at or after fromPos; wraps to doc start if none found.
 * @returns {{ from: number, to: number } | null}
 */
export function findTextFrom(doc, query, fromPos, caseSensitive) { ... }

/**
 * Find last match strictly before beforePos; wraps to doc end if none found.
 * @returns {{ from: number, to: number } | null}
 */
export function findTextBefore(doc, query, beforePos, caseSensitive) { ... }
```

### Refactor consumers

**`findInEditor.js`** — thin wrapper:

```js
import { findTextFrom, findTextBefore } from './proseTextSearch.js'

export function findNextInEditor(view, query, caseSensitive) { ... }
export function findPreviousInEditor(view, query, caseSensitive) { ... }
```

**`driftFindInDoc.js`** — import `findTextFrom`; keep drift-specific:

```js
export function issueSearchText(issue) { ... }  // drift-only
export function resolveDriftIssuesInDoc(doc, issues) { ... }  // uses findTextFrom
```

### Acceptance

- [ ] Find bar and drift navigation use identical search semantics
- [ ] No duplicate `norm()` functions in codebase
- [ ] Case-sensitive and case-insensitive both work

---

## Part 3 — Markdown parsing

### Problem detail

Four parsers serve different purposes but overlap on markdown stripping:

| Module | Function | Output |
|--------|----------|--------|
| `documentStats.js` | `markdownToPlain` | Plain string for word count |
| `markdown/headings.js` | `parseHeadings` | `{ level, text, line, id }[]` |
| `export.js` | `parseMarkdownBlocks` | Block AST for DOCX/PDF |
| `detector.ts` | `extractMarkdownProseRanges` | `{ start, end, text }[]` for drift |

### Create: `src/lib/markdown/parse.js`

**Phase 1 — shared primitives** (low risk):

```js
/** Strip inline markdown markers for display/search purposes */
export function stripInlineMarkdown(text) { ... }

/** Remove fenced code blocks and return prose-only string */
export function markdownToPlain(markdown) { ... }

/** Split markdown into non-overlapping prose segments (skip code, frontmatter) */
export function extractProseSegments(markdown) { ... }
```

Move `markdownToPlain` implementation from `documentStats.js` here.

**Phase 2 — detector migration** (medium risk):

Refactor `detector.ts` `extractMarkdownProseRanges` to call `extractProseSegments` from `parse.js` OR re-implement in TS with shared test fixtures.

Options:

- **A)** Implement `parse.js` in JS; import from detector via JSDoc — detector keeps TS, imports JS
- **B)** Duplicate interface in TS with shared test vectors ensuring parity
- **C)** Move prose extraction to `parse.ts` — requires TS in markdown folder

**Recommended:** Option A for minimal churn.

**Phase 3 — export blocks** (defer if high risk):

`parseMarkdownBlocks` in `export.js` is ~70 lines and DOCX-specific. Do **not** force-merge with prose extraction in v1 of this task. Add a TODO in export.js linking to future `markdown/blocks.js` if export AST is needed elsewhere.

### Migrate consumers

| File | Change |
|------|--------|
| `documentStats.js` | `import { markdownToPlain } from './markdown/parse.js'` |
| `detector.ts` | Use `extractProseSegments` for range extraction |
| `markdown/headings.js` | Optionally use `stripInlineMarkdown` for heading text cleanup |

### Acceptance

- [ ] Word count unchanged on sample docs
- [ ] Drift scan results unchanged on `drifttest.md`
- [ ] Outline headings unchanged

---

## Part 4 — Persistence unification

### Current state

| Data | Storage | File |
|------|---------|------|
| Settings | `plugin-store` | `ma.json` key `settings` |
| Session | `plugin-store` | `ma.json` key `session` |
| Anonymous usage ID | `plugin-store` | `ma.json` |
| Recent projects | Raw `plugin-fs` | `recent-projects.json` in AppData |

Two files, two patterns, two failure modes.

### Target state

All app preferences in **`ma.json`** via `@tauri-apps/plugin-store`.

### Create: `src/lib/modules/persistence/store.js`

Thin wrapper around plugin-store:

```js
import { load } from '@tauri-apps/plugin-store'

export const STORE_FILE = 'ma.json'

let storePromise = null

export async function getStore() {
  if (!storePromise) storePromise = load(STORE_FILE, { autoSave: true })
  return storePromise
}

export async function getKey(key, defaultValue) { ... }
export async function setKey(key, value) { ... }
```

Refactor `settings.svelte.ts`, `session.svelte.ts`, `anonymousId.js` to use `getStore()` instead of各自 calling `load(STORE_FILE)`.

### Migrate recent projects

**Modify:** `src/lib/recentProjects.js`

```js
import { getKey, setKey } from '../modules/persistence/store.js'

const RECENT_KEY = 'recentProjects'
export const MAX_ENTRIES = 10

export async function loadRecentProjects() {
  const list = await getKey(RECENT_KEY, [])
  return Array.isArray(list) ? list : []
}

export async function addRecentProject(entry) {
  const list = await loadRecentProjects()
  const next = [ ... ].slice(0, MAX_ENTRIES)
  await setKey(RECENT_KEY, next)
  return next
}
```

### One-time migration

On first load after upgrade:

```js
export async function migrateRecentProjectsIfNeeded() {
  // If ma.json has no recentProjects but recent-projects.json exists,
  // read legacy file, write to store, delete legacy file (optional)
}
```

Call from `main.js` during boot (before App mount).

### Fix session persist inconsistency

Today: settings auto-persist on change; session requires manual `persistSession()` calls from App and SettingsPanel.

**In `session.svelte.ts`:** Add debounced auto-persist (e.g. 500ms after any session field change) matching settings pattern.

Remove scattered `persistSession()` calls from App once auto-persist works.

### Acceptance

- [ ] Recent projects survive restart via `ma.json`
- [ ] Legacy `recent-projects.json` migrated once
- [ ] Session persists without manual `persistSession()` from App
- [ ] Settings behavior unchanged
- [ ] Only one store file in AppData for app state

---

## Part 5 — Minor unifications (same PR or fast follow)

### OS menu labels

**Create:** `src/lib/platformLabels.js`

```js
export function revealInFileManagerLabel() {
  return navigator.platform?.includes('Win') ? 'Show in Explorer' : 'Reveal in Finder'
}
```

Replace duplicates in `appMenu.js` and `fileTreeContextMenu.js`.

### Duplicate file operation

**Fix in `workspaceFiles.js`:**

```js
export async function duplicateEntry(sourcePath, rootPath) {
  const newPath = await duplicateFilePath(sourcePath)
  const content = await readTextFile(sourcePath)
  await writeTextFile(newPath, content)
  return newPath
}
```

Use from `document.duplicateFile()` and tree actions — one code path.

---

## Files to create

| File | Purpose |
|------|---------|
| `src/lib/pathUtils.js` | Canonical path helpers |
| `src/lib/editor/proseTextSearch.js` | Shared ProseMirror search |
| `src/lib/markdown/parse.js` | Shared markdown stripping/segments |
| `src/lib/modules/persistence/store.js` | Unified plugin-store access |
| `src/lib/platformLabels.js` | OS-specific UI strings |

## Files to modify

| File | Change |
|------|--------|
| `workspaceFiles.js` | Import path utils |
| `workspaceTrash.js` | Import path utils |
| `FileTree.svelte` | Remove local path helpers |
| `wikilinkResolve.js` | Import path utils |
| `findInEditor.js` | Use proseTextSearch |
| `driftFindInDoc.js` | Use proseTextSearch |
| `documentStats.js` | Import markdownToPlain |
| `detector.ts` | Use extractProseSegments |
| `recentProjects.js` | Use persistence store |
| `settings.svelte.ts` | Use getStore |
| `session.svelte.ts` | Use getStore + auto-persist |
| `main.js` | Call migration on boot |

## Files to delete (after migration)

| File | Condition |
|------|-----------|
| `recent-projects.json` (runtime) | After successful migration to ma.json |

---

## Acceptance criteria (full task)

- [ ] `grep -r "function normalizePath" src/` returns **one** definition (in pathUtils.js)
- [ ] `grep -r "function norm(" src/lib/editor` returns **zero** (replaced by proseTextSearch)
- [ ] Recent projects stored in `ma.json`
- [ ] Session auto-persists
- [ ] `npm run build` passes
- [ ] No regression in word count, outline, drift scan, find bar, file tree DnD

---

## Test dependency

Part 3 and Part 1 benefit from unit tests — see `TASK-refactor-add-tests.md`. Add shared test fixtures:

```
tests/fixtures/sample.md
tests/fixtures/drifttest-excerpt.md
```

---

## What NOT to do

- Do not rewrite `export.js` block parser in this task
- Do not switch to Rust path handling
- Do not add lodash or path npm packages — Tauri path API + small helpers suffice
- Do not change store file name from `ma.json` (would break existing users)

---

## Estimated effort

| Part | Effort |
|------|--------|
| Path utils | 0.5 day |
| Prose text search | 0.5 day |
| Markdown parse (phase 1–2) | 1 day |
| Persistence + migration | 1 day |
| Minor unifications | 0.5 day |
| **Total** | **3–4 days |

**Suggested PR order:** path utils → prose search → persistence → markdown parse
