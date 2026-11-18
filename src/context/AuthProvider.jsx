import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import { APP_MODES, getAppMode } from '../config/appMode'
import { requireSupabase } from '../lib/supabaseClient'
import {
  getCurrentSession,
  onAuthStateChange,
  signInWithPassword,
  signOut as signOutService,
} from '../services/authService'
import { normalizeRole } from '../utils/roles'

const LOCAL_USER = { id: 'local-user', email: '' }
const LOCAL_PROFILE = { id: 'local-user', full_name: '', phone: '' }

async function loadIdentity(user) {
  const client = requireSupabase()
  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] =
    await Promise.all([
      client.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      client
        .from('pharmacy_members')
        .select('*, pharmacies(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])

  if (profileError) throw profileError
  if (membershipError) throw membershipError

  return {
    profile: profile ?? { id: user.id, full_name: '', phone: '' },
    membership: membership ?? null,
    pharmacy: membership?.pharmacies ?? null,
    role: membership ? normalizeRole(membership.role) : null,
  }
}

export function AuthProvider({ children }) {
  const isLocal = getAppMode() !== APP_MODES.PRODUCTION
  const [state, setState] = useState(() =>
    isLocal
      ? {
          status: 'ready',
          session: null,
          user: LOCAL_USER,
          profile: LOCAL_PROFILE,
          membership: null,
          pharmacy: null,
          role: 'owner',
          error: '',
        }
      : {
          status: 'checking',
          session: null,
          user: null,
          profile: null,
          membership: null,
          pharmacy: null,
          role: null,
          error: '',
        },
  )

  useEffect(() => {
    if (isLocal) return undefined

    let active = true

    async function hydrate(session) {
      if (!session?.user) {
        if (!active) return
        setState((previous) => ({
          ...previous,
          status: 'signed-out',
          session: null,
          user: null,
          profile: null,
          membership: null,
          pharmacy: null,
          role: null,
        }))
        return
      }

      try {
        const identity = await loadIdentity(session.user)
        if (!active) return
        setState({
          status: identity.membership ? 'ready' : 'no-membership',
          session,
          user: session.user,
          ...identity,
          error: '',
        })
      } catch (error) {
        if (!active) return
        setState((previous) => ({
          ...previous,
          status: 'error',
          session,
          user: session.user,
          error: error.message || 'Unable to load your account.',
        }))
      }
    }

    getCurrentSession()
      .then(hydrate)
      .catch((error) => {
        if (!active) return
        setState((previous) => ({
          ...previous,
          status: 'signed-out',
          error: error.message || 'Unable to reach the sign-in service.',
        }))
      })

    const { data } = onAuthStateChange((_event, session) => {
      hydrate(session)
    })

    return () => {
      active = false
      data?.subscription?.unsubscribe()
    }
  }, [isLocal])

  async function signIn(email, password) {
    const { error } = await signInWithPassword(email.trim(), password)
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  async function signOut() {
    if (isLocal) return { ok: true }
    const { error } = await signOutService()
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  const value = {
    ...state,
    isLocal,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
