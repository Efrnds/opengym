import { describe, it, expect } from 'vitest'
import { EXIDX } from './exercises.js'
import { EXDB as RAW_EXDB } from './exercises-data.js'

const CANONICAL = Object.fromEntries(RAW_EXDB.map(e => [e.id, e]))

// Media fixes from fixPlan — ids must keep local dataset filenames with real .gif assets.
const FIXED = {
  c001: '3666',
  g007: '0861',
  g035: '1452',
}

describe('extra-exercises media fixes (EXIDX)', () => {
  for (const [id, canonicalId] of Object.entries(FIXED)) {
    it(`${id} uses canonical ${canonicalId} img/gif filenames`, () => {
      const ex = EXIDX[id]
      const canon = CANONICAL[canonicalId]
      expect(ex).toBeTruthy()
      expect(canon).toBeTruthy()
      expect(ex.img).toBe(canon.img)
      expect(ex.gif).toBe(canon.gif)
      expect(ex.gif.endsWith('.gif')).toBe(true)
      expect(ex.img.endsWith('.jpg')).toBe(true)
    })
  }
})
