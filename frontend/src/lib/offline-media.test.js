import { describe, it, expect } from 'vitest'
import { exerciseIdsFromState } from './offline-media.js'

describe('exerciseIdsFromState', () => {
  it('collects ids from routines, history and active workout', () => {
    const S = {
      routines: [{ ex: [{ id: 'a' }, { id: 'b' }] }],
      workouts: [{ entries: [{ id: 'c' }] }],
      active: { entries: [{ id: 'd' }] },
    }
    expect(exerciseIdsFromState(S).sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('deduplicates ids', () => {
    const S = {
      routines: [{ ex: [{ id: 'a' }] }],
      workouts: [{ entries: [{ id: 'a' }] }],
      active: null,
    }
    expect(exerciseIdsFromState(S)).toEqual(['a'])
  })
})
