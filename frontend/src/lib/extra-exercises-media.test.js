import { describe, it, expect } from 'vitest'
import { EXIDX } from './exercises.js'
import { EXDB as RAW_EXDB } from './exercises-data.js'
import { EXTRA_EXERCISES } from './extra-exercises.js'
import { EXTRA_MEDIA_CANONICAL } from './extra-exercises-media-map.js'

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

  it('maps every extra exercise with placeholder URLs to Gym visual filenames', () => {
    for (const id of Object.keys(EXTRA_MEDIA_CANONICAL)) {
      const ex = EXIDX[id]
      const canon = CANONICAL[EXTRA_MEDIA_CANONICAL[id]]
      expect(ex, id).toBeTruthy()
      expect(canon, id).toBeTruthy()
      expect(ex.img, id).toBe(canon.img)
      expect(ex.gif, id).toBe(canon.gif)
      expect(ex.gif.startsWith('http'), id).toBe(false)
    }
  })

  it('no merged extra exercise still points at free-exercise-db URLs', () => {
    for (const ex of EXTRA_EXERCISES) {
      const merged = EXIDX[ex.id]
      expect(merged?.img?.startsWith('http'), ex.id).toBeFalsy()
      expect(merged?.gif?.startsWith('http'), ex.id).toBeFalsy()
    }
  })
})
