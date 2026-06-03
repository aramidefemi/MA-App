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

describe('trashEntry', () => {
  it('moves file to .calm-trash/ with manifest entry', async () => {
    seedWorkspace(ROOT, { 'notes/a.md': 'hello' })
    const { trashEntry, listTrashedItems } = await import('./workspaceTrash.js')
    const id = await trashEntry(`${ROOT}/notes/a.md`, ROOT, { isDir: false })

    expect(getMockFiles().has('/workspace/notes/a.md')).toBe(false)
    const trashed = [...getMockFiles().keys()].find((p) => p.includes('.calm-trash'))
    expect(trashed).toBeTruthy()

    const items = await listTrashedItems(ROOT)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(id)
    expect(items[0].originalPath).toBe('/workspace/notes/a.md')
  })

  it('preserves relative path structure in trash metadata', async () => {
    seedWorkspace(ROOT, { 'deep/nested/file.md': 'x' })
    const { trashEntry, listTrashedItems } = await import('./workspaceTrash.js')
    await trashEntry(`${ROOT}/deep/nested/file.md`, ROOT, { isDir: false })
    const items = await listTrashedItems(ROOT)
    expect(items[0].originalPath).toBe('/workspace/deep/nested/file.md')
  })
})

describe('restoreFromTrash', () => {
  it('restores most recent trashed item', async () => {
    seedWorkspace(ROOT, { 'a.md': 'a', 'b.md': 'b' })
    const { trashEntry, restoreFromTrash } = await import('./workspaceTrash.js')
    await trashEntry(`${ROOT}/a.md`, ROOT, { isDir: false })
    await new Promise((r) => setTimeout(r, 5))
    await trashEntry(`${ROOT}/b.md`, ROOT, { isDir: false })

    const { restoredPath } = await restoreFromTrash(ROOT)
    expect(normalizeMockPath(restoredPath)).toBe('/workspace/b.md')
    expect(getMockFiles().get('/workspace/b.md')).toBe('b')
  })

  it('updates manifest after restore', async () => {
    seedWorkspace(ROOT, { 'a.md': 'a' })
    const { trashEntry, restoreFromTrash, listTrashedItems } = await import('./workspaceTrash.js')
    await trashEntry(`${ROOT}/a.md`, ROOT, { isDir: false })
    await restoreFromTrash(ROOT)
    expect(await listTrashedItems(ROOT)).toHaveLength(0)
  })

  it('throws when trash empty', async () => {
    const { restoreFromTrash } = await import('./workspaceTrash.js')
    await expect(restoreFromTrash(ROOT)).rejects.toThrow(/Trash is empty/)
  })
})

describe('hasTrashedItems', () => {
  it('returns false for empty trash', async () => {
    const { hasTrashedItems } = await import('./workspaceTrash.js')
    expect(await hasTrashedItems(ROOT)).toBe(false)
  })

  it('returns true after trash', async () => {
    seedWorkspace(ROOT, { 'a.md': 'a' })
    const { trashEntry, hasTrashedItems } = await import('./workspaceTrash.js')
    await trashEntry(`${ROOT}/a.md`, ROOT, { isDir: false })
    expect(await hasTrashedItems(ROOT)).toBe(true)
  })
})
