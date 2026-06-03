import { mount } from 'svelte'
import { getCurrentWindow } from '@tauri-apps/api/window'
import './lib/editor/crepeTokens.css'
import './app.css'
import App from './App.svelte'
import { app } from './lib/app.js'
import { initSession } from './lib/modules/session'
import { initSettings } from './lib/modules/settings'
import { migrateRecentProjectsIfNeeded } from './lib/modules/persistence/store.js'
import { isTauri } from './lib/tauriEnv.js'

document.title = app.name

async function bootstrap() {
  let isMainWindow = true
  if (isTauri()) {
    try {
      isMainWindow = getCurrentWindow().label === 'main'
    } catch (e) {
      console.warn('[bootstrap] getCurrentWindow failed:', e)
    }
  }

  const target = document.getElementById('app')
  if (!target) {
    console.error('[bootstrap] #app not found')
    return
  }

  try {
    await migrateRecentProjectsIfNeeded()
  } catch (e) {
    console.warn('[bootstrap] recent projects migration failed:', e)
  }

  mount(App, { target })

  try {
    await Promise.all([initSession(isMainWindow), initSettings(isMainWindow)])
  } catch (e) {
    console.error('[bootstrap] init failed:', e)
  }
}

bootstrap().catch((e) => console.error('[bootstrap]', e))
