const DEFAULT_MS = 800

/** @param {() => void | Promise<void>} onSave @param {number} [delayMs] */
export function createAutosave(onSave, delayMs = DEFAULT_MS) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null

  function cancel() {
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function schedule() {
    cancel()
    timer = setTimeout(() => {
      timer = null
      void onSave()
    }, delayMs)
  }

  return { schedule, cancel }
}
