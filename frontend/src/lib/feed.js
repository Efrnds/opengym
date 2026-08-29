import { api } from './api.js'
import { fmtDur, fmtVol } from './format.js'
import { setsDone, workSetsDone } from './history.js'
import { EXIDX } from './exercises.js'
import { exerciseNameFor } from './i18n.js'

/** Compact workout payload for the server feed. */
export function workoutPostPayload(workout, unit) {
  const w = workout || {}
  return {
    id: w.id,
    name: w.name,
    d: w.d,
    start: w.start,
    end: w.end,
    vol: w.vol,
    prs: w.prs || [],
    unit: unit || 'kg',
    entries: (w.entries || []).map(e => ({
      id: e.id,
      name: EXIDX[e.id] ? exerciseNameFor(EXIDX[e.id]) : e.id,
      sets: (e.sets || []).length,
      topW: Math.max(0, ...(e.sets || []).map(s => s.w || 0)),
    })),
  }
}

export function workoutPostSummary(workout, unit) {
  const w = workout || {}
  const dur = w.end && w.start ? fmtDur(w.end - w.start) : '—'
  return {
    name: w.name,
    duration: dur,
    volume: fmtVol(w.vol || 0, unit),
    sets: setsDone(w),
    workSets: workSetsDone(w),
    prs: (w.prs || []).length,
  }
}

export const fetchFeed = (before = '') => {
  const q = before ? `?before=${encodeURIComponent(before)}&limit=20` : '?limit=20'
  return api('/api/feed' + q)
}

export const createPost = body => api('/api/feed', { method: 'POST', body: JSON.stringify(body) })

export const deletePost = id => api('/api/feed/delete', { method: 'POST', body: JSON.stringify({ id }) })

export const postPhotoPath = id => `/api/feed/photo?id=${encodeURIComponent(id)}`
