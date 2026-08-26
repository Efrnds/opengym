// Pure program builder for the Guided Trainer. Slot-based templates resolve exercises
// from the catalogue at generation time — no hardcoded exercise lists.
import { allExercises, EXIDX } from './exercises.js'
import { exAvailable } from './equipment.js'
import { POLICIES } from './progression.js'
import { computeRoutineStats } from '../components/RoutineSummary.jsx'

const GYM_EQ = new Set([
  'barbell', 'cable', 'leverage machine', 'smith machine', 'sled machine',
  'ez barbell', 'olympic barbell', 'trap bar', 'assisted', 'weighted', 'hammer'
])
const DB_EQ = new Set(['dumbbell', 'body weight', 'kettlebell'])
const BW_EQ = new Set(['body weight'])

export const MIN_ROUTINE_EXERCISES = 3

const COMPOUND_ROLES = new Set([
  'chest_compound', 'back_vertical', 'back_horizontal', 'quad_compound', 'shoulder_press'
])

const SPLIT_LABELS = {
  3: 'Full Body A / B / C or PPL',
  4: 'Upper / Lower',
  5: 'ABCDE split by muscle group',
  6: 'Push / Pull / Legs (PPL 2x) or Arnold'
}

/** Map experience level (+ optional goal) to a valid progression policy name. */
export function progForLevel(level, goal = 'hypertrophy') {
  if (level === 'beginner') return 'linear'
  if (level === 'intermediate') return 'double'
  if (level === 'advanced') return 'greyskull'
  return 'linear'
}

/** Default training weekdays (0=Sun … 6=Sat) spread across the week. */
export function defaultWeekdays(days) {
  const presets = {
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6]
  }
  return presets[days] || presets[4]
}

/** Sets / reps / rest derived from training goal. */
export function paramsForGoal(goal) {
  if (goal === 'strength') return { reps: 6, restSec: 150 }
  if (goal === 'fatloss') return { reps: 12, restSec: 60 }
  if (goal === 'functional') return { reps: 11, restSec: 80 }
  return { reps: 10, restSec: 90 }
}

function hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function exText(ex) {
  return [ex.n, ex.tg, ex.mg, ...(ex.sm || []), ex.bp, ex.eq].filter(Boolean).join(' ').toLowerCase()
}

function matchesRole(ex, role) {
  const text = exText(ex)
  const rules = {
    chest_compound: { bp: ['chest'], inc: ['press', 'bench', 'push-up', 'push up', 'dip'], exc: ['fly', 'crossover', 'pullover'] },
    chest_isolation: { bp: ['chest'], inc: ['fly', 'crossover', 'pullover', 'pec deck', 'pec'] },
    back_vertical: { bp: ['back'], inc: ['pull-down', 'pulldown', 'pull up', 'pull-up', 'chin', 'lat pull'] },
    back_horizontal: { bp: ['back'], inc: ['row', 'deadlift', 't-bar'] },
    shoulder_press: { bp: ['shoulders'], inc: ['press', 'overhead', 'military', 'arnold'] },
    shoulder_lateral: { bp: ['shoulders'], inc: ['lateral', 'raise', 'side'] },
    shoulder_rear: { bp: ['shoulders'], inc: ['rear', 'reverse', 'face pull', 'face-pull'] },
    triceps: { bp: ['upper arms', 'triceps'], inc: ['tricep', 'extension', 'pushdown', 'skull', 'dip'] },
    biceps: { bp: ['upper arms', 'biceps'], inc: ['curl', 'bicep', 'chin'] },
    quad_compound: { bp: ['upper legs'], inc: ['squat', 'lunge', 'leg press', 'step-up', 'step up'] },
    hamstring: { bp: ['upper legs'], inc: ['deadlift', 'curl', 'rdl', 'romanian', 'good morning', 'hamstring'] },
    glute: { bp: ['upper legs', 'hips', 'glutes'], inc: ['hip thrust', 'glute', 'bridge', 'kickback'] },
    calf: { bp: ['lower legs'], inc: ['calf', 'calves', 'raise'] },
    abs: { bp: ['waist'], inc: ['crunch', 'sit-up', 'sit up', 'plank', 'leg raise', 'ab'] },
    cardio: { bp: ['cardio'], inc: [] }
  }
  const r = rules[role]
  if (!r) return false
  if (r.bp && !r.bp.includes(ex.bp)) return false
  if (role === 'cardio') return ex.bp === 'cardio'
  if (r.exc && r.exc.some(k => text.includes(k))) return false
  if (r.inc.length) return r.inc.some(k => text.includes(k))
  return true
}

export function equipmentAllowed(ex, equipmentMode) {
  const eq = ex.eq || 'body weight'
  if (equipmentMode === 'bodyweight') return BW_EQ.has(eq)
  if (equipmentMode === 'dumbbells') return DB_EQ.has(eq)
  return GYM_EQ.has(eq) || eq === 'body weight'
}

/** Filter catalogue candidates for one slot. Exported for tests. */
export function candidatesForSlot(slot, storeSnapshot, equipmentMode, usedIds) {
  const list = allExercises(storeSnapshot)
  return list.filter(ex => {
    if (usedIds.has(ex.id)) return false
    if (!exAvailable(storeSnapshot, ex)) return false
    if (!equipmentAllowed(ex, equipmentMode)) return false
    if (!matchesRole(ex, slot.role)) return false
    return true
  })
}

function pickExercise(slot, storeSnapshot, equipmentMode, usedIds, seed) {
  let cands = candidatesForSlot(slot, storeSnapshot, equipmentMode, usedIds)
  if (!cands.length) {
    // Relax role match but keep equipment + profile filters
    cands = allExercises(storeSnapshot).filter(ex => {
      if (usedIds.has(ex.id)) return false
      if (!exAvailable(storeSnapshot, ex)) return false
      if (!equipmentAllowed(ex, equipmentMode)) return false
      if (slot.role === 'cardio') return ex.bp === 'cardio'
      if (slot.bp && ex.bp !== slot.bp) return false
      return true
    })
  }
  if (!cands.length) {
    // Last resort: bodyweight in same body part
    cands = allExercises(storeSnapshot).filter(ex => {
      if (usedIds.has(ex.id)) return false
      if (!exAvailable(storeSnapshot, ex)) return false
      if (slot.role === 'cardio') return ex.bp === 'cardio'
      return (ex.eq === 'body weight' || !ex.eq) && (!slot.bp || ex.bp === slot.bp)
    })
  }
  if (!cands.length) return null
  cands.sort((a, b) => {
    const aExtra = a.id.startsWith('g') || a.id.startsWith('c') ? 0 : 1
    const bExtra = b.id.startsWith('g') || b.id.startsWith('c') ? 0 : 1
    if (aExtra !== bExtra) return aExtra - bExtra
    return a.id.localeCompare(b.id)
  })
  const idx = hashSeed(seed + slot.role + slot.variant) % cands.length
  return cands[idx]
}

function repsForSlot(slot, ctx) {
  if (slot.reps != null) return slot.reps
  let reps = ctx.reps + (slot.repsOffset || 0)
  if (ctx.goal === 'strength' && COMPOUND_ROLES.has(slot.role)) {
    reps = Math.min(reps, 5)
  }
  return reps
}

function resolveRoutine(template, ctx) {
  const used = new Set()
  const ex = []
  for (const slot of template.slots) {
    const picked = pickExercise(slot, ctx.storeSnapshot, ctx.equipmentMode, used, ctx.seed + template.name)
    if (!picked) continue
    used.add(picked.id)
    const reps = repsForSlot(slot, ctx)
    const restSec = slot.restSec ?? (slot.restOffset != null ? ctx.restSec + slot.restOffset : ctx.restSec)
    const row = { id: picked.id, sets: slot.sets || 3, reps, restSec }
    if (slot.cardio) {
      row.reps = undefined
      row.min = slot.min || 20
      row.speed = slot.speed || 9
      row.restSec = 0
    }
    ex.push(row)
  }
  return {
    name: template.name,
    emoji: template.emoji,
    prog: ctx.prog,
    ex
  }
}

function slot(overrides) {
  return { sets: 3, repsOffset: 0, variant: '', ...overrides }
}

function cardioSlot(goal) {
  return slot({
    role: 'cardio',
    sets: 1,
    cardio: true,
    min: goal === 'fatloss' ? 20 : 15,
    speed: goal === 'fatloss' ? 9 : 8
  })
}

function withCardioFinisher(slots, goal) {
  if (goal === 'fatloss' || goal === 'functional') return [...slots, cardioSlot(goal)]
  return slots
}

function pushSlots(variant = 'a') {
  const v = variant.toLowerCase()
  return [
    slot({ role: 'chest_compound', sets: 4, variant: v }),
    slot({ role: v === 'b' ? 'chest_isolation' : 'shoulder_press', sets: 3, repsOffset: 2, variant: v }),
    slot({ role: v === 'b' ? 'shoulder_press' : 'shoulder_lateral', sets: 3, variant: v }),
    slot({ role: 'shoulder_lateral', sets: v === 'b' ? 4 : 3, repsOffset: 2, variant: v + 'lat' }),
    slot({ role: 'triceps', sets: 3, repsOffset: 2, restSec: 60, variant: v })
  ]
}

function pullSlots(variant = 'a') {
  const v = variant.toLowerCase()
  return [
    slot({ role: 'back_vertical', sets: 4, variant: v }),
    slot({ role: 'back_horizontal', sets: 4, repsOffset: v === 'b' ? 0 : 2, variant: v }),
    slot({ role: 'back_horizontal', sets: 3, repsOffset: 4, variant: v + 'row' }),
    slot({ role: 'shoulder_rear', sets: 4, repsOffset: 5, restSec: 60, variant: v }),
    slot({ role: 'biceps', sets: 3, repsOffset: 2, restSec: 60, variant: v }),
    slot({ role: 'biceps', sets: 3, repsOffset: 4, restSec: 60, variant: v + 'bi' })
  ]
}

function legSlots(variant = 'a') {
  const v = variant.toLowerCase()
  return [
    slot({ role: 'quad_compound', sets: 4, restOffset: 30, variant: v }),
    slot({ role: v === 'b' ? 'hamstring' : 'quad_compound', sets: 3, repsOffset: 4, restSec: 120, variant: v }),
    slot({ role: 'hamstring', sets: 3, repsOffset: 6, variant: v }),
    slot({ role: 'glute', sets: v === 'b' ? 4 : 3, repsOffset: 2, variant: v }),
    slot({ role: 'calf', sets: 4, repsOffset: 5, restSec: 60, variant: v }),
    slot({ role: 'abs', sets: 3, repsOffset: 5, restSec: 60, variant: v })
  ]
}

function templatesForDays(days, goal) {
  if (days === 3) {
    return [
      { name: 'Workout A: Push (Chest, Shoulders, Triceps)', emoji: 'dumbbell', slots: pushSlots('a') },
      { name: 'Workout B: Pull (Back, Rear Delts, Biceps)', emoji: 'anchor', slots: pullSlots('a') },
      {
        name: 'Workout C: Legs (Legs, Glutes & Abs)',
        emoji: 'figureRun',
        slots: withCardioFinisher(legSlots('a'), goal)
      }
    ]
  }
  if (days === 4) {
    return [
      {
        name: 'Upper A (Chest & Back strength focus)',
        emoji: 'bolt',
        slots: [
          slot({ role: 'chest_compound', sets: 4 }),
          slot({ role: 'back_horizontal', sets: 4 }),
          slot({ role: 'shoulder_press', sets: 3, repsOffset: -2 }),
          slot({ role: 'back_vertical', sets: 3, repsOffset: 2 }),
          slot({ role: 'triceps', sets: 3, repsOffset: 2, restSec: 60 }),
          slot({ role: 'biceps', sets: 3, repsOffset: 2, restSec: 60 })
        ]
      },
      {
        name: 'Lower A (Quads & Calves)',
        emoji: 'flame',
        slots: [
          slot({ role: 'quad_compound', sets: 4, restOffset: 30 }),
          slot({ role: 'quad_compound', sets: 3, repsOffset: 4, restSec: 120, variant: 'qa' }),
          slot({ role: 'hamstring', sets: 3, repsOffset: 6 }),
          slot({ role: 'glute', sets: 4, repsOffset: 2 }),
          slot({ role: 'calf', sets: 4, repsOffset: 5, restSec: 60 }),
          slot({ role: 'calf', sets: 3, repsOffset: 35, restSec: 60, variant: 'hold' })
        ]
      },
      {
        name: 'Upper B (Hypertrophy & Shoulders/Arms)',
        emoji: 'sparkles',
        slots: [
          slot({ role: 'chest_isolation', sets: 4, repsOffset: 2 }),
          slot({ role: 'back_horizontal', sets: 4, repsOffset: 2 }),
          slot({ role: 'shoulder_lateral', sets: 4, repsOffset: 2, restSec: 60 }),
          slot({ role: 'shoulder_rear', sets: 3, repsOffset: 5, restSec: 60 }),
          slot({ role: 'biceps', sets: 3, repsOffset: 4, restSec: 60 }),
          slot({ role: 'triceps', sets: 3, repsOffset: 4, restSec: 60 })
        ]
      },
      {
        name: 'Lower B (Hamstrings & Glutes)',
        emoji: 'trophy',
        slots: withCardioFinisher([
          slot({ role: 'hamstring', sets: 4, repsOffset: -2, restSec: 120 }),
          slot({ role: 'glute', sets: 3, repsOffset: 2 }),
          slot({ role: 'quad_compound', sets: 4, repsOffset: 4 }),
          slot({ role: 'abs', sets: 3, repsOffset: 2, restSec: 120 }),
          slot({ role: 'calf', sets: 4, repsOffset: 5, restSec: 60 }),
          slot({ role: 'abs', sets: 3, repsOffset: 5, restSec: 60, variant: 'b' })
        ], goal)
      }
    ]
  }
  if (days === 5) {
    const armSlots = [
      slot({ role: 'biceps', sets: 4, repsOffset: 2, restSec: 60 }),
      slot({ role: 'biceps', sets: 4, repsOffset: 2, restSec: 60, variant: 'bi2' }),
      slot({ role: 'triceps', sets: 3, repsOffset: 4, restSec: 60 }),
      slot({ role: 'triceps', sets: 4, repsOffset: 2, restSec: 60, variant: 'tri2' }),
      slot({ role: 'biceps', sets: 3, repsOffset: 4, restSec: 60, variant: 'bi3' })
    ]
    if (goal === 'fatloss') armSlots.push(cardioSlot('fatloss'))
    const legDaySlots = goal === 'functional'
      ? withCardioFinisher([
        slot({ role: 'quad_compound', sets: 4, restOffset: 30 }),
        slot({ role: 'quad_compound', sets: 4, repsOffset: 2, restSec: 120, variant: 'hack' }),
        slot({ role: 'quad_compound', sets: 3, repsOffset: 2, variant: 'ext' }),
        slot({ role: 'hamstring', sets: 4, repsOffset: 4, restSec: 60 }),
        slot({ role: 'calf', sets: 5, repsOffset: 5, restSec: 60 })
      ], goal)
      : [
        slot({ role: 'quad_compound', sets: 4, restOffset: 30 }),
        slot({ role: 'quad_compound', sets: 4, repsOffset: 2, restSec: 120, variant: 'hack' }),
        slot({ role: 'quad_compound', sets: 3, repsOffset: 2, variant: 'ext' }),
        slot({ role: 'hamstring', sets: 4, repsOffset: 4, restSec: 60 }),
        slot({ role: 'calf', sets: 5, repsOffset: 5, restSec: 60 })
      ]
    return [
      {
        name: 'A: Chest & Abs',
        emoji: 'dumbbell',
        slots: [
          slot({ role: 'chest_compound', sets: 4 }),
          slot({ role: 'chest_isolation', sets: 4, repsOffset: 2 }),
          slot({ role: 'chest_isolation', sets: 3, repsOffset: 2, variant: 'incl' }),
          slot({ role: 'chest_isolation', sets: 4, repsOffset: 4, restSec: 60, variant: 'fly' }),
          slot({ role: 'chest_isolation', sets: 3, repsOffset: 5, restSec: 60, variant: 'dec' }),
          slot({ role: 'abs', sets: 4, repsOffset: 5, restSec: 60 })
        ]
      },
      {
        name: 'B: Back & Lower Back',
        emoji: 'anchor',
        slots: [
          slot({ role: 'back_vertical', sets: 4 }),
          slot({ role: 'back_horizontal', sets: 4, repsOffset: -2, restSec: 120 }),
          slot({ role: 'back_horizontal', sets: 4, repsOffset: 2 }),
          slot({ role: 'back_horizontal', sets: 3, repsOffset: 4 }),
          slot({ role: 'hamstring', sets: 3, repsOffset: 2, restSec: 120 })
        ]
      },
      {
        name: 'C: Quads & Calves',
        emoji: 'flame',
        slots: legDaySlots
      },
      {
        name: 'D: Shoulders & Traps',
        emoji: 'bolt',
        slots: [
          slot({ role: 'shoulder_press', sets: 4, repsOffset: -2, restSec: 120 }),
          slot({ role: 'shoulder_lateral', sets: 5, repsOffset: 2, restSec: 60 }),
          slot({ role: 'shoulder_rear', sets: 4, repsOffset: 5, restSec: 60 }),
          slot({ role: 'shoulder_rear', sets: 4, repsOffset: 5, restSec: 60, variant: 'face' }),
          slot({ role: 'shoulder_press', sets: 4, repsOffset: 4, restSec: 60, variant: 'shrug' })
        ]
      },
      {
        name: goal === 'fatloss' ? 'E: Arms (Biceps + Triceps) + Cardio' : 'E: Arms (Biceps + Triceps)',
        emoji: 'trophy',
        slots: armSlots
      }
    ]
  }
  return [
    { name: 'Push A (Chest / Shoulders / Triceps)', emoji: 'dumbbell', slots: pushSlots('a') },
    { name: 'Pull A (Back / Rear Delts / Biceps)', emoji: 'anchor', slots: pullSlots('a') },
    { name: 'Legs A (Quads / Glutes)', emoji: 'flame', slots: legSlots('a').slice(0, 5) },
    { name: 'Push B (Chest / Shoulders / Triceps)', emoji: 'dumbbell', slots: pushSlots('b') },
    { name: 'Pull B (Back / Rear Delts / Biceps)', emoji: 'anchor', slots: pullSlots('b') },
    {
      name: 'Legs B (Quads / Glutes / Abs)',
      emoji: 'figureRun',
      slots: withCardioFinisher(legSlots('b'), goal)
    }
  ]
}

/** Assign routine indices to weekdays round-robin. */
export function buildWeekSchedule(routineCount, selectedWeekdays) {
  const days = [...selectedWeekdays].sort((a, b) => a - b)
  const schedule = {}
  days.forEach((day, i) => {
    schedule[day] = i % routineCount
  })
  return schedule
}

export function routineExerciseCount(routine) {
  return routine.ex?.length ?? 0
}

export function hasUnderfilledRoutines(routines, min = MIN_ROUTINE_EXERCISES) {
  return routines.some(r => routineExerciseCount(r) < min)
}

/** Human-readable split name for a weekly frequency (3–6 days). */
export function splitLabelForDays(days) {
  return SPLIT_LABELS[days] || SPLIT_LABELS[4]
}

/** @deprecated Use splitLabelForDays */
export const splitDescription = splitLabelForDays

export function programQuality(routines, min = MIN_ROUTINE_EXERCISES) {
  const counts = routines.map(routineExerciseCount)
  const underfilledCount = counts.filter(c => c < min).length
  const minExercisesPerRoutine = counts.length ? Math.min(...counts) : 0
  return {
    underfilledCount,
    minExercisesPerRoutine,
    minRequired: min,
    isCritical: underfilledCount > 0,
    isPoor: underfilledCount > 0 || minExercisesPerRoutine < min
  }
}

/**
 * Aggregate per-routine stats and weekly totals for preview UI.
 * @returns {{ routines: Array, weekly: Object, quality: Object }}
 */
export function summarizeProgram({ routines, weekSchedule }, defaultRestSec = 90) {
  const routineSummaries = routines.map((routine, index) => {
    const stats = computeRoutineStats(routine, defaultRestSec)
    const exerciseCount = routineExerciseCount(routine)
    return {
      index,
      routine,
      stats,
      exerciseCount,
      underfilled: exerciseCount < MIN_ROUTINE_EXERCISES
    }
  })

  const schedule = weekSchedule || {}
  const trainingDays = Object.keys(schedule).length
  let weeklySets = 0
  let weeklyMinutes = 0
  Object.values(schedule).forEach(rIdx => {
    const entry = routineSummaries[rIdx]
    if (!entry) return
    weeklySets += entry.stats.totalSets
    weeklyMinutes += entry.stats.estMinutes
  })

  return {
    routines: routineSummaries,
    weekly: {
      routineCount: routines.length,
      trainingDays,
      totalSets: weeklySets,
      estMinutes: weeklyMinutes
    },
    quality: programQuality(routines)
  }
}

export function countCardioSlots(routines) {
  return routines.reduce((n, r) => n + r.ex.filter(e => e.min != null).length, 0)
}

/**
 * Build a full program preview.
 * @returns {{ routines: Array, weekSchedule: Object<number, number> }}
 */
export function buildProgram({ goal, days, level, equipmentMode, selectedWeekdays, storeSnapshot, seedVariant = 0 }) {
  const prog = progForLevel(level, goal)
  if (!POLICIES.includes(prog)) throw new Error('invalid prog: ' + prog)

  const { reps, restSec } = paramsForGoal(goal)
  const weekdays = selectedWeekdays?.length ? selectedWeekdays : defaultWeekdays(days)
  const seed = [goal, days, level, equipmentMode, weekdays.join(','), seedVariant].join('|')
  const ctx = {
    storeSnapshot: storeSnapshot || {},
    equipmentMode: equipmentMode || 'gym',
    goal: goal || 'hypertrophy',
    prog,
    reps,
    restSec,
    seed
  }

  const templates = templatesForDays(days, goal)
  const routines = templates.map(t => resolveRoutine(t, ctx))
  const weekSchedule = buildWeekSchedule(routines.length, weekdays)

  return { routines, weekSchedule }
}

/** Resolve exercise display names for preview ( skips missing ). */
export function exerciseName(id) {
  return EXIDX[id]?.n || id
}
