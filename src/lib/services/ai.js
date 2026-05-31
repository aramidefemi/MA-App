import { hasApiKey } from './keys.js'
import { getAnonymousId } from '../modules/usage/anonymousId.js'

const MODEL = 'nvidia/llama-3.3-nemotron-super-49b-v1'
const MAX_TOKENS = 600

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

/** @param {'explain'|'ask'} mode @param {string} [documentText] */
function buildSystemPrompt(mode, documentText) {
  const doc = documentText?.trim()
  if (!doc) return PROMPTS[mode]
  return `${PROMPTS[mode]}

The user's current document:
---
${doc}
---`
}

/** @param {'explain'|'ask'} mode @param {string} input @param {string} [context] @param {string} [documentText] */
function buildMessages(mode, input, context, documentText) {
  const userMessage = context
    ? `Context from my document:\n"${context}"\n\n${input}`
    : input
  return [
    { role: 'system', content: buildSystemPrompt(mode, documentText) },
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

/** @param {object[]} messages @param {{ onToken: function, onDone: function, onError: function }} handlers */
async function streamViaProxy(messages, { onToken, onDone, onError }) {
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
    await consumeSseStream(res.body, onToken)
    onDone()
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
 * @param {function} options.onToken
 * @param {function} options.onDone
 * @param {function} options.onError
 */
export async function streamResponse({
  mode = 'explain',
  input,
  context,
  documentText,
  onToken,
  onDone,
  onError
}) {
  const messages = buildMessages(mode, input, context, documentText)
  await streamViaProxy(messages, { onToken, onDone, onError })
}

export async function hasKey() {
  return hasApiKey()
}
