import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import NavDrawer, { navDrawerItems, isMoreRoute } from './NavDrawer.jsx'

export default function TabBar() {
  const nav = useNavigate()
  const loc = useLocation()
  const openSheet = useUI(s => s.openSheet)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  if (!user && !isGuest) return null
  const cur = loc.pathname.split('/')[1] || 'home'
  const on = k => cur === k || (cur === 'history' && k === 'stats') || (cur === 'settings' && k === 'home')
  const onMore = isMoreRoute(cur)

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
      <Tab k="social" icon="globe" to="/social" label={t('Social')} />
      <Tab k="stats" icon="chart" to="/stats" label={t('Stats')} className="tab-desktop" />
      <Tab k="library" icon="list" to="/library" label={t('Exercises')} className="tab-desktop" />
      <button type="button" className={'tab-more' + (onMore ? ' on' : '')} onClick={openMore}>
        <Icon name="grip" /><span>{t('Menu')}</span>
      </button>
    </nav>
  )
}
