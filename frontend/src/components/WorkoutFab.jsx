import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

export default function WorkoutFab({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())

  if (!user && !isGuest) return null
  if (loc.pathname === '/workout') return null

  const active = S.active
  const name = active?.name || ''

  const go = () => {
    if (active) { nav('/workout'); return }
    const r = effectiveRoutine(S, todayISO())
    if (r?.ex?.length) { onStart(r.id); return }
    nav('/workout')
  }

  const label = active ? t('Resume') : t('Start')

  return (
    <button
      type="button"
      id="workout-fab"
      className={active ? 'live' : ''}
      onClick={go}
      aria-label={active ? `${label}: ${name}` : label}
    >
      <span className="workout-fab-icn" aria-hidden>
        <Icon name={active ? 'play' : 'dumbbell'} />
      </span>
      {active && name && (
        <span className="workout-fab-lbl">{name}</span>
      )}
    </button>
  )
}
