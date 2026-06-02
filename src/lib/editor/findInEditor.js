import { TextSelection } from '@milkdown/prose/state'

/** @param {string} text @param {string} query @param {boolean} caseSensitive */
function norm(text, query, caseSensitive) {
  return caseSensitive ? { text, query } : { text: text.toLowerCase(), query: query.toLowerCase() }
}

/**
 * @param {import('@milkdown/prose').Node} doc
 * @param {string} query
 * @param {number} fromPos
 * @param {boolean} caseSensitive
 */
function findFrom(doc, query, fromPos, caseSensitive) {
  if (!query) return null
  const { query: q } = norm('', query, caseSensitive)
  let match = null

  doc.nodesBetween(fromPos, doc.content.size, (node, pos) => {
    if (match || !node.isText || !node.text) return
    const { text } = norm(node.text, query, caseSensitive)
    const start = Math.max(0, fromPos - pos)
    const idx = text.indexOf(q, start)
    if (idx >= 0) match = { from: pos + idx, to: pos + idx + query.length }
  })

  if (!match && fromPos > 0) {
    doc.nodesBetween(0, fromPos, (node, pos) => {
      if (match || !node.isText || !node.text) return
      const { text } = norm(node.text, query, caseSensitive)
      const idx = text.indexOf(q)
      if (idx >= 0) match = { from: pos + idx, to: pos + idx + query.length }
    })
  }

  return match
}

/**
 * @param {import('@milkdown/prose').Node} doc
 * @param {string} query
 * @param {number} beforePos
 * @param {boolean} caseSensitive
 */
function findLastBefore(doc, query, beforePos, caseSensitive) {
  if (!query) return null
  const { query: q } = norm('', query, caseSensitive)
  /** @type {{ from: number, to: number } | null} */
  let last = null

  doc.nodesBetween(0, beforePos, (node, pos) => {
    if (!node.isText || !node.text) return
    const { text } = norm(node.text, query, caseSensitive)
    let idx = 0
    while (idx < text.length) {
      const found = text.indexOf(q, idx)
      if (found < 0) break
      const from = pos + found
      const to = from + query.length
      if (to <= beforePos) last = { from, to }
      idx = found + 1
    }
  })

  return last
}

/** @param {import('@milkdown/prose/view').EditorView} view @param {{ from: number, to: number }} match */
function applyMatch(view, match) {
  const { state } = view
  const tr = state.tr.setSelection(TextSelection.create(state.doc, match.from, match.to)).scrollIntoView()
  view.dispatch(tr)
  view.focus()
}

/**
 * @param {import('@milkdown/prose/view').EditorView} view
 * @param {string} query
 * @param {{ caseSensitive?: boolean }} [opts]
 */
export function findNextInView(view, query, opts = {}) {
  const caseSensitive = opts.caseSensitive ?? false
  const from = view.state.selection.empty ? view.state.selection.from : view.state.selection.to
  const match = findFrom(view.state.doc, query, from, caseSensitive)
  if (!match) return false
  applyMatch(view, match)
  return true
}

/**
 * @param {import('@milkdown/prose/view').EditorView} view
 * @param {string} query
 * @param {{ caseSensitive?: boolean }} [opts]
 */
export function findPreviousInView(view, query, opts = {}) {
  const caseSensitive = opts.caseSensitive ?? false
  const before = view.state.selection.from
  const match = findLastBefore(view.state.doc, query, before, caseSensitive)
  if (!match) return false
  applyMatch(view, match)
  return true
}
