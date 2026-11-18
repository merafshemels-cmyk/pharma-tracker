import { useEffect, useState } from 'react'

export const routes = [
  'dashboard',
  'inventory',
  'sales',
  'purchases',
  'packaging',
  'expiry',
  'reports',
  'staff',
  'settings',
]

function readLocation() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path, query = ''] = raw.split('?')
  const route = routes.includes(path) ? path : 'dashboard'
  return { route, params: Object.fromEntries(new URLSearchParams(query)) }
}

export function useRoute() {
  const [location, setLocation] = useState(readLocation)

  useEffect(() => {
    function handleHashChange() {
      setLocation(readLocation())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function navigate(nextRoute, params = {}) {
    if (!routes.includes(nextRoute)) return

    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value != null && value !== ''),
    ).toString()
    const hash = query ? `/${nextRoute}?${query}` : `/${nextRoute}`

    setLocation({ route: nextRoute, params })
    window.location.hash = hash
    window.scrollTo({ top: 0 })
  }

  return [location.route, navigate, location.params]
}
