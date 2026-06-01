import { suspendTypewriterScroll } from '../editor/typewriterScroll.js'

/**
 * @typedef {{ level: number, text: string, index: number }} HeadingItem
 */

/** @param {string} markdown @param {number} [maxLevel] @returns {HeadingItem[]} */
export function parseHeadings(markdown, maxLevel = 6) {
  const re = new RegExp(`^(#{1,${maxLevel}})\\s+(.+)`)
  return markdown
    .split('\n')
    .map((line, i) => {
      const match = line.match(re)
      if (!match) return null
      return { level: match[1].length, text: match[2].trim(), index: i }
    })
    .filter(Boolean)
}

/** @param {string} text */
export function jumpToHeading(text) {
  suspendTypewriterScroll()
  const selectors = 'h1, h2, h3, h4, h5, h6'
  const nodes = globalThis.document.querySelectorAll(`.milkdown .ProseMirror ${selectors}`)
  for (const node of nodes) {
    if (node.textContent.trim() === text) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
      break
    }
  }
}

/** @param {number} level */
export function headingIndentPx(level) {
  return (level - 1) * 12
}
