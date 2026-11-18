import { Icon, BrandMark } from './icons'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import { isRouteAllowed, roleLabelKey } from '../utils/roles'

const navItems = [
  { key: 'nav.dashboard', route: 'dashboard', icon: 'dashboard' },
  { key: 'nav.sales', route: 'sales', icon: 'sales' },
  { key: 'nav.inventory', route: 'inventory', icon: 'inventory' },
  { key: 'nav.purchases', route: 'purchases', icon: 'purchases' },
  { key: 'nav.packaging', route: 'packaging', icon: 'packaging' },
  { key: 'nav.expiry', route: 'expiry', icon: 'expiry' },
  { key: 'nav.reports', route: 'reports', icon: 'audit' },
  { key: 'nav.settings', route: 'settings', icon: 'settings' },
]

function Sidebar({ route, navigate, isOpen, onClose }) {
  const { role, pharmacy } = useWorkspace()
  const { t } = usePreferences()
  const visibleItems = navItems.filter((item) =>
    isRouteAllowed(role, item.route),
  )

  function goTo(nextRoute) {
    navigate(nextRoute)
    onClose()
  }

  return (
    <aside
      id="sidebar"
      className={`sidebar${isOpen ? ' is-open' : ''}`}
      aria-label={t('nav.aria')}
    >
      <div className="sidebar-brand">
        <BrandMark />
        <div>
          <p className="brand-name">PharmaTrack</p>
          <p className="brand-sub">{t('brand.subtitle')}</p>
        </div>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label={t('nav.close')}
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label={t('nav.main')}>
        <p className="nav-heading">{t('nav.menu')}</p>
        <ul>
          {visibleItems.map((item) => {
            const isActive = item.route === route

            return (
              <li key={item.route}>
                <button
                  type="button"
                  className={`nav-item${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => goTo(item.route)}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{t(item.key)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <p className="footer-title">{pharmacy?.name || t('nav.workspace')}</p>
        <p className="footer-role">
          {t('nav.signedInAs', { role: t(roleLabelKey(role)) })}
        </p>
        <p className="footer-text">{t('nav.footerText')}</p>
      </div>
    </aside>
  )
}

export default Sidebar
