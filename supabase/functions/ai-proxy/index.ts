import { createClient } from 'jsr:@supabase/supabase-js@2'

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1'
const DEFAULT_MODEL = 'nvidia/llama-3.3-nemotron-super-49b-v1'
const DEFAULT_MAX_TOKENS = 600
const DAILY_LIMIT = 50
const MIN_ANON_ID_LEN = 8

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-anonymous-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ChatMessage = { role: string; content: string }

type ProxyBody = {
  messages?: ChatMessage[]
  model?: string
  max_tokens?: number
  stream?: boolean
}

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}

function getAnonymousId(req: Request): string | null {
  const id =
    req.headers.get('x-anonymous-id') ?? req.headers.get('X-Anonymous-Id')
  if (!id || id.length < MIN_ANON_ID_LEN) return null
  return id
}

function hasBearerAuth(req: Request): boolean {
  const auth = req.headers.get('Authorization') ?? ''
  return auth.startsWith('Bearer ') && auth.length > 'Bearer '.length
}

function parseBody(raw: unknown): ProxyBody | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as ProxyBody
  if (!Array.isArray(body.messages) || body.messages.length === 0) return null
  return body
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key, { auth: { persistSession: false } })
}

async function consumeQuota(anonymousId: string): Promise<{
  allowed: boolean
  requestCount: number
  dailyLimit: number
}> {
  const supabase = serviceClient()
  const { data, error } = await supabase.rpc('consume_ai_proxy_quota', {
    p_anonymous_id: anonymousId,
    p_daily_limit: DAILY_LIMIT,
  })

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Quota RPC returned no row')

  return {
    allowed: Boolean(row.allowed),
    requestCount: Number(row.request_count ?? 0),
    dailyLimit: Number(row.daily_limit ?? DAILY_LIMIT),
  }
}

async function fetchUserApiKey(anonymousId: string): Promise<string | null> {
  const supabase = serviceClient()
  const { data, error } = await supabase.rpc('get_user_ai_key', {
    p_anonymous_id: anonymousId,
  })
  if (error) {
    console.error('get_user_ai_key error', error)
    return null
  }
  const key = typeof data === 'string' ? data : null
  if (!key?.startsWith('nvapi-')) return null
  return key
}

async function forwardToNvidia(
  body: ProxyBody,
  stream: boolean,
  apiKey: string,
): Promise<Response> {
  if (!apiKey) {
    return jsonResponse({ error: 'AI proxy is not configured' }, 503)
  }

  const payload = {
    model: body.model ?? DEFAULT_MODEL,
    max_tokens: body.max_tokens ?? DEFAULT_MAX_TOKENS,
    stream,
    messages: body.messages,
  }

  const upstream = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (stream) {
    const contentType =
      upstream.headers.get('Content-Type') ?? 'text/event-stream'
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!hasBearerAuth(req)) {
    return jsonResponse({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const anonymousId = getAnonymousId(req)
  if (!anonymousId) {
    return jsonResponse(
      {
        error:
          'Missing or invalid x-anonymous-id header (min 8 characters required)',
      },
      400,
    )
  }

  let body: ProxyBody
  try {
    const parsed = parseBody(await req.json())
    if (!parsed) {
      return jsonResponse({ error: 'Invalid body: messages array required' }, 400)
    }
    body = parsed
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const userApiKey = await fetchUserApiKey(anonymousId)
  const sharedApiKey = Deno.env.get('NVIDIA_API_KEY') ?? ''
  const apiKey = userApiKey ?? sharedApiKey

  if (!apiKey) {
    return jsonResponse({ error: 'AI proxy is not configured' }, 503)
  }

  if (!userApiKey) {
    try {
      const quota = await consumeQuota(anonymousId)
      if (!quota.allowed) {
        return jsonResponse(
          {
            error: 'Daily AI request limit exceeded',
            request_count: quota.requestCount,
            daily_limit: quota.dailyLimit,
          },
          429,
        )
      }
    } catch (e) {
      console.error('quota error', e)
      return jsonResponse({ error: 'Rate limit check failed' }, 500)
    }
  }

  const stream = body.stream !== false
  try {
    return await forwardToNvidia(body, stream, apiKey)
  } catch (e) {
    console.error('nvidia proxy error', e)
    return jsonResponse({ error: 'Upstream AI request failed' }, 502)
  }
})
