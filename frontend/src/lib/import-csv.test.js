import { describe, expect, it } from 'vitest'
import { parseBodyweight, parseWhen, parseWorkoutCSV, deriveRoutinesFromParsed, mergeDerivedRoutines, mergeImport, importSessionKey } from './import-csv.js'
import { EXIDX } from './exercises.js'

// Hevy writes the month token in the app language ("24 Ago 2026"). English-only used to
// drop every set dated Fev/Ago/Dez/… — the months Portuguese (and the other Romance /
// Germanic locales Hevy ships) don't share with English.
describe('localised Hevy dates', () => {
  it('parses Portuguese month tokens', () => {
    expect(parseWhen('24 Ago 2026, 18:43')).toEqual({ d: '2026-08-24', t: 67380000 })
    expect(parseWhen('05 Fev 2026, 09:00')).toEqual({ d: '2026-02-05', t: 32400000 })
    expect(parseWhen('20 Dez 2025, 00:00')).toEqual({ d: '2025-12-20', t: 0 })
  })

  it('imports a Hevy workout CSV dated in Portuguese', () => {
    const csv = [
      'title,start_time,end_time,exercise_title,set_index,set_type,weight_kg,reps,rpe',
      'A1,"24 Ago 2026, 18:43","24 Ago 2026, 20:09",Supino (Barra),0,normal,15,6,10',
      'A1,"24 Ago 2026, 18:43","24 Ago 2026, 20:09",Supino (Barra),1,normal,15,6,9.5',
      'A1,"05 Fev 2026, 10:00","05 Fev 2026, 11:00",Agachamento (Barra),0,normal,60,5,8',
    ].join('\n')
    const p = parseWorkoutCSV(csv, { unit: 'kg' })
    expect(p.error).toBeUndefined()
    expect(p.skipped).toBe(0)
    expect(p.sets).toBe(3)
    expect(p.from).toBe('2026-02-05')
    expect(p.to).toBe('2026-08-24')
    expect(p.workouts).toHaveLength(2)
    expect(p.matched).toBe(2)
    expect(p.created).toBe(0)
    expect(p.workouts.flatMap(w => w.entries.map(e => e.id)).sort()).toEqual(['0025', '0043'])
  })

  it('splits same-day Hevy sessions by title and start time', () => {
    const csv = [
      'title,start_time,end_time,exercise_title,set_index,set_type,weight_kg,reps',
      'Morning,"24 Ago 2026, 08:00","24 Ago 2026, 09:00",Supino (Barra),0,normal,60,5',
      'Evening,"24 Ago 2026, 18:00","24 Ago 2026, 19:00",Agachamento (Barra),0,normal,100,3',
    ].join('\n')
    const p = parseWorkoutCSV(csv, { unit: 'kg' })
    expect(p.workouts).toHaveLength(2)
    expect(p.workouts.map(w => w.name)).toEqual(['Morning', 'Evening'])
  })

  it('orders Hevy sets by set_index', () => {
    const csv = [
      'title,start_time,exercise_title,set_index,set_type,weight_kg,reps',
      'Push,"12 Jan 2026, 18:00",Supino (Barra),2,normal,80,3',
      'Push,"12 Jan 2026, 18:00",Supino (Barra),0,normal,60,10',
      'Push,"12 Jan 2026, 18:00",Supino (Barra),1,normal,70,8',
    ].join('\n')
    const p = parseWorkoutCSV(csv, { unit: 'kg' })
    expect(p.workouts[0].entries[0].sets.map(s => s.w)).toEqual([60, 70, 80])
  })

  it('imports Hevy measurement CSV with a Portuguese date', () => {
    const csv = [
      'date,weight_kg,fat_percent',
      '"20 Dez 2025, 00:00",79.4,',
    ].join('\n')
    const p = parseBodyweight(csv, { unit: 'kg' })
    expect(p.error).toBeUndefined()
    expect(p.bodyweight).toEqual([{ d: '2025-12-20', w: 79.4, t: expect.any(Number) }])
  })
})

const CSV = [
  'Date,Exercise,Weight,Reps,Set Type',
  '2026-08-08,Bench Press,100,5,Warm-up',
  '2026.08.08,Bench Press,80,5,Working',
  '8 Aug 2026,Bench Press,80,5,Working',
  '2026/08/08,Bench Press,85,3,Working',
].join('\n')

describe('CSV warm-up provenance', () => {
  it('retains the imported warm-up phase and excludes it from topW', () => {
    const parsed = parseWorkoutCSV(CSV, { unit: 'kg' })
    const entry = parsed.workouts[0].entries[0]

    expect(parsed.warmups).toBe(1)
    expect(entry.sets).toEqual([
      { w: 100, r: 5, done: true, phase: 'warmup' },
      { w: 80, r: 5, done: true },
      { w: 80, r: 5, done: true },
      { w: 85, r: 3, done: true },
    ])
    expect(entry.topW).toBe(85)
  })
})

// gravl writes its units in parentheses ("Weight (kg)", "Set Duration (sec)"). Header text is
// normalised before it is matched, so the alias table has to hold the normalised form — an alias
// written with the parentheses can never match. Sample rows are from the gravl export in !21.
const GRAVL = [
  'Date,Start Date,Workout,Source,Workout Duration (min),Energy,Exercise,Superset,Set,Set Type,Reps,Weight (kg),Distance (km),Set Duration (sec),Incline,Steps,Effort,Workout Notes',
  '2026/01/01,1:11 PM,Push Day,,11,11,Chin Up,No,1,Normal,11,11,0,,,,Ideal,felt strong',
  '2026/01/22,2:22 PM,External Something,APP,21,22,Walking,No,0,Normal,0,0,0,22,,,,',
].join('\n')

describe('gravl export', () => {
  it('reads slash dates, parenthesised weight and per-set duration', () => {
    const parsed = parseWorkoutCSV(GRAVL, { unit: 'kg' })

    expect(parsed.skipped).toBe(0)
    expect(parsed.from).toBe('2026-01-01')
    expect(parsed.to).toBe('2026-01-22')

    const [lift, cardio] = parsed.workouts
    expect(lift.name).toBe('Push Day')
    expect(lift.entries[0].sets).toEqual([{ w: 11, r: 11, done: true }])

    // "Set Duration (sec)" is seconds, not minutes: read as `time` it would land as 22 minutes.
    expect(cardio.entries[0].sets).toEqual([{ min: 0.4, speed: 0, done: true }])
  })
})

describe('deriveRoutinesFromParsed', () => {
  it('groups sessions by workout name and skips one-offs', () => {
    const csv = [
      'title,start_time,end_time,exercise_title,set_index,set_type,weight_kg,reps',
      'A1,"24 Ago 2026, 18:43","24 Ago 2026, 20:09",Supino (Barra),0,normal,60,8',
      'A1,"24 Ago 2026, 18:43","24 Ago 2026, 20:09",Agachamento (Barra),0,normal,80,5',
      'A1,"24 Ago 2026, 18:43","24 Ago 2026, 20:09",Remada Curvada (Barra),0,normal,50,8',
      'A1,"24 Ago 2026, 18:43","24 Ago 2026, 20:09",Desenvolvimento (Barra),0,normal,40,8',
      'A1,"24 Ago 2026, 18:43","24 Ago 2026, 20:09",Tríceps Pulley,0,normal,25,12',
      'A1,"24 Ago 2026, 18:43","24 Ago 2026, 20:09",Rosca Direta (Barra),0,normal,20,10',
      'A1,"05 Fev 2026, 10:00","05 Fev 2026, 11:00",Supino (Barra),0,normal,70,6',
      'B1,"12 Jan 2026, 18:00","12 Jan 2026, 19:00",Supino (Barra),0,normal,60,5',
      'Treino A,"01 Mar 2026, 09:00","01 Mar 2026, 10:00",Supino (Barra),0,normal,80,5',
      'Treino A,"15 Mar 2026, 09:00","15 Mar 2026, 10:00",Supino (Barra),0,normal,82,5',
      'Treino A,"29 Mar 2026, 09:00","29 Mar 2026, 10:00",Supino (Barra),0,normal,84,5',
    ].join('\n')
    const p = parseWorkoutCSV(csv, { unit: 'kg' })
    const d = deriveRoutinesFromParsed(p)
    expect(d.routineCount).toBe(3)
    expect(d.templateNames).toEqual(['A1', 'B1', 'Treino A'])
    expect(d.skippedOneOff).toEqual([])
    const a1 = d.routines.find(r => r.name === 'A1')
    expect(a1.ex.length).toBeGreaterThanOrEqual(5)
    expect(a1.ex[0].sets).toBeGreaterThan(0)
    expect(a1.ex[0].reps).toBeGreaterThan(0)
    expect(a1.ex[0].weight).toBe(0)
  })

  it('accepts single-session program slots and skips generic one-offs', () => {
    const row = (title, date, ex) =>
      `"${title}","${date}, 18:00","${date}, 19:00",${ex},0,normal,60,8`
    const csv = [
      'title,start_time,end_time,exercise_title,set_index,set_type,weight_kg,reps',
      row('A1', '24 Ago 2026', 'Supino (Barra)'),
      row('A1', '05 Fev 2026', 'Supino (Barra)'),
      row('A2', '20 Dez 2025', 'Supino (Barra)'),
      row('B1', '17 Dez 2025', 'Supino (Barra)'),
      row('B2', '18 Dez 2025', 'Supino (Barra)'),
      row('Treino A - Quadríceps e Panturrilha', '01 Mar 2026', 'Supino (Barra)'),
      row('Treino A - Quadríceps e Panturrilha', '15 Mar 2026', 'Supino (Barra)'),
      row('Treino B - Ombros, Bíceps e Tríceps', '01 Mar 2026', 'Supino (Barra)'),
      row('Treino B - Ombros, Bíceps e Tríceps', '15 Mar 2026', 'Supino (Barra)'),
      row('Treino C - Peito e Posterior', '01 Mar 2026', 'Supino (Barra)'),
      row('Treino C - Peito e Posterior', '15 Mar 2026', 'Supino (Barra)'),
      row('Treino D - Costa e Abdomen', '01 Mar 2026', 'Supino (Barra)'),
      row('Treino D - Costa e Abdomen', '15 Mar 2026', 'Supino (Barra)'),
      row('Treinamento noturno 🏋️', '01 Mar 2026', 'Supino (Barra)'),
    ].join('\n')
    const p = parseWorkoutCSV(csv, { unit: 'kg' })
    const d = deriveRoutinesFromParsed(p)
    expect(d.routineCount).toBe(8)
    expect(d.skippedOneOff).toEqual(['Treinamento noturno 🏋️'])
    expect(d.templateNames).toEqual([
      'A1', 'A2', 'B1', 'B2',
      'Treino A - Quadríceps e Panturrilha',
      'Treino B - Ombros, Bíceps e Tríceps',
      'Treino C - Peito e Posterior',
      'Treino D - Costa e Abdomen',
    ])
  })

  it('excludes warm-up sets from derived set counts', () => {
    const csv = [
      'title,start_time,exercise_title,set_index,set_type,weight_kg,reps',
      'Push,"12 Jan 2026, 18:00",Bench Press,0,Warm-up,100,5',
      'Push,"12 Jan 2026, 18:00",Bench Press,1,Working,80,5',
      'Push,"12 Jan 2026, 18:00",Bench Press,2,Working,85,3',
      'Push,"19 Jan 2026, 18:00",Bench Press,0,Working,82,5',
      'Push,"19 Jan 2026, 18:00",Bench Press,1,Working,87,3',
    ].join('\n')
    const p = parseWorkoutCSV(csv, { unit: 'kg' })
    const d = deriveRoutinesFromParsed(p)
    const push = d.routines.find(r => r.name === 'Push')
    expect(push.ex[0].sets).toBe(2)
  })

  it('derives cardio entries from timed exercises', () => {
    const csv = [
      'title,start_time,exercise_title,set_index,set_type,duration_seconds',
      'Leg,"12 Jan 2026, 18:00",Treadmill,0,normal,1200',
      'Leg,"19 Jan 2026, 18:00",Treadmill,0,normal,1500',
    ].join('\n')
    const p = parseWorkoutCSV(csv, { unit: 'kg' })
    const d = deriveRoutinesFromParsed(p)
    const leg = d.routines.find(r => r.name === 'Leg')
    expect(leg.ex[0]).toEqual({ id: '3666', min: 25, speed: 0 })
    expect(leg.ex[0].reps).toBeUndefined()
  })

  it('maps Hevy pt-BR esteira to c001 with animated gif media', () => {
    const csv = [
      'title,start_time,exercise_title,set_index,set_type,duration_seconds',
      'Leg,"12 Jan 2026, 18:00",Esteira (Caminhada),0,normal,960',
      'Leg,"19 Jan 2026, 18:00",Esteira (Caminhada),0,normal,960',
    ].join('\n')
    const p = parseWorkoutCSV(csv, { unit: 'kg' })
    expect(p.matched).toBe(1)
    expect(p.created).toBe(0)
    expect(p.workouts[0].entries[0].id).toBe('c001')
    expect(EXIDX.c001.gif.endsWith('.gif')).toBe(true)
    expect(EXIDX.c001.gif).not.toMatch(/^https?:\/\//)
    const d = deriveRoutinesFromParsed(p)
    expect(d.routines[0].ex[0].id).toBe('c001')
  })
})

describe('mergeImport', () => {
  const sameDayHevy = [
    'title,start_time,end_time,exercise_title,set_index,set_type,weight_kg,reps',
    'Morning,"24 Ago 2026, 08:00","24 Ago 2026, 09:00",Supino (Barra),0,normal,60,5',
    'Evening,"24 Ago 2026, 18:00","24 Ago 2026, 19:00",Agachamento (Barra),0,normal,100,3',
  ].join('\n')

  it('adds both same-day Hevy sessions when store is empty', () => {
    const parsed = parseWorkoutCSV(sameDayHevy, { unit: 'kg' })
    const S = { workouts: [], customEx: [], exWeights: {} }
    const res = mergeImport(S, parsed)
    expect(res).toEqual({ added: 2, skipped: 0 })
    expect(S.workouts).toHaveLength(2)
    expect(S.workouts.map(w => w.name)).toEqual(['Morning', 'Evening'])
  })

  it('adds a second same-day session when one is already stored', () => {
    const parsed = parseWorkoutCSV(sameDayHevy, { unit: 'kg' })
    const S = { workouts: [parsed.workouts[0]], customEx: [], exWeights: {} }
    const res = mergeImport(S, parsed)
    expect(res).toEqual({ added: 1, skipped: 1 })
    expect(S.workouts).toHaveLength(2)
    expect(S.workouts.map(w => w.name).sort()).toEqual(['Evening', 'Morning'])
  })

  it('skips sessions already in store by session key, not date alone', () => {
    const parsed = parseWorkoutCSV(sameDayHevy, { unit: 'kg' })
    const S = { workouts: [...parsed.workouts], customEx: [], exWeights: {} }
    const res = mergeImport(S, parsed)
    expect(res).toEqual({ added: 0, skipped: 2 })
    expect(S.workouts).toHaveLength(2)
  })

  it('imports rows with exercise and date but no metrics as placeholder sets', () => {
    const csv = [
      'title,start_time,exercise_title,set_index,set_type,weight_kg,reps',
      'Push,"12 Jan 2026, 18:00",Supino (Barra),0,normal,,',
    ].join('\n')
    const parsed = parseWorkoutCSV(csv, { unit: 'kg' })
    expect(parsed.skipped).toBe(0)
    expect(parsed.workouts[0].entries[0].sets).toEqual([{ w: 0, r: 0, done: true }])
    const S = { workouts: [], customEx: [], exWeights: {} }
    mergeImport(S, parsed)
    expect(S.workouts).toHaveLength(1)
  })
})

describe('importSessionKey', () => {
  it('collapses date-only workouts to the calendar day', () => {
    const base = new Date('2026-08-08T00:00:00').getTime()
    expect(importSessionKey({ d: '2026-08-08', start: base + 18 * 3600000, name: 'Imported' })).toBe('2026-08-08')
  })

  it('distinguishes same-day sessions by start time and title', () => {
    const base = new Date('2026-08-24T00:00:00').getTime()
    const morning = importSessionKey({ d: '2026-08-24', start: base + 8 * 3600000, name: 'Morning' })
    const evening = importSessionKey({ d: '2026-08-24', start: base + 18 * 3600000, name: 'Evening' })
    expect(morning).not.toBe(evening)
  })
})

describe('mergeDerivedRoutines', () => {
  it('skips routines whose names already exist', () => {
    const S = { routines: [{ id: 'r1', name: 'A1', ex: [] }] }
    const derived = { routines: [{ id: 'x', name: 'A1', emoji: 'figureStrength', ex: [{ id: '0025', sets: 3, reps: 8, weight: 0 }] }] }
    const res = mergeDerivedRoutines(S, derived)
    expect(res.skipped).toBe(1)
    expect(S.routines).toHaveLength(1)
  })

  it('replaces routines when replace is enabled', () => {
    const S = { routines: [{ id: 'r1', name: 'A1', ex: [] }] }
    const derived = { routines: [{ id: 'x', name: 'A1', emoji: 'figureStrength', ex: [{ id: '0025', sets: 3, reps: 8, weight: 0 }] }] }
    const res = mergeDerivedRoutines(S, derived, { replace: true })
    expect(res.replaced).toBe(1)
    expect(S.routines[0].ex.length).toBeGreaterThan(0)
    expect(S.routines[0].id).not.toBe('r1')
  })
})
