import { TextSelection } from '@milkdown/prose/state'
import { findTextBefore, findTextFrom } from './proseTextSearch.js'

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
  const match = findTextFrom(view.state.doc, query, from, caseSensitive)
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
  const match = findTextBefore(view.state.doc, query, before, caseSensitive)
  if (!match) return false
  applyMatch(view, match)
  return true
}
