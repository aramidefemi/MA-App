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
 * Scroll offset that vertically centers the caret in the container.
 * Clamped so we never over-scroll at top or bottom.
 *
 * @param {HTMLElement} container
 * @param {number} caretTop viewport Y of caret top
 * @param {number} caretBottom viewport Y of caret bottom
 */
export function computeTypewriterScrollTop(container, caretTop, caretBottom) {
  const rect = container.getBoundingClientRect()
  const caretMid = (caretTop + caretBottom) / 2
  const caretY = caretMid - rect.top + container.scrollTop
  const target = caretY - container.clientHeight / 2
  const max = Math.max(0, container.scrollHeight - container.clientHeight)
  return Math.max(0, Math.min(target, max))
}

/** @param {import('@milkdown/prose/view').EditorView} view */
function applyTypewriterScroll(view) {
  if (!session.typewriterScroll || isSuspended()) return

  const container = view.dom.closest('.editor-root')
  if (!container) return

  const pos = view.state.selection.head
  const coords = view.coordsAtPos(pos)
  const next = computeTypewriterScrollTop(container, coords.top, coords.bottom)
  if (next !== container.scrollTop) container.scrollTop = next
}

export function createTypewriterScrollPlugin() {
  return $prose(() => {
    return new Plugin({
      key: TYPEWRITER_KEY,
      view() {
        return {
          update(view) {
            applyTypewriterScroll(view)
          },
        }
      },
    })
  })
}
