import { matchExercise } from './import-csv.js'
import { EXIDX } from './exercises.js'

/** Import-created customs use im+uid; user-created customs use c+uid (sheets.jsx). */
export const isImportedCustom = id => typeof id === 'string' && id.startsWith('im')

/**
 * When import matching improves, relink stale im* customs to catalogue entries.
 * Only runs when matchExercise returns a single id (never on subset ties).
 * User customs (c*) are never touched.
 */
export function relinkImportedExercises(S) {
  const customs = S.customEx || []
  const idMap = {}
  for (const c of customs) {
    if (!isImportedCustom(c.id)) continue
    const target = matchExercise(c.n)
    if (!target || !EXIDX[target] || target === c.id) continue
    idMap[c.id] = target
  }
  const ids = Object.keys(idMap)
  if (!ids.length) return { relinked: 0, idMap: {} }

  for (const r of S.routines || []) {
    for (const e of r.ex || []) if (idMap[e.id]) e.id = idMap[e.id]
  }
  for (const w of S.workouts || []) {
    for (const e of w.entries || []) if (idMap[e.id]) e.id = idMap[e.id]
  }
  if (S.active?.entries) {
    for (const e of S.active.entries) if (idMap[e.id]) e.id = idMap[e.id]
  }
  if (S.exWeights) {
    for (const oldId of ids) {
      const old = S.exWeights[oldId]
      if (!old) continue
      const newId = idMap[oldId]
      const cur = S.exWeights[newId]
      if (!cur || (old.d || '') >= (cur.d || '')) S.exWeights[newId] = old
      delete S.exWeights[oldId]
    }
  }
  S.customEx = customs.filter(c => !idMap[c.id])
  return { relinked: ids.length, idMap }
}
