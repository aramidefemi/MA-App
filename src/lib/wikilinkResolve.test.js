import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockPluginFs,
  createMockTauriPath,
  getMockFiles,
  resetMockFs,
  seedWorkspace,
} from '../../tests/helpers/mockTauriFs.js'

vi.mock('@tauri-apps/plugin-fs', () => createMockPluginFs())
vi.mock('@tauri-apps/api/path', () => createMockTauriPath())

const ROOT = '/vault'

beforeEach(() => {
  resetMockFs()
  seedWorkspace(ROOT, {})
})

describe('wikilinkTargetToFileName', () => {
  it('appends .md when missing', async () => {
    const { wikilinkTargetToFileName } = await import('./wikilinkResolve.js')
    expect(wikilinkTargetToFileName('Ideas')).toBe('Ideas.md')
  })

  it('preserves nested paths', async () => {
    const { wikilinkTargetToFileName } = await import('./wikilinkResolve.js')
    expect(wikilinkTargetToFileName('projects/roadmap')).toBe('projects/roadmap.md')
  })
})

describe('stem helpers', () => {
  it('matches case-insensitively', async () => {
    const { noteStem, targetStem } = await import('./wikilinkResolve.js')
    expect(targetStem('My Note')).toBe(noteStem('/vault/My Note.md'))
  })
})

describe('resolveWikilinkFromIndex', () => {
  it('resolves by title stem', async () => {
    const { buildWikilinkStemIndex, resolveWikilinkFromIndex } = await import('./wikilinkResolve.js')
    const index = buildWikilinkStemIndex([
      `${ROOT}/alpha.md`,
      `${ROOT}/nested/beta.md`,
      `${ROOT}/nested/beta-copy.md`,
    ])
    expect(resolveWikilinkFromIndex(ROOT, 'Beta', { index })).toBe(`${ROOT}/nested/beta.md`)
  })

  it('prefers same folder as nearPath', async () => {
    const { buildWikilinkStemIndex, resolveWikilinkFromIndex } = await import('./wikilinkResolve.js')
    const index = buildWikilinkStemIndex([
      `${ROOT}/todo.md`,
      `${ROOT}/archive/todo.md`,
    ])
    expect(
      resolveWikilinkFromIndex(ROOT, 'todo', {
        index,
        nearPath: `${ROOT}/archive/other.md`,
      }),
    ).toBe(`${ROOT}/archive/todo.md`)
  })
})

describe('pathForNewWikilinkNote', () => {
  it('creates beside current note', async () => {
    const { pathForNewWikilinkNote } = await import('./wikilinkResolve.js')
    expect(pathForNewWikilinkNote(ROOT, 'New', `${ROOT}/drafts/a.md`)).toBe(
      `${ROOT}/drafts/New.md`,
    )
  })

  it('honors path-like targets at workspace root', async () => {
    const { pathForNewWikilinkNote } = await import('./wikilinkResolve.js')
    expect(pathForNewWikilinkNote(ROOT, 'refs/book', null)).toBe(`${ROOT}/refs/book.md`)
  })
})

describe('resolveWikilinkPath (fs)', () => {
  beforeEach(async () => {
    const { invalidateWikilinkIndex } = await import('./wikilinkResolve.js')
    invalidateWikilinkIndex()
  })

  it('finds nested notes', async () => {
    seedWorkspace(ROOT, { 'deep/note.md': '# hi' })
    const { resolveWikilinkPath } = await import('./wikilinkResolve.js')
    expect(await resolveWikilinkPath(ROOT, 'note')).toBe(`${ROOT}/deep/note.md`)
  })

  it('resolves path-like targets', async () => {
    seedWorkspace(ROOT, { 'refs/book.md': '' })
    const { resolveWikilinkPath } = await import('./wikilinkResolve.js')
    expect(await resolveWikilinkPath(ROOT, 'refs/book')).toBe(`${ROOT}/refs/book.md`)
  })
})

describe('createNoteFromWikilinkTarget', () => {
  beforeEach(async () => {
    const { invalidateWikilinkIndex } = await import('./wikilinkResolve.js')
    invalidateWikilinkIndex()
  })

  it('writes a new markdown file', async () => {
    const { createNoteFromWikilinkTarget } = await import('./wikilinkResolve.js')
    const path = await createNoteFromWikilinkTarget(ROOT, 'Fresh', null)
    expect(path).toBe(`${ROOT}/Fresh.md`)
    expect(getMockFiles().get(`${ROOT}/Fresh.md`)).toBe('')
  })
})
