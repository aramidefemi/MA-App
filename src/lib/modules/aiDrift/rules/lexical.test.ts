import { describe, expect, it } from 'vitest'
import { LEXICAL_AI_DRIFT_RULES } from './lexical'
import { detectAiDriftIssues } from '../detector'

const ruleCases: Array<{ ruleId: string; text: string; shouldMatch: boolean }> = [
  { ruleId: 'vocab.ai_high_frequency', text: 'We should delve deeper.', shouldMatch: true },
  { ruleId: 'filler.phrase', text: 'It is important to note that this matters.', shouldMatch: true },
  { ruleId: 'signposting.phrase', text: 'In conclusion, the work continues.', shouldMatch: true },
  { ruleId: 'conclusion.generic', text: 'The future looks bright for everyone.', shouldMatch: true },
  { ruleId: 'vocab.ai_high_frequency', text: 'We should dig deeper.', shouldMatch: false },
]

describe('LEXICAL_AI_DRIFT_RULES', () => {
  it('exports a non-empty rule set', () => {
    expect(LEXICAL_AI_DRIFT_RULES.length).toBeGreaterThan(10)
  })

  it.each(ruleCases)('$ruleId in "$text"', ({ ruleId, text, shouldMatch }) => {
    const result = detectAiDriftIssues(text)
    const matched = result.issues.some((issue) => issue.ruleId === ruleId)
    expect(matched).toBe(shouldMatch)
  })
})

describe('lexical rules skip code blocks', () => {
  it('does not match filler inside fenced code', () => {
    const text = '```\nit is important to note that\n```'
    const result = detectAiDriftIssues(text)
    expect(result.issues.some((i) => i.ruleId === 'filler.phrase')).toBe(false)
  })
})
