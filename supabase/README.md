# Supabase — Ma Editor

Project: **Ma Editor** (`xmehatovmiaeibkprvfq`).

## `usage_patterns`

Stores device-level signals only (no PII).

| Column | Type | Description |
|--------|------|-------------|
| `anonymous_id` | `text` (PK) | Client-generated random device ID |
| `first_seen` | `timestamptz` | First app open for this device |
| `last_open` | `timestamptz` | Most recent open |
| `previous_open` | `timestamptz` | Open before `last_open` (nullable) |
| `updated_at` | `timestamptz` | Last heartbeat / row update |

### Client requirements

1. Generate and persist a random `anonymous_id` locally (e.g. UUID).
2. On every Supabase request, set header **`x-anonymous-id`** to that value (required for RLS).
3. Use **upsert** on `anonymous_id` for heartbeats; on open, set `previous_open` from the prior `last_open`, then `last_open = now()`.

Example (supabase-js):

```ts
const supabase = createClient(url, anonKey, {
  global: { headers: { 'x-anonymous-id': anonymousId } },
});
```

### RLS (role `anon`)

- **INSERT** — only when `anonymous_id` matches `x-anonymous-id` header.
- **SELECT** — own row only (needed for upsert).
- **UPDATE** — own row only.
- **DELETE** — not allowed.

---

## `ai_proxy_usage` + Edge Function `ai-proxy`

Server-side NVIDIA proxy so users do not need their own API key.

| Column | Type | Description |
|--------|------|-------------|
| `anonymous_id` | `text` | Device ID (same as usage_patterns) |
| `usage_date` | `date` (UTC) | Calendar day for quota |
| `request_count` | `int` | Requests consumed that day |

**Limit:** 50 requests per device per UTC day.

### Access model

- **RLS enabled**, no policies for `anon` / `authenticated` — clients cannot read or write this table.
- **`consume_ai_proxy_quota`** (`SECURITY DEFINER`) atomically increments count and returns whether the request is allowed. Granted to **`service_role` only**.
- The **`ai-proxy`** edge function uses `SUPABASE_SERVICE_ROLE_KEY` (injected automatically) to call the RPC before forwarding to NVIDIA.

### Deploy (one-time / updates)

Prerequisites: [Supabase CLI](https://supabase.com/docs/guides/cli), project linked:

```bash
cd /path/to/calm-writer
supabase link --project-ref xmehatovmiaeibkprvfq
supabase db push                    # apply migrations (usage, quota, BYOK keys)
supabase secrets set NVIDIA_API_KEY=nvapi-xxxxxxxx   # never commit this
supabase functions deploy ai-proxy
```

`NVIDIA_API_KEY` is only stored as a Supabase secret (not in `.env` for the Vite app).

### Client call (for `ai.js` routing)

**URL:** `{VITE_SUPABASE_URL}/functions/v1/ai-proxy`

**Method:** `POST`

**Headers:**

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer {VITE_SUPABASE_ANON_KEY}` |
| `apikey` | `{VITE_SUPABASE_ANON_KEY}` |
| `Content-Type` | `application/json` |
| `x-anonymous-id` | Device UUID from `getAnonymousId()` (min 8 chars) |

**Body (OpenAI-style):**

```json
{
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "model": "nvidia/llama-3.3-nemotron-super-49b-v1",
  "max_tokens": 600,
  "stream": true
}
```

Defaults match the desktop client if `model` / `max_tokens` are omitted.

**Streaming:** With `stream: true`, the response is `text/event-stream`; read `response.body` with `fetch` (do not use `supabase.functions.invoke` for SSE — it buffers). Pipe chunks like the current OpenAI client.

**429:** `{ "error": "Daily AI request limit exceeded", "request_count": 51, "daily_limit": 50 }`

---

## `user_ai_keys` (BYOK)

Per-device NVIDIA API keys saved from Settings. Keys are **never readable by the client** — only boolean presence is exposed.

| Column | Type | Description |
|--------|------|-------------|
| `anonymous_id` | `text` (PK) | Same device ID as `usage_patterns` |
| `api_key` | `text` | NVIDIA key (`nvapi-…`) |
| `created_at` / `updated_at` | `timestamptz` | Row lifecycle |

### Access model

- **RLS enabled**, no table policies for `anon` — direct SELECT/INSERT/UPDATE/DELETE blocked.
- Client RPCs (require `x-anonymous-id` header on Supabase client):
  - **`has_user_ai_key()`** → `boolean`
  - **`upsert_user_ai_key(p_api_key)`** → save/replace key
  - **`delete_user_ai_key()`** → remove key
- **`get_user_ai_key(p_anonymous_id)`** — `service_role` only; used by **`ai-proxy`** edge function.
- Users with a stored BYOK key skip daily quota; shared `NVIDIA_API_KEY` is used otherwise.

### Client (keys + usage)

Always attach **`x-anonymous-id`** on the Supabase JS client (required for RLS and RPCs):

```ts
const supabase = createClient(url, anonKey, {
  global: { headers: { 'x-anonymous-id': anonymousId } },
});
```

The **`ai-proxy`** call does **not** send the NVIDIA key — the edge function loads it from the DB by `x-anonymous-id`.

---

## Env vars (Vite)

See `.env.example`. Never commit `.env`.
