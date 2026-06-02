import { homeDir } from '@tauri-apps/api/path'
import { isTauri } from '../../tauriEnv.js'

let topbarDismissed = $state(false)
let topbarHovered = $state(false)
let skipTopbarHide = $state(true)
let sidebarDismissed = $state(false)
let sidebarHovered = $state(false)
let skipSidebarHide = $state(true)
let homePath = $state('')

let topbarVisible = $derived(!topbarDismissed || topbarHovered)
let sidebarChromeVisible = $derived(!sidebarDismissed || sidebarHovered)

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
  resetTopbar,
  resetSidebar,
  handleTopbarOnEdit,
  handleSidebarOnEdit,
  formatDisplayPath,
}
