import {
  coefficientOfVariation,
  isSubjectlessFragment,
  sentenceWordCount,
  splitSentencesWithOffsets,
} from '../sentenceUtils'
import type { AiDriftIssue, ScanBudget, TextSegment } from '../types'

type WordSpan = { word: string; start: number; end: number }

const WORD_RE = /\b[\w'\u00C0-\u024F]+\b/gu
const BOLD_HEADER_LINE = /^\s*\*\*[^*]+\*\*\s+(?:is|are|was|were|built|has|have|had)\b/i
const MIN_REPEATED_PHRASE_WORDS = 4
const MAX_REPEATED_PHRASE_WORDS = 8
const MIN_REPEATED_OCCURRENCES = 2

function budgetExpired(budget: ScanBudget): boolean {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return now - budget.startedAt > budget.timeBudgetMs
}

function pushIssue(
  issues: AiDriftIssue[],
  budget: ScanBudget,
  issue: AiDriftIssue,
): boolean {
  if (issues.length >= budget.maxMatches) return false
  issues.push(issue)
  return true
}

function extractWordSpans(text: string): WordSpan[] {
  const spans: WordSpan[] = []
  WORD_RE.lastIndex = 0
  let hit: RegExpExecArray | null
  while ((hit = WORD_RE.exec(text)) != null) {
    spans.push({ word: hit[0], start: hit.index, end: hit.index + hit[0].length })
  }
  return spans
}

function countSeparatedOccurrences(starts: number[], minGap: number): number {
  if (starts.length < MIN_REPEATED_OCCURRENCES) return starts.length
  let distinct = 1
  for (let i = 1; i < starts.length; i += 1) {
    if (starts[i] - starts[i - 1] >= minGap) distinct += 1
  }
  return distinct
}

function findRepeatedPhrases(segment: TextSegment, issues: AiDriftIssue[], budget: ScanBudget): void {
  const spans = extractWordSpans(segment.text)
  if (spans.length < MIN_REPEATED_PHRASE_WORDS) return

  const reported = new Set<string>()
  const maxN = Math.min(MAX_REPEATED_PHRASE_WORDS, spans.length)

  for (let n = maxN; n >= MIN_REPEATED_PHRASE_WORDS; n -= 1) {
    if (budgetExpired(budget)) return

    const byKey = new Map<string, { starts: number[]; end: number }>()
    for (let i = 0; i <= spans.length - n; i += 1) {
      const key = spans.slice(i, i + n).map((s) => s.word.toLowerCase()).join(' ')
      const start = spans[i].start
      const end = spans[i + n - 1].end
      const entry = byKey.get(key) ?? { starts: [], end }
      entry.starts.push(start)
      byKey.set(key, entry)
    }

    for (const [key, { starts, end }] of byKey) {
      if (reported.has(key)) continue
      if (countSeparatedOccurrences(starts, 30) < MIN_REPEATED_OCCURRENCES) continue

      reported.add(key)
      const localStart = starts[0]
      const snippet = segment.text.slice(localStart, end)
      if (
        !pushIssue(issues, budget, {
          ruleId: 'structure.repeated_phrase',
          label: 'Repeated phrase',
          severity: 'medium',
          start: segment.start + localStart,
          end: segment.start + end,
          text: snippet.length > 80 ? `${snippet.slice(0, 77)}...` : snippet,
        })
      ) {
        return
      }
    }
  }
}

function findSubjectlessFragments(segment: TextSegment, issues: AiDriftIssue[], budget: ScanBudget): void {
  for (const sentence of splitSentencesWithOffsets(segment.text)) {
    if (budgetExpired(budget)) return
    if (!isSubjectlessFragment(sentence.text)) continue
    pushIssue(issues, budget, {
      ruleId: 'structure.subjectless_fragment',
      label: 'Subjectless fragment',
      severity: 'medium',
      start: segment.start + sentence.start,
      end: segment.start + sentence.end,
      text: sentence.text,
    })
  }
}

function findUniformRhythm(segment: TextSegment, issues: AiDriftIssue[], budget: ScanBudget): void {
  const blocks = segment.text.split(/\n\s*\n/)
  let offset = 0
  for (const block of blocks) {
    if (budgetExpired(budget)) return
    const blockStart = segment.text.indexOf(block, offset)
    offset = blockStart + block.length

    const sentences = splitSentencesWithOffsets(block)
    if (sentences.length < 4) continue

    const counts = sentences.map((s) => sentenceWordCount(s.text))
    const cv = coefficientOfVariation(counts)
    if (cv === null || cv >= 0.15) continue

    const first = sentences[0]
    const last = sentences[sentences.length - 1]
    pushIssue(issues, budget, {
      ruleId: 'rhythm.uniform_sentence_length',
      label: 'Uniform sentence rhythm',
      severity: 'low',
      start: segment.start + blockStart + first.start,
      end: segment.start + blockStart + last.end,
      text: block.length > 120 ? `${block.slice(0, 117)}...` : block,
    })
  }
}

function findParallelBoldBlocks(segment: TextSegment, issues: AiDriftIssue[], budget: ScanBudget): void {
  const lines = segment.text.split('\n')
  let lineOffset = 0
  let run: { start: number; lines: string[] } | null = null

  const flush = () => {
    if (!run || run.lines.length < 3) {
      run = null
      return
    }
    const text = run.lines.join('\n')
    pushIssue(issues, budget, {
      ruleId: 'structure.parallel_bold_blocks',
      label: 'Parallel bold project blocks',
      severity: 'medium',
      start: segment.start + run.start,
      end: segment.start + run.start + text.length,
      text: text.length > 100 ? `${text.slice(0, 97)}...` : text,
    })
    run = null
  }

  for (const line of lines) {
    const matches = BOLD_HEADER_LINE.test(line)
    if (matches) {
      if (!run) run = { start: lineOffset, lines: [line] }
      else run.lines.push(line)
    } else {
      flush()
    }
    lineOffset += line.length + 1
  }
  flush()
}

/** Run structural analyzers on prose segments (offsets are document-global). */
export function runStructuralAnalyzers(
  segments: TextSegment[],
  issues: AiDriftIssue[],
  budget: ScanBudget,
): void {
  for (const segment of segments) {
    if (budgetExpired(budget)) return
    findRepeatedPhrases(segment, issues, budget)
    findSubjectlessFragments(segment, issues, budget)
    findUniformRhythm(segment, issues, budget)
    findParallelBoldBlocks(segment, issues, budget)
    if (issues.length >= budget.maxMatches) return
  }
}
