import { useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import TransactionsTable from '../components/TransactionsTable'
import {
  formatETB,
  formatNumber,
  pluralize,
  roundMoney,
  toDateInputValue,
} from '../utils/format'

function Purchases() {
  const { medicines, transactions, recordPurchase } = useWorkspace()
  const { t } = usePreferences()
  const [medicineId, setMedicineId] = useState('')
  const [supplier, setSupplier] = useState('')
  const [unit, setUnit] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')
  const [date, setDate] = useState(toDateInputValue())
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)

  const medicine = medicines.find((item) => item.id === medicineId)
  const levels = medicine
    ? [...medicine.packaging].sort((a, b) => b.contains - a.contains)
    : []
  const level = levels.find((item) => item.unit === unit)

  const quantityNumber = Number(quantity)
  const costNumber = Number(unitCost)
  const baseQuantity =
    medicine && level && Number.isFinite(quantityNumber)
      ? quantityNumber * level.contains
      : 0
  const total =
    Number.isFinite(quantityNumber) && Number.isFinite(costNumber)
      ? roundMoney(quantityNumber * costNumber)
      : 0

  const recentPurchases = transactions
    .filter((item) => item.type === 'purchase')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)

  function handleMedicineChange(nextId) {
    setMedicineId(nextId)
    setErrors({})
    setNotice(null)

    const nextMedicine = medicines.find((item) => item.id === nextId)
    if (!nextMedicine) {
      setUnit('')
      return
    }

    const top = [...nextMedicine.packaging].sort(
      (a, b) => b.contains - a.contains,
    )[0]
    setUnit(top?.unit ?? '')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setNotice(null)

    const nextErrors = {}

    if (!supplier.trim()) {
      nextErrors.supplier = t('purchases.errors.supplier')
    }
    if (!medicine) nextErrors.medicine = t('purchases.errors.medicine')
    if (!level) nextErrors.unit = t('purchases.errors.unit')

    if (!Number.isInteger(quantityNumber) || quantityNumber < 1) {
      nextErrors.quantity = t('purchases.errors.quantity')
    }

    if (unitCost === '' || !Number.isFinite(costNumber) || costNumber < 0) {
      nextErrors.unitCost = t('purchases.errors.unitCost')
    }

    if (!date) nextErrors.date = t('purchases.errors.date')

    if (expiryDate && date && expiryDate < date) {
      nextErrors.expiryDate = t('purchases.errors.expiry')
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const result = await recordPurchase({
      medicineId: medicine.id,
      supplier,
      level,
      quantity: quantityNumber,
      unitCost: costNumber,
      date,
      batchNumber,
      expiryDate,
    })

    if (!result.ok) {
      setNotice({ type: 'error', message: result.error })
      return
    }

    setNotice({
      type: 'success',
      message: t('purchases.notice.confirmed', {
        code: result.transaction.code,
        count: formatNumber(baseQuantity),
        unit: pluralize(medicine.baseUnit, baseQuantity),
      }),
    })
    setMedicineId('')
    setSupplier('')
    setUnit('')
    setQuantity('1')
    setUnitCost('')
    setBatchNumber('')
    setExpiryDate('')
    setErrors({})
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('purchases.title')}</h1>
          <p className="page-sub">{t('purchases.subtitle')}</p>
        </div>
      </div>

      {notice && (
        <div className={`notice notice-${notice.type}`} role="status">
          {notice.message}
        </div>
      )}

      <div className="two-col">
        <section className="panel" aria-labelledby="purchase-form-title">
          <div className="panel-head">
            <div>
              <h2 id="purchase-form-title">{t('purchases.recordTitle')}</h2>
              <p className="panel-sub">{t('purchases.recordSubtitle')}</p>
            </div>
          </div>

          <form className="panel-body" onSubmit={handleSubmit} noValidate>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label htmlFor="purchase-supplier">{t('purchases.supplier')}</label>
                <input
                  id="purchase-supplier"
                  type="text"
                  value={supplier}
                  onChange={(event) => setSupplier(event.target.value)}
                  placeholder={t('purchases.supplierPlaceholder')}
                />
                {errors.supplier && <p className="field-error">{errors.supplier}</p>}
              </div>

              <div className="field">
                <label htmlFor="purchase-date">
                  {t('purchases.purchaseDate')}
                </label>
                <input
                  id="purchase-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
                {errors.date && <p className="field-error">{errors.date}</p>}
              </div>
            </div>

            <div className="field">
              <label htmlFor="purchase-medicine">{t('purchases.medicine')}</label>
              <select
                id="purchase-medicine"
                value={medicineId}
                onChange={(event) => handleMedicineChange(event.target.value)}
              >
                <option value="">{t('purchases.selectMedicine')}</option>
                {medicines.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.strength} —{' '}
                    {t('purchases.inStock', {
                      count: formatNumber(item.stock),
                      unit: pluralize(item.baseUnit, item.stock),
                    })}
                  </option>
                ))}
              </select>
              {errors.medicine && <p className="field-error">{errors.medicine}</p>}
            </div>

            <div className="form-grid form-grid-2">
              <div className="field">
                <label htmlFor="purchase-unit">{t('purchases.receivedAs')}</label>
                <select
                  id="purchase-unit"
                  value={unit}
                  onChange={(event) => {
                    setUnit(event.target.value)
                    setErrors({})
                  }}
                  disabled={!medicine}
                >
                  {levels.length === 0 && (
                    <option value="">{t('purchases.selectMedicineFirst')}</option>
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
                <label htmlFor="purchase-quantity">
                  {t('purchases.quantityReceived')}
                </label>
                <input
                  id="purchase-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
                {errors.quantity && <p className="field-error">{errors.quantity}</p>}
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="field">
                <label htmlFor="purchase-cost">{t('purchases.costPerUnit')}</label>
                <input
                  id="purchase-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                  placeholder={t('editor.pricePlaceholder')}
                />
                {errors.unitCost && <p className="field-error">{errors.unitCost}</p>}
              </div>

              <div className="field">
                <label htmlFor="purchase-batch">
                  {t('purchases.batchOptional')}
                </label>
                <input
                  id="purchase-batch"
                  type="text"
                  value={batchNumber}
                  onChange={(event) => setBatchNumber(event.target.value)}
                  placeholder="AMX-2401"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="purchase-expiry">
                {t('purchases.expiryOptional')}
              </label>
              <input
                id="purchase-expiry"
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
              />
              {errors.expiryDate && (
                <p className="field-error">{errors.expiryDate}</p>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {t('purchases.confirm')}
              </button>
            </div>
          </form>
        </section>

        <section className="panel" aria-labelledby="purchase-preview-title">
          <div className="panel-head">
            <div>
              <h2 id="purchase-preview-title">{t('purchases.previewTitle')}</h2>
              <p className="panel-sub">{t('purchases.previewSubtitle')}</p>
            </div>
          </div>
          <div className="panel-body">
            <dl className="calc-list">
              <div>
                <dt>{t('purchases.medicine')}</dt>
                <dd>
                  {medicine
                    ? `${medicine.name} ${medicine.strength}`
                    : t('common.unknown')}
                </dd>
              </div>
              <div>
                <dt>{t('purchases.receivedAs')}</dt>
                <dd>{level ? level.unit : t('common.unknown')}</dd>
              </div>
              <div>
                <dt>{t('purchases.baseUnitsAdded')}</dt>
                <dd>
                  {baseQuantity > 0
                    ? `+${formatNumber(baseQuantity)} ${pluralize(medicine.baseUnit, baseQuantity)}`
                    : t('common.unknown')}
                </dd>
              </div>
              <div>
                <dt>{t('purchases.newStockLevel')}</dt>
                <dd>
                  {medicine && level
                    ? `${formatNumber(medicine.stock + baseQuantity)} ${pluralize(medicine.baseUnit, medicine.stock + baseQuantity)}`
                    : t('common.unknown')}
                </dd>
              </div>
              <div>
                <dt>{t('purchases.costPerReceivedUnit')}</dt>
                <dd>
                  {Number.isFinite(costNumber) && unitCost !== ''
                    ? `${formatETB(costNumber)}${level ? ` / ${level.unit}` : ''}`
                    : t('common.unknown')}
                </dd>
              </div>
              <div className="calc-total">
                <dt>{t('purchases.totalCost')}</dt>
                <dd>{formatETB(total)}</dd>
              </div>
            </dl>
            <p className="hint">{t('purchases.hint')}</p>
          </div>
        </section>
      </div>

      <section className="panel" aria-labelledby="recent-purchases-title">
        <div className="panel-head">
          <div>
            <h2 id="recent-purchases-title">{t('purchases.recentTitle')}</h2>
            <p className="panel-sub">{t('purchases.recentSubtitle')}</p>
          </div>
        </div>
        <TransactionsTable
          transactions={recentPurchases}
          emptyText={t('purchases.empty')}
        />
      </section>
    </>
  )
}

export default Purchases
