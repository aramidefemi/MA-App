import { findTextFrom } from './proseTextSearch.js'

/** @typedef {{ ruleId: string, label: string, severity: string, start: number, end: number, text: string }} DriftIssue */

/** @param {DriftIssue} issue */
export function issueSearchText(issue) {
  let text = issue.text
  if (text.endsWith('...')) text = text.slice(0, -3).trimEnd()
  return text.replace(/\*\*/g, '').replace(/__/g, '')
}

/**
 * Map drift issues (markdown offsets) to ProseMirror ranges via ordered text search.
 * @param {import('@milkdown/prose').Node} doc
 * @param {DriftIssue[]} issues
 */
export function resolveDriftIssuesInDoc(doc, issues) {
  /** @type {{ from: number, to: number, issue: DriftIssue }[]} */
  const resolved = []
  let searchFrom = 0

  for (const issue of issues) {
    const query = issueSearchText(issue)
    if (!query) continue
    const match = findTextFrom(doc, query, searchFrom, false)
    if (!match) continue
    resolved.push({ ...match, issue })
    searchFrom = match.to
  }

  return resolved
}
