// Cache exercise thumbnails/GIFs for offline training — same cache bucket the service worker uses.
import { exOr, imgSrc, gifSrc } from './exercises.js'

export const MEDIA_CACHE = 'opengym-media-v2'

/** Collect exercise ids from routines, history and any in-progress workout. */
export function exerciseIdsFromState(S) {
  const ids = new Set()
  for (const r of S.routines || []) {
    for (const e of r.ex || []) ids.add(typeof e === 'string' ? e : e.id)
  }
  for (const w of S.workouts || []) {
    for (const e of w.entries || []) if (e?.id) ids.add(e.id)
  }
  if (S.active) {
    for (const e of S.active.entries || []) if (e?.id) ids.add(e.id)
  }
  return [...ids]
}

function mediaUrlsForIds(ids) {
  const urls = new Set()
  for (const id of ids) {
    const ex = exOr(id)
    const img = imgSrc(ex)
    const gif = gifSrc(ex)
    if (img) urls.add(img)
    if (gif && gif !== img) urls.add(gif)
  }
  return [...urls]
}

/** Fetch and store media URLs. Returns counts for UI feedback. */
export async function cacheExerciseMedia(ids, { onProgress } = {}) {
  if (!ids.length || typeof caches === 'undefined') return { ok: 0, fail: 0, total: 0 }
  const urls = mediaUrlsForIds(ids)
  const cache = await caches.open(MEDIA_CACHE)
  let ok = 0
  let fail = 0
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    try {
      if (await cache.match(url)) { ok++; continue }
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
      if (res.ok) { await cache.put(url, res); ok++ }
      else fail++
    } catch { fail++ }
    onProgress?.(i + 1, urls.length)
  }
  return { ok, fail, total: urls.length }
}
