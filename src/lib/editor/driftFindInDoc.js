/** @typedef {{ ruleId: string, label: string, severity: string, start: number, end: number, text: string }} DriftIssue */

/** @param {DriftIssue} issue */
export function issueSearchText(issue) {
  let text = issue.text
  if (text.endsWith('...')) text = text.slice(0, -3).trimEnd()
  return text.replace(/\*\*/g, '').replace(/__/g, '')
}

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
function findTextFrom(doc, query, fromPos, caseSensitive) {
  if (!query) return null
  const { query: q } = norm('', query, caseSensitive)
  /** @type {{ from: number, to: number } | null} */
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
