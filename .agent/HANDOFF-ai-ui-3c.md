# AI UI — Task 3c Handoff

## Status

Complete. Follow-up input added to ResearchPanel. No changes to `ai.js` — existing `ask` mode + `context` param cover follow-ups.

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/components/ResearchPanel.svelte` | Follow-up textarea, `initialDone` gate, `submitFollowUp()` |
| `.agent/HANDOFF-ai-ui-3c.md` | This file |

---

## ai.js — no changes

Existing API already supports follow-ups:

```js
streamResponse({
  mode: 'ask',
  input: followUpQuestion,       // user's new question
  context: originalHighlight,    // `input` prop — unchanged highlighted text
  onToken, onDone, onError
})
```

### How the model receives follow-up context

`ai.js` builds the user message when `context` is set:

```
Context from my document:
"<original highlighted text>"

<follow-up question>
```

- **System prompt:** `PROMPTS.ask` — direct research companion, 2–4 paragraphs, no preamble.
- **No conversation history:** each follow-up is a fresh single-turn call. Prior explain/follow-up responses are not sent.
- **Context chip:** always reads the `input` prop (original highlight from App.svelte). Never updated on follow-up.

Initial explain still uses `mode: 'explain'` with `input` only (no `context`).

---

## ResearchPanel state (new / changed)

| State | Purpose |
|-------|---------|
| `initialDone` | `true` after first explain stream completes successfully (`mode === 'explain'` in `onDone`). Gates follow-up textarea visibility. |
| `followUp` | Textarea value; cleared on submit |
| `followUpEl` | DOM ref for auto-resize |

### Follow-up behaviour

1. Textarea appears only when `initialDone` is true (first explain finished without cancel).
2. Placeholder: `ask a follow-up...`
3. **Enter** → submit; **Shift+Enter** → newline.
4. Empty/whitespace submit → no-op.
5. On submit: clear `response`, clear `followUp`, reset textarea height, call `startStream(question, …, 'ask', input.trim())`.
6. Textarea stays visible for subsequent follow-ups.
7. Auto-resize via `scrollHeight` on `oninput`.

### Unchanged from 3b

- Initial explain still driven by `$effect` on `input` prop.
- Panel header, context chip, resize handle, streaming UI, save button logic.
- `onSaveNote?.(input, response)` — `input` is always original highlight; `response` is current (latest) streamed text.

---

## Agent 3d (save as note) — what you need

1. **`onSaveNote` signature unchanged:** `(input: string, response: string) => void`
   - `input` — original highlighted text (full string)
   - `response` — whatever is currently displayed (initial explain or latest follow-up answer)

2. **Save button visibility:** `{#if isDone && response}` — hidden while streaming (including follow-up streams). Reappears when latest answer completes.

3. **Follow-up answers replace explain text in the panel** — there is no separate “explain vs follow-up” flag. If 3d needs to distinguish note types, derive from whether user clicked save after a follow-up (panel only shows latest `response`; no history).

4. **Suggested note content for 3d:** consider including both original highlight and latest response, e.g.:
   - Title/source: highlighted text
   - Body: current `response`
   - Optional: prefix follow-up notes with the question asked — **not stored in panel state today**; would require 3d to add state if needed.

5. **Wire in App.svelte:** still not implemented — add `onSaveNote={handleSaveNote}` when implementing save.

---

## Acceptance (3c)

- [x] Follow-up input hidden until first explain completes
- [x] Input pinned at bottom of panel
- [x] Enter submits, Shift+Enter newline, no send button
- [x] Submit clears response + input, streams new answer immediately
- [x] Context chip always shows original highlight
- [x] No conversation history; fresh ask per submission
- [x] Auto-resizing textarea, no character limit
- [x] No ai.js changes required
- [x] svelte-autofixer: no issues (existing $effect suggestions only)
