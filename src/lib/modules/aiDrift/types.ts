export type AiDriftSeverity = 'low' | 'medium' | 'high'

export type AiDriftIssue = {
  ruleId: string
  label: string
  severity: AiDriftSeverity
  start: number
  end: number
  text: string
}

export type AiDriftRule = {
  id: string
  label: string
  severity: AiDriftSeverity
  pattern: RegExp
}

export type TextSegment = {
  text: string
  start: number
}

export type AiDriftScanMetadata = {
  runDurationMs: number
  textLength: number
  issueCount: number
  scannedSegments: number
  scannedChars: number
  partial: boolean
  truncated: boolean
  timedOut: boolean
  coverage: number
  maxSegmentLength: number
  maxMatchesPerRule: number
  maxScannedSegments: number | null
  maxScannedChars: number | null
  timeBudgetMs: number | null
}

export type AiDriftDetectionResult = {
  issues: AiDriftIssue[]
  metadata: AiDriftScanMetadata
}

export type DetectOptions = {
  maxSegmentLength?: number
  maxMatchesPerRule?: number
  maxScannedSegments?: number
  maxScannedChars?: number
  timeBudgetMs?: number
  yieldEverySegments?: number
}

export type NormalizedDetectOptions = {
  maxSegmentLength: number
  maxMatchesPerRule: number
  maxScannedSegments: number
  maxScannedChars: number
  timeBudgetMs: number
  yieldEverySegments: number
  userMaxScannedSegments: number | null
  userMaxScannedChars: number | null
  userTimeBudgetMs: number | null
}

export type ScanBudget = {
  startedAt: number
  timeBudgetMs: number
  maxMatches: number
}
