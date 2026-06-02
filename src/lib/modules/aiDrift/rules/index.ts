import type { AiDriftRule } from '../types'
import { LEXICAL_AI_DRIFT_RULES } from './lexical'

/** Deterministic regex rules — favor precision; extend via analyzers for structure. */
export const AI_DRIFT_RULES: readonly AiDriftRule[] = LEXICAL_AI_DRIFT_RULES
