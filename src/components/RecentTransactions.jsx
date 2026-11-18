import { formatETB } from '../utils/format'
import { usePreferences } from '../context/PreferencesContext'

function RecentTransactions({ transactions, limit = 6 }) {
  const { t } = usePreferences()
  const rows = transactions.slice(0, limit)

  return (
    <section
      className="panel dashboard-panel"
      aria-labelledby="transactions-title"
    >
      <div className="panel-head">
        <div>
          <h2 id="transactions-title">{t('recent.title')}</h2>
          <p className="panel-sub">{t('recent.subtitle')}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">{t('recent.empty')}</div>
      ) : (
        <div className="table-wrap recent-table-wrap">
          <table className="recent-table">
            <caption className="sr-only">{t('tx.caption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('tx.medicine')}</th>
                <th scope="col">{t('tx.type')}</th>
                <th scope="col" className="recent-total-head">
                  {t('tx.lineTotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} className={`tx-row tx-${tx.type}`}>
                  <td>
                    <span className="strong">{tx.medicineName}</span>
                  </td>
                  <td>
                    <span className={`type type-${tx.type}`}>
                      {tx.type === 'sale' ? t('tx.sale') : t('tx.purchase')}
                    </span>
                  </td>
                  <td className="recent-total">
                    <span className="line-total">{formatETB(tx.total)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default RecentTransactions
