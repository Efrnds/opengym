import { useEffect } from 'react'
import { useStore } from '../store/useStore.js'
import { MOBILE } from '../lib/mobile.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

export default function OfflineBanner() {
  const online = useStore(s => s.online)
  const syncPending = useStore(s => s.syncPending)
  const user = useStore(s => s.user)
  const syncing = useStore(s => s.syncing)
  const flushSync = useStore(s => s.flushSync)

  useEffect(() => {
    const show = (!MOBILE || !!user) && (!online || syncPending || syncing)
    document.body.classList.toggle('has-offline-banner', show)
    return () => document.body.classList.remove('has-offline-banner')
  }, [online, syncPending, syncing, user])

  if (MOBILE && !user) return null
  if (online && !syncPending && !syncing) return null

  let text = t('Offline — everything works. Changes stay on this device.')
  let action = null
  if (online && syncing) text = t('Back online — syncing…')
  else if (online && syncPending) {
    text = t('Changes not synced yet')
    action = (
      <button type="button" className="offline-banner-btn" onClick={() => flushSync()}>
        {t('Sync now')}
      </button>
    )
  }

  return (
    <div className={'offline-banner' + (online ? ' online' : '')} role="status">
      <Icon name={online ? 'reset' : 'shield'} />
      <span>{text}</span>
      {action}
    </div>
  )
}
