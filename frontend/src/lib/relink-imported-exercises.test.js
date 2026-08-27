import { describe, it, expect } from 'vitest'
import { relinkImportedExercises, isImportedCustom } from './relink-imported-exercises.js'
import { EXIDX } from './exercises.js'

describe('isImportedCustom', () => {
  it('recognises import vs user customs', () => {
    expect(isImportedCustom('imabc')).toBe(true)
    expect(isImportedCustom('cabc')).toBe(false)
    expect(isImportedCustom('0025')).toBe(false)
  })
})

describe('relinkImportedExercises', () => {
  it('relinks im* customs when matchExercise is unambiguous', () => {
    const S = {
      customEx: [
        { id: 'im1', n: 'passadeira', custom: true, eq: 'custom' },
        { id: 'im2', n: 'some invented lift', custom: true, eq: 'custom' },
      ],
      routines: [{ id: 'r1', name: 'A', ex: [{ id: 'im1', sets: 3, reps: 10 }] }],
      workouts: [{ id: 'w1', d: '2026-01-01', entries: [{ id: 'im1', sets: [] }] }],
      exWeights: { im1: { w: 0, d: '2026-01-01' } },
    }
    const { relinked, idMap } = relinkImportedExercises(S)
    expect(relinked).toBe(1)
    expect(idMap).toEqual({ im1: 'c001' })
    expect(S.routines[0].ex[0].id).toBe('c001')
    expect(S.workouts[0].entries[0].id).toBe('c001')
    expect(S.exWeights.c001).toEqual({ w: 0, d: '2026-01-01' })
    expect(S.exWeights.im1).toBeUndefined()
    expect(S.customEx).toHaveLength(1)
    expect(S.customEx[0].id).toBe('im2')
    expect(EXIDX.c001).toBeTruthy()
  })

  it('never relinks user-created c* customs', () => {
    const S = {
      customEx: [{ id: 'cuser1', n: 'passadeira', custom: true, eq: 'custom' }],
      routines: [{ id: 'r1', name: 'A', ex: [{ id: 'cuser1', sets: 3, reps: 10 }] }],
      workouts: [],
    }
    const { relinked } = relinkImportedExercises(S)
    expect(relinked).toBe(0)
    expect(S.routines[0].ex[0].id).toBe('cuser1')
    expect(S.customEx).toHaveLength(1)
  })

  it('is idempotent once customs are gone', () => {
    const S = {
      customEx: [{ id: 'im1', n: 'passadeira', custom: true, eq: 'custom' }],
      routines: [{ id: 'r1', name: 'A', ex: [{ id: 'im1', sets: 3, reps: 10 }] }],
      workouts: [],
    }
    relinkImportedExercises(S)
    const second = relinkImportedExercises(S)
    expect(second.relinked).toBe(0)
  })
})
