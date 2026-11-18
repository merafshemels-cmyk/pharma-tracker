import { useEffect, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Packaging from './pages/Packaging'
import Audit from './pages/Audit'
import Settings from './pages/Settings'
import Expiry from './pages/Expiry'
import Staff from './pages/Staff'
import SignIn, { NoMembership } from './pages/SignIn'
import { useAuth } from './context/AuthContext'
import { useWorkspace } from './context/WorkspaceContext'
import { usePreferences } from './context/PreferencesContext'
import { useRoute } from './hooks/useRoute'
import { isRouteAllowed } from './utils/roles'
import './App.css'

function App() {
  const auth = useAuth()
  const workspace = useWorkspace()
  const { t } = usePreferences()
  const [route, navigate, routeParams] = useRoute()
  const [inventoryQuery, setInventoryQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route])

  useEffect(() => {
    if (
      auth.status === 'ready' &&
      isRouteAllowed(workspace.role, route) === false
    ) {
      navigate('dashboard')
    }
  }, [auth.status, workspace.role, route, navigate])

  if (auth.status === 'checking') {
    return (
      <main className="auth-page">
        <div className="loading-panel" role="status">
          {t('app.loadingPharmacy')}
        </div>
      </main>
    )
  }

  if (auth.status === 'signed-out' || auth.status === 'error') {
    return <SignIn />
  }

  if (auth.status === 'no-membership') {
    return <NoMembership />
  }

  function goTo(nextRoute, params = {}) {
    navigate(nextRoute, params)
    setIsSidebarOpen(false)
  }

  function handleSearch(query) {
    setInventoryQuery(query)
    goTo('inventory')
  }

  if (workspace.loading && workspace.medicines.length === 0) {
    return (
      <main className="auth-page">
        <div className="loading-panel" role="status">
          {t('app.loadingRecords')}
        </div>
      </main>
    )
  }

  let page

  if (route === 'inventory') {
    page = (
      <Inventory
        query={inventoryQuery}
        onQueryChange={setInventoryQuery}
        navigate={goTo}
        initialStatus={routeParams.filter ?? 'all'}
      />
    )
  } else if (route === 'sales') {
    page = (
      <Sales
        key={routeParams.period ?? 'today'}
        initialPeriod={routeParams.period ?? 'today'}
      />
    )
  } else if (route === 'purchases') {
    page = <Purchases />
  } else if (route === 'packaging') {
    page = <Packaging />
  } else if (route === 'expiry') {
    page = <Expiry navigate={goTo} />
  } else if (route === 'reports') {
    page = <Audit />
  } else if (route === 'staff') {
    page = <Staff />
  } else if (route === 'settings') {
    page = <Settings />
  } else {
    page = <Dashboard navigate={goTo} />
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        {t('app.skipToContent')}
      </a>

      <Sidebar
        route={route}
        navigate={goTo}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label={t('nav.close')}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="app-main">
        <Header
          onMenuClick={() => setIsSidebarOpen(true)}
          onSearch={handleSearch}
        />
        <main className="page" id="main-content" key={route}>
          {workspace.error && (
            <div className="notice notice-error" role="alert">
              {workspace.error}
            </div>
          )}
          {page}
        </main>
      </div>
    </div>
  )
}

export default App
