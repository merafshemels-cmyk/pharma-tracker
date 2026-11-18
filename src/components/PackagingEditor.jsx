import { sortPackaging } from '../utils/inventory'
import { usePreferences } from '../context/PreferencesContext'

function PackagingEditor({ levels, baseUnit, onChange, basePrice }) {
  const { t } = usePreferences()

  function updateLevel(index, field, value) {
    onChange(
      levels.map((level, levelIndex) =>
        levelIndex === index ? { ...level, [field]: value } : level,
      ),
    )
  }

  function addLevel() {
    const sorted = sortPackaging(levels)
    const top = sorted[sorted.length - 1]
    const nextContains = top ? top.contains * 10 : 10
    const autoPrice =
      basePrice !== undefined && basePrice !== null && basePrice !== ''
        ? Math.round(Number(basePrice) * nextContains * 100) / 100
        : ''
    onChange([...levels, { unit: '', contains: nextContains, price: autoPrice }])
  }

  function removeLevel(index) {
    if (index === 0) return
    onChange(levels.filter((_, levelIndex) => levelIndex !== index))
  }

  return (
    <div className="packaging-editor">
      <div className="packaging-head">
        <span>{t('editor.level')}</span>
        <span>{t('editor.contains')}</span>
        <span>{t('editor.price')}</span>
        <span className="sr-only">{t('editor.actions')}</span>
      </div>

      {levels.map((level, index) => (
        <div className="packaging-row" key={`level-${index}`}>
          <input
            type="text"
            value={index === 0 ? baseUnit : level.unit}
            placeholder={t('editor.unitPlaceholder')}
            aria-label={t('editor.unitAria', { index: index + 1 })}
            readOnly={index === 0}
            onChange={(event) => updateLevel(index, 'unit', event.target.value)}
          />
          <input
            type="number"
            min="1"
            step="1"
            value={index === 0 ? 1 : level.contains}
            aria-label={t('editor.containsAria', { index: index + 1 })}
            readOnly={index === 0}
            onChange={(event) =>
              updateLevel(index, 'contains', Number(event.target.value))
            }
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={level.price ?? ''}
            aria-label={t('editor.priceAria', { index: index + 1 })}
            placeholder={t('editor.pricePlaceholder')}
            onChange={(event) => updateLevel(index, 'price', event.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => removeLevel(index)}
            disabled={index === 0}
          >
            {t('common.remove')}
          </button>
        </div>
      ))}

      <div className="packaging-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={addLevel}
        >
          {t('editor.addLevel')}
        </button>
        <p className="hint">{t('editor.hint')}</p>
      </div>
    </div>
  )
}

export default PackagingEditor
