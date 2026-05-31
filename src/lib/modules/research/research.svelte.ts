import { aiLog } from '../../debug/aiFlowLog.js'

let showResearch = $state(false)
let researchInput = $state('')
let sessionId = $state(0)

function setInput(text) {
  researchInput = text
}

function openWithText(text = '') {
  aiLog('research.openWithText START', {
    text: text.slice(0, 80),
    length: text.length,
    showResearchBefore: showResearch,
    researchInputBefore: researchInput.slice(0, 80),
  })
  researchInput = text
  showResearch = true
  sessionId += 1
  aiLog('research.openWithText DONE', {
    showResearchAfter: showResearch,
    researchInputAfter: researchInput.slice(0, 80),
    researchInputLength: researchInput.length,
    sessionId,
  })
}

function close() {
  showResearch = false
}

function restorePanel(open: boolean) {
  showResearch = open
}

export const research = {
  get showResearch() { return showResearch },
  get researchInput() { return researchInput },
  get sessionId() { return sessionId },
  setInput,
  openWithText,
  close,
  restorePanel,
}
