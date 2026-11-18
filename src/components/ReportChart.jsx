import { formatETB, formatNumber } from '../utils/format'
import { usePreferences } from '../context/PreferencesContext'

const WIDTH = 760
const HEIGHT = 250
const PADDING = { top: 14, right: 20, bottom: 34, left: 62 }

function niceMaximum(value) {
  if (value <= 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

function compactMoney(value) {
  if (value >= 1000) {
    const thousands = value / 1000
    return `ETB ${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`
  }
  return `ETB ${formatNumber(value)}`
}

// Evenly spread points across the plot. A single bucket sits in the middle.
function pointsFor(series, maximum, key) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const step = series.length > 1 ? plotWidth / (series.length - 1) : 0
  const start = series.length > 1 ? PADDING.left : PADDING.left + plotWidth / 2

  return series.map((bucket, index) => ({
    x: start + step * index,
    y: PADDING.top + plotHeight - (bucket[key] / maximum) * plotHeight,
    bucket,
  }))
}

function toPointsAttribute(points) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

export default function ReportChart({ series }) {
  const { t } = usePreferences()
  const hasData = series.some(
    (bucket) => bucket.sales > 0 || bucket.purchases > 0,
  )

  if (!hasData) {
    return <div className="empty-state">{t('audit.chartEmpty')}</div>
  }

  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const maximum = niceMaximum(
    Math.max(...series.flatMap((bucket) => [bucket.sales, bucket.purchases])),
  )
  const salesPoints = pointsFor(series, maximum, 'sales')
  const purchasePoints = pointsFor(series, maximum, 'purchases')
  const labelEvery = Math.ceil(series.length / 12)
  const gridValues = [1, 0.75, 0.5, 0.25, 0]

  return (
    <div className="report-chart">
      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-dot is-sales" />
          {t('audit.chartSales')}
        </span>
        <span className="chart-legend-item">
          <span className="chart-dot is-purchases" />
          {t('audit.chartPurchases')}
        </span>
      </div>
      <div className="chart-frame">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={t('audit.chartAria')}
          preserveAspectRatio="xMidYMid meet"
        >
          {gridValues.map((ratio) => {
            const y = PADDING.top + plotHeight * (1 - ratio)
            return (
              <g key={ratio}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
                <text
                  x={PADDING.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="chart-axis-label"
                >
                  {compactMoney(maximum * ratio)}
                </text>
              </g>
            )
          })}

          <polyline
            className="chart-line is-purchases"
            points={toPointsAttribute(purchasePoints)}
          />
          <polyline
            className="chart-line is-sales"
            points={toPointsAttribute(salesPoints)}
          />

          {purchasePoints.map(({ x, y, bucket }) => (
            <circle
              key={`purchase-${bucket.key}`}
              className="chart-point is-purchases"
              cx={x}
              cy={y}
              r="4"
            >
              <title>{`${bucket.label} · ${t('audit.chartPurchases')}: ${formatETB(bucket.purchases)}`}</title>
            </circle>
          ))}
          {salesPoints.map(({ x, y, bucket }) => (
            <circle
              key={`sale-${bucket.key}`}
              className="chart-point is-sales"
              cx={x}
              cy={y}
              r="4"
            >
              <title>{`${bucket.label} · ${t('audit.chartSales')}: ${formatETB(bucket.sales)}`}</title>
            </circle>
          ))}

          {salesPoints.map(({ x, bucket }, index) =>
            index % labelEvery === 0 ? (
              <text
                key={`label-${bucket.key}`}
                x={x}
                y={HEIGHT - 10}
                textAnchor="middle"
                className="chart-axis-label"
              >
                {bucket.label}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  )
}
