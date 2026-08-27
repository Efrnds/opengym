import { describe, expect, it } from 'vitest'
import {
  entryVolume,
  exerciseMode,
  exerciseProgressSeries,
  exerciseHistory,
  exerciseClassification,
} from './exercise-detail.js'
import { registerCustom } from './exercises.js'

const DAY = 86400000
const NOW = Date.UTC(2026, 7, 24, 12)

registerCustom([{ id: 'sq', n: 'Squat', tg: 'quadriceps', sm: ['glutes', 'hamstrings'] }])

function workout(dayAgo, entry) {
  const d = new Date(NOW - dayAgo * DAY)
  const iso = d.toISOString().slice(0, 10)
  return {
    id: 'w' + iso,
    d: iso,
    start: NOW - dayAgo * DAY,
    entries: [entry],
  }
}

const squatEntry = {
  id: 'sq',
  sets: [
    { phase: 'work', w: 30, r: 8, done: true },
    { phase: 'work', w: 40, r: 5, done: true },
  ],
}

describe('entryVolume', () => {
  it('sums weight × reps for completed sets', () => {
    expect(entryVolume(squatEntry)).toBe(30 * 8 + 40 * 5)
  })
})

describe('exerciseProgressSeries', () => {
  const S = {
    unit: 'kg',
    workouts: [
      workout(30, squatEntry),
      workout(7, { id: 'sq', sets: [{ phase: 'work', w: 50, r: 5, done: true }] }),
    ],
  }

  it('builds top-set and volume points within the range window', () => {
    const recent = exerciseProgressSeries(S, 'sq', { range: 90, now: NOW })
    expect(recent.topPts).toHaveLength(2)
    expect(recent.topBest).toBe(50)
    expect(recent.volBest).toBe(30 * 8 + 40 * 5)
    expect(recent.showE1).toBe(true)
    expect(recent.showVol).toBe(true)
  })

  it('filters out sessions outside the selected range', () => {
    const narrow = exerciseProgressSeries(S, 'sq', { range: 14, now: NOW })
    expect(narrow.topPts).toHaveLength(1)
    expect(narrow.topBest).toBe(50)
  })

  it('limits e1Best to the selected range window', () => {
    const wide = {
      unit: 'kg',
      workouts: [
        workout(30, { id: 'sq', sets: [{ phase: 'work', w: 100, r: 10, done: true }] }),
        workout(7, { id: 'sq', sets: [{ phase: 'work', w: 50, r: 5, done: true }] }),
      ],
    }
    const allTime = exerciseProgressSeries(wide, 'sq', { range: 0, now: NOW })
    const narrow = exerciseProgressSeries(wide, 'sq', { range: 14, now: NOW })
    expect(allTime.e1Best.est).toBeGreaterThan(narrow.e1Best.est)
    expect(narrow.e1Pts).toHaveLength(1)
    expect(narrow.e1Best.est).toBe(narrow.e1Pts[0].y)
  })
})

describe('exerciseHistory', () => {
  it('returns newest sessions first', () => {
    const S = {
      workouts: [
        workout(30, squatEntry),
        workout(7, { id: 'sq', sets: [{ phase: 'work', w: 50, r: 5, done: true }] }),
      ],
    }
    const history = exerciseHistory(S, 'sq')
    expect(history).toHaveLength(2)
    expect(history[0].entry.sets[0].w).toBe(50)
  })
})

describe('exerciseClassification', () => {
  it('ranks the exercise among logged estimates', () => {
    const S = {
      unit: 'kg',
      workouts: [
        workout(3, squatEntry),
        workout(3, {
          id: 'bench',
          sets: [{ phase: 'work', w: 80, r: 8, done: true }],
        }),
      ],
    }
    registerCustom([
      { id: 'sq', n: 'Squat', tg: 'quadriceps' },
      { id: 'bench', n: 'Bench', tg: 'chest' },
    ])
    const cls = exerciseClassification(S, 'sq', NOW)
    expect(cls.rank).toBeGreaterThan(0)
    expect(cls.total).toBe(2)
    expect(cls.primary).toBe('quadriceps')
    expect(cls.muscleRank).toBe(1)
  })

  it('returns null when the exercise has no estimate', () => {
    expect(exerciseClassification({ unit: 'kg', workouts: [] }, 'sq', NOW)).toBe(null)
  })
})

describe('exerciseMode', () => {
  it('follows the latest logged entry mode', () => {
    const S = {
      workouts: [workout(1, { id: 'sq', sets: [{ phase: 'work', sec: 45, done: true }] })],
    }
    expect(exerciseMode(S, 'sq')).toBe('time')
  })
})
