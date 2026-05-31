/** AI panel open flow — use console.log so logs show in Tauri webview devtools. */
export function aiLog(step, data) {
  if (data !== undefined) console.log(`[ai-flow] ${step}`, data)
  else console.log(`[ai-flow] ${step}`)
}

export function aiWarn(step, data) {
  if (data !== undefined) console.warn(`[ai-flow] ${step}`, data)
  else console.warn(`[ai-flow] ${step}`)
}
