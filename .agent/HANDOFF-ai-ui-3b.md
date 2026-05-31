# AI UI — Task 3b Handoff

## Status

Complete. Build passes (`npm run build`). No live NeMo API test (no key in CI).

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/components/ResearchPanel.svelte` | Streaming explain UI, state, CSS |
| `src/App.svelte` | Pass `input={researchInput}` to ResearchPanel |
| `.agent/HANDOFF-ai-ui-3b.md` | This file |

---

## ResearchPanel props (Agent 3c extends)

```js
let {
  onClose,
  input = '',      // highlighted text from App.svelte
  onSaveNote       // optional callback — not wired in App yet
} = $props()
```

### `onSaveNote` signature (for save-note / follow-up task)

```js
/** @type {(input: string, response: string) => void} */
onSaveNote
```

Invoked from the save button:

```js
onSaveNote?.(input, response)
```

- `input` — original highlighted text (full string, not truncated chip)
- `response` — complete streamed explain text

No implementation in App.svelte yet. Button renders when `isDone && response`.

---

## Streaming behavior

- Panel mounts inside `{#if showResearch}` → `onMount` calls `startStream()` when `input` is non-empty.
- Closing panel destroys component; reopening remounts and restarts stream.
- Uses `streamResponse({ mode: 'explain', input, onToken, onDone, onError })` from `../services/ai.js`.

### States

| State | UI |
|-------|-----|
| `isStreaming && !response` | Three pulsing dots |
| `response && isStreaming` | Prose text + blinking `▌` cursor |
| `isDone && response` | Text only + "save as note ↗" button |
| `error` | Red error message (read-only, no retry) |

### NeMo endpoint

Implementation follows OpenAI-compatible SSE contract (Task 2 handoff). Tokens arrive via `chunk.choices[0].delta.content` — may be partial words or multi-character fragments, not guaranteed word-by-word. UI appends each token as received; `white-space: pre-wrap` preserves newlines.

**Not live-tested** against NVIDIA API in this task. Expected errors:

- Missing key → `"No API key found. Please add your NVIDIA key in settings."`
- API/network failure → `e.message` from thrown error

---

## Response rendering notes

- **Plain text is fine** for explain mode. System prompt requests flowing prose, no bullet points.
- **`white-space: pre-wrap`** on `.response-text` preserves paragraph breaks from the model.
- **No markdown rendering needed** for current prompt — model is instructed not to use bullets/markdown. If prompts change later, consider lightweight markdown or paragraph splitting only.
- Raw markdown characters (`*`, `#`) would display literally if the model emits them — acceptable for v1.

---

## App.svelte wiring

```svelte
{#if showResearch}
  <ResearchPanel
    input={researchInput}
    onClose={() => showResearch = false}
  />
{/if}
```

`researchInput` set by SelectionPill `onAiClick` (Task 3a).

---

## Hard limits respected

- No follow-up input field (Agent 3c)
- No `onSaveNote` implementation in App
- No retry button
- Panel width (280px) and header unchanged from 3a
- Svelte 5 runes only; svelte-autofixer reports no issues

---

## Acceptance (3b)

- [x] Explain opens panel and streams on mount
- [x] Thinking dots before first token
- [x] Tokens append as they arrive; cursor while streaming
- [x] Cursor hidden when done
- [x] Save as note button after complete
- [x] Error state for missing key / failed calls
- [x] Reopen restarts stream (component remount)
- [x] `npm run build` clean
