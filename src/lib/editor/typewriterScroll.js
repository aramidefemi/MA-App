import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { session } from '../modules/session'

const TYPEWRITER_KEY = new PluginKey('TYPEWRITER_SCROLL')

let suspendedUntil = 0

/** Pause typewriter scroll (e.g. outline `scrollIntoView`). */
export function suspendTypewriterScroll(ms = 900) {
  suspendedUntil = Date.now() + ms
}

function isSuspended() {
  return Date.now() < suspendedUntil
}

/**
 * Centers the caret vertically in the scroll viewport.
 *
 * Formula (caretY = content offset of caret midpoint):
 *   targetScrollTop = caretY - viewportHeight / 2 + padding
 * Clamped to [0, scrollHeight - clientHeight] so short docs don't over-scroll at top
 * and long docs respect the bottom.
 *
 * @param {{
 *   scrollContainer: HTMLElement
 *   cursorTop: number
 *   cursorHeight: number
 *   viewportHeight?: number
 *   padding?: number
 * }} opts
 */
export function computeTypewriterScrollTop({
  scrollContainer,
  cursorTop,
  cursorHeight,
  viewportHeight = scrollContainer.clientHeight,
  padding = 0,
}) {
  const caretMid = cursorTop + cursorHeight / 2
  const target = caretMid - viewportHeight / 2 + padding
  const max = Math.max(0, scrollContainer.scrollHeight - viewportHeight)
  return Math.max(0, Math.min(target, max))
}

/**
 * Map viewport caret coords (from coordsAtPos) to a scroll offset on scrollContainer.
 *
 * @param {HTMLElement} scrollContainer
 * @param {number} caretTop viewport Y of caret top
 * @param {number} caretBottom viewport Y of caret bottom
 */
export function computeTypewriterScrollTopFromCoords(scrollContainer, caretTop, caretBottom) {
  const rect = scrollContainer.getBoundingClientRect()
  const cursorHeight = caretBottom - caretTop
  const cursorTopInContent = caretTop - rect.top + scrollContainer.scrollTop
  return computeTypewriterScrollTop({
    scrollContainer,
    cursorTop: cursorTopInContent,
    cursorHeight,
    viewportHeight: scrollContainer.clientHeight,
  })
}

/** @param {HTMLElement} scrollContainer @param {number} targetScrollTop */
export function applyTypewriterScroll(scrollContainer, targetScrollTop) {
  if (targetScrollTop !== scrollContainer.scrollTop) {
    scrollContainer.scrollTop = targetScrollTop
  }
}

/** @param {import('@milkdown/prose/view').EditorView} view */
export function syncTypewriterScroll(view) {
  if (!session.typewriterScroll || isSuspended()) return

  const container = view.dom.closest('.editor-root')
  if (!container) return

  const pos = view.state.selection.head
  const coords = view.coordsAtPos(pos)
  const next = computeTypewriterScrollTopFromCoords(container, coords.top, coords.bottom)
  applyTypewriterScroll(container, next)
}

export function createTypewriterScrollPlugin() {
  return $prose(() => {
    /** @type {number | null} */
    let rafId = null

    return new Plugin({
      key: TYPEWRITER_KEY,
      view() {
        return {
          update(view) {
            if (!session.typewriterScroll || isSuspended()) return
            if (rafId != null) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(() => {
              rafId = null
              syncTypewriterScroll(view)
            })
          },
          destroy() {
            if (rafId != null) cancelAnimationFrame(rafId)
          },
        }
      },
    })
  })
}
