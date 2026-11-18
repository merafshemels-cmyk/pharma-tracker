import { Icon } from './icons'

function StatCard({ label, value, hint, icon, tone, onClick }) {
  const content = (
    <>
      <span className="stat-icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        <p className="stat-hint">{hint}</p>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={`stat-card stat-card-button tone-${tone}`}
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  return <article className={`stat-card tone-${tone}`}>{content}</article>
}

export default StatCard
