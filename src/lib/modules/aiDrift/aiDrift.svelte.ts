type AiDriftManualCheckInput = {
  filePath: string | null
  content: string
  contentVersion: number
  getLatestContentVersion?: () => number
}

import type { AiDriftDetectionResult } from './detector'
import type { AiDriftIssue } from './types'
import { detectAiDriftIssuesAsync } from './detector'
import { getEditorCommands } from '../../editor/editorCommands.js'
import { hashContent, isCheckStale } from './stale'

/** Pause typing this long before an automatic re-scan (non-blocking). */
const AUTO_SCAN_DEBOUNCE_MS = 2000

type AiDriftManualCheckPayload = {
  runId: number
  filePath: string | null
  content: string
  contentLength: number
  contentVersion: number
  contentHash: string
  requestedAt: number
  completedAt: number
  stale: boolean
  result: AiDriftDetectionResult
}

let lastManualCheck = $state<AiDriftManualCheckPayload | null>(null)
let isRunning = $state(false)
let lastError = $state<string | null>(null)
let currentRunId = $state(0)
let currentFilePath = $state<string | null>(null)
let currentContent = $state('')
let currentContentVersion = $state(0)
let currentIsPreview = $state(false)
let lastTrackedFilePath = $state<string | null>(null)
/** @type {ReturnType<typeof setTimeout> | null} */
let debouncedScanTimer = null

const LONG_DOC_GUARDRAILS = {
  timeBudgetMs: 45,
  maxScannedChars: 120_000,
  maxScannedSegments: 80,
} as const

function createAiDriftManualPayload(
  input: AiDriftManualCheckInput,
  result: AiDriftDetectionResult,
  runId: number,
  requestedAt: number,
  completedAt: number,
  stale: boolean,
): AiDriftManualCheckPayload {
  return {
    runId,
    filePath: input.filePath,
    content: input.content,
    contentLength: input.content.length,
    contentVersion: input.contentVersion,
    contentHash: hashContent(input.content),
    requestedAt,
    completedAt,
    stale,
    result,
  }
}

const matchesCurrentFile = $derived(
  !!lastManualCheck && lastManualCheck.filePath === currentFilePath,
)

const isStale = $derived.by(() =>
  isCheckStale(lastManualCheck, currentContentVersion, currentFilePath, currentContent),
)

const visibleIssues = $derived.by((): AiDriftIssue[] => {
  if (isRunning) return []
  if (!lastManualCheck || !matchesCurrentFile) return []
  if (lastError) return []
  if (isStale) return []
  return lastManualCheck.result.issues
})

const issueCount = $derived(
  matchesCurrentFile ? (lastManualCheck?.result?.metadata?.issueCount ?? null) : null,
)

const isPartial = $derived(
  matchesCurrentFile && !!lastManualCheck?.result?.metadata?.partial,
)

const uiStatus = $derived.by(() => {
  if (isRunning) return 'checking'
  if (lastError && matchesCurrentFile) return 'error'
  if (!lastManualCheck || !matchesCurrentFile) return 'idle'
  if (isStale) return 'stale'
  return 'done'
})

const uiStatusText = $derived.by(() => {
  if (uiStatus === 'checking') return 'Checking AI Draft...'
  if (uiStatus === 'error') return 'Error'
  if (uiStatus === 'stale') {
    const count = issueCount ?? 0
    return `${count} drifty passage${count === 1 ? '' : 's'} (stale)`
  }
  if (uiStatus === 'done') {
    const count = issueCount ?? 0
    const partialSuffix = isPartial ? ' (partial)' : ''
    return `${count} drifty passage${count === 1 ? '' : 's'}${partialSuffix}`
  }
  return ''
})

async function runAiDriftManualCheck(
  input: AiDriftManualCheckInput,
  requestedAt = Date.now(),
): Promise<AiDriftManualCheckPayload | null> {
  const runId = currentRunId + 1
  currentRunId = runId
  isRunning = true
  lastError = null
  try {
    await Promise.resolve()
    const result = await detectAiDriftIssuesAsync(input.content, LONG_DOC_GUARDRAILS)
    const completedAt = Date.now()
    const latestVersion = input.getLatestContentVersion?.() ?? input.contentVersion
    const stale = latestVersion !== input.contentVersion
    const payload = createAiDriftManualPayload(
      input,
      result,
      runId,
      requestedAt,
      completedAt,
      stale,
    )
    if (runId !== currentRunId) return null
    lastManualCheck = payload
    console.info('[ai-drift] manual scan complete', {
      filePath: payload.filePath,
      issueCount: payload.result.metadata.issueCount,
      runDurationMs: payload.result.metadata.runDurationMs,
      textLength: payload.result.metadata.textLength,
      stale: payload.stale,
    })
    return payload
  } catch (error) {
    if (runId === currentRunId) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    return null
  } finally {
    if (runId === currentRunId) isRunning = false
  }
}

function cancelDebouncedScan() {
  if (debouncedScanTimer != null) {
    clearTimeout(debouncedScanTimer)
    debouncedScanTimer = null
  }
}

function scheduleDebouncedScan() {
  if (!currentFilePath || currentIsPreview) return
  cancelDebouncedScan()
  debouncedScanTimer = setTimeout(() => {
    debouncedScanTimer = null
    runCheck()
  }, AUTO_SCAN_DEBOUNCE_MS)
}

function notifyContentChange(content: string) {
  const changed = hashContent(content) !== hashContent(currentContent)
  currentContent = content
  if (!changed) return
  currentContentVersion += 1
  scheduleDebouncedScan()
}

function notifyFileChange(filePath: string | null, content: string, isPreview: boolean) {
  const isFirstRun = lastTrackedFilePath === null
  const pathChanged = !isFirstRun && filePath !== lastTrackedFilePath

  cancelDebouncedScan()
  currentFilePath = filePath
  currentContent = content
  currentIsPreview = isPreview
  if (pathChanged) currentContentVersion += 1
  lastTrackedFilePath = filePath

  if ((isFirstRun || pathChanged) && filePath && !isPreview) {
    runCheck()
  }
}

function runCheck() {
  cancelDebouncedScan()
  if (!currentFilePath || currentIsPreview) return
  void runAiDriftManualCheck({
    filePath: currentFilePath,
    content: currentContent,
    contentVersion: currentContentVersion,
    getLatestContentVersion: () => currentContentVersion,
  })
}

function goToNextIssue() {
  getEditorCommands()?.nextDriftIssue()
}

export const aiDrift = {
  get lastManualCheck() {
    return lastManualCheck
  },
  get isRunning() {
    return isRunning
  },
  get lastError() {
    return lastError
  },
  get matchesCurrentFile() {
    return matchesCurrentFile
  },
  get isStale() {
    return isStale
  },
  get visibleIssues() {
    return visibleIssues
  },
  get issueCount() {
    return issueCount
  },
  get isPartial() {
    return isPartial
  },
  get uiStatus() {
    return uiStatus
  },
  get uiStatusText() {
    return uiStatusText
  },
  notifyContentChange,
  notifyFileChange,
  runCheck,
  goToNextIssue,
  runAiDriftManualCheck,
}
