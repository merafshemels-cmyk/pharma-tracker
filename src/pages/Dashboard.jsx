import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import StatCard from '../components/StatCard'
import RecentTransactions from '../components/RecentTransactions'
import StockOverview from '../components/StockOverview'
import { buildDashboardCards } from '../utils/dashboard'
import { roleLabelKey } from '../utils/roles'

function todayLabel(language) {
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

// One dashboard for every signed-in member. The layout, cards, and empty
// states are identical for Owner and Cashier; only navigation access differs.
function Dashboard({ navigate }) {
  const {
    medicines,
    transactions,
    batches,
    pharmacy,
    staff,
    email,
    role,
  } = useWorkspace()
  const { t, language } = usePreferences()

  const dateLabel = todayLabel(language)

  const cards = buildDashboardCards({ medicines, transactions, batches })
  const displayName = staff.name || email || t('dashboard.signedInStaff')
  const pharmacyName = pharmacy?.name || t('dashboard.yourPharmacy')

  const recentTransactions = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  )

  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p className="page-sub">
            {t('dashboard.subtitle', {
              pharmacy: pharmacyName,
              name: displayName,
              role: t(roleLabelKey(role)),
            })}
          </p>
        </div>
        <div className="heading-actions">
          <span className="date-chip">
            <span className="date-dot" aria-hidden="true" />
            {dateLabel}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('sales')}
          >
            {t('dashboard.recordSale')}
          </button>
        </div>
      </div>

      <section className="stat-grid" aria-label={t('dashboard.summaryAria')}>
        {cards.map((card) => (
          <StatCard
            key={card.id}
            label={t(card.labelKey)}
            value={card.value}
            hint={t(card.hintKey, card.hintParams)}
            icon={card.icon}
            tone={card.tone}
            onClick={() => navigate(card.route, card.params)}
          />
        ))}
      </section>

      <div className="content-grid">
        <RecentTransactions transactions={recentTransactions} />
        <StockOverview medicines={medicines} />
      </div>
    </>
  )
}

export default Dashboard
