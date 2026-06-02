import type { AiDriftRule } from '../types'

/** High-frequency AI vocabulary (humanizer §7). */
const AI_VOCAB =
  /\b(?:additionally|align(?:s|ed|ing)?\s+with|crucial|delve(?:s|d)?|emphasiz(?:e|es|ed|ing)|enduring|enhanc(?:e|es|ed|ing)|fostering|garner(?:ed|s)?|highlight(?:s|ed|ing)?|interplay|intricat(?:e|es)|pivotal|showcase[ds]?|tapestry|testament|underscore[ds]?|vibrant|comprehensive|specificity|landscape|valuable)\b/gi

const SIGNIFICANCE =
  /\b(?:a\s+testament\s+to|underscores?\s+(?:the\s+)?(?:importance|significance)|evolving\s+landscape|key\s+turning\s+point|indelible\s+mark|deeply\s+rooted|setting\s+the\s+stage\s+for|plays?\s+a\s+(?:vital|crucial|pivotal|key)\s+role)\b/gi

const PROMOTIONAL =
  /\b(?:boasts?\s+a|groundbreaking|renowned|breathtaking|must-visit|stunning|nestled|in\s+the\s+heart\s+of|commitment\s+to|natural\s+beauty|profound)\b/gi

const COPULA_AVOIDANCE =
  /\b(?:serves|stood|stands|marks|represents|boasts|features|offers)\s+as\s+(?:a|an|the)\b/gi

const ING_ANALYSIS =
  /\b(?:highlighting|underscoring|emphasizing|ensuring|reflecting|symbolizing|contributing\s+to|cultivating|encompassing|showcasing)\b/gi

const WEASEL =
  /\b(?:industry\s+reports|observers\s+have\s+cited|experts\s+argue|some\s+critics\s+argue|several\s+(?:sources|publications))\b/gi

const SUPERLATIVE_SIGNIFICANCE =
  /\b(?:most|least)\s+(?:comprehensive|important|significant|crucial|pivotal|notable)\b/gi

const SCALE_ABSTRACT =
  /\b(?:deployed|deploy)\s+at\s+scale\b|\bmainstream\s+(?:safety|systems|platforms)\b/gi

const CHALLENGES_OUTLOOK =
  /\b(?:despite\s+(?:its|these)\s+challenges|challenges\s+and\s+(?:future|legacy)|future\s+outlook)\b/gi

const SIGNPOSTING =
  /\b(?:let's|lets)\s+dive\s+in\b|\bhere(?:'s| is)\s+what\s+you\s+need\s+to\s+know\b|\b(?:in\s+conclusion|to\s+summarize)\b|\bthe\s+bottom\s+line\s+is\b|\bkey\s+takeaways?\b/gi

const FILLER =
  /\bin\s+order\s+to\b|\bdue\s+to\s+the\s+fact\s+that\b|\bit\s+is\s+important\s+to\s+note\s+that\b|\bat\s+the\s+end\s+of\s+the\s+day\b|\bin\s+today's\s+(?:world|landscape)\b/gi

const CONCLUSION =
  /\b(?:the\s+)?future\s+looks\s+bright\b|\bexciting\s+times\s+lie\s+ahead\b|\boverall,?\s+this\s+(?:shows|demonstrates|highlights)\b/gi

const SYCOPHANCY =
  /^\s*(?:great|excellent)\s+question\b|^\s*you(?:'re| are)\s+absolutely\s+right\b|^\s*(?:certainly|absolutely)!?\s/i

const NEGATIVE_PARALLEL =
  /\bnot\s+only\b[^.]{0,160}\bbut\s+also\b|,\s*no\s+(?:guessing|wasted\s+motion)\b/gi

const RULE_OF_THREE_PHRASE =
  /\b\w[\w'-]*,\s+\w[\w'-]*,\s+and\s+\w[\w'-]*/gi

export const LEXICAL_AI_DRIFT_RULES: readonly AiDriftRule[] = [
  { id: 'punctuation.em_en_dash', label: 'Em or en dash', severity: 'high', pattern: /[\u2013\u2014]/g },
  { id: 'punctuation.curly_quotes', label: 'Curly quotation mark', severity: 'low', pattern: /[\u2018\u2019\u201C\u201D]/g },
  { id: 'vocab.ai_high_frequency', label: 'Common AI vocabulary', severity: 'low', pattern: AI_VOCAB },
  { id: 'significance.legacy_phrase', label: 'Significance / legacy phrasing', severity: 'medium', pattern: SIGNIFICANCE },
  { id: 'significance.superlative', label: 'Superlative significance claim', severity: 'medium', pattern: SUPERLATIVE_SIGNIFICANCE },
  { id: 'significance.scale_abstract', label: 'Abstract scale phrasing', severity: 'low', pattern: SCALE_ABSTRACT },
  { id: 'promotional.language', label: 'Promotional language', severity: 'medium', pattern: PROMOTIONAL },
  { id: 'grammar.copula_avoidance', label: 'Copula avoidance', severity: 'medium', pattern: COPULA_AVOIDANCE },
  { id: 'analysis.ing_participle', label: 'Superficial -ing analysis', severity: 'low', pattern: ING_ANALYSIS },
  { id: 'weasel.attribution', label: 'Vague attribution', severity: 'medium', pattern: WEASEL },
  { id: 'outline.challenges_future', label: 'Challenges / future outlook phrasing', severity: 'medium', pattern: CHALLENGES_OUTLOOK },
  { id: 'signposting.phrase', label: 'Signposting phrase', severity: 'medium', pattern: SIGNPOSTING },
  { id: 'filler.phrase', label: 'Filler phrase', severity: 'low', pattern: FILLER },
  { id: 'conclusion.generic', label: 'Generic conclusion', severity: 'high', pattern: CONCLUSION },
  { id: 'sycophancy.opening', label: 'Sycophantic opening', severity: 'high', pattern: SYCOPHANCY },
  { id: 'grammar.negative_parallel', label: 'Negative parallelism', severity: 'medium', pattern: NEGATIVE_PARALLEL },
  { id: 'grammar.rule_of_three_list', label: 'Rule-of-three list', severity: 'low', pattern: RULE_OF_THREE_PHRASE },
  {
    id: 'markdown.bold_inline_header',
    label: 'Bold inline header',
    severity: 'medium',
    pattern: /(?:^|\n)(\s*\*\*[^*]+\*\*\s+(?:is|are|was|were|built|has|have|had)\b)/gim,
  },
] as const
