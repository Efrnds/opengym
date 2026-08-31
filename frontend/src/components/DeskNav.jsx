import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

/** Left rail for wide screens — mobile keeps the bottom TabBar + Menu sheet. */
export default function DeskNav() {
  const nav = useNavigate()
  const loc = useLocation()
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  if (!user && !isGuest) return null

  const cur = loc.pathname.split('/')[1] || 'home'
  const on = (keys) => {
    const set = Array.isArray(keys) ? keys : [keys]
    return set.includes(cur) || (cur === 'stock' && set.includes('diet'))
  }

  const Item = ({ keys, icon, to, label }) => (
    <button type="button" className={on(keys) ? 'on' : ''} onClick={() => nav(to)}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  )

  return (
    <aside id="desk-nav" aria-label={t('Menu')}>
      <div className="desk-brand" onClick={() => nav('/home')} role="link" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') nav('/home') }}>
        <span className="desk-brand-mark" aria-hidden><Icon name="dumbbell" /></span>
        <span className="desk-brand-name">openGym</span>
      </div>

      <nav className="desk-nav-primary">
        <Item keys="home" icon="house" to="/home" label={t('Home')} />
        <Item keys="plan" icon="calendar" to="/plan" label={t('Plan')} />
        <Item keys="social" icon="globe" to="/social" label={t('Social')} />
        <Item keys="stats" icon="chart" to="/stats" label={t('Stats')} />
        <Item keys="library" icon="dumbbell" to="/library" label={t('Exercises')} />
      </nav>

      <div className="desk-nav-label">{t('More')}</div>
      <nav className="desk-nav-more">
        <Item keys="diet" icon="clipboard" to="/diet" label={t('Nutrition')} />
        <Item keys="shopping" icon="folder" to="/shopping" label={t('Shopping')} />
        <Item keys="vault" icon="camera" to="/vault" label={t('Photos')} />
        <Item keys="history" icon="history" to="/history" label={t('History')} />
        <Item keys="settings" icon="gear" to="/settings" label={t('Settings')} />
        {user?.admin && <Item keys="admin" icon="wrench" to="/admin" label={t('Admin')} />}
      </nav>
    </aside>
  )
}
