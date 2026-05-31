# AI UI — Task 3a Handoff

## State in App.svelte

| Name | Location | Purpose |
|------|----------|---------|
| `showResearch` | `App.svelte` script, `$state(false)` | Controls research panel visibility |
| `researchInput` | `App.svelte` script, `$state('')` | Selected text from pill; Agent 3b reads this |

Both live alongside other root state (after `skipTopbarHide`).

## SelectionPill wiring

```svelte
{#if filePath}
  <SelectionPill
    onAiClick={(text) => {
      researchInput = text
      showResearch = true
    }}
  />
{/if}
```

Rendered at `.app` root level (not inside `.workspace`). Only mounted when a file is open (`filePath` truthy).

## ResearchPanel props (Agent 3b extends)

| Prop | Type | Notes |
|------|------|-------|
| `onClose` | `() => void` | Closes panel; wired as `() => showResearch = false` |

Panel body (`.panel-body`) is empty — Agent 3b adds streaming UI, input, and response display.

Agent 3b will likely need additional props from App.svelte, e.g.:

```svelte
<ResearchPanel
  input={researchInput}
  onClose={() => showResearch = false}
/>
```

(`input` prop not added in 3a — add when wiring AI.)

## Keyboard shortcut stub

`⌘E` / `Ctrl+E` is registered in `handleKeydown` with `preventDefault()` only. Agent 3b/3c wires the explain call.

## Files created/changed

- `src/lib/components/SelectionPill.svelte` — NEW
- `src/lib/components/ResearchPanel.svelte` — NEW (empty shell)
- `src/App.svelte` — imports, state, layout, SelectionPill wiring
- `.agent/HANDOFF-ai-ui-3a.md` — this file

## Selection detection quirks (Milkdown / ProseMirror)

1. **`selectionchange` on document** — Pill listens globally; gates on `.milkdown .ProseMirror` containing `range.commonAncestorContainer`.

2. **≥3 trimmed chars** — Collapsed selections or shorter text hide the pill.

3. **Position** — Pill uses `getBoundingClientRect()` with `position: fixed` and `translateX(-50%) translateY(-100%)`. `y` includes `window.scrollY` per spec (usually 0 in this app since `body { overflow: hidden }`).

4. **Format bubble overlap** — Milkdown's format bubble toolbar (`format-bubble-root`, z-index ~1000) appears above selections. SelectionPill uses z-index 50, so the pill may sit **behind** the bubble when both are visible. Agent 3b/UX may need to adjust z-index or offset if this is a problem.

5. **Click behavior** — `onAiClick(selectedText)` sets `researchInput` and opens the research panel, then hides the pill. Selection is not explicitly cleared.

6. **No trigger outside editor** — Selections in sidebar, outline, or settings do not show the pill.

## Acceptance (3a)

- [x] ✦ Explain pill on 3+ char highlight inside editor
- [x] Pill above selection, centred horizontally
- [x] Pill hides on cleared selection
- [x] ✦ Explain opens research panel, sets `researchInput`
- [x] Research panel 280px on right; workspace flex shrinks editor
- [x] `✕` closes panel
- [x] No AI calls, streaming, or panel content yet
- [x] `⌘E` stub registered
