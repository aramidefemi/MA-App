import { hasApiKey } from './keys.js'
import { getAnonymousId } from '../modules/usage/anonymousId.js'
import { getAiSkillPrompt } from '../ai/skills/index.js'

/** Nano 8B — much faster TTFT than the 49B super model on free/shared keys. */
const DEFAULT_MODEL = 'nvidia/llama-3.1-nemotron-nano-8b-v1'
const MODEL = import.meta.env.VITE_AI_MODEL?.trim() || DEFAULT_MODEL
const MAX_TOKENS = 450
/** Cap document context so prompts stay small (major latency win on large files). */
const MAX_DOC_CHARS = 6_000

const PROMPTS = {
  explain: `You are a focused writing assistant inside a markdown editor 
called Ma. The user has highlighted some text and wants it explained.

Rules:
- Be concise. Two to three short paragraphs maximum.
- Plain language. No academic tone.
- If it is a person, tell me who they are and why they matter.
- If it is a concept, explain it like the user is smart but unfamiliar.
- If it is a word, define it and give one example in context.
- Never start with "Certainly" or "Of course" or "Great question".
- No bullet points. Flowing prose only.`,

  ask: `You are a focused research companion inside a markdown editor
called Ma. The user is writing a document and has a question.

Rules:
- Answer directly. No preamble.
- Two to four paragraphs maximum.
- If you are not sure, say so briefly then give your best answer.
- Never start with "Certainly" or "Of course" or "Great question".`
}

/**
 * @param {'explain'|'ask'} mode
 * @param {string} [documentText]
 * @param {string} [context]
 * @param {string} [skillPrompt]
 */
function buildSystemPrompt(mode, documentText, context, skillPrompt) {
  const basePrompt = (() => {
    if (mode === 'explain' && context?.trim()) return PROMPTS[mode]

    const doc = documentText?.trim()
    if (!doc) return PROMPTS[mode]

    const capped =
      doc.length > MAX_DOC_CHARS ? doc.slice(-MAX_DOC_CHARS) : doc
    const truncatedNote =
      doc.length > MAX_DOC_CHARS ? '\n(Document excerpt: end of file only.)' : ''

    return `${PROMPTS[mode]}

The user's current document:
---
${capped}
---${truncatedNote}`
  })()

  const trimmedSkillPrompt = skillPrompt?.trim()
  if (!trimmedSkillPrompt) return basePrompt

  return `${basePrompt}

Writing skill to apply when relevant:
---
${trimmedSkillPrompt}
---`
}

/**
 * @param {'explain'|'ask'} mode
 * @param {string} input
 * @param {string} [context]
 * @param {string} [documentText]
 * @param {string} [skillPrompt]
 */
function buildMessages(mode, input, context, documentText, skillPrompt) {
  const userMessage = context
    ? `Context from my document:\n"${context}"\n\n${input}`
    : input
  return [
    {
      role: 'system',
      content: buildSystemPrompt(mode, documentText, context, skillPrompt)
    },
    { role: 'user', content: userMessage }
  ]
}

function getProxyConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'AI is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    )
  }
  return { url, anonKey }
}

/** @param {ReadableStream<Uint8Array>} body @param {function(string): void} onToken */
async function consumeSseStream(body, onToken) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const chunk = JSON.parse(payload)
        const token = chunk.choices?.[0]?.delta?.content ?? ''
        if (token) onToken(token)
      } catch {
        /* skip malformed SSE chunks */
      }
    }
  }

  if (buffer.startsWith('data: ')) {
    const payload = buffer.slice(6).trim()
    if (payload && payload !== '[DONE]') {
      try {
        const chunk = JSON.parse(payload)
        const token = chunk.choices?.[0]?.delta?.content ?? ''
        if (token) onToken(token)
      } catch {
        /* skip */
      }
    }
  }
}

/**
 * @param {object[]} messages
 * @param {{
 *   onToken: function,
 *   onDone: function,
 *   onError: function,
 *   onFirstToken?: function,
 * }} handlers
 */
async function streamViaProxy(messages, { onToken, onDone, onError, onFirstToken }) {
  const startedAt = performance.now()
  let firstTokenAt = null

  const emitToken = (token) => {
    if (token && firstTokenAt == null) {
      firstTokenAt = performance.now()
      onFirstToken?.(Math.round(firstTokenAt - startedAt))
    }
    onToken(token)
  }

  const finish = () => {
    const totalMs = Math.round(performance.now() - startedAt)
    const ttftMs =
      firstTokenAt != null ? Math.round(firstTokenAt - startedAt) : totalMs
    onDone({ totalMs, ttftMs })
  }
  let config
  try {
    config = getProxyConfig()
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)))
    return
  }

  const anonymousId = await getAnonymousId()

  /** @type {Record<string, string>} */
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.anonKey}`,
    apikey: config.anonKey,
    'x-anonymous-id': anonymousId
  }

  let res
  try {
    res = await fetch(`${config.url}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages,
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true
      })
    })
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)))
    return
  }

  if (res.status === 429) {
    onError(
      new Error(
        'Daily AI limit reached. Add your own NVIDIA key in Settings for unlimited use.'
      )
    )
    return
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.error ?? body.message ?? detail
    } catch {
      /* use statusText */
    }
    onError(new Error(detail || `AI request failed (${res.status})`))
    return
  }

  if (!res.body) {
    onError(new Error('AI response had no body'))
    return
  }

  try {
    await consumeSseStream(res.body, emitToken)
    finish()
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Stream an AI response token by token.
 *
 * @param {object} options
 * @param {'explain'|'ask'} options.mode
 * @param {string} options.input
 * @param {string} [options.context]
 * @param {string} [options.documentText]
 * @param {string} [options.skillId]
 * @param {string} [options.skillPrompt]
 * @param {function} options.onToken
 * @param {function(options: { totalMs: number, ttftMs: number }): void} options.onDone
 * @param {function} options.onError
 * @param {function(number): void} [options.onFirstToken] ttft in ms
 */
export async function streamResponse({
  mode = 'explain',
  input,
  context,
  documentText,
  skillId,
  skillPrompt,
  onToken,
  onDone,
  onError,
  onFirstToken
}) {
  const resolvedSkillPrompt = skillPrompt?.trim() || getAiSkillPrompt(skillId)
  const messages = buildMessages(
    mode,
    input,
    context,
    documentText,
    resolvedSkillPrompt
  )
  await streamViaProxy(messages, { onToken, onDone, onError, onFirstToken })
}

/** @param {number} ms */
export function formatAiTiming(ms) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export async function hasKey() {
  return hasApiKey()
}
