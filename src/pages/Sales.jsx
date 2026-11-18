import { useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import TransactionsTable from '../components/TransactionsTable'
import MedicinePicker from '../components/MedicinePicker'
import MedicineImage from '../components/MedicineImage'
import MedicineFormModal from '../components/MedicineFormModal'
import { priceForLevel } from '../utils/inventory'
import { canManageInventory } from '../utils/roles'
import { formatETB, formatNumber, pluralize } from '../utils/format'
import { SALES_PERIODS, buildSaleLine, summarizeSales } from '../utils/sales'
import { translateDosage } from '../i18n/translations'

function Sales({ initialPeriod = 'today' }) {
  const { medicines, transactions, recordSale, role } = useWorkspace()
  const { t } = usePreferences()
  const [period, setPeriod] = useState(initialPeriod)
  const [search, setSearch] = useState('')
  const [medicineId, setMedicineId] = useState('')
  const [unit, setUnit] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [priceOverride, setPriceOverride] = useState(null)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [createdMedicine, setCreatedMedicine] = useState(null)
  const canAddMedicine = canManageInventory(role)

  const medicine =
    medicines.find((item) => item.id === medicineId) ??
    (createdMedicine?.id === medicineId ? createdMedicine : undefined)
  const levels = medicine
    ? [...medicine.packaging].sort((a, b) => b.contains - a.contains)
    : []
  const level = levels.find((item) => item.unit === unit)

  const savedPrice = medicine && level ? priceForLevel(medicine, level) : ''
  const priceValue =
    priceOverride === null
      ? savedPrice === ''
        ? ''
        : String(savedPrice)
      : priceOverride
  const hasPriceOverride =
    priceOverride !== null &&
    savedPrice !== '' &&
    Number(priceOverride) !== Number(savedPrice)
  const {
    priceNumber,
    quantityNumber,
    baseQuantity,
    maxUnits,
    exceedsStock,
    total,
  } = buildSaleLine({ medicine, level, quantity, unitPrice: priceValue })

  const summary = summarizeSales(transactions, period)
  const periodLabel = t(
    SALES_PERIODS.find((item) => item.id === period)?.labelKey ?? 'period.today',
  )

  function handleSelect(nextId) {
    setMedicineId(nextId)
    setPriceOverride(null)
    setErrors({})
    setNotice(null)
    setCreatedMedicine((previous) =>
      previous?.id === nextId ? previous : null,
    )

    const nextMedicine =
      medicines.find((item) => item.id === nextId) ??
      (createdMedicine?.id === nextId ? createdMedicine : null)
    if (!nextMedicine) {
      setUnit('')
      return
    }

    const top = [...nextMedicine.packaging].sort(
      (a, b) => b.contains - a.contains,
    )[0]
    setUnit(top?.unit ?? '')
  }

  // Select the medicine immediately using the object returned by the save,
  // then fall back to the refreshed inventory list once it arrives. This keeps
  // the sale form usable without leaving the page or searching again.
  function handleMedicineSaved(created, { imageWarning = '' } = {}) {
    if (!created?.id) return

    const top = [...(created.packaging ?? [])].sort(
      (a, b) => b.contains - a.contains,
    )[0]

    setCreatedMedicine(created)
    setMedicineId(created.id)
    setUnit(top?.unit ?? '')
    setQuantity('1')
    setPriceOverride(null)
    setErrors({})
    setSearch('')
    setNotice(
      imageWarning
        ? {
            type: 'error',
            message: t('sales.notice.addedImageWarning', {
              name: created.name,
              strength: created.strength,
              warning: imageWarning,
            }),
          }
        : {
            type: 'success',
            message: t('sales.notice.added', {
              name: created.name,
              strength: created.strength,
            }),
          },
    )
  }

  function handleUnitChange(nextUnit) {
    setUnit(nextUnit)
    setPriceOverride(null)
    setErrors({})
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setNotice(null)

    const nextErrors = {}

    if (!medicine) nextErrors.medicine = t('sales.errors.chooseMedicine')
    if (!level) nextErrors.unit = t('sales.errors.chooseUnit')

    if (!Number.isInteger(quantityNumber) || quantityNumber < 1) {
      nextErrors.quantity = t('sales.errors.wholeNumber')
    } else if (exceedsStock) {
      nextErrors.quantity = t('sales.errors.notEnoughStock', {
        max: formatNumber(maxUnits),
        unit: pluralize(level.unit, maxUnits),
        stock: formatNumber(medicine.stock),
        base: pluralize(medicine.baseUnit, medicine.stock),
      })
    }

    if (!priceValue || !Number.isFinite(priceNumber) || priceNumber <= 0) {
      nextErrors.price = t('sales.errors.pricePositive')
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSaving(true)
    const result = await recordSale({
      medicineId: medicine.id,
      level,
      quantity: quantityNumber,
      unitPrice: priceNumber,
    })
    setSaving(false)

    if (!result.ok) {
      setNotice({ type: 'error', message: result.error })
      return
    }

    setNotice({
      type: 'success',
      message: t('sales.notice.recorded', {
        code: result.transaction.code,
        quantity: formatNumber(quantityNumber),
        unit: pluralize(level.unit, quantityNumber),
        baseQuantity: formatNumber(baseQuantity),
        baseUnit: pluralize(medicine.baseUnit, baseQuantity),
      }),
    })
    setMedicineId('')
    setUnit('')
    setQuantity('1')
    setPriceOverride(null)
    setErrors({})
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('sales.title')}</h1>
          <p className="page-sub">{t('sales.subtitle')}</p>
        </div>
      </div>

      {notice && (
        <div className={`notice notice-${notice.type}`} role="status">
          {notice.message}
        </div>
      )}

      <div className="two-col">
        <section className="panel" aria-labelledby="sale-picker-title">
          <div className="panel-head">
            <div>
              <h2 id="sale-picker-title">{t('sales.selectTitle')}</h2>
              <p className="panel-sub">{t('sales.selectSubtitle')}</p>
            </div>
          </div>
          <div className="panel-body">
            <MedicinePicker
              medicines={medicines}
              value={medicineId}
              onSelect={handleSelect}
              search={search}
              onSearchChange={setSearch}
              onAddMedicine={() => setAddOpen(true)}
              canAddMedicine={canAddMedicine}
            />
          </div>
        </section>

        <section className="panel" aria-labelledby="sale-form-title">
          <div className="panel-head">
            <div>
              <h2 id="sale-form-title">{t('sales.detailsTitle')}</h2>
              <p className="panel-sub">{t('sales.detailsSubtitle')}</p>
            </div>
          </div>

          <form className="panel-body" onSubmit={handleSubmit} noValidate>
            {!medicine ? (
              <div className="empty-state">{t('sales.selectPrompt')}</div>
            ) : (
              <>
                <div className="sale-selected">
                  <MedicineImage
                    medicine={medicine}
                    className="medicine-thumb-lg"
                  />
                  <div>
                    <span className="detail-label">
                      {t('sales.selectedMedicine')}
                    </span>
                    <span className="detail-value">
                      {medicine.name} {medicine.strength}
                    </span>
                    <span className="hint">
                      {t('sales.available', {
                        form: translateDosage(t, medicine.dosageForm),
                        count: formatNumber(medicine.stock),
                        unit: pluralize(medicine.baseUnit, medicine.stock),
                      })}
                    </span>
                  </div>
                </div>

                {errors.medicine && (
                  <p className="field-error">{errors.medicine}</p>
                )}

                <div className="form-grid form-grid-2">
                  <div className="field">
                    <label htmlFor="sale-unit">{t('sales.packagingUnit')}</label>
                    <select
                      id="sale-unit"
                      value={unit}
                      onChange={(event) => handleUnitChange(event.target.value)}
                      disabled={levels.length === 0}
                    >
                      {levels.length === 0 && (
                        <option value="">{t('sales.noPackaging')}</option>
                      )}
                      {levels.map((item) => (
                        <option key={item.unit} value={item.unit}>
                          {item.unit} ({formatNumber(item.contains)}{' '}
                          {pluralize(medicine.baseUnit, item.contains)})
                        </option>
                      ))}
                    </select>
                    {errors.unit && <p className="field-error">{errors.unit}</p>}
                  </div>

                  <div className="field">
                    <label htmlFor="sale-quantity">{t('sales.quantity')}</label>
                    <input
                      id="sale-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                    />
                    {errors.quantity && (
                      <p className="field-error">{errors.quantity}</p>
                    )}
                  </div>
                </div>

                {level && (
                  <p className="hint">
                    {t('sales.conversion', {
                      unit: level.unit,
                      count: formatNumber(level.contains),
                      base: pluralize(medicine.baseUnit, level.contains),
                      max: formatNumber(maxUnits),
                      unitLabel: pluralize(level.unit, maxUnits),
                    })}
                  </p>
                )}

                <div className="field">
                  <label htmlFor="sale-price">
                    {t('sales.unitPriceLabel')}
                  </label>
                  <input
                    id="sale-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceValue}
                    onChange={(event) => setPriceOverride(event.target.value)}
                    disabled={!level}
                  />
                  {errors.price && (
                    <p className="field-error">{errors.price}</p>
                  )}
                  {level && (
                    <p className="hint">
                      {t('sales.savedPrice', {
                        price: formatETB(savedPrice),
                        unit: level.unit,
                      })}
                      {hasPriceOverride ? t('sales.priceAdjusted') : ''}
                    </p>
                  )}
                </div>

                {exceedsStock && (
                  <p className="field-warning" role="status">
                    {t('sales.exceeds')}
                  </p>
                )}

                <dl className="calc-list">
                  <div>
                    <dt>{t('sales.stockEffect')}</dt>
                    <dd className={exceedsStock ? 'text-danger' : ''}>
                      {baseQuantity > 0
                        ? `−${formatNumber(baseQuantity)} ${pluralize(medicine.baseUnit, baseQuantity)}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="calc-total">
                    <dt>{t('sales.lineTotal')}</dt>
                    <dd>{formatETB(total)}</dd>
                  </div>
                </dl>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? t('sales.recording') : t('sales.confirm')}
                  </button>
                </div>
              </>
            )}
          </form>
        </section>
      </div>

      <section className="panel" aria-labelledby="sales-history-title">
        <div className="panel-head panel-head-wrap">
          <div>
            <h2 id="sales-history-title">{t('sales.history')}</h2>
            <p className="panel-sub">
              {t('sales.historySubtitle', { period: periodLabel })}
            </p>
          </div>
        </div>

        <div className="panel-body">
          <div
            className="period-tabs"
            role="group"
            aria-label={t('sales.historyPeriodAria')}
          >
            {SALES_PERIODS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`period-tab${period === item.id ? ' is-active' : ''}`}
                aria-pressed={period === item.id}
                onClick={() => setPeriod(item.id)}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>

          <section className="audit-stats" aria-label={t('sales.totalsAria')}>
            <div className="audit-stat">
              <span>{t('sales.total')}</span>
              <strong>{formatETB(summary.total)}</strong>
            </div>
            <div className="audit-stat">
              <span>{t('sales.transactions')}</span>
              <strong>{formatNumber(summary.saleCount)}</strong>
            </div>
            <div className="audit-stat">
              <span>{t('sales.itemsSold')}</span>
              <strong>{formatNumber(summary.itemCount)}</strong>
            </div>
            <div className="audit-stat">
              <span>{t('sales.average')}</span>
              <strong>{formatETB(summary.average)}</strong>
            </div>
          </section>
        </div>

        <TransactionsTable
          transactions={summary.sales}
          emptyText={t('sales.emptyForPeriod', {
            period: periodLabel.toLowerCase(),
          })}
        />
      </section>

      {addOpen && (
        <MedicineFormModal
          mode="add"
          quickAdd
          initialName={search.trim()}
          onClose={() => setAddOpen(false)}
          onSaved={handleMedicineSaved}
        />
      )}
    </>
  )
}

export default Sales
