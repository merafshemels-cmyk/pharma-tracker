import MedicineImage from './MedicineImage'
import { filterMedicines } from '../utils/medicineSearch'
import { formatNumber, pluralize } from '../utils/format'
import { usePreferences } from '../context/PreferencesContext'
import { translateDosage } from '../i18n/translations'

// Visual, mobile-friendly medicine selection used on the sales screen.
// Each option shows the optional photo, name, strength, form, and stock.
function MedicinePicker({
  medicines,
  value,
  onSelect,
  search,
  onSearchChange,
  onAddMedicine,
  canAddMedicine = false,
}) {
  const { t } = usePreferences()
  const results = filterMedicines(medicines, search)
  const hasSearch = Boolean(search.trim())

  return (
    <div className="medicine-picker">
      <div className="field">
        <label className="sr-only" htmlFor="sale-search">
          {t('picker.searchAria')}
        </label>
        <input
          id="sale-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('picker.searchPlaceholder')}
          autoComplete="off"
        />
      </div>

      {results.length === 0 ? (
        <div className="empty-state medicine-empty">
          <p>
            {medicines.length === 0
              ? t('picker.emptyInventory')
              : t('picker.notFound')}
          </p>
          {hasSearch && medicines.length > 0 && (
            <p className="hint">
              {t('picker.noMatch', { term: search.trim() })}
            </p>
          )}
          {onAddMedicine && canAddMedicine && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAddMedicine}
            >
              {t('picker.addNew')}
            </button>
          )}
          {onAddMedicine && !canAddMedicine && (
            <p className="hint">{t('picker.ownerOnly')}</p>
          )}
        </div>
      ) : (
        <ul className="medicine-options" aria-label={t('picker.chooseAria')}>
          {results.map((medicine) => {
            const isActive = medicine.id === value
            return (
              <li key={medicine.id}>
                <button
                  type="button"
                  className={`medicine-option${isActive ? ' is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => onSelect(medicine.id)}
                >
                  <MedicineImage
                    medicine={medicine}
                    className="medicine-thumb-picker"
                  />
                  <span className="medicine-option-body">
                    <span className="medicine-option-name">
                      {medicine.name}
                    </span>
                    <span className="medicine-option-meta">
                      {[medicine.strength, translateDosage(t, medicine.dosageForm)]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <span className="medicine-option-stock">
                      {t('picker.availableStock', {
                        count: formatNumber(medicine.stock),
                        unit: pluralize(medicine.baseUnit, medicine.stock),
                      })}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default MedicinePicker
