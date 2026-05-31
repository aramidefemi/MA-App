import { getUsageClient } from '../modules/usage/client.js'

export async function saveApiKey(key) {
  const supabase = await getUsageClient()
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase.rpc('upsert_user_ai_key', { p_api_key: key.trim() })
  if (error) throw error
}

export async function clearApiKey() {
  const supabase = await getUsageClient()
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase.rpc('delete_user_ai_key')
  if (error) throw error
}

export async function hasApiKey() {
  const supabase = await getUsageClient()
  if (!supabase) return false

  const { data, error } = await supabase.rpc('has_user_ai_key')
  if (error) {
    if (import.meta.env.DEV) console.debug('[keys] has_user_ai_key', error)
    return false
  }
  return !!data
}
