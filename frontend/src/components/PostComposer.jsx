import { useState, useRef, useEffect } from 'react'
import { t } from '../lib/i18n.js'
import { fmtVol, fmtNum, fmtDur } from '../lib/format.js'
import { workoutPostPayload, workoutPostSummary, createPost, postPhotoPath } from '../lib/feed.js'
import { apiBlob } from '../lib/api.js'
import { isOnline } from '../lib/network.js'
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { Button } from './ui.jsx'
import Icon from './Icon.jsx'

export default function PostComposer({ workout, unit, close, onPosted }) {
  const toast = useUI(s => s.toast)
  const flushSync = useStore(s => s.flushSync)
  const fileRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const summary = workoutPostSummary(workout, unit)

  const onPhoto = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { compressPhotoFile } = await import('../lib/photo-compress.js')
      setPhoto(await compressPhotoFile(file))
    } catch {
      toast(t('Could not read that file'))
    }
    setBusy(false)
  }

  const submit = async () => {
    if (!isOnline()) {
      toast(t('Feed needs an internet connection.'))
      return
    }
    setBusy(true)
    try {
      await flushSync()
      const { post } = await createPost({
        caption,
        photo: photo || undefined,
        workout: workoutPostPayload(workout, unit),
      })
      toast(t('Posted to feed'))
      onPosted?.(post)
      close()
    } catch (e) {
      toast(e.message || t('Could not post'))
    }
    setBusy(false)
  }

  return (
    <div style={{ padding: '6px 0' }}>
      <h3 style={{ margin: '0 0 12px' }}>{t('Post workout')}</h3>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} disabled={busy} />

      <button type="button" className="post-photo-pick" onClick={() => fileRef.current?.click()} disabled={busy}>
        {photo ? (
          <img src={photo} alt="" className="post-photo-preview" />
        ) : (
          <div className="post-photo-empty">
            <Icon name="camera" />
            <span>{t('Add gym photo')}</span>
          </div>
        )}
      </button>

      {photo && (
        <div style={{ marginBottom: 10 }}>
          <Button size="sm" variant="ghost" onClick={() => setPhoto(null)}>{t('Remove photo')}</Button>
        </div>
      )}

      <div className="feed-card-stats" style={{ marginBottom: 12 }}>
        <div className="feed-workout-name">{summary.name}</div>
        <div className="feed-stats-row">
          <span>{summary.duration}</span>
          <span>{summary.volume}</span>
          <span>{t('{0} sets · {1} work', summary.sets, summary.workSets)}</span>
          {summary.prs > 0 && <span className="accent">🏆 {summary.prs}</span>}
        </div>
      </div>

      <textarea
        className="post-caption"
        rows={3}
        placeholder={t('Caption (optional)')}
        value={caption}
        onChange={e => setCaption(e.target.value.slice(0, 280))}
      />

      <div className="row" style={{ gap: 8, marginTop: 14 }}>
        <Button variant="ghost" onClick={close}>{t('Cancel')}</Button>
        <Button variant="primary" icon="upload" disabled={busy} onClick={submit}>
          {busy ? t('Posting…') : t('Post')}
        </Button>
      </div>
    </div>
  )
}

export function FeedPostCard({ post, mine, onDelete }) {
  const w = post.workout || {}
  const dur = w.end && w.start ? fmtDur(w.end - w.start) : '—'
  const vol = fmtVol(w.vol || 0, w.unit || 'kg')
  const [photoUrl, setPhotoUrl] = useState(null)

  useEffect(() => {
    if (!post.hasPhoto) return
    let url = null
    let cancelled = false
    apiBlob(postPhotoPath(post.id))
      .then(blob => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setPhotoUrl(url)
      })
      .catch(() => { if (!cancelled) setPhotoUrl(null) })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [post.id, post.hasPhoto])

  return (
    <article className="feed-card">
      <header className="feed-head">
        <div className="feed-avatar">{(post.userName || '?').slice(0, 1).toUpperCase()}</div>
        <div className="grow">
          <div className="feed-user">{post.userName}</div>
          <div className="feed-time dim small">{new Date(post.createdAt).toLocaleString()}</div>
        </div>
        {mine && (
          <button type="button" className="iconbtn" aria-label={t('Delete')} onClick={() => onDelete(post.id)}>
            <Icon name="trash" />
          </button>
        )}
      </header>

      {post.hasPhoto && photoUrl && (
        <img src={photoUrl} alt="" className="feed-photo" loading="lazy" />
      )}

      <div className="feed-body">
        <div className="feed-workout-name">{w.name}</div>
        <div className="feed-stats-row dim small">
          <span>{dur}</span>
          <span>{vol}</span>
          {(w.prs || []).length > 0 && <span className="accent">🏆 {(w.prs || []).length}</span>}
        </div>
        {(w.entries || []).length > 0 && (
          <div className="feed-ex-list">
            {(w.entries || []).slice(0, 8).map((e, i) => (
              <div key={i} className="feed-ex-row small">
                <span className="capitalize">{e.name || e.id}</span>
                <span className="dim">
                  {e.sets} {t('sets')}
                  {e.topW > 0 ? ` · ${fmtNum(e.topW)} ${w.unit || 'kg'}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
        {post.caption && <p className="feed-caption">{post.caption}</p>}
      </div>
    </article>
  )
}
