# AI Drift Phases

## Phase 0 - Writing Skill Baseline

### Goal
Ship a stable baseline for writing-quality checks with deterministic prompts and clear result shape.

### Scope
- Add drift-specific prompt + response contract in `src/lib/services/ai.js` (parallel to existing `explain` / `ask` flow).
- Define a small shared module for drift request/response types and confidence buckets.
- Use current document source (`document.content`) as the single input.
- Log minimal timing + error telemetry via existing AI logging pattern.

### Acceptance Criteria
- A drift check can run on current document text and return:
  - issue list (possibly empty),
  - confidence (`high` | `medium` | `low`),
  - short rationale.
- Empty/short docs are handled without throwing.
- Output parsing is strict and fails safely (no UI crash).

### Non-Goals
- No UI entry point yet.
- No background execution.
- No auto-rewrite or auto-fix behavior.

---

## Phase 1 - Manual Trigger Button

### Goal
Expose an explicit user-triggered "Check drift" action.

### Scope
- Add one entry point in editor chrome (prefer `EditorTopbar.svelte`; optional mirror in `SidebarFileToolbar.svelte`).
- Wire action through existing app/module flow (`App.svelte` -> module/service call).
- Show concise status states: idle, checking, done, failed.
- Render results in existing side-surface pattern (reuse `ResearchPanel` style/layout conventions where practical).

### Acceptance Criteria
- User can run drift check on demand from visible UI.
- Re-click while running is prevented.
- Result state is shown clearly, and recoverable after error.
- No interference with save/autosave/editing flow.

### Non-Goals
- No automatic checks.
- No document chunking yet.
- No persisted history across sessions.

---

## Phase 2 - Chunking + Confidence + Long-Doc Handling

### Goal
Make drift checks reliable for long documents and reduce low-quality judgments.

### Scope
- Add chunking pipeline for large `document.content` (deterministic split + stable ordering).
- Run per-chunk drift checks and aggregate into one result.
- Compute aggregate confidence from chunk-level confidence + coverage.
- Add guardrails for very large files (hard caps, timeout, partial-result marker).

### Acceptance Criteria
- Docs beyond current prompt cap are fully processable via chunking.
- Final result includes aggregate confidence and indicates partial coverage when limits are hit.
- Re-running without content changes produces stable ordering and similar scores.
- Processing time remains bounded by configured caps.

### Non-Goals
- No background scheduler.
- No automatic inline edits.
- No model/prompt experimentation UI.

---

## Phase 3 - Background Incremental Checks

### Goal
Run drift checks automatically after significant edits, without blocking writing.

### Scope
- Add incremental trigger based on meaningful document delta (`document.content` vs last checked snapshot).
- Debounce and schedule checks off the critical typing path.
- Store last-check metadata in UI/domain module (timestamp, doc hash, confidence, issue count).
- Surface passive status (e.g., "checking" / "last checked") in topbar or meta bar.

### Acceptance Criteria
- Significant changes trigger checks automatically; minor edits do not.
- Active typing remains smooth; checks are deferred/debounced.
- Latest result always maps to current document version (stale result dropped).
- Manual trigger still works and can force refresh.

### Non-Goals
- No always-on per-keystroke checking.
- No remote job queue.
- No cross-file workspace-wide drift scan.

---

## Phase 4 (Optional) - Rewrite/Fix Suggestions

### Goal
Offer actionable rewrite suggestions for confirmed drift issues.

### Scope
- For selected issues, request fix suggestions from AI with strict output shape.
- Present suggestions as preview-only patches/snippets first.
- Allow explicit apply per suggestion; never auto-apply.

### Acceptance Criteria
- Each suggestion links to source issue and target text span.
- User can review before apply.
- Apply action is reversible via normal editor undo.

### Non-Goals
- No bulk auto-apply.
- No silent document mutation.
- No replacement of core writing workflow with full-agent editing.
