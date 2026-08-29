// Cardio field detection and calorie estimation — pure helpers with unit tests beside.
import { EXIDX } from './exercises.js'
import { fmtNum } from './format.js'
import { LB_TO_KG } from './recovery.js'
import { t } from './i18n-core.js'

const NO_SPEED = /jump rope|jumping jack|mountain climber|burpee|battle rope|heavy bag|swimming|hiit session|hiit\b/i
const ELEV = /treadmill|incline|stair|stepmill|step mill|steepmill|hill/i

/** Which optional inputs a cardio exercise uses in the log UI. */
export function cardioFields(idOrEx) {
  const ex = typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx
  if (!ex || ex.bp !== 'cardio') return { speed: false, elev: false }
  const n = ex.n || ''
  const speed = !NO_SPEED.test(n)
  const elev = speed && (ELEV.test(n) || ex.id === 'c009')
  return { speed, elev }
}

export function bodyweightKg(S) {
  const bw = S?.bodyweight?.length ? S.bodyweight[S.bodyweight.length - 1] : null
  if (!bw || !(bw.w > 0)) return null
  return S.unit === 'lb' ? bw.w * LB_TO_KG : bw.w
}

/** ACSM treadmill walking/running VO₂ → kcal. Speed in km/h, grade as percent (0–15). */
function acsmTreadmillKcal(min, speedKmh, elevPct, kg) {
  const speedMmin = speedKmh * 1000 / 60
  const grade = Math.max(0, elevPct) / 100
  const vo2 = speedKmh < 8
    ? 0.1 * speedMmin + 1.8 * speedMmin * grade + 3.5
    : 0.2 * speedMmin + 0.9 * speedMmin * grade + 3.5
  return vo2 * kg * min / 200
}

function metForExercise(id) {
  const n = (EXIDX[id]?.n || '').toLowerCase()
  if (/run/.test(n)) return 9.8
  if (/walk/.test(n)) return 3.8
  if (/bike|cycl|spin/.test(n)) return 7.5
  if (/row/.test(n)) return 7
  if (/elliptical/.test(n)) return 5
  if (/stair/.test(n)) return 9
  if (/jump rope/.test(n)) return 11
  if (/swim/.test(n)) return 7
  if (/hiit/.test(n)) return 8
  if (/box/.test(n)) return 5.5
  if (/battle rope/.test(n)) return 9
  if (/mountain climber/.test(n)) return 8
  if (/jumping jack/.test(n)) return 8
  return 6
}

function speedMetKcal(min, speedKmh, elevPct, kg, id) {
  const n = (EXIDX[id]?.n || '').toLowerCase()
  if (/bike|cycl|spin|elliptical/.test(n)) {
    const met = Math.max(3, 2 + speedKmh * 0.35)
    return met * kg * (min / 60)
  }
  if (/row/.test(n)) {
    const met = Math.max(4, 4 + speedKmh * 0.4)
    return met * kg * (min / 60)
  }
  return acsmTreadmillKcal(min, speedKmh, elevPct, kg)
}

/** Estimated kcal for one logged cardio set. Uses last bodyweight when given, else 70 kg. */
export function estimateCardioKcal(set, { exerciseId, weightKg } = {}) {
  const min = Math.max(0, Number(set?.min) || 0)
  if (min <= 0) return 0
  const kg = weightKg > 0 ? weightKg : 70
  const fields = cardioFields(exerciseId)
  const speed = Number(set?.speed) || 0
  const elev = Number(set?.elev) || 0
  if (fields.speed && speed > 0) return Math.round(speedMetKcal(min, speed, elev, kg, exerciseId))
  return Math.round(metForExercise(exerciseId) * kg * (min / 60))
}

/** Human-readable cardio set line (duration, speed, incline, kcal). */
export function cardioSetSummary(set, exerciseId, weightKg) {
  const fields = cardioFields(exerciseId)
  const parts = [`${set.min || 0} min`]
  if (fields.speed) parts.push(`${fmtNum(set.speed || 0)} km/h`)
  if (fields.elev && (set.elev > 0)) parts.push(`${fmtNum(set.elev)}%`)
  const kcal = estimateCardioKcal(set, { exerciseId, weightKg })
  if (kcal > 0) parts.push(t('{0} kcal', kcal))
  return parts.join(' · ')
}

/** Default incline for a cardio exercise config. */
export function defaultCardioElev(id) {
  const n = EXIDX[id]?.n || ''
  if (/incline|stair|stepmill|step mill|steepmill/i.test(n) || id === 'c003' || id === 'c009') return 10
  return 0
}

/** Seed a cardio set/target from config + optional previous set. */
export function seedCardioSet(cfg, prev) {
  const fields = cardioFields(cfg.id)
  const row = {
    min: prev ? prev.min : (cfg.min || 20),
    done: false,
  }
  if (fields.speed) row.speed = prev ? prev.speed : (cfg.speed ?? 8)
  if (fields.elev) row.elev = prev ? (prev.elev ?? cfg.elev ?? 0) : (cfg.elev ?? defaultCardioElev(cfg.id))
  return row
}
