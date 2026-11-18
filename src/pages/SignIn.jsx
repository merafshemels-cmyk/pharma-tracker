import { useState } from 'react'
import { BrandMark } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { usePreferences } from '../context/PreferencesContext'

function SignIn() {
  const { signIn, error: authError } = useAuth()
  const { t } = usePreferences()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const result = await signIn(email, password)
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <div className="auth-brand">
          <BrandMark />
          <div>
            <p className="brand-name">PharmaTrack</p>
            <p className="brand-sub">{t('brand.subtitle')}</p>
          </div>
        </div>

        <div>
          <h1 id="sign-in-title">{t('signIn.title')}</h1>
          <p className="page-sub">{t('signIn.subtitle')}</p>
        </div>

        {(authError || error) && (
          <div className="notice notice-error" role="alert">
            {error || authError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="sign-in-email">{t('signIn.email')}</label>
            <input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="sign-in-password">{t('signIn.password')}</label>
            <input
              id="sign-in-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t('signIn.signingIn') : t('signIn.submit')}
          </button>
        </form>

        <p className="hint">{t('signIn.hint')}</p>
      </section>
    </main>
  )
}

export function NoMembership() {
  const { signOut, email } = useAuth()
  const { t } = usePreferences()
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="no-access-title">
        <div className="auth-brand">
          <BrandMark />
          <div>
            <p className="brand-name">PharmaTrack</p>
            <p className="brand-sub">{t('brand.subtitle')}</p>
          </div>
        </div>
        <h1 id="no-access-title">{t('signIn.noAccess')}</h1>
        <p className="page-sub">
          {email
            ? t('signIn.noAccessEmail', { email })
            : t('signIn.noAccessGeneric')}
        </p>
        <p className="hint">{t('signIn.askOwner')}</p>
        <button type="button" className="btn btn-secondary" onClick={signOut}>
          {t('signIn.signOut')}
        </button>
      </section>
    </main>
  )
}

export default SignIn
