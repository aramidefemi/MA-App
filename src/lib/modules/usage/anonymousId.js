import { getKey, setKey } from '../persistence/store.js'

const ANON_ID_KEY = 'anonymous_id'

export async function getAnonymousId() {
  let id = await getKey(ANON_ID_KEY, null)
  if (!id) {
    id = crypto.randomUUID()
    await setKey(ANON_ID_KEY, id)
  }
  return id
}
