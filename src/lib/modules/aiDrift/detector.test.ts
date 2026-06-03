import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  detectAiDriftIssues,
  detectAiDriftIssuesAsync,
  extractMarkdownProseRanges,
} from './detector'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '../../../../tests/fixtures')

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8')
}

describe('extractMarkdownProseRanges', () => {
  it('skips fenced code blocks', () => {
    const text = readFixture('code-heavy.md')
    const ranges = extractMarkdownProseRanges(text)
    const prose = ranges.map((r) => r.text).join('\n')
    expect(prose).not.toMatch(/const x = 1/)
    expect(prose).not.toMatch(/plain fence/)
  })

  it('includes inline code in prose ranges (not stripped)', () => {
    const text = 'Hello `inline code` world'
    const ranges = extractMarkdownProseRanges(text)
    expect(ranges.map((r) => r.text).join('')).toContain('inline code')
  })

  it('skips frontmatter', () => {
    const text = '---\ntitle: Test\n---\n\nBody text here.'
    const ranges = extractMarkdownProseRanges(text)
    const prose = ranges.map((r) => r.text).join('')
    expect(prose).not.toContain('title: Test')
    expect(prose).toContain('Body text here.')
  })

  it('skips blockquote markers but includes heading text', () => {
    const text = '> quoted line\n\n## Heading text\n\nParagraph.'
    const ranges = extractMarkdownProseRanges(text)
    const prose = ranges.map((r) => r.text).join('\n')
    expect(prose).not.toContain('> quoted')
    expect(prose).toContain('Heading text')
    expect(prose).toContain('Paragraph.')
  })

  it('handles empty document', () => {
    expect(extractMarkdownProseRanges('')).toEqual([])
  })

  it('handles unicode and emoji', () => {
    const text = 'Yorùbá has 45 million speakers 🌍'
    const ranges = extractMarkdownProseRanges(text)
    expect(ranges[0]?.text).toContain('Yorùbá')
    expect(ranges[0]?.text).toContain('🌍')
  })
})

describe('detectAiDriftIssues — lexical', () => {
  it('flags "delve into"', () => {
    const result = detectAiDriftIssues("Let's delve into the topic.")
    expect(result.issues.some((i) => /delve/i.test(i.text))).toBe(true)
  })

  it('flags "it\'s important to note"', () => {
    const result = detectAiDriftIssues('It is important to note that safety matters.')
    expect(result.issues.some((i) => i.ruleId === 'filler.phrase')).toBe(true)
  })

  it('does not flag same phrase inside code block', () => {
    const text = '```\ndelve into the evolving landscape\n```\n\nClean prose only.'
    const result = detectAiDriftIssues(text)
    expect(result.issues.some((i) => /delve/i.test(i.text))).toBe(false)
  })

  it('respects severity ordering in fixture vocabulary', () => {
    const result = detectAiDriftIssues(readFixture('ai-vocabulary.md'))
    const severities = new Set(result.issues.map((i) => i.severity))
    expect(severities.has('high') || severities.has('medium') || severities.has('low')).toBe(true)
  })

  it('finds multiple issues in ai-vocabulary fixture', () => {
    const result = detectAiDriftIssues(readFixture('ai-vocabulary.md'))
    expect(result.issues.length).toBeGreaterThan(3)
  })
})

describe('detectAiDriftIssues — structural', () => {
  it('flags low sentence length variance', () => {
    const sentence = 'This sentence has exactly ten words in it here.'
    const text = [sentence, sentence, sentence, sentence].join(' ')
    const result = detectAiDriftIssues(text)
    expect(result.issues.some((i) => i.ruleId === 'rhythm.uniform_sentence_length')).toBe(true)
  })

  it('flags repeated 4-gram phrases', () => {
    const phrase = 'the quick brown fox jumps'
    const text = `${phrase} over something. Later, ${phrase} again here.`
    const result = detectAiDriftIssues(text)
    expect(result.issues.some((i) => i.ruleId === 'structure.repeated_phrase')).toBe(true)
  })

  it('ignores short documents below structural thresholds', () => {
    const result = detectAiDriftIssues('Hi.')
    expect(result.issues.some((i) => i.ruleId === 'rhythm.uniform_sentence_length')).toBe(false)
    expect(result.issues.some((i) => i.ruleId === 'structure.repeated_phrase')).toBe(false)
  })
})

describe('detectAiDriftIssuesAsync — guardrails', () => {
  it('returns partial:true when time budget exceeded', async () => {
    const text = 'word '.repeat(200_000)
    const result = await detectAiDriftIssuesAsync(text, { timeBudgetMs: 1, maxSegmentLength: 128 })
    expect(result.metadata.partial).toBe(true)
  })

  it('respects maxScannedChars', async () => {
    const text = 'word '.repeat(5000)
    const result = await detectAiDriftIssuesAsync(text, { maxScannedChars: 100 })
    expect(result.metadata.truncated).toBe(true)
    expect(result.metadata.scannedChars).toBeLessThanOrEqual(100)
  })

  it('completes within time budget for moderate doc', async () => {
    const text = readFixture('drifttest-excerpt.md')
    const result = await detectAiDriftIssuesAsync(text, { timeBudgetMs: 5000 })
    expect(result.metadata.timedOut).toBe(false)
    expect(result.metadata.partial).toBe(false)
  })
})

describe('drifttest fixture regression', () => {
  it('matches snapshot issue count for drifttest fixture', async () => {
    const text = readFixture('drifttest-excerpt.md')
    const result = await detectAiDriftIssuesAsync(text)
    expect(result.metadata.issueCount).toMatchSnapshot()
  })
})
