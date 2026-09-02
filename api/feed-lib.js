/** Pure feed helpers — tested in feed-lib.test.js, used by server.js */

export function isImageBuf(buf) {
  if (!buf?.length) return false;
  if (buf[0] === 0xFF && buf[1] === 0xD8) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
  if (buf.length > 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return true;
  return false;
}

export function imageExt(buf) {
  if (!buf?.length) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf.length > 12 && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

export function imageMime(ext) {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export function decodePhotoDataUrl(raw) {
  const m = /^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i.exec(String(raw || ''));
  if (!m) return null;
  // removed strict base64 regex check
  try {
    const buf = Buffer.from(m[1], 'base64');
    if (!buf.length || buf.length > 15 * 1024 * 1024 || !isImageBuf(buf)) return null;
    const ext = imageExt(buf);
    return ext ? { buf, ext } : null;
  } catch {
    return null;
  }
}

export function sanitizeWorkoutPost(w) {
  if (!w || typeof w !== 'object') return null;
  return {
    id: String(w.id || '').slice(0, 40),
    name: String(w.name || 'Workout').slice(0, 80),
    d: String(w.d || '').slice(0, 10),
    start: +w.start || 0,
    end: +w.end || 0,
    vol: +w.vol || 0,
    prs: Array.isArray(w.prs) ? w.prs.slice(0, 50).map(x => String(x).slice(0, 20)) : [],
    unit: w.unit === 'lb' ? 'lb' : 'kg',
    entries: (w.entries || []).slice(0, 24).map(e => ({
      id: String(e.id || '').slice(0, 20),
      name: String(e.name || e.id || '').slice(0, 80),
      sets: Math.max(0, Math.min(99, +e.sets || (Array.isArray(e.sets) ? e.sets.length : 0))),
      topW: Math.max(0, +e.topW || 0),
    })),
  };
}

/** Build feed workout snapshot from saved server state (trusted stats). */
export function workoutPostFromState(state, workoutId, unitFallback = 'kg') {
  if (!state?.workouts?.length || !workoutId) return null;
  const w = state.workouts.find(x => x.id === workoutId);
  if (!w?.entries?.length) return null;
  const unit = state.unit === 'lb' ? 'lb' : (unitFallback === 'lb' ? 'lb' : 'kg');
  let vol = +w.vol || 0;
  if (!vol) {
    for (const e of w.entries) {
      for (const s of e.sets || []) {
        if (s.done && (s.w || 0) > 0 && (s.r || 0) > 0) vol += (s.w || 0) * (s.r || 0);
      }
    }
  }
  return sanitizeWorkoutPost({
    id: w.id,
    name: w.name,
    d: w.d,
    start: w.start,
    end: w.end,
    vol,
    prs: w.prs || [],
    unit,
    entries: w.entries.map(e => ({
      id: e.id,
      name: e.id,
      sets: (e.sets || []).filter(s => s.done).length || (e.sets || []).length,
      topW: Math.max(0, ...(e.sets || []).filter(s => s.done).map(s => s.w || 0)),
    })).filter(e => e.sets > 0),
  });
}

export function parseFeedCursor(raw) {
  const s = String(raw || '');
  if (!s) return null;
  const i = s.lastIndexOf('|');
  if (i <= 0) return { at: s, id: '' };
  return { at: s.slice(0, i), id: s.slice(i + 1) };
}

export function feedCursor(post) {
  return post ? `${post.createdAt}|${post.id}` : null;
}

export function feedPage(allPosts, { before = '', limit = 20 } = {}) {
  const sorted = [...allPosts].sort((a, b) => {
    const c = String(b.createdAt).localeCompare(String(a.createdAt));
    if (c !== 0) return c;
    return String(b.id).localeCompare(String(a.id));
  });
  const cur = parseFeedCursor(before);
  let list = sorted;
  if (cur) {
    list = sorted.filter(p => {
      const at = String(p.createdAt);
      if (at < cur.at) return true;
      if (at > cur.at) return false;
      return cur.id ? String(p.id) < cur.id : false;
    });
  }
  const page = list.slice(0, limit);
  return {
    posts: page,
    nextBefore: page.length === limit ? feedCursor(page[page.length - 1]) : null,
  };
}

const POSTS_PER_HOUR = 20;

export function checkPostRateLimit(map, userId, now = Date.now()) {
  const hour = 3600000;
  let rec = map.get(userId);
  if (!rec || rec.resetAt <= now) {
    rec = { count: 0, resetAt: now + hour };
    map.set(userId, rec);
  }
  if (rec.count >= POSTS_PER_HOUR) return false;
  rec.count++;
  return true;
}
