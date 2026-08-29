import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fetchFeed, deletePost } from '../lib/feed.js'
import { isOnline } from '../lib/network.js'
import { confirmSheet } from '../sheets.jsx'
import { FeedPostCard } from '../components/PostComposer.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

export default function Social() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const setUser = useStore(s => s.setUser)
  const isGuest = useStore(s => s.isGuest())
  const toast = useUI(s => s.toast)
  const [posts, setPosts] = useState([])
  const [nextBefore, setNextBefore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)

  const load = useCallback(async (before = '') => {
    if (!user || isGuest) { setLoading(false); return }
    if (!isOnline()) { setLoading(false); return }
    try {
      const data = await fetchFeed(before)
      setPosts(prev => before ? [...prev, ...(data.posts || [])] : (data.posts || []))
      setNextBefore(data.nextBefore || null)
    } catch (e) {
      if (e?.status === 401) setUser(null)
      else if (!before) toast(e.message || t('Could not load feed'))
      else toast(e.message || t('Could not load feed'))
    }
    setLoading(false)
    setMore(false)
  }, [user, isGuest, toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const refresh = () => load()
    window.addEventListener('opengym-feed-posted', refresh)
    return () => window.removeEventListener('opengym-feed-posted', refresh)
  }, [load])

  const remove = id => {
    confirmSheet({
      title: t('Delete post?'),
      message: t('This cannot be undone.'),
      confirmText: t('Delete'),
      danger: true,
      onConfirm: async () => {
        try {
          await deletePost(id)
          setPosts(prev => prev.filter(p => p.id !== id))
          toast(t('Post deleted'))
        } catch (e) {
          toast(e.message || t('Could not delete post'))
        }
      },
    })
  }

  if (isGuest || !user) {
    return (
      <div className="narrow social-page">
        <header className="page-head"><h1>{t('Social')}</h1></header>
        <div className="empty-state">
          <Icon name="globe" />
          <p>{t('Sign in to see the gym feed and post your workouts.')}</p>
          <Button variant="primary" onClick={() => nav('/settings')}>{t('Settings')}</Button>
        </div>
      </div>
    )
  }

  if (!isOnline() && !posts.length) {
    return (
      <div className="narrow social-page">
        <header className="page-head"><h1>{t('Social')}</h1></header>
        <div className="empty-state dim">{t('Feed needs an internet connection.')}</div>
      </div>
    )
  }

  return (
    <div className="narrow social-page">
      <header className="page-head">
        <h1>{t('Social')}</h1>
      </header>
      <p className="dim small" style={{ margin: '-8px 0 16px' }}>{t('Workouts posted by everyone on this server.')}</p>

      {loading && !posts.length ? (
        <div className="dim" style={{ padding: 24, textAlign: 'center' }}>{t('Loading…')}</div>
      ) : !posts.length ? (
        <div className="empty-state">
          <Icon name="globe" />
          <p>{t('No posts yet — finish a workout and share it here.')}</p>
        </div>
      ) : (
        <div className="feed-list">
          {posts.map(p => (
            <FeedPostCard
              key={p.id}
              post={p}
              mine={p.userId === user.id}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      {nextBefore && (
        <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
          <Button size="sm" disabled={more} onClick={() => { setMore(true); load(nextBefore) }}>
            {more ? t('Loading…') : t('Load more')}
          </Button>
        </div>
      )}
    </div>
  )
}
