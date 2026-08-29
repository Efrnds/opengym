import { describe, expect, it } from 'vitest'
import { dataUrlBytes, MAX_BYTES } from './photo-compress.js'

describe('photo-compress', () => {
  it('estimates base64 payload size', () => {
    const tiny = 'data:image/jpeg;base64,' + 'A'.repeat(4)
    expect(dataUrlBytes(tiny)).toBe(3)
  })

  it('keeps target under server limit', () => {
    expect(MAX_BYTES).toBeLessThan(2 * 1024 * 1024)
  })
})
