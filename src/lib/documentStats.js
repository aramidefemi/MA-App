const WORDS_PER_MINUTE = 200

export function markdownToPlain(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>\[\]()#\-]/g, ' ')
    .trim()
}

export function getDocumentStats(markdown) {
  const plain = markdownToPlain(markdown)
  const words = plain.split(/\s+/).filter((w) => w.length > 0).length
  const chars = plain.length
  const readingSeconds = Math.ceil((words / WORDS_PER_MINUTE) * 60)
  return { words, chars, readingSeconds }
}

export function formatReadingTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function readingMinutes(readingSeconds) {
  return Math.max(1, Math.ceil(readingSeconds / 60))
}
