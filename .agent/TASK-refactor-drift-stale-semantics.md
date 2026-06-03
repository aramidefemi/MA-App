# Task — Fix AI Draft (Drift) Stale Semantics

**Priority:** P0 (correctness bug)  
**Status:** Planned  
**Depends on:** Coordinates with `TASK-refactor-shrink-app-svelte.md` (move derived state out of App)  
**Reads:** `src/App.svelte`, `src/lib/modules/aiDrift/aiDrift.svelte.ts`, `src/lib/editor/driftHighlightIntegration.js`, `src/lib/editor/driftNavigation.js`, `SidebarFileToolbar.svelte`  
**Produces:** Correct stale invalidation; consolidated drift UI state in aiDrift module

---

## Problem

AI Draft scan results can become **incorrect relative to the document** without the UI reflecting that. Highlights, counts, and sidebar status can disagree.

### Current behavior

1. **`driftContentVersion`** lives in `App.svelte` — incremented on every content change and file path change
2. **`stale` flag** is set only at scan **completion** time:

```ts
// aiDrift.svelte.ts
const latestVersion = input.getLatestContentVersion?.() ?? input.contentVersion
const stale = latestVersion !== input.contentVersion
```

This catches edits that happened **during** an in-flight scan. It does **not** catch edits **after** a scan completes.

3. **`driftIssues` derived in App** hides issues when stale:

```js
driftMatchesCurrentFile && !driftIsStale && driftStatus === 'done'
  ? lastManualCheck.result.issues
  : []
```

4. After scan completes with `stale: false`, user edits document → `driftContentVersion` increments → **`lastManualCheck.stale` stays false** → sidebar may still show "3 drifty passages" while highlights point at wrong text (or highlights cleared inconsistently depending on timing).

### Symptom scenarios

| Scenario | Expected | Actual |
|----------|----------|--------|
| Scan completes, user types | Status shows stale; highlights hidden or dimmed | Count may still show; highlights may be wrong |
| Scan in progress, user types | Stale at completion | Works ✓ |
| Switch file and back | Idle until re-scan | May show previous file's cached results briefly |
| Re-scan same file | Fresh results | Works ✓ |

---

## Goal

**Single source of truth** for drift validity in `aiDrift` module:

- Track `contentVersion` internally
- Derive `isStale` reactively: `lastCheck.contentVersion !== currentContentVersion`
- Expose UI-ready derived state (`uiStatus`, `uiStatusText`, `visibleIssues`)
- Remove drift derived logic from `App.svelte`

---

## Target API (aiDrift module)

Extend `src/lib/modules/aiDrift/aiDrift.svelte.ts`:

```ts
// Internal mutable state
let currentContentVersion = $state(0)
let currentFilePath = $state<string | null>(null)
let currentContent = $state('')

// Existing
let lastManualCheck = $state<AiDriftManualCheckPayload | null>(null)
let isRunning = $state(false)
let lastError = $state<string | null>(null)

// New derived (exported via getters)
/** True when last check's contentVersion !== currentContentVersion */
get isStale(): boolean

/** Issues to show in editor — empty if stale, wrong file, running, or error */
get visibleIssues(): AiDriftIssue[]

/** Sidebar status: 'idle' | 'checking' | 'done' | 'error' | 'stale' */
get uiStatus(): string

/** Human-readable sidebar text */
get uiStatusText(): string

/** Issue count for current file, null if no check yet */
get issueCount(): number | null

/** Whether last result was partial (budget exceeded) */
get isPartial(): boolean

// New methods
function notifyContentChange(content: string): void
function notifyFileChange(filePath: string | null, content: string, isPreview: boolean): void
function runCheck(): Promise<...>  // uses internal currentFilePath/currentContent/currentContentVersion
function goToNextIssue(): void    // delegates to editorCommands
function goToPreviousIssue(): void
```

---

## Implementation steps

### Step 1 — Move version tracking into aiDrift

**Remove from App.svelte:**

- `driftContentVersion` state
- All `drift*` `$derived` blocks (~lines 76–113)
- `$effect` for file path → scan (move to aiDrift)

**Add to aiDrift:**

```ts
function notifyContentChange(content: string) {
  currentContent = content
  currentContentVersion += 1
}

function notifyFileChange(filePath: string | null, content: string, isPreview: boolean) {
  const pathChanged = filePath !== currentFilePath
  currentFilePath = filePath
  currentContent = content
  if (pathChanged) {
    currentContentVersion += 1
    if (filePath && !isPreview) {
      void runCheck()
    }
  }
}
```

### Step 2 — Fix stale derivation

```ts
get isStale() {
  if (!lastManualCheck) return false
  if (lastManualCheck.filePath !== currentFilePath) return false
  // Stale if user edited after scan OR scan detected mid-flight drift
  return (
    lastManualCheck.stale ||
    lastManualCheck.contentVersion !== currentContentVersion
  )
}
```

**Key fix:** Compare `lastManualCheck.contentVersion` to `currentContentVersion` **reactively**, not only at scan completion.

Also compare content hash for belt-and-suspenders:

```ts
hashContent(currentContent) !== lastManualCheck.contentHash
```

Use hash OR version (version is cheaper; hash catches external content replacement with same version counter if file reloaded).

### Step 3 — visibleIssues derived

```ts
get visibleIssues() {
  if (isRunning) return []
  if (!lastManualCheck || lastManualCheck.filePath !== currentFilePath) return []
  if (lastError) return []
  if (isStale) return []
  return lastManualCheck.result.issues
}
```

Editor receives `driftIssues={aiDrift.visibleIssues}` — no App-derived filtering.

### Step 4 — uiStatus and uiStatusText

```ts
get uiStatus() {
  if (isRunning) return 'checking'
  if (lastError && lastManualCheck?.filePath === currentFilePath) return 'error'
  if (!lastManualCheck || lastManualCheck.filePath !== currentFilePath) return 'idle'
  if (isStale) return 'stale'
  return 'done'
}

get uiStatusText() {
  switch (uiStatus) {
    case 'checking': return 'Checking AI Draft...'
    case 'error': return 'Error'
    case 'stale': return `${issueCount ?? 0} drifty passages (stale)`
    case 'done': {
      const n = issueCount ?? 0
      const partial = isPartial ? ' (partial)' : ''
      return `${n} drifty passage${n === 1 ? '' : 's'}${partial}`
    }
    default: return ''
  }
}
```

Align copy with existing `SidebarFileToolbar.svelte` — it already has `.ai-drift-stale` styling.

### Step 5 — Wire App.svelte (minimal)

```svelte
<!-- In onContentChange callback -->
onContentChange={(md) => {
  aiDrift.notifyContentChange(md)
  // autosave, ui chrome — stays in App or moves later
}}

<!-- File open effect -->
$effect(() => {
  aiDrift.notifyFileChange(document.filePath, document.content, document.isPreview)
})

<!-- Editor -->
<Editor driftIssues={aiDrift.visibleIssues} ... />

<!-- Sidebar -->
<SidebarFileToolbar
  driftStatus={aiDrift.uiStatus}
  driftStatusText={aiDrift.uiStatusText}
  onAiDrift={() => aiDrift.runCheck()}
  onNextDrift={aiDrift.goToNextIssue}
/>
```

### Step 6 — Consolidate duplicate issue arrays

Today:

- `setDriftHighlightIssues(issues)` in `driftHighlightIntegration.js`
- `setDriftNavigationIssues(issues)` in `driftNavigation.js`

Both receive the same list from Editor `$effect`.

**Option A (minimal):** Keep two setters but call from one function in Editor:

```js
function syncDriftIssues(issues) {
  setDriftHighlightIssues(issues)
  setDriftNavigationIssues(issues)
}
```

**Option B (better):** Single module-level state in `driftHighlightIntegration.js`; navigation reads from same array.

Implement Option B if touching those files anyway.

### Step 7 — runCheck signature simplification

```ts
async function runCheck(): Promise<AiDriftManualCheckPayload | null> {
  if (!currentFilePath || /* preview */) return null
  return runAiDriftManualCheck({
    filePath: currentFilePath,
    content: currentContent,
    contentVersion: currentContentVersion,
    getLatestContentVersion: () => currentContentVersion,
  })
}
```

App no longer passes content/version — module owns it.

### Step 8 — Auto re-scan policy (product decision)

Document and implement one of:

| Policy | Behavior |
|--------|----------|
| **Manual only (current)** | User clicks scan; stale badge prompts re-scan |
| **Debounced auto-scan** | Re-scan 2s after typing stops (expensive) |
| **Scan on save only** | Re-scan when file saved |

**Recommended for v1 of this fix:** Manual only + clear stale UI. Do not add auto re-scan in this task.

---

## Files to modify

| File | Change |
|------|--------|
| `src/lib/modules/aiDrift/aiDrift.svelte.ts` | Add notify*, derived getters, fix stale |
| `src/App.svelte` | Remove drift derived state; wire notify* |
| `src/lib/components/Editor.svelte` | Receive `visibleIssues` prop (unchanged prop name ok) |
| `src/lib/components/SidebarFileToolbar.svelte` | Handle `stale` uiStatus if not already |
| `src/lib/editor/driftHighlightIntegration.js` | Optional: merge with navigation state |
| `src/lib/editor/driftNavigation.js` | Optional: read shared issue list |

## Files to create

None required. Optional: `src/lib/modules/aiDrift/driftUi.ts` if aiDrift.svelte.ts grows too large.

---

## Acceptance criteria

- [ ] Edit document after scan → `uiStatus` becomes `'stale'` within same tick
- [ ] Edit document after scan → `visibleIssues` is `[]` (highlights cleared)
- [ ] Sidebar shows stale indicator (existing CSS) with count
- [ ] Re-scan after edits → fresh issues, `isStale` false
- [ ] Scan during typing → completion marked stale (existing behavior preserved)
- [ ] Switch files → no drift issues from previous file shown
- [ ] Preview mode files → no auto-scan, no issues shown
- [ ] `App.svelte` has zero `drift*` derived state

---

## Test cases (manual + unit)

### Manual QA (use `drifttest.md`)

1. Open drifttest.md → run AI Draft scan → see N issues highlighted
2. Type one character → sidebar shows stale; highlights disappear
3. Click scan again → new results
4. Start scan → type during scan → completes stale
5. Switch to another file → drift UI idle
6. Switch back → previous results shown as stale until re-scan

### Unit tests (see add-tests task)

```ts
// aiDrift stale logic (pure functions extracted for test)
describe('isCheckStale', () => {
  it('returns true when contentVersion changed after check')
  it('returns true when check.stale is true')
  it('returns false when versions match and check.stale false')
  it('returns false when file paths differ')
})
```

Extract `isCheckStale(check, currentVersion, currentPath)` as pure function for testing.

---

## What NOT to do

- Do not change detector rules or scoring in this task
- Do not add LLM-based drift detection
- Do not show toast when going stale (guardrail: editor is sacred)
- Do not auto re-scan on every keystroke

---

## Estimated effort

**1–2 days** including App wiring and SidebarFileToolbar stale UX polish.

---

## Relationship to other tasks

| Task | Interaction |
|------|-------------|
| Shrink App.svelte | Drift derived state move is Phase 5 of that task — do together or drift first |
| Unify utilities | `driftFindInDoc.js` uses proseTextSearch — independent |
| Add tests | Add stale logic unit tests in same PR or immediately after |
