import { homeDir } from '@tauri-apps/api/path'
import { isTauri } from '../../tauriEnv.js'
import { createIdleRevealScheduler } from './chromeIdleReveal.js'

let topbarDismissed = $state(false)
let topbarHovered = $state(false)
let skipTopbarHide = $state(true)
let sidebarDismissed = $state(false)
let sidebarHovered = $state(false)
let skipSidebarHide = $state(true)
let rightRailDismissed = $state(false)
let rightRailHovered = $state(false)
let skipRightRailHide = $state(true)
let homePath = $state('')

const sidebarIdleReveal = createIdleRevealScheduler()
const rightRailIdleReveal = createIdleRevealScheduler()

let topbarVisible = $derived(!topbarDismissed || topbarHovered)
let sidebarChromeVisible = $derived(!sidebarDismissed || sidebarHovered)
let rightRailChromeVisible = $derived(!rightRailDismissed || rightRailHovered)

if (isTauri()) {
  homeDir().then((dir) => {
    homePath = dir
  }).catch(() => {})
}

function resetTopbar() {
  topbarDismissed = false
  topbarHovered = false
  skipTopbarHide = true
}

function handleTopbarOnEdit() {
  if (skipTopbarHide) {
    skipTopbarHide = false
    return
  }
  topbarDismissed = true
}

function resetSidebar() {
  sidebarIdleReveal.cancel()
  sidebarDismissed = false
  sidebarHovered = false
  skipSidebarHide = true
}

function handleSidebarOnEdit() {
  if (skipSidebarHide) {
    skipSidebarHide = false
    return
  }
  sidebarDismissed = true
  sidebarIdleReveal.schedule(() => {
    sidebarDismissed = false
  })
}

function revealSidebarOnHover() {
  sidebarIdleReveal.cancel()
  sidebarDismissed = false
  sidebarHovered = true
}

function endSidebarHover() {
  sidebarHovered = false
}

function resetRightRail() {
  rightRailIdleReveal.cancel()
  rightRailDismissed = false
  rightRailHovered = false
  skipRightRailHide = true
}

function handleRightRailOnEdit() {
  if (skipRightRailHide) {
    skipRightRailHide = false
    return
  }
  rightRailDismissed = true
  rightRailIdleReveal.schedule(() => {
    rightRailDismissed = false
  })
}

function revealRightRailOnHover() {
  rightRailIdleReveal.cancel()
  rightRailDismissed = false
  rightRailHovered = true
}

function endRightRailHover() {
  rightRailHovered = false
}

function formatDisplayPath(path) {
  if (homePath && path.startsWith(homePath)) {
    return `~${path.slice(homePath.length)}`
  }
  return path
}

export const ui = {
  get topbarDismissed() {
    return topbarDismissed
  },
  set topbarDismissed(v) {
    topbarDismissed = v
  },
  get topbarHovered() {
    return topbarHovered
  },
  set topbarHovered(v) {
    topbarHovered = v
  },
  get skipTopbarHide() {
    return skipTopbarHide
  },
  set skipTopbarHide(v) {
    skipTopbarHide = v
  },
  get homePath() {
    return homePath
  },
  get topbarVisible() {
    return topbarVisible
  },
  get sidebarDismissed() {
    return sidebarDismissed
  },
  set sidebarDismissed(v) {
    sidebarDismissed = v
  },
  get sidebarHovered() {
    return sidebarHovered
  },
  set sidebarHovered(v) {
    sidebarHovered = v
  },
  get skipSidebarHide() {
    return skipSidebarHide
  },
  set skipSidebarHide(v) {
    skipSidebarHide = v
  },
  get sidebarChromeVisible() {
    return sidebarChromeVisible
  },
  get rightRailDismissed() {
    return rightRailDismissed
  },
  get rightRailHovered() {
    return rightRailHovered
  },
  get rightRailChromeVisible() {
    return rightRailChromeVisible
  },
  resetTopbar,
  resetSidebar,
  resetRightRail,
  handleTopbarOnEdit,
  handleSidebarOnEdit,
  handleRightRailOnEdit,
  revealSidebarOnHover,
  endSidebarHover,
  revealRightRailOnHover,
  endRightRailHover,
  formatDisplayPath,
}
