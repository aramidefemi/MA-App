import { describe, expect, it } from 'vitest'
import { hashContent, isCheckStale, type StaleCheckSnapshot } from './stale'

const baseCheck = (): StaleCheckSnapshot => ({
  stale: false,
  contentVersion: 1,
  contentHash: hashContent('hello'),
  filePath: '/docs/a.md',
})

describe('isCheckStale', () => {
  it('returns true when contentVersion changed after check', () => {
    expect(isCheckStale(baseCheck(), 2, '/docs/a.md', 'hello')).toBe(true)
  })

  it('returns true when check.stale is true', () => {
    expect(isCheckStale({ ...baseCheck(), stale: true }, 1, '/docs/a.md', 'hello')).toBe(
      true,
    )
  })

  it('returns false when versions and hash match and check.stale is false', () => {
    expect(isCheckStale(baseCheck(), 1, '/docs/a.md', 'hello')).toBe(false)
  })

  it('returns false when file paths differ', () => {
    expect(isCheckStale(baseCheck(), 1, '/docs/b.md', 'hello')).toBe(false)
  })

  it('returns false when check is null', () => {
    expect(isCheckStale(null, 1, '/docs/a.md', 'hello')).toBe(false)
  })

  it('returns true when content hash differs at same version', () => {
    const check = { ...baseCheck(), contentHash: hashContent('other') }
    expect(isCheckStale(check, 1, '/docs/a.md', 'hello')).toBe(true)
  })
})
