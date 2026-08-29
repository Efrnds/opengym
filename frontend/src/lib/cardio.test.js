import { describe, it, expect } from 'vitest'
import { EXDB } from './exercises.js'
import {
  cardioFields, estimateCardioKcal, cardioSetSummary, defaultCardioElev, seedCardioSet,
} from './cardio.js'

const TREADMILL = 'c002'
const INCLINE = 'c003'
const JUMP_ROPE = 'c011'
const CARDIO = EXDB.find(e => e.bp === 'cardio' && !e.id.startsWith('c')).id

describe('cardioFields', () => {
  it('enables speed and incline on treadmills', () => {
    expect(cardioFields(TREADMILL)).toEqual({ speed: true, elev: true })
    expect(cardioFields(INCLINE)).toEqual({ speed: true, elev: true })
  })
  it('disables speed on jump rope', () => {
    expect(cardioFields(JUMP_ROPE)).toEqual({ speed: false, elev: false })
  })
  it('enables speed on built-in catalogue cardio', () => {
    expect(cardioFields(CARDIO).speed).toBe(true)
  })
})

describe('estimateCardioKcal', () => {
  it('scales with duration and body weight on a treadmill run', () => {
    const base = estimateCardioKcal({ min: 30, speed: 10, elev: 0 }, { exerciseId: TREADMILL, weightKg: 70 })
    const heavier = estimateCardioKcal({ min: 30, speed: 10, elev: 0 }, { exerciseId: TREADMILL, weightKg: 84 })
    expect(base).toBeGreaterThan(200)
    expect(heavier).toBeGreaterThan(base)
  })
  it('adds cost with incline', () => {
    const flat = estimateCardioKcal({ min: 20, speed: 6, elev: 0 }, { exerciseId: TREADMILL, weightKg: 70 })
    const hill = estimateCardioKcal({ min: 20, speed: 6, elev: 10 }, { exerciseId: TREADMILL, weightKg: 70 })
    expect(hill).toBeGreaterThan(flat)
  })
  it('uses MET when speed is not logged', () => {
    const kcal = estimateCardioKcal({ min: 15 }, { exerciseId: JUMP_ROPE, weightKg: 70 })
    expect(kcal).toBeGreaterThan(100)
  })
})

describe('cardioSetSummary', () => {
  it('includes speed, incline and kcal', () => {
    const line = cardioSetSummary({ min: 20, speed: 8, elev: 5 }, TREADMILL, 70)
    expect(line).toMatch(/20 min/)
    expect(line).toMatch(/8 km\/h/)
    expect(line).toMatch(/5%/)
    expect(line).toMatch(/kcal/)
  })
})

describe('seedCardioSet', () => {
  it('carries incline from config', () => {
    expect(seedCardioSet({ id: INCLINE, min: 25, speed: 5, elev: 12 }, null)).toEqual({
      min: 25, speed: 5, elev: 12, done: false,
    })
  })
  it('defaults incline on incline treadmill', () => {
    expect(seedCardioSet({ id: INCLINE, min: 20, speed: 4 }, null).elev).toBe(10)
  })
})

describe('defaultCardioElev', () => {
  it('returns 10 for incline variants', () => {
    expect(defaultCardioElev(INCLINE)).toBe(10)
    expect(defaultCardioElev('c009')).toBe(10)
  })
  it('returns 0 for flat treadmill', () => {
    expect(defaultCardioElev(TREADMILL)).toBe(0)
  })
})
