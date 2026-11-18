import { usePreferences } from '../context/PreferencesContext'

function ToggleRow({ id, title, description, checked, onChange }) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <span className="settings-row-title" id={`${id}-title`}>
          {title}
        </span>
        <span className="settings-row-sub" id={`${id}-description`}>
          {description}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className={`switch${checked ? ' is-on' : ''}`}
        onClick={onChange}
      >
        <span className="switch-thumb" aria-hidden="true" />
      </button>
    </div>
  )
}

// Owner-only screen. The route guard hides it from cashiers.
function Settings() {
  const { isDark, isAmharic, toggleTheme, toggleLanguage, t } =
    usePreferences()

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('settings.title')}</h1>
          <p className="page-sub">{t('settings.subtitle')}</p>
        </div>
      </div>

      <section
        className="panel settings-panel"
        aria-labelledby="preferences-title"
      >
        <div className="panel-head">
          <div>
            <h2 id="preferences-title">{t('settings.preferences')}</h2>
            <p className="panel-sub">{t('settings.savedOnDevice')}</p>
          </div>
        </div>

        <div className="settings-list">
          <ToggleRow
            id="setting-dark-mode"
            title={t('settings.darkMode')}
            description={t('settings.darkModeDescription')}
            checked={isDark}
            onChange={toggleTheme}
          />
          <ToggleRow
            id="setting-amharic"
            title={t('settings.amharic')}
            description={t('settings.amharicDescription')}
            checked={isAmharic}
            onChange={toggleLanguage}
          />
        </div>
      </section>
    </>
  )
}

export default Settings
