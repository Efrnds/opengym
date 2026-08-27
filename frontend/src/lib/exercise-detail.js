import { modeOf, metricModeForEntry, metricRowsForEntry, bestWeightForEntry } from './history.js'
import { e1rmSeries } from './onerm.js'
import { strengthExerciseRows, strengthExerciseRowsForMuscle, primaryMuscleOf } from './strength-exercises.js'
import { extraVolumeOf } from './workout-model.js'
import { MUSCLE_NAME } from './muscles.js'

/** Completed-set volume for one workout entry (weight × reps, plus intensifier extras). */
export function entryVolume(entry) {
  let volume = 0
  ;(entry?.sets || []).forEach(set => {
    if (set.done) volume += (set.w || 0) * (set.r || 0) + extraVolumeOf(set)
  })
  return volume
}

/** Latest logged metric mode for an exercise, falling back to the catalogue default. */
export function exerciseMode(S, exId) {
  for (let i = (S?.workouts || []).length - 1; i >= 0; i--) {
    const entry = S.workouts[i].entries?.find(e => e.id === exId)
    if (entry) {
      const mode = metricModeForEntry(entry)
      if (mode) return mode
    }
  }
  return modeOf({ id: exId })
}

function inRange(timestamp, range, now) {
  if (range === 0) return true
  return timestamp > now - range * 86400000
}

/**
 * Per-exercise chart series for the detail sheet — mirrors Stats exercise progress,
 * scoped to one exercise and an optional day window.
 */
export function exerciseProgressSeries(S, exId, { range = 90, now = Date.now() } = {}) {
  const curMode = exerciseMode(S, exId)
  const curCardio = curMode === 'cardio'
  const curTimed = curMode === 'time'
  const metric = set => curCardio ? (set.speed || 0) : curTimed ? (set.sec || 0) : (set.w || 0)
  const exUnit = curCardio ? 'km/h' : curTimed ? 's' : S.unit

  const topPts = []
  const volPts = []
  let topBest = 0
  let volBest = 0

  ;(S?.workouts || []).forEach(workout => {
    const timestamp = workout.start || new Date(workout.d).getTime()
    if (!inRange(timestamp, range, now)) return
    const entry = workout.entries?.find(e => e.id === exId)
    if (!entry) return
    if (metricModeForEntry(entry) !== curMode) return

    const doneSets = metricRowsForEntry(entry, curMode)
    const top = curMode === 'reps' ? bestWeightForEntry(entry) : Math.max(0, ...doneSets.map(metric))
    if (top > 0) {
      topPts.push({ t: timestamp, y: top, d: workout.d, sets: doneSets, target: entry.target })
      if (top > topBest) topBest = top
    }

    const volume = entryVolume(entry)
    if (volume > 0) {
      volPts.push({ t: timestamp, y: volume, d: workout.d })
      if (volume > volBest) volBest = volume
    }
  })

  const e1Pts = curMode === 'reps'
    ? e1rmSeries(S, exId).filter(point => inRange(point.t, range, now))
    : []
  let e1Best = null
  e1Pts.forEach(p => {
    if (!e1Best || p.y > e1Best.est) e1Best = { est: p.y, w: p.w, r: p.r, d: p.d, t: p.t }
  })

  return {
    curMode,
    curCardio,
    curTimed,
    exUnit,
    topPts,
    volPts,
    e1Pts,
    topBest,
    volBest,
    e1Best,
    showE1: e1Pts.length > 0,
    showVol: volPts.length > 0 && curMode === 'reps',
  }
}

/** Logged sessions for one exercise, newest first. */
export function exerciseHistory(S, exId) {
  const sessions = []
  ;(S?.workouts || []).forEach(workout => {
    const entry = workout.entries?.find(e => e.id === exId)
    if (!entry) return
    const done = (entry.sets || []).filter(set => set.done)
    if (!done.length) return
    sessions.push({ workout, entry })
  })
  return sessions.reverse()
}

/** Local-only rank among the user's logged exercises with a usable 1RM estimate. */
export function exerciseClassification(S, exId, now = Date.now()) {
  const rows = strengthExerciseRows(S, now)
  const index = rows.findIndex(row => row.id === exId)
  if (index < 0) return null

  const row = rows[index]
  const primary = primaryMuscleOf({ id: exId })?.slug
  const muscleRows = primary ? strengthExerciseRowsForMuscle(S, now, primary) : []
  const muscleIndex = muscleRows.findIndex(r => r.id === exId)

  return {
    rank: index + 1,
    total: rows.length,
    muscleRank: muscleIndex >= 0 ? muscleIndex + 1 : null,
    muscleTotal: muscleRows.length,
    primary,
    primaryName: primary ? MUSCLE_NAME[primary] : null,
    current: row.current,
    est: row.est,
    decay: row.decay,
  }
}
