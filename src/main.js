import { mount } from 'svelte'
import { getCurrentWindow } from '@tauri-apps/api/window'
import './app.css'
import App from './App.svelte'
import { app } from './lib/app.js'
import { initSession } from './lib/modules/session'

document.title = app.name

async function bootstrap() {
  const isMainWindow = getCurrentWindow().label === 'main'
  await initSession(isMainWindow)
  mount(App, { target: document.getElementById('app') })
}

void bootstrap()
