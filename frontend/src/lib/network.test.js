// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isOnline, watchNetwork } from './network.js'

describe('network', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('isOnline reflects navigator.onLine', () => {
    vi.stubGlobal('navigator', { onLine: true })
    expect(isOnline()).toBe(true)
    vi.stubGlobal('navigator', { onLine: false })
    expect(isOnline()).toBe(false)
  })

  it('watchNetwork fires on online/offline', () => {
    vi.stubGlobal('navigator', { onLine: true })
    const fn = vi.fn()
    const stop = watchNetwork(fn)
    vi.stubGlobal('navigator', { onLine: false })
    window.dispatchEvent(new Event('offline'))
    expect(fn).toHaveBeenCalledWith(false)
    vi.stubGlobal('navigator', { onLine: true })
    window.dispatchEvent(new Event('online'))
    expect(fn).toHaveBeenCalledWith(true)
    stop()
  })
})
