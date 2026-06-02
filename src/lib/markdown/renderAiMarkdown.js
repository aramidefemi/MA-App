import { Marked } from 'marked'

const marked = new Marked({
  breaks: true,
  gfm: true,
})

marked.use({
  renderer: {
    html({ text }) {
      return escapeHtml(text)
    },
  },
})

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** @param {string} text */
export function renderAiMarkdown(text) {
  if (!text) return ''
  return marked.parse(text, { async: false })
}
