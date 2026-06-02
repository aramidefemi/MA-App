/** @typedef {import('./formatState.js').FormatActions} FormatActions */
/** @typedef {import('./formatState.js').FormatActiveState} FormatActiveState */

/** @type {FormatActions | null} */
let actions = null

/** @type {Set<(state: FormatActiveState) => void>} */
const listeners = new Set()

/** @type {Set<(ready: boolean) => void>} */
const readyListeners = new Set()

/** @param {FormatActions | null} next */
export function setFormatActions(next) {
  actions = next
  const ready = !!next
  for (const fn of readyListeners) fn(ready)
}

/** @returns {FormatActions | null} */
export function getFormatActions() {
  return actions
}

/** @param {FormatActiveState} state */
export function pushFormatState(state) {
  for (const fn of listeners) fn(state)
}

/** @param {(state: FormatActiveState) => void} fn */
export function subscribeFormatState(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** @param {(ready: boolean) => void} fn */
export function subscribeFormatReady(fn) {
  fn(!!actions)
  readyListeners.add(fn)
  return () => readyListeners.delete(fn)
}
