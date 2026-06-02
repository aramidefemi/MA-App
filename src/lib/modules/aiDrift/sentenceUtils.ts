export type SentenceSpan = {
  text: string
  start: number
  end: number
}

const FINITE_VERB =
  /\b(?:is|are|was|were|am|'s|'re|'ve|'d|have|has|had|do|does|did|can|could|will|would|shall|should|may|might|must)\b/i

/** Sentence spans relative to the input string. */
export function splitSentencesWithOffsets(text: string): SentenceSpan[] {
  const spans: SentenceSpan[] = []
  const re = /[^.!?]+[.!?]+|[^.!?]+$/g
  let hit: RegExpExecArray | null
  while ((hit = re.exec(text)) != null) {
    const raw = hit[0]
    const lead = raw.length - raw.trimStart().length
    const trimmed = raw.trim()
    if (!trimmed) continue
    const start = hit.index + lead
    const end = start + trimmed.length
    spans.push({ text: trimmed, start, end })
  }
  return spans
}

/** Short declarative line without a finite verb — common AI staccato fragment. */
export function isSubjectlessFragment(sentence: string): boolean {
  const trimmed = sentence.trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 14) return false
  if (!/^[A-Z"'(]/.test(trimmed)) return false
  if (!/[.!?]$/.test(trimmed)) return false
  if (FINITE_VERB.test(trimmed)) return false
  if (/^(?:However|Moreover|Furthermore|Additionally|Meanwhile|Therefore|Thus)\b/i.test(trimmed)) {
    return false
  }
  return true
}

export function sentenceWordCount(sentence: string): number {
  return sentence.split(/\s+/).filter(Boolean).length
}

export function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return null
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance) / mean
}
