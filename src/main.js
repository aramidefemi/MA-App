import { mount } from 'svelte'
import { getCurrentWindow } from '@tauri-apps/api/window'
import './lib/editor/crepeTokens.css'
import './app.css'
import App from './App.svelte'
import { app } from './lib/app.js'
import { initSession } from './lib/modules/session'
import { initSettings } from './lib/modules/settings'

document.title = app.name

async function bootstrap() {
  const isMainWindow = getCurrentWindow().label === 'main'
  await Promise.all([initSession(isMainWindow), initSettings(isMainWindow)])
  mount(App, { target: document.getElementById('app') })
}

void bootstrap()
