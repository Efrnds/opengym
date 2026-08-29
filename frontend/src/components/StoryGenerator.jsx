import { useState, useRef, useEffect } from 'react'
import { t } from '../lib/i18n.js'
import { fmtVol, fmtNum, fmtDur } from '../lib/format.js'
import { setsDone, workSetsDone } from '../lib/history.js'
import { EXIDX } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n.js'
import { renderStoryImage, storyLabels, STORY_W, STORY_H } from '../lib/story-image.js'
import { shareImageBlob } from '../lib/share-image.js'
import { Button } from './ui.jsx'
import { useUI } from '../store/useUI.js'

export default function StoryGenerator({ workout, prs = [], unit = 'kg', close }) {
  const toast = useUI(s => s.toast)
  const fileRef = useRef(null)
  const blobRef = useRef(null)
  const previewRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  const w = workout || {}
  const duration = w.end && w.start ? fmtDur(w.end - w.start) : '—'
  const volume = fmtVol(w.vol || 0, unit)
  const totalSets = setsDone(w)
  const workSets = workSetsDone(w)

  const exerciseList = (w.entries || []).slice(0, 6).map(e => {
    const ex = EXIDX[e.id] || { n: e.id }
    const topW = Math.max(...(e.sets || []).map(s => s.w || 0), 0)
    return {
      name: exerciseNameFor(ex),
      sets: (e.sets || []).length,
      topW: topW > 0 ? `${fmtNum(topW)} ${unit}` : '',
    }
  })

  const labels = storyLabels(t)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const blob = await renderStoryImage({ workout: w, prs, unit, photoDataUrl: photo, labels })
        if (cancelled) return
        blobRef.current = blob
        if (previewRef.current) URL.revokeObjectURL(previewRef.current)
        previewRef.current = URL.createObjectURL(blob)
        setPreview(previewRef.current)
      } catch {
        if (!cancelled) {
          setPreview(null)
          toast(t('Could not generate preview'))
        }
      }
    })()
    return () => {
      cancelled = true
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current)
        previewRef.current = null
      }
    }
  }, [photo, w.id, w.end, prs.length, unit])

  const onPhoto = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { compressPhotoFile } = await import('../lib/photo-compress.js')
      setPhoto(await compressPhotoFile(file))
    } catch {
      toast(t('Could not read that file'))
    }
  }

  const shareImage = async () => {
    setBusy(true)
    try {
      const blob = blobRef.current || await renderStoryImage({ workout: w, prs, unit, photoDataUrl: photo, labels })
      const mode = await shareImageBlob(blob, `opengym-${w.d || 'workout'}.png`)
      if (mode === 'share') toast(t('Image shared'))
      else if (mode === 'download') toast(t('Image saved'))
    } catch (e) {
      toast(e.message || t('Could not share image'))
    }
    setBusy(false)
  }

  return (
    <div style={{ padding: '6px 0', textAlign: 'center' }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{t('Story generator')}</h3>
        <span className="tag acc">1080×1920</span>
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />

      {preview ? (
        <img
          src={preview}
          alt=""
          style={{
            width: '100%',
            maxWidth: 280,
            aspectRatio: `${STORY_W}/${STORY_H}`,
            objectFit: 'cover',
            borderRadius: 16,
            margin: '0 auto 12px',
            display: 'block',
            boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
          }}
        />
      ) : (
        <div className="story-preview-fallback dim small" style={{ marginBottom: 12 }}>
          {t('Add a photo for a gym selfie story, or share the stats card as-is.')}
        </div>
      )}

      <div className="row" style={{ gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <Button size="sm" icon="camera" onClick={() => fileRef.current?.click()}>
          {photo ? t('Change photo') : t('Add photo')}
        </Button>
        {photo && <Button size="sm" variant="ghost" onClick={() => setPhoto(null)}>{t('Remove photo')}</Button>}
      </div>

      <div className="tiles" style={{ textAlign: 'left', marginBottom: 14 }}>
        <div className="tile"><div className="l">{t('Duration')}</div><div className="v">{duration}</div></div>
        <div className="tile"><div className="l">{t('Volume')}</div><div className="v">{volume}</div></div>
        <div className="tile"><div className="l">{t('Sets')}</div><div className="v">{totalSets} ({workSets} {t('work')})</div></div>
        <div className="tile"><div className="l">{t('PRs')}</div><div className="v">{prs.length || '—'}</div></div>
      </div>

      {exerciseList.length > 0 && (
        <div style={{ textAlign: 'left', marginBottom: 14 }}>
          {exerciseList.map((e, i) => (
            <div key={i} className="small row between" style={{ padding: '4px 0' }}>
              <span className="capitalize">{e.name}</span>
              <span className="dim">{e.sets} {t('sets')}{e.topW ? ` · ${e.topW}` : ''}</span>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
        <Button variant="ghost" onClick={close}>{t('Close')}</Button>
        <Button variant="primary" icon="upload" disabled={busy} onClick={shareImage}>
          {busy ? t('Generating…') : t('Share image')}
        </Button>
      </div>
    </div>
  )
}
