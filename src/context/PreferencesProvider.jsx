import { useCallback, useEffect, useMemo, useState } from 'react'
import { PreferencesContext } from './PreferencesContext'
import { translate } from '../i18n/translations'
import { setFormatLocale } from '../utils/format'

const STORAGE_KEY = 'pharmatrack.preferences'
const DEFAULT_PREFERENCES = { theme: 'light', language: 'en' }

function readStoredPreferences() {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return DEFAULT_PREFERENCES
    }

    const parsed = JSON.parse(stored)
    return {
      theme: parsed?.theme === 'dark' ? 'dark' : 'light',
      language: parsed?.language === 'am' ? 'am' : 'en',
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(readStoredPreferences)
  const { theme, language } = preferences

  // Keep date formatting in sync during render so the first paint after a
  // language switch already uses the right locale.
  setFormatLocale(language)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.lang = language === 'am' ? 'am' : 'en'
    root.style.colorScheme = theme
  }, [theme, language])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); the
      // preference still works for the current session.
    }
  }, [preferences])

  const setTheme = useCallback((nextTheme) => {
    setPreferences((previous) => ({
      ...previous,
      theme: nextTheme === 'dark' ? 'dark' : 'light',
    }))
  }, [])

  const setLanguage = useCallback((nextLanguage) => {
    setPreferences((previous) => ({
      ...previous,
      language: nextLanguage === 'am' ? 'am' : 'en',
    }))
  }, [])

  const toggleTheme = useCallback(() => {
    setPreferences((previous) => ({
      ...previous,
      theme: previous.theme === 'dark' ? 'light' : 'dark',
    }))
  }, [])

  const toggleLanguage = useCallback(() => {
    setPreferences((previous) => ({
      ...previous,
      language: previous.language === 'am' ? 'en' : 'am',
    }))
  }, [])

  // Translation helper. Components call t('some.key', { name: 'value' }).
  const t = useCallback(
    (key, params) => translate(language, key, params),
    [language],
  )

  const value = useMemo(
    () => ({
      theme,
      language,
      isDark: theme === 'dark',
      isAmharic: language === 'am',
      setTheme,
      setLanguage,
      toggleTheme,
      toggleLanguage,
      t,
    }),
    [
      theme,
      language,
      setTheme,
      setLanguage,
      toggleTheme,
      toggleLanguage,
      t,
    ],
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}
