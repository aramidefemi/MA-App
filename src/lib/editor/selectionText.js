/** @param {import('@milkdown/prose/view').EditorView} view */
export function readSelectionText(view) {
  const { from, to, selection, doc } = view.state
  if (!selection.empty) {
    const live = doc.textBetween(from, to, ' ').trim()
    if (live) return live
  }

  const sel = window.getSelection()
  if (sel?.rangeCount && !sel.isCollapsed) {
    const range = sel.getRangeAt(0)
    if (view.dom.contains(range.commonAncestorContainer)) {
      return sel.toString().trim()
    }
  }

  return ''
}
