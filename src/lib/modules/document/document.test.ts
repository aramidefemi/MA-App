import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(async () => ''),
  writeTextFile: vi.fn(),
}))

const { document, isUntitled, UNTITLED_PATH } = await import('./document.svelte.ts')

beforeEach(async () => {
  await document.closeTab()
})

describe('isUntitled', () => {
  it('returns true for virtual in-memory names', () => {
    expect(isUntitled('untitled.md')).toBe(true)
    expect(isUntitled('my-essay.md')).toBe(true)
  })

  it('returns false for disk paths', () => {
    expect(isUntitled('/workspace/notes/a.md')).toBe(false)
    expect(isUntitled('C:\\Users\\writer\\a.md')).toBe(false)
  })

  it('returns false for empty or null paths', () => {
    expect(isUntitled(null)).toBe(false)
    expect(isUntitled('')).toBe(false)
  })
})

describe('renameUntitled', () => {
  beforeEach(() => {
    document.startWriting()
  })

  it('renames a virtual document and appends .md when missing', () => {
    document.renameUntitled('my-essay')
    expect(document.filePath).toBe('my-essay.md')
    expect(document.hasDiskPath).toBe(false)
  })

  it('keeps an explicit extension when provided', () => {
    document.renameUntitled('notes.txt')
    expect(document.filePath).toBe('notes.txt')
  })

  it('trims whitespace from the new name', () => {
    document.renameUntitled('  chapter one  ')
    expect(document.filePath).toBe('chapter one.md')
  })

  it('rejects empty names and path separators', () => {
    document.renameUntitled('')
    expect(document.filePath).toBe(UNTITLED_PATH)

    document.renameUntitled('   ')
    expect(document.filePath).toBe(UNTITLED_PATH)

    document.renameUntitled('notes/draft')
    expect(document.filePath).toBe(UNTITLED_PATH)

    document.renameUntitled('notes\\draft')
    expect(document.filePath).toBe(UNTITLED_PATH)
  })

  it('rejects non-editable extensions', () => {
    document.renameUntitled('photo.png')
    expect(document.filePath).toBe(UNTITLED_PATH)
  })

  it('does not rename when the document has a disk path', async () => {
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    vi.mocked(readTextFile).mockResolvedValueOnce('saved')
    await document.loadFileAt('/workspace/saved.md')

    document.renameUntitled('new-name')
    expect(document.filePath).toBe('/workspace/saved.md')
  })

  it('does not rename preview documents', async () => {
    await document.openPreviewAt('/workspace/report.pdf')

    document.renameUntitled('renamed')
    expect(document.filePath).toBe('/workspace/report.pdf')
  })
})
