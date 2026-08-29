import { useNavigate } from 'react-router-dom'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

/** Bottom-sheet grid menu (mobile “More” tab) — shadcn-style drawer without extra deps. */
export default function NavDrawer({ close, items }) {
  const nav = useNavigate()

  const go = to => {
    close()
    nav(to)
  }

  return (
    <div className="nav-drawer" data-nodrag>
      <div className="nav-drawer-handle" aria-hidden="true" />
      <h3 className="nav-drawer-title">{t('Menu')}</h3>
      <p className="nav-drawer-sub dim small">{t('More sections of openGym')}</p>
      <div className="nav-drawer-grid">
        {items.map(item => (
          <button key={item.to} type="button" className="nav-drawer-tile" onClick={() => go(item.to)}>
            <Icon name={item.icon} size={26} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <Button variant="ghost" className="nav-drawer-close" onClick={close}>{t('Close')}</Button>
    </div>
  )
}

export function navDrawerItems(user) {
  const items = [
    { to: '/stats', icon: 'chart', label: t('Stats') },
    { to: '/social', icon: 'globe', label: t('Social') },
    { to: '/library', icon: 'list', label: t('Exercises') },
    { to: '/history', icon: 'history', label: t('History') },
    { to: '/settings', icon: 'gear', label: t('Settings') },
  ]
  if (user?.admin) items.push({ to: '/admin', icon: 'wrench', label: t('Admin') })
  return items
}

const MORE_ROUTES = new Set(['stats', 'social', 'library', 'history', 'settings', 'admin'])

export function isMoreRoute(pathSegment) {
  return MORE_ROUTES.has(pathSegment)
}
