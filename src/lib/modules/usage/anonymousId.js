import { load } from '@tauri-apps/plugin-store'

const STORE_FILE = 'ma.json'
const ANON_ID_KEY = 'anonymous_id'

export async function getAnonymousId() {
  const store = await load(STORE_FILE)
  let id = await store.get(ANON_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    await store.set(ANON_ID_KEY, id)
    await store.save()
  }
  return id
}
