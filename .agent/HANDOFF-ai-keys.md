# AI Key Setup — Task 1 Handoff

## Store configuration

| Setting | Value |
|---------|-------|
| Store file | `ma.json` |
| Key name | `nvidia_api_key` |

## Task 2 import

```js
import { getApiKey } from './lib/services/keys.js'
```

Also available: `saveApiKey(key)`, `clearApiKey()` from the same module.

## Tauri permissions

`store:allow-get`, `store:allow-set`, `store:allow-save` added to `src-tauri/capabilities/default.json`.

Note: `clearApiKey()` uses `store.delete()` — add `store:allow-delete` if Task 2+ needs key removal.

## Issues / notes

- No settings UI to change the key after initial setup (by design for Task 1).
- No key validation or API testing (by design).
- First launch shows `KeySetup` overlay until a key is saved; subsequent launches read from encrypted store via `getApiKey()`.
