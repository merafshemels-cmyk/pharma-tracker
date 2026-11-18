import { requireSupabase } from '../lib/supabaseClient.js'

export async function getCurrentSession() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCurrentUser() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  return data.user
}

export async function signInWithPassword(email, password) {
  const client = requireSupabase()
  return client.auth.signInWithPassword({ email, password })
}

export async function signUpWithPassword(email, password, metadata = {}) {
  const client = requireSupabase()
  return client.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })
}

export async function signOut() {
  const client = requireSupabase()
  return client.auth.signOut()
}

export function onAuthStateChange(callback) {
  const client = requireSupabase()
  return client.auth.onAuthStateChange(callback)
}
