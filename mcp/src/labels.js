// Formatting glue between lib helpers (which speak {0}/{1} templates) and the JSON returned
// to the LLM.
import { MUSCLE_NAME, MUSCLES } from '../../frontend/src/lib/muscles.js'
import { modeOf, fmtSec, setLabel } from '../../frontend/src/lib/history.js'
import { cardioFields } from '../../frontend/src/lib/cardio.js'
import { POLICY_NAME } from '../../frontend/src/lib/progression.js'
import { fmtDate, fmtNum, fmtDur } from '../../frontend/src/lib/format.js'

// Apply {0},{1},… substitutions to the template strings the lib returns.
export function fmt(template, args) {
  let v = template
  for (let i = 0; i < (args || []).length; i++) v = v.replaceAll('{' + i + '}', String(args[i]))
  return v
}

export { setLabel }

export function exLine(cfg, unit) {
  const mode = modeOf(cfg)
  const n = cfg.sets || 1
  const load = cfg.weight ? ' · ' + fmtNum(cfg.weight) + ' ' + unit : ''
  if (mode === 'cardio') {
    const fields = cardioFields(cfg.id)
    const parts = [`${n} × ${cfg.min || 20} min`]
    if (fields.speed) parts.push(`${fmtNum(cfg.speed || 0)} km/h`)
    if (fields.elev && (cfg.elev > 0)) parts.push(`${fmtNum(cfg.elev)}%`)
    return parts.join(' · ')
  }
  if (mode === 'time') return `${n} × ${fmtSec(cfg.sec || 45)}${load}`
  return `${n} × ${cfg.reps}${load}`
}

export function muscleName(slug) {
  return MUSCLE_NAME[slug] || slug
}

export function policyName(policy) {
  return POLICY_NAME[policy] || policy
}

export function friendlyDate(iso) {
  if (!iso) return null
  return fmtDate(iso)
}

export function friendlyDuration(ms) {
  return ms ? fmtDur(ms) : null
}

export function ratio(done, total) {
  return `${done}/${total}`
}

export function muscleOrder() { return MUSCLES.slice() }
