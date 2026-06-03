/** @param {string} text @param {string} query @param {boolean} caseSensitive */
export function normalizeSearch(text, query, caseSensitive) {
  return caseSensitive ? { text, query } : { text: text.toLowerCase(), query: query.toLowerCase() }
}

/**
 * @param {import('@milkdown/prose').Node} doc
 * @param {string} query
 * @param {number} fromPos
 * @param {boolean} caseSensitive
 * @returns {{ from: number, to: number } | null}
 */
export function findTextFrom(doc, query, fromPos, caseSensitive) {
  if (!query) return null
  const { query: q } = normalizeSearch('', query, caseSensitive)
  /** @type {{ from: number, to: number } | null} */
  let match = null

  doc.nodesBetween(fromPos, doc.content.size, (node, pos) => {
    if (match || !node.isText || !node.text) return
    const { text } = normalizeSearch(node.text, query, caseSensitive)
    const start = Math.max(0, fromPos - pos)
    const idx = text.indexOf(q, start)
    if (idx >= 0) match = { from: pos + idx, to: pos + idx + query.length }
  })

  if (!match && fromPos > 0) {
    doc.nodesBetween(0, fromPos, (node, pos) => {
      if (match || !node.isText || !node.text) return
      const { text } = normalizeSearch(node.text, query, caseSensitive)
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
 * @returns {{ from: number, to: number } | null}
 */
export function findTextBefore(doc, query, beforePos, caseSensitive) {
  if (!query) return null
  const { query: q } = normalizeSearch('', query, caseSensitive)
  /** @type {{ from: number, to: number } | null} */
  let last = null

  doc.nodesBetween(0, beforePos, (node, pos) => {
    if (!node.isText || !node.text) return
    const { text } = normalizeSearch(node.text, query, caseSensitive)
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
