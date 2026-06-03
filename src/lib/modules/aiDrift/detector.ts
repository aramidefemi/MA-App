import { runStructuralAnalyzers } from './analyzers/structural'
import { extractProseSegments } from '../../markdown/parse.js'
import { AI_DRIFT_RULES } from './rules'
import type {
  AiDriftDetectionResult,
  AiDriftIssue,
  AiDriftRule,
  AiDriftScanMetadata,
  DetectOptions,
  NormalizedDetectOptions,
  ScanBudget,
  TextSegment,
} from './types'

export type {
  AiDriftDetectionResult,
  AiDriftIssue,
  AiDriftScanMetadata,
  AiDriftSeverity,
  DetectOptions,
} from './types'

export { AI_DRIFT_RULES } from './rules'

type ScanState = {
  issues: AiDriftIssue[]
  scannedSegments: number
  scannedChars: number
  timedOut: boolean
  truncatedBySegments: boolean
  truncatedByChars: boolean
}

function splitLargeSegment(segment: TextSegment, maxSegmentLength: number): TextSegment[] {
  if (segment.text.length <= maxSegmentLength) return [segment]

  const pieces: TextSegment[] = []
  const lines = segment.text.split('\n')
  let pieceStart = segment.start
  let buffer = ''
  let consumed = 0

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const withNewline = i < lines.length - 1 ? `${line}\n` : line

    if (buffer && buffer.length + withNewline.length > maxSegmentLength) {
      pieces.push({ text: buffer, start: pieceStart })
      pieceStart += buffer.length
      consumed += buffer.length
      buffer = ''
    }

    if (!buffer && withNewline.length > maxSegmentLength) {
      let cursor = 0
      while (cursor < withNewline.length) {
        const slice = withNewline.slice(cursor, cursor + maxSegmentLength)
        pieces.push({ text: slice, start: segment.start + consumed + cursor })
        cursor += slice.length
      }
      consumed += withNewline.length
      continue
    }

    buffer += withNewline
  }

  if (buffer) pieces.push({ text: buffer, start: pieceStart })
  return pieces
}

/** Extract prose-only ranges while preserving original offsets. */
export function extractMarkdownProseRanges(text: string): TextSegment[] {
  return extractProseSegments(text)
}

function segmentMarkdownProse(text: string, maxSegmentLength: number): TextSegment[] {
  const segments: TextSegment[] = []
  for (const range of extractMarkdownProseRanges(text)) {
    segments.push(...splitLargeSegment(range, maxSegmentLength))
  }
  return segments
}

function normalizeOptions(options: DetectOptions): NormalizedDetectOptions {
  const maxSegmentLength = Math.max(128, options.maxSegmentLength ?? 4_000)
  const maxMatchesPerRule = Math.max(1, options.maxMatchesPerRule ?? 200)
  const maxScannedSegments = Math.max(1, options.maxScannedSegments ?? Number.POSITIVE_INFINITY)
  const maxScannedChars = Math.max(1, options.maxScannedChars ?? Number.POSITIVE_INFINITY)
  const timeBudgetMs = Math.max(1, options.timeBudgetMs ?? Number.POSITIVE_INFINITY)
  const yieldEverySegments = Math.max(1, options.yieldEverySegments ?? 20)

  return {
    maxSegmentLength,
    maxMatchesPerRule,
    maxScannedSegments,
    maxScannedChars,
    timeBudgetMs,
    yieldEverySegments,
    userMaxScannedSegments: options.maxScannedSegments ?? null,
    userMaxScannedChars: options.maxScannedChars ?? null,
    userTimeBudgetMs: options.timeBudgetMs ?? null,
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function finalizeMetadata(
  textLength: number,
  startedAt: number,
  normalized: NormalizedDetectOptions,
  state: ScanState,
): AiDriftScanMetadata {
  const coverage = textLength === 0 ? 1 : Math.min(1, state.scannedChars / textLength)
  const truncated = state.truncatedBySegments || state.truncatedByChars
  const partial = truncated || state.timedOut

  return {
    runDurationMs: Math.round(nowMs() - startedAt),
    textLength,
    issueCount: state.issues.length,
    scannedSegments: state.scannedSegments,
    scannedChars: state.scannedChars,
    partial,
    truncated,
    timedOut: state.timedOut,
    coverage,
    maxSegmentLength: normalized.maxSegmentLength,
    maxMatchesPerRule: normalized.maxMatchesPerRule,
    maxScannedSegments: normalized.userMaxScannedSegments,
    maxScannedChars: normalized.userMaxScannedChars,
    timeBudgetMs: normalized.userTimeBudgetMs,
  }
}

function isProperNounRuleOfThree(match: string): boolean {
  const parts = match.split(/\s*,\s*|\s+and\s+/i)
  if (parts.length !== 3) return false
  return parts.every((part) => /^[A-Z][\w'-]*$/.test(part.trim()))
}

function shouldSkipRuleMatch(ruleId: string, matchedText: string): boolean {
  if (ruleId === 'grammar.rule_of_three_list' && isProperNounRuleOfThree(matchedText)) return true
  return false
}

function scanRuleOnSegment(
  rule: AiDriftRule,
  segment: TextSegment,
  issues: AiDriftIssue[],
  maxMatchesPerRule: number,
): number {
  rule.pattern.lastIndex = 0
  let ruleMatches = 0
  let hit: RegExpExecArray | null
  while ((hit = rule.pattern.exec(segment.text)) != null) {
    const matchedText = hit[1] ?? hit[0]
    if (shouldSkipRuleMatch(rule.id, matchedText)) continue
    const matchIndex = hit[1] != null ? hit.index + hit[0].indexOf(hit[1]) : hit.index
    const start = segment.start + matchIndex
    issues.push({
      ruleId: rule.id,
      label: rule.label,
      severity: rule.severity,
      start,
      end: start + matchedText.length,
      text: matchedText,
    })
    ruleMatches += 1
    if (ruleMatches >= maxMatchesPerRule) break
  }
  return ruleMatches
}

function isTimedOut(startedAt: number, timeBudgetMs: number): boolean {
  return nowMs() - startedAt > timeBudgetMs
}

async function countAndScanSegments(
  segments: TextSegment[],
  normalized: NormalizedDetectOptions,
  state: ScanState,
  startedAt: number,
  shouldYield?: (processedSegments: number) => Promise<void>,
): Promise<TextSegment[]> {
  const scanned: TextSegment[] = []

  for (const segment of segments) {
    if (state.scannedSegments >= normalized.maxScannedSegments) {
      state.truncatedBySegments = true
      break
    }
    if (state.scannedChars + segment.text.length > normalized.maxScannedChars) {
      state.truncatedByChars = true
      break
    }
    if (isTimedOut(startedAt, normalized.timeBudgetMs)) {
      state.timedOut = true
      break
    }

    state.scannedSegments += 1
    state.scannedChars += segment.text.length
    scanned.push(segment)

    if (shouldYield && state.scannedSegments % normalized.yieldEverySegments === 0) {
      await shouldYield(state.scannedSegments)
    }
  }

  return scanned
}

async function runDetectionScan(
  text: string,
  normalized: NormalizedDetectOptions,
  shouldYield?: (processedSegments: number) => Promise<void>,
): Promise<AiDriftDetectionResult> {
  const startedAt = nowMs()
  const segments = segmentMarkdownProse(text, normalized.maxSegmentLength)
  const state: ScanState = {
    issues: [],
    scannedSegments: 0,
    scannedChars: 0,
    timedOut: false,
    truncatedBySegments: false,
    truncatedByChars: false,
  }

  const scannedSegments = await countAndScanSegments(
    segments,
    normalized,
    state,
    startedAt,
    shouldYield,
  )

  if (!state.timedOut && !state.truncatedByChars && !state.truncatedBySegments) {
    for (const rule of AI_DRIFT_RULES) {
      if (isTimedOut(startedAt, normalized.timeBudgetMs)) {
        state.timedOut = true
        break
      }

      let matchCount = 0
      for (const segment of scannedSegments) {
        matchCount += scanRuleOnSegment(rule, segment, state.issues, normalized.maxMatchesPerRule)
        if (matchCount >= normalized.maxMatchesPerRule) break
      }
    }
  }

  if (!state.timedOut && !state.truncatedByChars && !state.truncatedBySegments) {
    const analyzerBudget: ScanBudget = {
      startedAt,
      timeBudgetMs: normalized.timeBudgetMs,
      maxMatches: normalized.maxMatchesPerRule,
    }
    runStructuralAnalyzers(scannedSegments, state.issues, analyzerBudget)
    if (isTimedOut(startedAt, normalized.timeBudgetMs)) state.timedOut = true
  }

  state.issues.sort((a, b) => (a.start !== b.start ? a.start - b.start : a.end - b.end))

  return {
    issues: state.issues,
    metadata: finalizeMetadata(text.length, startedAt, normalized, state),
  }
}

export async function detectAiDriftIssuesAsync(
  text: string,
  options: DetectOptions = {},
): Promise<AiDriftDetectionResult> {
  const normalized = normalizeOptions(options)
  return runDetectionScan(text, normalized, async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  })
}

export function detectAiDriftIssues(
  text: string,
  options: DetectOptions = {},
): AiDriftDetectionResult {
  const normalized = normalizeOptions(options)
  const startedAt = nowMs()
  const segments = segmentMarkdownProse(text, normalized.maxSegmentLength)
  const state: ScanState = {
    issues: [],
    scannedSegments: 0,
    scannedChars: 0,
    timedOut: false,
    truncatedBySegments: false,
    truncatedByChars: false,
  }

  const scannedSegments: TextSegment[] = []
  for (const segment of segments) {
    if (state.scannedSegments >= normalized.maxScannedSegments) {
      state.truncatedBySegments = true
      break
    }
    if (state.scannedChars + segment.text.length > normalized.maxScannedChars) {
      state.truncatedByChars = true
      break
    }
    if (isTimedOut(startedAt, normalized.timeBudgetMs)) {
      state.timedOut = true
      break
    }
    state.scannedSegments += 1
    state.scannedChars += segment.text.length
    scannedSegments.push(segment)
  }

  if (!state.timedOut && !state.truncatedByChars && !state.truncatedBySegments) {
    for (const rule of AI_DRIFT_RULES) {
      if (isTimedOut(startedAt, normalized.timeBudgetMs)) {
        state.timedOut = true
        break
      }
      let matchCount = 0
      for (const segment of scannedSegments) {
        matchCount += scanRuleOnSegment(rule, segment, state.issues, normalized.maxMatchesPerRule)
        if (matchCount >= normalized.maxMatchesPerRule) break
      }
    }

    runStructuralAnalyzers(scannedSegments, state.issues, {
      startedAt,
      timeBudgetMs: normalized.timeBudgetMs,
      maxMatches: normalized.maxMatchesPerRule,
    })
    if (isTimedOut(startedAt, normalized.timeBudgetMs)) state.timedOut = true
  }

  state.issues.sort((a, b) => (a.start !== b.start ? a.start - b.start : a.end - b.end))

  return {
    issues: state.issues,
    metadata: finalizeMetadata(text.length, startedAt, normalized, state),
  }
}
