import {
  describeStock,
  isLowStock,
  stockPercent,
  stockStatus,
} from '../utils/inventory'
import { pluralize } from '../utils/format'
import { usePreferences } from '../context/PreferencesContext'

function StockOverview({ medicines }) {
  const { t } = usePreferences()
  const sorted = [...medicines]
    .sort((a, b) => stockPercent(a) - stockPercent(b))
    .slice(0, 6)
  const alertCount = medicines.filter(isLowStock).length

  return (
    <section className="panel dashboard-panel" aria-labelledby="stock-title">
      <div className="panel-head">
        <div>
          <h2 id="stock-title">{t('stock.title')}</h2>
          <p className="panel-sub">
            {alertCount === 0
              ? t('stock.allAbove')
              : t('stock.alertCount', { count: alertCount })}
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">{t('stock.empty')}</div>
      ) : (
        <ul className="stock-list">
          {sorted.map((medicine) => {
            const status = stockStatus(medicine)
            const percent = stockPercent(medicine)

            return (
              <li className="stock-item" key={medicine.id}>
                <div className="stock-row">
                  <span className="stock-name">
                    {medicine.name} {medicine.strength}
                  </span>
                  <span
                    className={`status is-${status.tone === 'ok' ? 'ok' : status.tone === 'low' ? 'low' : 'out'}`}
                  >
                    {t(status.key)}
                  </span>
                </div>
                <div className="stock-meta">
                  <span>{describeStock(medicine.stock, medicine.packaging)}</span>
                  <span>
                    {t('stock.threshold', {
                      count: medicine.lowStockThreshold,
                      unit: pluralize(
                        medicine.baseUnit,
                        medicine.lowStockThreshold,
                      ),
                    })}
                  </span>
                </div>
                <div
                  className="progress"
                  role="progressbar"
                  aria-label={t('stock.levelAria', { name: medicine.name })}
                  aria-valuenow={percent}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <span
                    className={`bar-${status.tone}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default StockOverview
