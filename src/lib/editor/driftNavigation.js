import { TextSelection } from '@milkdown/prose/state'
import { resolveDriftIssuesInDoc } from './driftFindInDoc.js'

/** @type {import('./driftFindInDoc.js').DriftIssue[]} */
let issues = []
let index = -1

/** @param {import('./driftFindInDoc.js').DriftIssue[]} next */
export function setDriftNavigationIssues(next) {
  issues = next
  index = -1
}

/** @param {import('@milkdown/prose/view').EditorView} view @param {{ from: number, to: number }} match */
function applyMatch(view, match) {
  const { state } = view
  const tr = state.tr
    .setSelection(TextSelection.create(state.doc, match.from, match.to))
    .scrollIntoView()
  view.dispatch(tr)
  view.focus()
}

/**
 * @param {import('@milkdown/prose/view').EditorView} view
 * @param {{ backward?: boolean }} [opts]
 */
export function cycleDriftIssueInView(view, opts = {}) {
  const resolved = resolveDriftIssuesInDoc(view.state.doc, issues)
  if (!resolved.length) return false

  if (opts.backward) {
    index = index <= 0 ? resolved.length - 1 : index - 1
  } else {
    index = (index + 1) % resolved.length
  }

  applyMatch(view, resolved[index])
  return true
}

/** @param {import('@milkdown/prose/view').EditorView} view */
export function getResolvedDriftCount(view) {
  return resolveDriftIssuesInDoc(view.state.doc, issues).length
}
