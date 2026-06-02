import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import { resolveDriftIssuesInDoc } from './driftFindInDoc.js'

const DRIFT_KEY = new PluginKey('AI_DRIFT_HIGHLIGHT')

/** @type {import('./driftFindInDoc.js').DriftIssue[]} */
let activeIssues = []

/** @param {import('./driftFindInDoc.js').DriftIssue[]} issues */
export function setDriftHighlightIssues(issues) {
  activeIssues = issues
}

/** @param {import('@milkdown/prose/state').EditorState} state */
export function buildDriftDecorations(state) {
  if (!activeIssues.length) return DecorationSet.empty

  const resolved = resolveDriftIssuesInDoc(state.doc, activeIssues)
  if (!resolved.length) return DecorationSet.empty

  const decos = resolved.map(({ from, to, issue }) =>
    Decoration.inline(from, to, {
      class: `drift-highlight drift-highlight-${issue.severity}`,
      'data-drift-label': issue.label,
      title: issue.label,
    }),
  )

  return DecorationSet.create(state.doc, decos)
}

export const driftHighlightIntegration = $prose(() => {
  return new Plugin({
    key: DRIFT_KEY,
    props: {
      decorations(state) {
        return buildDriftDecorations(state)
      },
    },
  })
})
