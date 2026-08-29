// Instagram-story PNG (1080×1920) — canvas only, no extra deps.
import { fmtDur, fmtVol, fmtNum, fmtDate } from './format.js'
import { setsDone, workSetsDone } from './history.js'
import { EXIDX } from './exercises.js'
import { exerciseNameFor } from './i18n.js'

export const STORY_W = 1080
export const STORY_H = 1920

const ACC = '#3a86ff'
const GOLD = '#fbbf24'
const LOAD_TIMEOUT = 15000
const PHOTO_MAX = 1440

const trunc = (s, max = 28) => {
  const t = String(s || '')
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

const loadImage = src => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT)
  const done = img => { clearTimeout(timer); resolve(img) }
  const fail = e => { clearTimeout(timer); reject(e) }
  if (typeof createImageBitmap === 'function' && String(src).startsWith('data:')) {
    fetch(src).then(r => r.blob()).then(blob =>
      createImageBitmap(blob, { resizeWidth: PHOTO_MAX, resizeHeight: PHOTO_MAX, resizeQuality: 'high' })
    ).then(done).catch(() => {
      const img = new Image()
      img.onload = () => done(img)
      img.onerror = fail
      img.src = src
    })
    return
  }
  const img = new Image()
  img.onload = () => done(img)
  img.onerror = fail
  img.src = src
})

const imgSize = img => ({ w: img.width || img.bitmapWidth, h: img.height || img.bitmapHeight })

const coverDraw = (ctx, img, x, y, w, h) => {
  const { w: iw, h: ih } = imgSize(img)
  const ir = iw / ih
  const dr = w / h
  let sw, sh, sx, sy
  if (ir > dr) { sh = ih; sw = sh * dr; sx = (iw - sw) / 2; sy = 0 }
  else { sw = iw; sh = sw / dr; sx = 0; sy = (ih - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

const wrapText = (ctx, text, x, y, maxW, lineH, maxLines) => {
  const words = String(text).split(/\s+/)
  let line = ''
  let lines = 0
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i]
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH)
      line = words[i]
      lines++
      if (lines >= maxLines - 1) {
        ctx.fillText(trunc(line, 40), x, y + lines * lineH)
        return lines + 1
      }
    } else line = test
  }
  if (line) { ctx.fillText(line, x, y + lines * lineH); lines++ }
  return lines
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => {
      if (b) { resolve(b); return }
      try {
        const data = canvas.toDataURL('image/png', 0.92)
        const bin = atob(data.split(',')[1])
        const arr = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
        resolve(new Blob([arr], { type: 'image/png' }))
      } catch (e) { reject(e) }
    }, 'image/png', 0.92)
  })
}

/** @param {{ workout, prs?, unit?, photoDataUrl?, labels }} opts */
export async function renderStoryImage({ workout, prs = [], unit = 'kg', photoDataUrl = null, labels }) {
  const w = workout || {}
  const duration = w.end && w.start ? fmtDur(w.end - w.start) : '—'
  const volume = fmtVol(w.vol || 0, unit)
  const totalSets = setsDone(w)
  const workSets = workSetsDone(w)
  const prCount = (prs || []).length

  const exercises = (w.entries || []).slice(0, 6).map(e => {
    const ex = EXIDX[e.id] || { n: e.id }
    const topW = Math.max(0, ...(e.sets || []).map(s => s.w || 0))
    return {
      name: trunc(exerciseNameFor(ex)),
      sets: (e.sets || []).length,
      topW: topW > 0 ? `${fmtNum(topW)} ${unit}` : '',
    }
  })

  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
  if (!canvas) throw new Error('canvas unavailable')
  canvas.width = STORY_W
  canvas.height = STORY_H
  const ctx = canvas.getContext('2d')

  const photoH = Math.round(STORY_H * 0.52)
  if (photoDataUrl) {
    try {
      const img = await loadImage(photoDataUrl)
      coverDraw(ctx, img, 0, 0, STORY_W, photoH)
    } catch {
      const g = ctx.createLinearGradient(0, 0, STORY_W, photoH)
      g.addColorStop(0, '#0d1117'); g.addColorStop(1, '#1f2937')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, STORY_W, photoH)
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, STORY_W, STORY_H)
    g.addColorStop(0, '#0d1117'); g.addColorStop(0.45, '#161b22'); g.addColorStop(1, '#1f2937')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, STORY_W, STORY_H)
    ctx.fillStyle = 'rgba(58,134,255,0.15)'
    ctx.beginPath()
    ctx.arc(STORY_W - 80, 120, 200, 0, Math.PI * 2)
    ctx.fill()
  }

  const panelY = photoDataUrl ? photoH - 40 : 0
  const panelH = STORY_H - panelY
  const fade = ctx.createLinearGradient(0, panelY, 0, panelY + 120)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,0.85)')
  ctx.fillStyle = fade
  ctx.fillRect(0, panelY, STORY_W, 120)
  ctx.fillStyle = 'rgba(0,0,0,0.88)'
  ctx.fillRect(0, panelY + (photoDataUrl ? 80 : 0), STORY_W, panelH)

  let y = panelY + (photoDataUrl ? 100 : 72)
  const pad = 56

  ctx.fillStyle = ACC
  ctx.font = '700 28px system-ui, sans-serif'
  ctx.fillText(labels.brand.toUpperCase(), pad, y)
  y += 52

  ctx.fillStyle = '#fff'
  ctx.font = '800 64px system-ui, sans-serif'
  const titleLines = wrapText(ctx, w.name || labels.workout, pad, y, STORY_W - pad * 2, 72, 2)
  y += titleLines * 72 + 16

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '400 32px system-ui, sans-serif'
  ctx.fillText(fmtDate(w.d || new Date().toISOString(), true), pad, y)
  y += 56

  const tileW = (STORY_W - pad * 2 - 24) / 2
  const tileH = 120
  const tiles = [
    [labels.duration, duration],
    [labels.volume, volume],
    [labels.sets, `${totalSets} (${workSets} ${labels.work})`],
    [labels.prs, prCount ? `🏆 ${prCount}` : '—'],
  ]
  for (let i = 0; i < tiles.length; i++) {
    const col = i % 2
    const row = Math.floor(i / 2)
    const tx = pad + col * (tileW + 24)
    const ty = y + row * (tileH + 20)
    roundRect(ctx, tx, ty, tileW, tileH, 20)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = '500 26px system-ui, sans-serif'
    ctx.fillText(tiles[i][0], tx + 24, ty + 40)
    ctx.fillStyle = i === 3 && prCount ? GOLD : ACC
    ctx.font = '700 40px system-ui, sans-serif'
    ctx.fillText(String(tiles[i][1]), tx + 24, ty + 88)
  }
  y += tileH * 2 + 48

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '700 30px system-ui, sans-serif'
  ctx.fillText(labels.exercisesDone + ':', pad, y)
  y += 44

  ctx.font = '500 28px system-ui, sans-serif'
  for (const ex of exercises) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    const right = `${ex.sets} ${labels.setsLabel}${ex.topW ? ' · ' + ex.topW : ''}`
    ctx.fillText(ex.name, pad, y)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.textAlign = 'right'
    ctx.fillText(right, STORY_W - pad, y)
    ctx.textAlign = 'left'
    y += 44
  }

  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '500 26px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(labels.madeWith, STORY_W / 2, STORY_H - 48)
  ctx.textAlign = 'left'

  const blob = await canvasToBlob(canvas)
  canvas.width = 0
  canvas.height = 0
  return blob
}

export function storyLabels(t) {
  return {
    brand: 'openGym',
    workout: t('Workout'),
    duration: t('Duration'),
    volume: t('Volume'),
    sets: t('Sets'),
    work: t('work'),
    prs: t('PRs'),
    exercisesDone: t('Exercises Done'),
    setsLabel: t('sets'),
    madeWith: t('Made with openGym'),
  }
}
