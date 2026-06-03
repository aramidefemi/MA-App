/** Pause typing this long before auto-revealing dismissed editor chrome. */
export const CHROME_IDLE_REVEAL_MS = 2000

/** @returns {{ schedule: (onReveal: () => void) => void, cancel: () => void }} */
export function createIdleRevealScheduler(delayMs = CHROME_IDLE_REVEAL_MS) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null

  return {
    schedule(onReveal) {
      if (timer != null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        onReveal()
      }, delayMs)
    },
    cancel() {
      if (timer != null) {
        clearTimeout(timer)
        timer = null
      }
    },
  }
}
