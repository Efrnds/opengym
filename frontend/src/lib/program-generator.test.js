import { describe, it, expect } from 'vitest'
import {
  buildProgram, progForLevel, defaultWeekdays, buildWeekSchedule,
  equipmentAllowed, candidatesForSlot, paramsForGoal, countCardioSlots,
  summarizeProgram, programQuality, splitLabelForDays, splitDescription,
  hasUnderfilledRoutines, MIN_ROUTINE_EXERCISES, routineExerciseCount
} from './program-generator.js'
import { POLICIES } from './progression.js'
import { allExercises } from './exercises.js'

const emptyStore = { customEx: [], equipFilterOn: false, equipProfiles: [], activeEquipId: null }

function minCompoundReps(program) {
  const { routines } = program
  const firstCompoundReps = []
  for (const r of routines) {
    const firstWithReps = r.ex.find(e => e.reps != null)
    if (firstWithReps) firstCompoundReps.push(firstWithReps.reps)
  }
  return firstCompoundReps.length ? Math.min(...firstCompoundReps) : Infinity
}

describe('progForLevel', () => {
  it('maps beginner to linear', () => {
    expect(progForLevel('beginner')).toBe('linear')
  })
  it('maps intermediate to double (not wave)', () => {
    expect(progForLevel('intermediate')).toBe('double')
    expect(POLICIES).toContain(progForLevel('intermediate'))
  })
  it('maps advanced to greyskull', () => {
    expect(progForLevel('advanced')).toBe('greyskull')
    expect(progForLevel('advanced', 'strength')).toBe('greyskull')
  })
})

describe('paramsForGoal', () => {
  it('uses strength, fatloss, and functional presets', () => {
    expect(paramsForGoal('strength')).toEqual({ reps: 6, restSec: 150 })
    expect(paramsForGoal('fatloss')).toEqual({ reps: 12, restSec: 60 })
    expect(paramsForGoal('functional')).toEqual({ reps: 11, restSec: 80 })
    expect(paramsForGoal('hypertrophy')).toEqual({ reps: 10, restSec: 90 })
  })
})

describe('splitLabelForDays', () => {
  it('returns split names for 3–6 day frequencies', () => {
    expect(splitLabelForDays(3)).toContain('PPL')
    expect(splitLabelForDays(4)).toContain('Upper')
    expect(splitLabelForDays(5)).toContain('ABCDE')
    expect(splitLabelForDays(6)).toContain('PPL')
    expect(splitDescription(4)).toBe(splitLabelForDays(4))
  })
})

describe('summarizeProgram and programQuality', () => {
  it('aggregates weekly totals from weekSchedule', () => {
    const program = buildProgram({
      goal: 'hypertrophy', days: 4, level: 'intermediate',
      equipmentMode: 'gym', selectedWeekdays: defaultWeekdays(4), storeSnapshot: emptyStore
    })
    const summary = summarizeProgram(program, 90)
    expect(summary.routines.length).toBe(4)
    expect(summary.weekly.routineCount).toBe(4)
    expect(summary.weekly.trainingDays).toBe(4)
    expect(summary.weekly.totalSets).toBeGreaterThan(0)
    expect(summary.weekly.estMinutes).toBeGreaterThan(0)
    summary.routines.forEach(r => {
      expect(r.stats.exCount).toBe(routineExerciseCount(r.routine))
      expect(r.stats.totalSets).toBeGreaterThanOrEqual(r.stats.exCount)
    })
  })

  it('flags underfilled routines in quality', () => {
    const routines = [{ ex: [{ id: 'x', sets: 3 }] }, { ex: [{ id: 'y', sets: 3 }, { id: 'z', sets: 3 }, { id: 'w', sets: 3 }] }]
    const quality = programQuality(routines)
    expect(quality.underfilledCount).toBe(1)
    expect(quality.isCritical).toBe(true)
    expect(quality.minExercisesPerRoutine).toBe(1)
    expect(hasUnderfilledRoutines(routines, MIN_ROUTINE_EXERCISES)).toBe(true)
  })
})

describe('buildProgram', () => {
  it('returns valid prog on every routine', () => {
    const { routines } = buildProgram({
      goal: 'hypertrophy', days: 4, level: 'intermediate',
      equipmentMode: 'gym', selectedWeekdays: [1, 2, 4, 5], storeSnapshot: emptyStore
    })
    expect(routines.length).toBe(4)
    routines.forEach(r => {
      expect(POLICIES).toContain(r.prog)
      expect(r.ex.length).toBeGreaterThan(0)
      r.ex.forEach(e => expect(e.id).toBeTruthy())
    })
  })

  it('filters exercises for dumbbell mode', () => {
    const gym = buildProgram({
      goal: 'hypertrophy', days: 3, level: 'beginner',
      equipmentMode: 'gym', selectedWeekdays: [1, 3, 5], storeSnapshot: emptyStore
    })
    const db = buildProgram({
      goal: 'hypertrophy', days: 3, level: 'beginner',
      equipmentMode: 'dumbbells', selectedWeekdays: [1, 3, 5], storeSnapshot: emptyStore
    })
    const gymIds = gym.routines.flatMap(r => r.ex.map(e => e.id)).sort().join(',')
    const dbIds = db.routines.flatMap(r => r.ex.map(e => e.id)).sort().join(',')
    expect(gymIds).not.toBe(dbIds)
    db.routines.flatMap(r => r.ex).forEach(e => {
      const ex = allExercises(emptyStore).find(x => x.id === e.id)
      expect(equipmentAllowed(ex, 'dumbbells')).toBe(true)
    })
  })

  it('filters exercises for bodyweight mode', () => {
    const { routines } = buildProgram({
      goal: 'functional', days: 3, level: 'beginner',
      equipmentMode: 'bodyweight', selectedWeekdays: [1, 3, 5], storeSnapshot: emptyStore
    })
    expect(routines.length).toBe(3)
    const ids = routines.flatMap(r => r.ex.map(e => e.id))
    expect(ids.length).toBeGreaterThan(0)
    ids.forEach(id => {
      const ex = allExercises(emptyStore).find(x => x.id === id)
      expect(ex).toBeTruthy()
      expect(equipmentAllowed(ex, 'bodyweight')).toBe(true)
    })
  })

  it('uses custom weekdays in weekSchedule', () => {
    const days = [2, 4, 6]
    const { routines, weekSchedule } = buildProgram({
      goal: 'hypertrophy', days: 3, level: 'beginner',
      equipmentMode: 'gym', selectedWeekdays: days, storeSnapshot: emptyStore
    })
    expect(Object.keys(weekSchedule).map(Number).sort()).toEqual(days)
    expect(weekSchedule[2]).toBe(0)
    expect(weekSchedule[4]).toBe(1)
    expect(weekSchedule[6]).toBe(2)
    expect(routines.length).toBe(3)
  })

  it('produces 6 routines for 6-day split', () => {
    const { routines, weekSchedule } = buildProgram({
      goal: 'strength', days: 6, level: 'advanced',
      equipmentMode: 'gym', selectedWeekdays: defaultWeekdays(6), storeSnapshot: emptyStore
    })
    expect(routines.length).toBe(6)
    expect(new Set(routines.map(r => r.name)).size).toBe(6)
    expect(Object.keys(weekSchedule).length).toBe(6)
  })

  it('falls back when profile excludes barbell exercises', () => {
    const noBarbell = {
      customEx: [],
      equipFilterOn: true,
      activeEquipId: 'p1',
      equipProfiles: [{ id: 'p1', name: 'No barbell', equipment: ['dumbbell', 'body weight', 'cable'] }]
    }
    const slot = { role: 'chest_compound', sets: 4, variant: 'test' }
    const withBar = candidatesForSlot(slot, emptyStore, 'gym', new Set())
    const withoutBar = candidatesForSlot(slot, noBarbell, 'gym', new Set())
    expect(withBar.some(e => e.eq === 'barbell')).toBe(true)
    expect(withoutBar.every(e => e.eq !== 'barbell')).toBe(true)

    const { routines } = buildProgram({
      goal: 'hypertrophy', days: 3, level: 'beginner',
      equipmentMode: 'gym', selectedWeekdays: [1, 3, 5], storeSnapshot: noBarbell
    })
    const ids = routines.flatMap(r => r.ex.map(e => e.id))
    expect(ids.length).toBeGreaterThan(0)
    ids.forEach(id => {
      const ex = allExercises(noBarbell).find(x => x.id === id)
      expect(ex).toBeTruthy()
      expect(ex.eq).not.toBe('barbell')
    })
  })

  it('adds cardio slots for fatloss across split sizes', () => {
    for (const days of [3, 4, 5, 6]) {
      const { routines } = buildProgram({
        goal: 'fatloss', days, level: 'intermediate',
        equipmentMode: 'gym', selectedWeekdays: defaultWeekdays(days), storeSnapshot: emptyStore
      })
      expect(countCardioSlots(routines)).toBeGreaterThanOrEqual(1)
    }
  })

  it('fatloss uses shorter rest than hypertrophy on resolved exercises', () => {
    const fatloss = buildProgram({
      goal: 'fatloss', days: 4, level: 'intermediate',
      equipmentMode: 'gym', selectedWeekdays: defaultWeekdays(4), storeSnapshot: emptyStore
    })
    const hypertrophy = buildProgram({
      goal: 'hypertrophy', days: 4, level: 'intermediate',
      equipmentMode: 'gym', selectedWeekdays: defaultWeekdays(4), storeSnapshot: emptyStore
    })
    const fatRest = fatloss.routines.flatMap(r => r.ex).filter(e => e.restSec != null).map(e => e.restSec)
    const hyperRest = hypertrophy.routines.flatMap(r => r.ex).filter(e => e.restSec != null).map(e => e.restSec)
    expect(Math.min(...fatRest)).toBeLessThan(Math.min(...hyperRest))
  })

  it('functional builds valid programs with moderate params and cardio', () => {
    const { routines } = buildProgram({
      goal: 'functional', days: 3, level: 'intermediate',
      equipmentMode: 'gym', selectedWeekdays: defaultWeekdays(3), storeSnapshot: emptyStore
    })
    expect(routines.length).toBe(3)
    routines.forEach(r => {
      expect(r.ex.length).toBeGreaterThan(0)
      r.ex.filter(e => e.reps != null).forEach(e => expect(e.reps).toBeGreaterThanOrEqual(10))
    })
    expect(countCardioSlots(routines)).toBeGreaterThanOrEqual(1)
  })

  it('seedVariant changes exercise picks with same settings', () => {
    const base = buildProgram({
      goal: 'hypertrophy', days: 4, level: 'intermediate',
      equipmentMode: 'gym', selectedWeekdays: [1, 2, 4, 5], storeSnapshot: emptyStore, seedVariant: 0
    })
    const shuffled = buildProgram({
      goal: 'hypertrophy', days: 4, level: 'intermediate',
      equipmentMode: 'gym', selectedWeekdays: [1, 2, 4, 5], storeSnapshot: emptyStore, seedVariant: 1
    })
    const baseIds = base.routines.flatMap(r => r.ex.map(e => e.id)).join(',')
    const shuffledIds = shuffled.routines.flatMap(r => r.ex.map(e => e.id)).join(',')
    expect(shuffledIds).not.toBe(baseIds)
    expect(base.routines.map(r => r.name)).toEqual(shuffled.routines.map(r => r.name))
  })

  it('strength uses lower reps on main compound slots vs hypertrophy', () => {
    const opts = {
      days: 4, level: 'intermediate', equipmentMode: 'gym',
      selectedWeekdays: defaultWeekdays(4), storeSnapshot: emptyStore, seedVariant: 0
    }
    const strength = buildProgram({ ...opts, goal: 'strength' })
    const hypertrophy = buildProgram({ ...opts, goal: 'hypertrophy' })
    expect(minCompoundReps(strength)).toBeLessThan(minCompoundReps(hypertrophy))
    const sReps = strength.routines.flatMap(r => r.ex.filter(e => e.reps != null).map(e => e.reps))
    const hReps = hypertrophy.routines.flatMap(r => r.ex.filter(e => e.reps != null).map(e => e.reps))
    expect(Math.min(...sReps)).toBeLessThan(Math.min(...hReps))
  })

  it('all equipment modes and day counts produce at least one exercise per routine', () => {
    for (const equipmentMode of ['gym', 'dumbbells', 'bodyweight']) {
      for (const days of [3, 4, 5, 6]) {
        const { routines } = buildProgram({
          goal: 'hypertrophy', days, level: 'intermediate',
          equipmentMode, selectedWeekdays: defaultWeekdays(days), storeSnapshot: emptyStore
        })
        expect(routines.length).toBeGreaterThan(0)
        routines.forEach(r => {
          expect(r.ex.length, `${equipmentMode} ${days}d ${r.name}`).toBeGreaterThanOrEqual(1)
        })
      }
    }
  })
})

describe('buildWeekSchedule', () => {
  it('assigns one routine index per weekday in order', () => {
    expect(buildWeekSchedule(6, [1, 2, 3, 4, 5, 6])).toEqual({ 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 })
  })
  it('wraps routine indices when weekdays outnumber routines', () => {
    expect(buildWeekSchedule(3, [1, 3, 5])).toEqual({ 1: 0, 3: 1, 5: 2 })
  })
})
