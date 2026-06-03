export type StaleCheckSnapshot = {
  stale: boolean
  contentVersion: number
  contentHash: string
  filePath: string | null
}

export function hashContent(content: string): string {
  let hash = 2166136261
  for (let i = 0; i < content.length; i += 1) {
    hash ^= content.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

/** True when a completed check no longer matches the live document on the same file. */
export function isCheckStale(
  check: StaleCheckSnapshot | null | undefined,
  currentVersion: number,
  currentPath: string | null,
  currentContent: string,
): boolean {
  if (!check || check.filePath !== currentPath) return false
  return (
    check.stale ||
    check.contentVersion !== currentVersion ||
    check.contentHash !== hashContent(currentContent)
  )
}
