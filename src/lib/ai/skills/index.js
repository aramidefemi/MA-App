import humanizerSkillText from './humanizer.md?raw'

const SKILLS = Object.freeze({
  humanizer: humanizerSkillText.trim()
})

/**
 * @param {string | null | undefined} skillId
 * @returns {string}
 */
export function normalizeAiSkillId(skillId) {
  return String(skillId || '')
    .trim()
    .toLowerCase()
}

/**
 * @param {string | null | undefined} skillId
 * @returns {string}
 */
export function getAiSkillPrompt(skillId) {
  const id = normalizeAiSkillId(skillId)
  if (!id) return ''
  return SKILLS[id] || ''
}

export function listAiSkillIds() {
  return Object.keys(SKILLS)
}
