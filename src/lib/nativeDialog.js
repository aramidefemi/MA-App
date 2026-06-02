import { confirm } from '@tauri-apps/plugin-dialog'
import { isTauri } from './tauriEnv.js'

/**
 * @param {string} message
 * @param {{ title?: string, kind?: 'info' | 'warning' | 'error' }} [options]
 */
export async function confirmAction(message, options = {}) {
  if (isTauri()) {
    return confirm(message, {
      title: options.title ?? 'Confirm',
      kind: options.kind ?? 'warning',
    })
  }
  return globalThis.confirm(message)
}
