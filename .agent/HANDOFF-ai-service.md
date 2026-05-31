# AI Service — Task 2 Handoff

## Task 3 imports

```js
import { streamResponse, hasKey } from './lib/services/ai.js'
```

### `streamResponse` signature

```js
/**
 * @param {object} options
 * @param {'explain'|'ask'} [options.mode='explain']
 * @param {string} options.input       - highlighted text (explain) or question (ask)
 * @param {string} [options.context]   - surrounding doc context, optional
 * @param {function(string)} options.onToken
 * @param {function()} options.onDone
 * @param {function(Error)} options.onError
 */
export async function streamResponse({ mode, input, context, onToken, onDone, onError })
```

### `hasKey` signature

```js
export async function hasKey()  // returns boolean
```

### Example usage (from Task 3)

```js
streamResponse({
  mode: 'explain',
  input: selectedText,
  context: docSnippet,          // optional
  onToken: (token) => { response += token },
  onDone: () => { isStreaming = false },
  onError: (e) => { errorMessage = e.message }
})
```

---

## Model

`nvidia/llama-3.3-nemotron-super-49b-v1` via `https://integrate.api.nvidia.com/v1`

---

## `dangerouslyAllowBrowser: true`

**Required.** Tauri's WebView runs the frontend in a browser-like JS context. The OpenAI SDK blocks browser-side API key usage by default; this flag opts in. Safe here because the key lives in Tauri's encrypted store, not in bundled source.

---

## Streaming notes (NeMo endpoint)

- Uses standard OpenAI-compatible SSE via `client.chat.completions.create({ stream: true })`.
- Tokens arrive in `chunk.choices[0].delta.content` — may be partial words or multi-character fragments, not full words.
- Empty delta chunks are skipped; `onDone()` fires after the async iterator completes.
- `max_tokens: 600` caps response length per call.
- No live API test was run in Task 2 (no key in CI); implementation follows OpenAI SDK streaming contract.

---

## Errors

| Case | Behavior |
|------|----------|
| No saved key | `onError(new Error('No API key found. Please add your NVIDIA key in settings.'))` |
| API / network failure | `onError(e)` with the thrown error |
| Other `getClient()` failure | `onError(e)` |

No retry logic. No API key logged.

---

## Task 1 handoff confirmed

| Item | Value |
|------|-------|
| Handoff file | `.agent/HANDOFF-ai-keys.md` — exists |
| Store file | `ma.json` |
| Store key name | `nvidia_api_key` |
| Import in `ai.js` | `import { getApiKey } from './keys.js'` (same directory as `keys.js`) |
| Import from components | `import { getApiKey } from './lib/services/keys.js'` (relative to `src/`) |

---

## Files changed (Task 2)

- `src/lib/services/ai.js` — NEW
- `package.json` / `package-lock.json` — added `openai`
