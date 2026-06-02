import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { isTauri } from './tauriEnv.js'

/** @param {string} text */
export async function copyText(text) {
  if (isTauri()) {
    await writeText(text)
    return
  }
  await navigator.clipboard.writeText(text)
}
