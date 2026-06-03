/** @param {string} text */
export function stripInlineMarkdown(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

/** @param {string} markdown */
export function markdownToPlain(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>\[\]()#\-]/g, ' ')
    .trim()
}

/**
 * Extract prose-only ranges while preserving original offsets.
 * @param {string} text
 * @returns {{ text: string, start: number }[]}
 */
export function extractProseSegments(text) {
  /** @type {{ text: string, start: number }[]} */
  const ranges = []
  const lines = text.split('\n')
  let cursor = 0
  let inFence = false
  let fenceChar = ''

  const maybePushRange = (start, end) => {
    if (end <= start) return
    ranges.push({ text: text.slice(start, end), start })
  }

  let lineIndex = 0
  if (lines[0]?.trim() === '---') {
    cursor += lines[0].length + (lines.length > 1 ? 1 : 0)
    lineIndex = 1
    while (lineIndex < lines.length) {
      const line = lines[lineIndex]
      cursor += line.length + (lineIndex < lines.length - 1 ? 1 : 0)
      lineIndex += 1
      if (line.trim() === '---' || line.trim() === '...') break
    }
  }

  let proseStart = cursor
  for (; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]
    const trimmed = line.trimStart()
    const lineStart = cursor
    const hasNewline = lineIndex < lines.length - 1
    const lineEnd = lineStart + line.length + (hasNewline ? 1 : 0)

    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/)
    if (fenceMatch) {
      const mark = fenceMatch[1][0]
      if (!inFence) {
        maybePushRange(proseStart, lineStart)
        inFence = true
        fenceChar = mark
      } else if (mark === fenceChar) {
        inFence = false
        proseStart = lineEnd
      }
      cursor = lineEnd
      continue
    }

    if (inFence) {
      cursor = lineEnd
      continue
    }

    if (/^\s*>/.test(line)) {
      maybePushRange(proseStart, lineStart)
      proseStart = lineEnd
      cursor = lineEnd
      continue
    }

    cursor = lineEnd
  }

  maybePushRange(proseStart, text.length)
  return ranges
}
