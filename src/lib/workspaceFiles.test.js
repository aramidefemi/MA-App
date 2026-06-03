import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockPluginFs,
  createMockTauriPath,
  getMockFiles,
  normalizeMockPath,
  resetMockFs,
  seedWorkspace,
} from '../../tests/helpers/mockTauriFs.js'

vi.mock('@tauri-apps/plugin-fs', () => createMockPluginFs())
vi.mock('@tauri-apps/api/path', () => createMockTauriPath())

const ROOT = '/workspace'

beforeEach(() => {
  resetMockFs()
  seedWorkspace(ROOT, {})
})

describe('createMarkdownInFolder', () => {
  it('creates untitled.md when no conflict', async () => {
    const { createMarkdownInFolder } = await import('./workspaceFiles.js')
    const path = await createMarkdownInFolder(ROOT)
    expect(normalizeMockPath(path)).toBe('/workspace/untitled.md')
    expect(getMockFiles().get('/workspace/untitled.md')).toBe('')
  })

  it('creates untitled 1.md on conflict', async () => {
    seedWorkspace(ROOT, { 'untitled.md': '' })
    const { createMarkdownInFolder } = await import('./workspaceFiles.js')
    const path = await createMarkdownInFolder(ROOT)
    expect(normalizeMockPath(path)).toBe('/workspace/untitled 1.md')
  })
})

describe('moveEntryToFolder', () => {
  it('moves file into subfolder', async () => {
    seedWorkspace(ROOT, { 'a.md': 'content', notes: null })
    const { moveEntryToFolder } = await import('./workspaceFiles.js')
    const dest = await moveEntryToFolder(`${ROOT}/a.md`, `${ROOT}/notes`, ROOT)
    expect(normalizeMockPath(dest)).toBe('/workspace/notes/a.md')
    expect(getMockFiles().has('/workspace/a.md')).toBe(false)
    expect(getMockFiles().get('/workspace/notes/a.md')).toBe('content')
  })

  it('throws when target outside workspace root', async () => {
    seedWorkspace(ROOT, { 'a.md': 'content' })
    const { moveEntryToFolder } = await import('./workspaceFiles.js')
    await expect(
      moveEntryToFolder(`${ROOT}/a.md`, '/outside', ROOT),
    ).rejects.toThrow(/outside workspace/)
  })

  it('throws when moving folder into itself', async () => {
    seedWorkspace(ROOT, { notes: null })
    const { moveEntryToFolder } = await import('./workspaceFiles.js')
    await expect(
      moveEntryToFolder(`${ROOT}/notes`, `${ROOT}/notes`, ROOT),
    ).rejects.toThrow(/Cannot move a folder/)
  })
})

describe('renameEntry', () => {
  it('preserves extension when renaming file without dot', async () => {
    seedWorkspace(ROOT, { 'notes.md': 'body' })
    const { renameEntry } = await import('./workspaceFiles.js')
    const newPath = await renameEntry(`${ROOT}/notes.md`, 'renamed.md', ROOT, { isDir: false })
    expect(normalizeMockPath(newPath)).toBe('/workspace/renamed.md')
    expect(getMockFiles().get('/workspace/renamed.md')).toBe('body')
  })

  it('throws when new name contains path separators', async () => {
    seedWorkspace(ROOT, { 'notes.md': 'body' })
    const { renameEntry } = await import('./workspaceFiles.js')
    await expect(
      renameEntry(`${ROOT}/notes.md`, '../escape.md', ROOT, { isDir: false }),
    ).rejects.toThrow(/Invalid name/)
  })
})

describe('duplicateFilePath', () => {
  it('generates copy suffix path', async () => {
    seedWorkspace(ROOT, { 'note.md': 'body' })
    const { duplicateFilePath } = await import('./workspaceFiles.js')
    const copyPath = await duplicateFilePath(`${ROOT}/note.md`)
    expect(normalizeMockPath(copyPath)).toBe('/workspace/note-copy.md')
  })
})

describe('duplicateWorkspaceFile', () => {
  it('copies file content to a new path', async () => {
    seedWorkspace(ROOT, { 'note.md': 'body' })
    const { duplicateWorkspaceFile } = await import('./workspaceFiles.js')
    const copyPath = await duplicateWorkspaceFile(`${ROOT}/note.md`)
    expect(normalizeMockPath(copyPath)).toBe('/workspace/note-copy.md')
    expect(getMockFiles().get('/workspace/note-copy.md')).toBe('body')
  })
})

describe('path security', () => {
  it('rejects move to ../../../etc/passwd', async () => {
    seedWorkspace(ROOT, { 'a.md': 'content' })
    const { moveEntryToFolder } = await import('./workspaceFiles.js')
    await expect(
      moveEntryToFolder(`${ROOT}/a.md`, '/etc', ROOT),
    ).rejects.toThrow(/outside workspace/)
  })

  it('rejects rename with path separators in name', async () => {
    seedWorkspace(ROOT, { 'a.md': 'content' })
    const { renameEntry } = await import('./workspaceFiles.js')
    await expect(
      renameEntry(`${ROOT}/a.md`, '../escape.md', ROOT, { isDir: false }),
    ).rejects.toThrow(/Invalid name/)
  })
})

describe('slugifyNoteName', () => {
  it('slugifies note titles', async () => {
    const { slugifyNoteName } = await import('./workspaceFiles.js')
    expect(slugifyNoteName('Hello World!')).toBe('hello-world')
    expect(slugifyNoteName('   ')).toBe('note')
  })
})
