import { useMemo, useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import {
  EXPIRY_WINDOW_DAYS,
  expiryStatus,
  isExpiredBatch,
  isExpiringBatch,
} from '../utils/expiry'
import { formatDate, formatNumber, pluralize } from '../utils/format'
import { translateDosage } from '../i18n/translations'

const FILTERS = [
  { id: 'alerts', labelKey: 'expiry.filterAlerts' },
  { id: 'expired', labelKey: 'expiry.filterExpired' },
  { id: 'all', labelKey: 'expiry.filterAll' },
]

function Expiry() {
  const { medicines, batches } = useWorkspace()
  const { t } = usePreferences()
  const [filter, setFilter] = useState('alerts')

  const medicineById = useMemo(
    () => new Map(medicines.map((medicine) => [medicine.id, medicine])),
    [medicines],
  )

  const rows = useMemo(
    () =>
      batches
        .filter((batch) => Number(batch.quantityRemainingBase) > 0)
        .map((batch) => ({
          ...batch,
          medicine: medicineById.get(batch.medicineId),
        }))
        .filter((batch) => batch.medicine)
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)),
    [batches, medicineById],
  )

  const expiring = rows.filter((batch) => isExpiringBatch(batch))
  const expired = rows.filter((batch) => isExpiredBatch(batch))
  const shown =
    filter === 'expired'
      ? expired
      : filter === 'all'
        ? rows
        : expiring

  const emptyText =
    filter === 'expired'
      ? t('expiry.emptyExpired')
      : filter === 'all'
        ? t('expiry.emptyAll')
        : t('expiry.emptyAlerts', { days: EXPIRY_WINDOW_DAYS })

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('expiry.title')}</h1>
          <p className="page-sub">{t('expiry.subtitle')}</p>
        </div>
      </div>

      <section className="audit-stats" aria-label={t('expiry.summaryAria')}>
        <div className="audit-stat">
          <span>{t('expiry.expiringSoon')}</span>
          <strong>{formatNumber(expiring.length)}</strong>
        </div>
        <div className="audit-stat">
          <span>{t('expiry.expired')}</span>
          <strong>{formatNumber(expired.length)}</strong>
        </div>
        <div className="audit-stat">
          <span>{t('expiry.batchesWithStock')}</span>
          <strong>{formatNumber(rows.length)}</strong>
        </div>
      </section>

      <section className="panel" aria-labelledby="expiry-list-title">
        <div className="panel-head panel-head-wrap">
          <div>
            <h2 id="expiry-list-title">{t('expiry.batches')}</h2>
            <p className="panel-sub">
              {t('expiry.shownCount', { count: shown.length })}
            </p>
          </div>
          <div
            className="period-tabs"
            role="group"
            aria-label={t('expiry.filterAria')}
          >
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`period-tab${filter === item.id ? ' is-active' : ''}`}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {t(item.labelKey, { days: EXPIRY_WINDOW_DAYS })}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="empty-state">{emptyText}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('expiry.medicine')}</th>
                  <th scope="col">{t('expiry.batch')}</th>
                  <th scope="col">{t('expiry.expiryDate')}</th>
                  <th scope="col">{t('expiry.status')}</th>
                  <th scope="col">{t('expiry.remainingStock')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((batch) => {
                  const status = expiryStatus(batch)
                  const medicine = batch.medicine
                  return (
                    <tr key={batch.id}>
                      <td>
                        <span className="strong">
                          {medicine.name} {medicine.strength}
                        </span>
                        <span className="cell-sub">
                          {translateDosage(t, medicine.dosageForm)}
                        </span>
                      </td>
                      <td className="mono">
                        {batch.batchNumber || t('common.unknown')}
                      </td>
                      <td className="nowrap">{formatDate(batch.expiryDate)}</td>
                      <td>
                        <span className={`status is-${status.tone}`}>
                          {t(status.key, { days: status.days })}
                        </span>
                      </td>
                      <td>
                        {formatNumber(batch.quantityRemainingBase)}{' '}
                        {pluralize(
                          medicine.baseUnit,
                          batch.quantityRemainingBase,
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

export default Expiry
