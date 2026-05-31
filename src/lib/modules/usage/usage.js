import { getAnonymousId } from './anonymousId.js'
import { getUsageClient } from './client.js'

const HEARTBEAT_MS = 60 * 60 * 1000
const TABLE = 'usage_patterns'

function nowIso() {
  return new Date().toISOString()
}

function usageDevLog(context, err) {
  if (import.meta.env.DEV) console.debug('[usage]', context, err)
}

export async function recordLaunch() {
  const supabase = await getUsageClient()
  if (!supabase) return

  try {
    const anonymousId = await getAnonymousId()
    const now = nowIso()

    const { data: existing, error: fetchError } = await supabase
      .from(TABLE)
      .select('first_seen, last_open')
      .eq('anonymous_id', anonymousId)
      .maybeSingle()

    if (fetchError) throw fetchError

    const row = existing
      ? {
          anonymous_id: anonymousId,
          first_seen: existing.first_seen,
          previous_open: existing.last_open,
          last_open: now,
          updated_at: now,
        }
      : {
          anonymous_id: anonymousId,
          first_seen: now,
          last_open: now,
          previous_open: null,
          updated_at: now,
        }

    const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'anonymous_id' })
    if (error) throw error
  } catch (err) {
    usageDevLog('recordLaunch', err)
  }
}

export async function recordHeartbeat() {
  const supabase = await getUsageClient()
  if (!supabase) return

  try {
    const anonymousId = await getAnonymousId()
    const { error } = await supabase
      .from(TABLE)
      .update({ updated_at: nowIso() })
      .eq('anonymous_id', anonymousId)

    if (error) throw error
  } catch (err) {
    usageDevLog('recordHeartbeat', err)
  }
}

export function initUsageTracking() {
  recordLaunch()

  const timer = setInterval(recordHeartbeat, HEARTBEAT_MS)
  return () => clearInterval(timer)
}
