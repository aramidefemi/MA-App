import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { app } from '../../app.js'

export const UNTITLED_PATH = 'untitled.md'

export const isUntitled = (path: string | null) => path === UNTITLED_PATH

let filePath = $state<string | null>(null)
let content = $state('')
let savedContent = $state('')
let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle')

const isDirty = $derived(content !== savedContent)
const fileName = $derived(
  filePath
    ? filePath.split('/').pop()!.split('\\').pop()!
    : null
)

const fileDialogFilters = [{
  name: app.fileDialog.filterName,
  extensions: app.fileDialog.extensions,
}]

function resetSaveStatusLater() {
  setTimeout(() => { saveStatus = 'idle' }, 1400)
}

async function loadFileAt(path: string) {
  const text = await readTextFile(path)
  filePath = path
  content = text
  savedContent = text
}

async function saveFile() {
  if (!filePath || isUntitled(filePath)) {
    await saveAs()
    return
  }
  if (!isDirty) return
  saveStatus = 'saving'
  try {
    await writeTextFile(filePath, content)
    savedContent = content
    saveStatus = 'saved'
    resetSaveStatusLater()
  } catch (e) {
    saveStatus = 'error'
    console.error('Save failed:', e)
  }
}

async function saveAs() {
  const selected = await save({ filters: fileDialogFilters })
  if (!selected) return
  saveStatus = 'saving'
  try {
    await writeTextFile(selected, content)
    filePath = selected
    savedContent = content
    saveStatus = 'saved'
    resetSaveStatusLater()
  } catch (e) {
    saveStatus = 'error'
    console.error('Save as failed:', e)
  }
}

function startWriting() {
  filePath = UNTITLED_PATH
  content = ''
  savedContent = ''
}

function newFile() {
  if (isDirty && filePath) void saveFile()
  startWriting()
}

async function closeTab() {
  if (isDirty) await saveFile()
  filePath = null
  content = ''
  savedContent = ''
}

function setContent(markdown: string) {
  content = markdown
}

async function openFile() {
  const selected = await open({
    filters: fileDialogFilters,
    multiple: false,
  })
  if (!selected || Array.isArray(selected)) return
  await loadFileAt(selected)
}

async function openFileFromTree(path: string) {
  if (isDirty) await saveFile()
  await loadFileAt(path)
}

export const document = {
  get filePath() { return filePath },
  get content() { return content },
  get savedContent() { return savedContent },
  get saveStatus() { return saveStatus },
  get isDirty() { return isDirty },
  get fileName() { return fileName },
  loadFileAt,
  saveFile,
  saveAs,
  startWriting,
  newFile,
  closeTab,
  setContent,
  openFile,
  openFileFromTree,
}
