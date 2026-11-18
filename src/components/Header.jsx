import { useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import { isRouteAllowed } from '../utils/roles'
import { Icon } from './icons'

function Header({ onMenuClick, onSearch }) {
  const { role, signOut, isLocal } = useWorkspace()
  const { t } = usePreferences()
  const [term, setTerm] = useState('')

  const canSearchInventory = isRouteAllowed(role, 'inventory')

  function handleSubmit(event) {
    event.preventDefault()
    const query = term.trim()
    if (query) {
      onSearch(query)
      setTerm('')
    }
  }

  return (
    <header className="header">
      <button
        type="button"
        className="icon-button menu-button"
        onClick={onMenuClick}
        aria-label={t('header.openNav')}
        aria-controls="sidebar"
      >
        <Icon name="menu" size={22} />
      </button>

      <div className="header-titles">
        <span className="header-brand">PharmaTrack</span>
      </div>

      {canSearchInventory && (
        <form className="header-search" role="search" onSubmit={handleSubmit}>
          <Icon name="search" size={18} />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t('header.searchPlaceholder')}
            aria-label={t('header.searchPlaceholder')}
          />
        </form>
      )}

      {!isLocal && (
        <button
          type="button"
          className="icon-button header-signout"
          onClick={() => signOut()}
          aria-label={t('header.signOut')}
          title={t('header.signOut')}
        >
          <Icon name="logout" size={20} />
        </button>
      )}
    </header>
  )
}

export default Header
