import { homeDir } from '@tauri-apps/api/path'

let topbarDismissed = $state(false)
let topbarHovered = $state(false)
let skipTopbarHide = $state(true)
let homePath = $state('')

let topbarVisible = $derived(!topbarDismissed || topbarHovered)

homeDir().then((dir) => {
  homePath = dir
})

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
  resetTopbar,
  handleTopbarOnEdit,
  formatDisplayPath,
}
