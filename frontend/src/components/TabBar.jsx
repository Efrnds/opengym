import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import NavDrawer, { navDrawerItems, isMoreRoute } from './NavDrawer.jsx'

export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const openSheet = useUI(s => s.openSheet)
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  if (!user && !isGuest) return null
  const cur = loc.pathname.split('/')[1] || 'home'
  const on = k => cur === k || (cur === 'history' && k === 'stats') || (cur === 'settings' && k === 'home')
  const onMore = isMoreRoute(cur)

  const startWorkout = () => {
    if (!S.active) {
      const r = effectiveRoutine(S, todayISO())
      if (r && r.ex.length) { onStart(r.id); return }
    }
    nav('/workout')
  }

  const openMore = () => {
    openSheet(close => (
      <NavDrawer close={close} items={navDrawerItems(user)} />
    ))
  }

  const Tab = ({ k, icon, to, label, className = '' }) => (
    <button className={[on(k) ? 'on' : '', className].filter(Boolean).join(' ')} onClick={() => nav(to)}>
      <Icon name={icon} /><span>{label}</span>
    </button>
  )

  return (
    <nav id="tabbar">
      <Tab k="home" icon="house" to="/home" label={t('Home')} />
      <Tab k="plan" icon="calendar" to="/plan" label={t('Plan')} />
      <button className={'start' + (S.active ? ' rec' : '')} onClick={startWorkout}>
        <span className="cir"><Icon name={S.active ? 'play' : 'dumbbell'} /></span>
        <span>{S.active ? t('Resume') : t('Start')}</span>
      </button>
      <Tab k="stats" icon="chart" to="/stats" label={t('Stats')} className="tab-desktop" />
      <Tab k="social" icon="globe" to="/social" label={t('Social')} className="tab-desktop" />
      <Tab k="library" icon="list" to="/library" label={t('Exercises')} className="tab-desktop" />
      <button type="button" className={'tab-more' + (onMore ? ' on' : '')} onClick={openMore}>
        <Icon name="grip" /><span>{t('Menu')}</span>
      </button>
    </nav>
  )
}
