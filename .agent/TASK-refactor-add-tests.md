# Task — Add Tests for detector.ts and Filesystem Operations

**Priority:** P1 (safety net for most complex pure logic)  
**Status:** Planned  
**Depends on:** Best after `TASK-refactor-unify-utilities.md` (path utils, markdown parse) so tests target stable APIs  
**Reads:** `detector.ts`, `workspaceFiles.js`, `workspaceTrash.js`, `pathUtils.js` (after unify task)  
**Produces:** Vitest setup, test suites, CI script, fixture files

---

## Problem

The codebase has **zero automated tests**. The most complex, bug-prone logic is **pure functions** with many edge cases:

| Module | Risk if broken | Testability |
|--------|----------------|-------------|
| `aiDrift/detector.ts` | Wrong highlights, missed AI patterns, perf regressions | High — pure TS |
| `workspaceFiles.js` | Data loss, path escape outside workspace | Medium — needs mocked fs |
| `workspaceTrash.js` | Trash/restore corruption | Medium — mocked fs |
| `pathUtils.js` | Wrong DnD targets, Windows path bugs | High — pure JS |
| `markdown/parse.js` | Word count drift, wrong drift scan ranges | High — pure JS |

Manual QA does not scale as rules and workspace ops grow.

---

## Goal

Introduce **Vitest** as the test runner (Vite-native, zero config overlap with existing stack). Cover critical pure logic first; mock Tauri fs for I/O tests.

**Target coverage (v1):**

- `detector.ts` — ≥80% line coverage on rules and prose extraction
- `pathUtils.js` — 100% on normalize/join/inside-root
- `workspaceFiles.js` — happy path + security paths (outside root throws)
- `workspaceTrash.js` — trash + restore manifest round-trip (mocked)

---

## Step 1 — Install Vitest

Add dev dependencies:

```bash
npm install -D vitest @vitest/coverage-v8
```

**Modify `package.json` scripts:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Create `vitest.config.js`:**

```js
import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,ts}', 'tests/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*..{js,ts}'],
      exclude: ['**/*.svelte', 'src/main.js'],
    },
  },
})
```

**Guardrail note:** Vitest is dev-only — no production bundle impact. Document in ADR or this task file.

---

## Step 2 — Test directory layout

```
tests/
├── fixtures/
│   ├── sample.md              ← generic markdown
│   ├── drifttest-excerpt.md   ← copy or symlink from drifttest.md
│   ├── code-heavy.md          ← fenced blocks only
│   └── ai-vocabulary.md       ← known drift phrases
├── helpers/
│   └── mockTauriFs.js         ← in-memory fs mock
src/lib/
├── pathUtils.test.js
├── modules/aiDrift/
│   ├── detector.test.ts
│   └── rules/lexical.test.ts
├── workspaceFiles.test.js
└── workspaceTrash.test.js
```

Co-locate unit tests next to source (`*.test.ts`) **or** centralize under `tests/` — pick one convention. **Recommended:** co-locate for modules (`detector.test.ts` next to `detector.ts`).

---

## Step 3 — detector.ts tests

**Create:** `src/lib/modules/aiDrift/detector.test.ts`

### Export pure helpers for testing (if needed)

If functions are not exported, export test-only or extract:

```ts
// detector.ts — ensure these are exported:
export function extractMarkdownProseRanges(text: string): TextSegment[]
export function detectAiDriftIssues(text: string, options?): AiDriftDetectionResult
export async function detectAiDriftIssuesAsync(text, guardrails?)
```

### Test categories

#### A. Prose extraction (`extractMarkdownProseRanges`)

```ts
describe('extractMarkdownProseRanges', () => {
  it('skips fenced code blocks')
  it('skips inline code')
  it('skips frontmatter')
  it('skips headings markers but includes heading text')
  it('handles empty document')
  it('handles unicode and emoji')
})
```

#### B. Lexical rules

```ts
describe('detectAiDriftIssues — lexical', () => {
  it('flags "delve into"')
  it('flags "it\'s important to note"')
  it('does not flag same phrase inside code block')
  it('respects severity ordering')
  it('deduplicates overlapping issues')
})
```

Use `tests/fixtures/ai-vocabulary.md` with known phrases.

#### C. Structural analyzers

```ts
describe('detectAiDriftIssues — structural', () => {
  it('flags low sentence length variance')
  it('flags repeated 4-gram phrases')
  it('ignores short documents below threshold')
})
```

#### D. Guardrails / budgets

```ts
describe('detectAiDriftIssuesAsync — guardrails', () => {
  it('returns partial:true when time budget exceeded')
  it('respects maxScannedChars')
  it('completes within time budget for 120k char doc')
})
```

#### E. Regression: drifttest.md

```ts
it('matches snapshot issue count for drifttest fixture', async () => {
  const text = readFileSync('tests/fixtures/drifttest-excerpt.md', 'utf8')
  const result = await detectAiDriftIssuesAsync(text)
  expect(result.metadata.issueCount).toMatchSnapshot()
})
```

Snapshot prevents accidental rule drift; review snapshot updates in PRs.

---

## Step 4 — pathUtils tests

**Create:** `src/lib/pathUtils.test.js`

```js
describe('normalizePath', () => {
  it('converts backslashes to forward slashes')
  it('collapses duplicate slashes')
  it('removes trailing slash except root')
  it('handles empty string')
})

describe('isPathInsideRoot', () => {
  it('returns true for root itself')
  it('returns true for nested file')
  it('returns false for sibling path')
  it('returns false for path traversal attempt (/other)')
  it('is case-sensitive on Linux paths')
})

describe('joinPath', () => {
  it('joins with correct separator for unix paths')
  it('joins with backslash when parent uses windows style')
})

describe('assertInsideRoot', () => {
  it('throws when outside workspace')
  it('does not throw when inside')
})
```

---

## Step 5 — workspaceFiles tests (mocked fs)

**Create:** `tests/helpers/mockTauriFs.js`

In-memory map `{ [path]: string }` implementing:

- `readTextFile`, `writeTextFile`, `exists`, `mkdir`, `rename`, `remove`, `stat`

Use `vi.mock('@tauri-apps/plugin-fs', () => mockImpl)`.

**Create:** `src/lib/workspaceFiles.test.js`

```js
describe('createMarkdownInFolder', () => {
  it('creates untitled.md when no conflict')
  it('creates untitled-2.md on conflict')
})

describe('moveEntryToFolder', () => {
  it('moves file into subfolder')
  it('throws when target outside workspace root')
  it('throws when moving folder into itself')
})

describe('renameEntry', () => {
  it('preserves extension when renaming file without dot')
  it('throws when new name escapes root')
})

describe('duplicateFilePath', () => {
  it('generates copy suffix path')
})
```

**Security tests (critical):**

```js
describe('path security', () => {
  it('rejects move to ../../../etc/passwd')
  it('rejects rename with .. in name')
})
```

---

## Step 6 — workspaceTrash tests

**Create:** `src/lib/workspaceTrash.test.js`

```js
describe('trashEntry', () => {
  it('moves file to .calm-trash/ with manifest entry')
  it('preserves relative path structure in trash')
})

describe('restoreFromTrash', () => {
  it('restores most recent trashed item')
  it('updates manifest after restore')
  it('throws when trash empty')
})

describe('hasTrashedItems', () => {
  it('returns false for empty trash')
  it('returns true after trash')
})
```

Mock fs + in-memory manifest JSON.

---

## Step 7 — aiDrift stale logic tests

After `TASK-refactor-drift-stale-semantics.md`, extract pure function:

**Create:** `src/lib/modules/aiDrift/stale.test.ts`

```ts
import { isCheckStale } from './stale'

describe('isCheckStale', () => {
  it('true when contentVersion incremented')
  it('true when check.stale flag set')
  it('false when versions match')
  it('false when file path mismatch')
})
```

---

## Step 8 — markdown parse tests (after unify task)

**Create:** `src/lib/markdown/parse.test.js`

```js
describe('markdownToPlain', () => {
  it('strips bold/italic markers')
  it('removes fenced code blocks')
})

describe('extractProseSegments', () => {
  it('matches detector prose ranges for fixture files')
})
```

Cross-test: `extractProseSegments` output should match `extractMarkdownProseRanges` on same fixtures (parity check during migration).

---

## Step 9 — CI integration

**Modify:** `.github/workflows/release.yml` (or create `ci.yml`)

Add job:

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: npm ci
    - run: npm test
```

Tests run on PR and before release build.

---

## Step 10 — Svelte component testing (explicitly out of scope v1)

Do **not** add `@testing-library/svelte` in v1 unless needed. Component tests are slower and flakier. Focus on pure logic first.

Future v2:

- `FileTree.svelte` — selection model with mocked tree data
- `Editor.svelte` — Crepe integration e2e via Playwright/Tauri WebDriver

---

## Files to create

| File | Purpose |
|------|---------|
| `vitest.config.js` | Test runner config |
| `tests/fixtures/*.md` | Shared markdown fixtures |
| `tests/helpers/mockTauriFs.js` | Fs mock |
| `src/lib/pathUtils.test.js` | Path tests |
| `src/lib/modules/aiDrift/detector.test.ts` | Drift detector tests |
| `src/lib/modules/aiDrift/rules/lexical.test.ts` | Rule-level tests |
| `src/lib/modules/aiDrift/stale.test.ts` | Stale logic tests |
| `src/lib/workspaceFiles.test.js` | Workspace ops tests |
| `src/lib/workspaceTrash.test.js` | Trash tests |
| `src/lib/markdown/parse.test.js` | Markdown utils tests |

## Files to modify

| File | Change |
|------|--------|
| `package.json` | Add vitest scripts + devDeps |
| `.github/workflows/release.yml` | Add test job |
| `detector.ts` | Export testable functions if private |
| `.agent/GUARDRAILS.md` | Note tests required for new drift rules |

---

## Acceptance criteria

- [ ] `npm test` runs and passes locally
- [ ] CI runs tests on PR
- [ ] `detector.test.ts` has ≥15 test cases covering lexical, structural, guardrails
- [ ] Path traversal security cases covered in workspaceFiles tests
- [ ] Trash round-trip test passes with mock fs
- [ ] No tests require Tauri runtime or network
- [ ] Test run completes in <30s on CI
- [ ] Adding a new lexical rule requires adding a test case (document in GUARDRAILS)

---

## Guardrail update (proposed addition to GUARDRAILS.md)

```markdown
## Testing

- New AI Draft lexical rules MUST include a test case in `rules/lexical.test.ts`
- Path operations MUST include an outside-root rejection test
- Do not merge detector scoring changes without updating snapshots intentionally
```

---

## What NOT to do

- Do not add Playwright/Cypress in this task
- Do not test Milkdown/Crepe rendering — too heavy
- Do not mock Supabase or test `services/ai.js` streaming in v1
- Do not require 100% coverage — focus on critical paths
- Do not add Jest — use Vitest only (Vite project)

---

## Estimated effort

| Step | Effort |
|------|--------|
| Vitest setup + CI | 0.5 day |
| detector tests | 1–1.5 days |
| pathUtils tests | 0.25 day |
| workspaceFiles + trash tests | 1 day |
| stale + markdown tests | 0.5 day |
| **Total** | **3–4 days**

---

## Suggested PR order

1. Vitest setup + pathUtils tests (prove pipeline works)
2. detector.test.ts + fixtures + snapshots
3. workspaceFiles + mockTauriFs + security tests
4. workspaceTrash tests
5. stale + markdown parse tests (after respective refactor tasks)

---

## Example: mockTauriFs sketch

```js
const files = new Map()

export function createMockFs() {
  return {
    async readTextFile(path) {
      if (!files.has(path)) throw new Error('Not found')
      return files.get(path)
    },
    async writeTextFile(path, content) {
      files.set(path, content)
    },
    async exists(path) {
      return files.has(path)
    },
    async mkdir() {},
    async rename(from, to) {
      files.set(to, files.get(from))
      files.delete(from)
    },
    async remove(path) {
      files.delete(path)
    },
    async stat(path) {
      return { isDirectory: false }
    },
  }
}

export function seedWorkspace(mock, root, tree) {
  // tree: { 'notes/a.md': 'content', ... }
}
```

Use `vi.mock('@tauri-apps/plugin-fs', () => createMockFs())` in workspace test files.
