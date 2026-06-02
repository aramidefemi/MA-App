import { open } from '@tauri-apps/plugin-dialog'
import { document } from '../document'

let folderPath = $state<string | null>(null)
let showSidebar = $state(false)
let showOutline = $state(false)
let showSettings = $state(false)

const hasSidebar = $derived(!!folderPath && showSidebar)
const showWelcome = $derived(!document.filePath && !folderPath)

async function loadFolderAt(path: string) {
  folderPath = path
  showSidebar = true
}

async function openFolder() {
  const selected = await open({ directory: true, multiple: false })
  if (!selected || Array.isArray(selected)) return
  await loadFolderAt(selected)
}

function toggleSidebar() {
  if (folderPath) showSidebar = !showSidebar
}

function openSettings() {
  showSettings = true
}

function closeSettings() {
  showSettings = false
}

function toggleOutline() {
  showOutline = !showOutline
}

function closeOutline() {
  showOutline = false
}

function restoreFolder(path: string, sidebar: boolean) {
  folderPath = path
  showSidebar = sidebar
}

function restorePanels(outline: boolean) {
  showOutline = outline
}

function closeFolder() {
  folderPath = null
  showSidebar = false
}

export const workspace = {
  get folderPath() { return folderPath },
  get showSidebar() { return showSidebar },
  get showOutline() { return showOutline },
  get showSettings() { return showSettings },
  get hasSidebar() { return hasSidebar },
  get showWelcome() { return showWelcome },
  loadFolderAt,
  openFolder,
  toggleSidebar,
  openSettings,
  closeSettings,
  toggleOutline,
  closeOutline,
  restoreFolder,
  restorePanels,
  closeFolder,
}
