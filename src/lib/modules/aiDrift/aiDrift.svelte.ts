type AiDriftManualCheckInput = {
  filePath: string | null
  content: string
  contentVersion: number
  getLatestContentVersion?: () => number
}

import type { AiDriftDetectionResult } from './detector'
import { detectAiDriftIssuesAsync } from './detector'

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

const LONG_DOC_GUARDRAILS = {
  timeBudgetMs: 45,
  maxScannedChars: 120_000,
  maxScannedSegments: 80,
} as const

function hashContent(content: string): string {
  let hash = 2166136261
  for (let i = 0; i < content.length; i += 1) {
    hash ^= content.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

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

async function runAiDriftManualCheck(
  input: AiDriftManualCheckInput,
  requestedAt = Date.now(),
): Promise<AiDriftManualCheckPayload | null> {
  const runId = currentRunId + 1
  currentRunId = runId
  isRunning = true
  lastError = null
  try {
    // Yield once so manual checks stay non-blocking from click flow.
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

export const aiDrift = {
  get lastManualCheck() { return lastManualCheck },
  get isRunning() { return isRunning },
  get lastError() { return lastError },
  runAiDriftManualCheck,
}
