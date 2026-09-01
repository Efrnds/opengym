import { describe, expect, it } from 'vitest'
import { eanChecksum, decodeBarcodeFromMedia } from './barcode-decoder.js'

describe('barcode-decoder', () => {
  it('validates standard EAN-13 barcodes correctly', () => {
    // 7891000100103 (e.g. Brazilian product code)
    expect(eanChecksum('7891000100103')).toBe(true)
    // 7891000315507 (Leite Ninho)
    expect(eanChecksum('7891000315507')).toBe(true)
    // Wrong checksum digit
    expect(eanChecksum('7891000315509')).toBe(false)
  })

  it('handles null and invalid media sources gracefully', async () => {
    const res = await decodeBarcodeFromMedia(null)
    expect(res).toBeNull()
  })
})
