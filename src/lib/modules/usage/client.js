import { createClient } from '@supabase/supabase-js'
import { getAnonymousId } from './anonymousId.js'

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null
/** @type {string | null} */
let cachedAnonId = null

export async function getUsageClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const anonymousId = await getAnonymousId()
  if (!client || cachedAnonId !== anonymousId) {
    client = createClient(url, key, {
      global: { headers: { 'x-anonymous-id': anonymousId } }
    })
    cachedAnonId = anonymousId
  }
  return client
}
