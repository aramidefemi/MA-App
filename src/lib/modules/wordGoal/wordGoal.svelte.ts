import { getDocumentStats } from '../../documentStats.js'
import { document } from '../document'

export const GOAL_PRESETS = [300, 500, 1000] as const

let goal = $state<number | null>(null)
let showPopover = $state(false)
let completedFaded = $state(false)
let fadeTimer: ReturnType<typeof setTimeout> | null = null

const wordCount = $derived(getDocumentStats(document.content).words)
const progress = $derived(goal ? Math.min(100, (wordCount / goal) * 100) : 0)
const isComplete = $derived(goal !== null && wordCount >= goal)
const isActive = $derived(goal !== null)

function clearFadeTimer() {
  if (fadeTimer) {
    clearTimeout(fadeTimer)
    fadeTimer = null
  }
}

function scheduleFade() {
  clearFadeTimer()
  completedFaded = false
  fadeTimer = setTimeout(() => {
    completedFaded = true
    fadeTimer = null
  }, 3000)
}

function syncCompletion() {
  if (isComplete) {
    if (!fadeTimer && !completedFaded) scheduleFade()
  } else {
    clearFadeTimer()
    completedFaded = false
  }
}

function setGoal(value: number) {
  const n = Math.floor(value)
  if (n <= 0) return
  goal = n
  showPopover = false
  completedFaded = false
  clearFadeTimer()
  syncCompletion()
}

function reset() {
  goal = null
  showPopover = false
  completedFaded = false
  clearFadeTimer()
}

function togglePopover() {
  showPopover = !showPopover
}

function closePopover() {
  showPopover = false
}

export const wordGoal = {
  get goal() { return goal },
  get showPopover() { return showPopover },
  get completedFaded() { return completedFaded },
  get wordCount() { return wordCount },
  get progress() { return progress },
  get isComplete() { return isComplete },
  get isActive() { return isActive },
  setGoal,
  reset,
  togglePopover,
  closePopover,
  syncCompletion,
}
