import { describe, expect, it } from 'vitest'
import {
  isPathInsideRoot,
  joinPath,
  normalizePath,
} from './pathUtils.js'

describe('normalizePath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(normalizePath('a\\b\\c')).toBe('a/b/c')
  })

  it('collapses duplicate slashes', () => {
    expect(normalizePath('a//b///c')).toBe('a/b/c')
  })

  it('removes trailing slash except root', () => {
    expect(normalizePath('/workspace/')).toBe('/workspace')
    expect(normalizePath('/')).toBe('/')
  })

  it('handles empty string', () => {
    expect(normalizePath('')).toBe('')
  })
})

describe('isPathInsideRoot', () => {
  const root = '/Users/writer/project'

  it('returns true for root itself', () => {
    expect(isPathInsideRoot(root, root)).toBe(true)
  })

  it('returns true for nested file', () => {
    expect(isPathInsideRoot(root, `${root}/notes/a.md`)).toBe(true)
  })

  it('returns false for sibling path', () => {
    expect(isPathInsideRoot(root, '/Users/writer/other/a.md')).toBe(false)
  })

  it('returns false for path traversal attempt (/other)', () => {
    expect(isPathInsideRoot(root, '/etc/passwd')).toBe(false)
    expect(isPathInsideRoot(root, `${root}-evil/notes.md`)).toBe(false)
  })

  it('is case-sensitive on Linux paths', () => {
    expect(isPathInsideRoot('/Workspace', '/workspace/notes.md')).toBe(false)
  })
})

describe('joinPath', () => {
  it('joins with correct separator for unix paths', () => {
    expect(joinPath('/workspace/notes', 'a.md')).toBe('/workspace/notes/a.md')
  })

  it('joins with backslash when parent uses windows style', () => {
    expect(joinPath('C:\\workspace\\notes', 'a.md')).toBe('C:\\workspace\\notes\\a.md')
  })
})

describe('assertInsideRoot (via moveEntryToFolder)', () => {
  it('throws when outside workspace', async () => {
    const { moveEntryToFolder } = await import('./workspaceFiles.js')
    await expect(
      moveEntryToFolder('/workspace/a.md', '/other', '/workspace'),
    ).rejects.toThrow(/outside workspace/)
  })
})
