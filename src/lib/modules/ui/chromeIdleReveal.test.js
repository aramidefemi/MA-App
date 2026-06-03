import { describe, expect, it, vi } from 'vitest'
import { CHROME_IDLE_REVEAL_MS, createIdleRevealScheduler } from './chromeIdleReveal.js'

describe('createIdleRevealScheduler', () => {
  it('reveals after the idle delay', () => {
    vi.useFakeTimers()
    const onReveal = vi.fn()
    const scheduler = createIdleRevealScheduler(100)

    scheduler.schedule(onReveal)
    expect(onReveal).not.toHaveBeenCalled()

    vi.advanceTimersByTime(99)
    expect(onReveal).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onReveal).toHaveBeenCalledOnce()

    vi.useRealTimers()
  })

  it('resets the timer when scheduled again', () => {
    vi.useFakeTimers()
    const onReveal = vi.fn()
    const scheduler = createIdleRevealScheduler(100)

    scheduler.schedule(onReveal)
    vi.advanceTimersByTime(80)
    scheduler.schedule(onReveal)
    vi.advanceTimersByTime(99)
    expect(onReveal).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onReveal).toHaveBeenCalledOnce()

    vi.useRealTimers()
  })

  it('exports the default idle delay used by editor chrome', () => {
    expect(CHROME_IDLE_REVEAL_MS).toBe(2000)
  })
})
