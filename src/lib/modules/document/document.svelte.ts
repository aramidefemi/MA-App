import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { app } from '../../app.js'
import { duplicateWorkspaceFile } from '../../workspaceFiles.js'
import { isEditableInEditor, isPreviewFile } from '../../workspaceFileTypes.js'

export const UNTITLED_PATH = 'untitled.md'

export const isUntitled = (path: string | null) => path === UNTITLED_PATH

let filePath = $state<string | null>(null)
let content = $state('')
let savedContent = $state('')
let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle')
let previewMode = $state(false)

const isDirty = $derived(!previewMode && content !== savedContent)
const isPreview = $derived(previewMode && !!filePath)
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
  previewMode = false
  filePath = path
  content = text
  savedContent = text
}

async function openPreviewAt(path: string) {
  previewMode = true
  filePath = path
  content = ''
  savedContent = ''
  saveStatus = 'idle'
}

async function saveFile() {
  if (previewMode) return
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
  previewMode = false
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
  previewMode = false
}

function retargetFilePath(oldPath: string, newPath: string) {
  if (filePath === oldPath) filePath = newPath
}

function clearIfRemoved(path: string) {
  if (filePath !== path) return
  filePath = null
  content = ''
  savedContent = ''
  previewMode = false
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
  const name = path.split(/[/\\]/).pop() ?? path
  try {
    if (isPreviewFile(name)) await openPreviewAt(path)
    else if (isEditableInEditor(name)) await loadFileAt(path)
  } catch (error) {
    console.error('Failed to open file:', path, error)
  }
}

async function duplicateFile() {
  if (previewMode || !filePath || isUntitled(filePath)) return
  const path = await duplicateWorkspaceFile(filePath, content)
  await loadFileAt(path)
}

export const document = {
  get filePath() { return filePath },
  get content() { return content },
  get savedContent() { return savedContent },
  get saveStatus() { return saveStatus },
  get isDirty() { return isDirty },
  get isPreview() { return isPreview },
  get fileName() { return fileName },
  loadFileAt,
  openPreviewAt,
  saveFile,
  saveAs,
  startWriting,
  newFile,
  closeTab,
  retargetFilePath,
  clearIfRemoved,
  setContent,
  openFile,
  openFileFromTree,
  duplicateFile,
}
