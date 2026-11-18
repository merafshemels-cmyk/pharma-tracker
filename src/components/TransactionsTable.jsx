import { Fragment, useMemo, useState } from 'react'
import {
  formatDate,
  formatDateTime,
  formatETB,
  formatNumber,
  pluralize,
  roundMoney,
} from '../utils/format'
import { COST_STATUS } from '../utils/costing'
import { usePreferences } from '../context/PreferencesContext'

function detailsFor(transaction, t) {
  if (transaction.type === 'purchase') {
    const parts = []
    if (transaction.supplier) parts.push(transaction.supplier)
    if (transaction.batchNumber) {
      parts.push(t('tx.batch', { number: transaction.batchNumber }))
    }
    if (transaction.expiryDate) {
      parts.push(t('tx.exp', { date: formatDate(transaction.expiryDate) }))
    }
    return parts.join(' · ') || t('common.unknown')
  }

  return transaction.staff
    ? t('tx.soldBy', { name: transaction.staff })
    : t('common.unknown')
}

function unitPriceFor(transaction) {
  const price = Number(transaction.unitPrice)

  if (Number.isFinite(price)) {
    return price
  }

  return transaction.quantity ? transaction.total / transaction.quantity : 0
}

function costFor(transaction, costing) {
  if (transaction.type !== 'sale') return null

  const result = costing?.saleResults?.get(transaction.id)
  if (result) return result

  if (transaction.costStatus) {
    return {
      cogs: Number(transaction.cogs) || 0,
      costStatus: transaction.costStatus,
    }
  }

  return { cogs: 0, costStatus: COST_STATUS.UNAVAILABLE }
}

function profitFor(transaction, result) {
  if (!result || result.costStatus !== COST_STATUS.AVAILABLE) return null
  return roundMoney((Number(transaction.total) || 0) - result.cogs)
}

// Sort descriptors are shared by the header buttons and the row comparator.
// `value` receives the prepared row so cost/profit columns can be sorted too.
const COLUMNS = [
  { key: 'reference', labelKey: 'tx.reference', value: (tx) => tx.code ?? '' },
  {
    key: 'date',
    labelKey: 'tx.date',
    value: (tx) => new Date(tx.date).getTime() || 0,
  },
  {
    key: 'medicine',
    labelKey: 'tx.medicine',
    value: (tx) => tx.medicineName ?? '',
  },
  { key: 'type', labelKey: 'tx.type', value: (tx) => tx.type ?? '' },
  {
    key: 'quantity',
    labelKey: 'tx.quantity',
    value: (tx) => Number(tx.quantity) || 0,
  },
  {
    key: 'stockChange',
    labelKey: 'tx.stockChange',
    value: (tx) => Number(tx.baseQuantity) || 0,
  },
  {
    key: 'unitPrice',
    labelKey: 'tx.unitPrice',
    value: (tx) => unitPriceFor(tx),
  },
  {
    key: 'lineTotal',
    labelKey: 'tx.lineTotal',
    value: (tx) => Number(tx.total) || 0,
  },
  {
    key: 'cogs',
    labelKey: 'tx.cogs',
    costs: true,
    value: (tx, row) => Number(row.result?.cogs) || 0,
  },
  {
    key: 'grossProfit',
    labelKey: 'tx.grossProfit',
    costs: true,
    value: (tx, row) => row.profit ?? -1,
  },
  { key: 'details', labelKey: 'tx.details', value: (tx, row) => row.details },
]

export function SortHeader({ column, sort, onSort, t }) {
  const isSorted = sort.key === column.key
  const label = t(column.labelKey)
  const arrow = isSorted ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'

  return (
    <th
      scope="col"
      aria-sort={
        isSorted
          ? sort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      <button
        type="button"
        className={`sort-button${isSorted ? ' is-sorted' : ''}`}
        onClick={() => onSort(column.key)}
        aria-label={t('tx.sortBy', { column: label })}
        title={t('tx.sortBy', { column: label })}
      >
        {label}
        <span className="sort-arrow" aria-hidden="true">
          {arrow}
        </span>
      </button>
    </th>
  )
}

function CostCell({ result, t }) {
  if (!result) return <td className="muted">{t('common.unknown')}</td>

  if (result.costStatus === COST_STATUS.AVAILABLE) {
    return (
      <td>
        <span className="cost-value">{formatETB(result.cogs)}</span>
      </td>
    )
  }

  if (result.costStatus === COST_STATUS.PARTIAL) {
    return (
      <td>
        <span className="cell-sub">
          {t('tx.known', { amount: formatETB(result.cogs) })}
        </span>
        <span className="cost-flag is-partial">{t('tx.partialCost')}</span>
      </td>
    )
  }

  return (
    <td>
      <span className="cost-flag is-unavailable">
        {t('tx.costUnavailable')}
      </span>
    </td>
  )
}

function ProfitCell({ transaction, result, t }) {
  const profit = profitFor(transaction, result)

  if (profit === null) return <td className="muted">{t('common.unknown')}</td>

  return (
    <td>
      <span
        className={`profit-pill ${profit >= 0 ? 'is-positive' : 'is-negative'}`}
      >
        {formatETB(profit)}
      </span>
    </td>
  )
}

function DetailField({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function TransactionDetail({ row, showCosts, t }) {
  const { tx, result, profit, details } = row

  return (
    <tr className="tx-detail-row">
      <td colSpan={showCosts ? 11 : 9}>
        <dl className="tx-detail-grid">
          <DetailField label={t('tx.reference')}>{tx.code}</DetailField>
          <DetailField label={t('tx.date')}>
            {formatDateTime(tx.date)}
          </DetailField>
          <DetailField label={t('tx.medicine')}>{tx.medicineName}</DetailField>
          <DetailField label={t('tx.type')}>
            {tx.type === 'sale' ? t('tx.sale') : t('tx.purchase')}
          </DetailField>
          <DetailField label={t('tx.quantity')}>
            {formatNumber(tx.quantity)} {pluralize(tx.unit, tx.quantity)}
          </DetailField>
          <DetailField label={t('tx.stockChange')}>
            {tx.type === 'sale' ? '−' : '+'}
            {formatNumber(tx.baseQuantity)}{' '}
            {pluralize(tx.baseUnit, tx.baseQuantity)}
          </DetailField>
          <DetailField label={t('tx.unitPrice')}>
            {formatETB(unitPriceFor(tx))} / {tx.unit}
          </DetailField>
          <DetailField label={t('tx.lineTotal')}>
            {formatETB(tx.total)}
          </DetailField>
          {showCosts && (
            <DetailField label={t('tx.cogs')}>
              {result ? formatETB(result.cogs) : t('common.unknown')}
            </DetailField>
          )}
          {showCosts && (
            <DetailField label={t('tx.grossProfit')}>
              {profit === null ? t('common.unknown') : formatETB(profit)}
            </DetailField>
          )}
          <DetailField label={t('tx.details')}>{details}</DetailField>
        </dl>
      </td>
    </tr>
  )
}

function TransactionsTable({
  transactions,
  limit,
  emptyText,
  costing = null,
  showCosts = false,
  sortable = false,
  expandable = false,
  sticky = false,
}) {
  const { t } = usePreferences()
  const [sort, setSort] = useState({ key: 'date', direction: 'desc' })
  const [expanded, setExpanded] = useState(() => new Set())

  const prepared = useMemo(
    () =>
      transactions.map((tx) => {
        const result = costFor(tx, costing)
        return {
          tx,
          result,
          profit: profitFor(tx, result),
          details: detailsFor(tx, t),
        }
      }),
    [transactions, costing, t],
  )

  const visibleColumns = COLUMNS.filter(
    (column) => !column.costs || showCosts,
  )

  const ordered = useMemo(() => {
    if (!sortable) return prepared
    const column = COLUMNS.find((item) => item.key === sort.key)
    if (!column) return prepared
    const direction = sort.direction === 'asc' ? 1 : -1
    return [...prepared].sort((a, b) => {
      const first = column.value(a.tx, a)
      const second = column.value(b.tx, b)
      const comparison =
        typeof first === 'number' && typeof second === 'number'
          ? first - second
          : String(first).localeCompare(String(second), undefined, {
              numeric: true,
            })
      return comparison * direction
    })
  }, [prepared, sort, sortable])

  const rows = limit ? ordered.slice(0, limit) : ordered

  function toggleSort(key) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'date' ? 'desc' : 'asc' },
    )
  }

  function toggleRow(id) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (rows.length === 0) {
    return <div className="empty-state">{emptyText ?? t('tx.empty')}</div>
  }

  return (
    <div className={`table-wrap${sticky ? ' is-sticky' : ''}`}>
      <table className="transactions-table">
        <caption className="sr-only">{t('tx.caption')}</caption>
        <thead>
          <tr>
            {visibleColumns.map((column) =>
              sortable ? (
                <SortHeader
                  key={column.key}
                  column={column}
                  sort={sort}
                  onSort={toggleSort}
                  t={t}
                />
              ) : (
                <th key={column.key} scope="col">
                  {t(column.labelKey)}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { tx, result, details } = row
            const isExpanded = expanded.has(tx.id)

            return (
              <Fragment key={tx.id}>
                <tr
                  className={`tx-row tx-${tx.type}${
                    isExpanded ? ' is-expanded' : ''
                  }`}
                >
                  <td>
                    {expandable && (
                      <button
                        type="button"
                        className="tx-toggle"
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded
                            ? t('audit.hideDetails')
                            : t('audit.showDetails')
                        }
                        title={
                          isExpanded
                            ? t('audit.hideDetails')
                            : t('audit.showDetails')
                        }
                        onClick={() => toggleRow(tx.id)}
                      >
                        {isExpanded ? '−' : '+'}
                      </button>
                    )}
                    <span className="ref-chip mono">{tx.code}</span>
                  </td>
                  <td className="muted nowrap">{formatDateTime(tx.date)}</td>
                  <td className="strong">{tx.medicineName}</td>
                  <td>
                    <span className={`type type-${tx.type}`}>
                      {tx.type === 'sale' ? t('tx.sale') : t('tx.purchase')}
                    </span>
                  </td>
                  <td>
                    {formatNumber(tx.quantity)}{' '}
                    {pluralize(tx.unit, tx.quantity)}
                  </td>
                  <td>
                    <span
                      className={`stock-change ${
                        tx.type === 'sale' ? 'is-out' : 'is-in'
                      }`}
                    >
                      {tx.type === 'sale' ? '−' : '+'}
                      {formatNumber(tx.baseQuantity)}{' '}
                      {pluralize(tx.baseUnit, tx.baseQuantity)}
                    </span>
                  </td>
                  <td className="tx-unit-price">
                    {formatETB(unitPriceFor(tx))} / {tx.unit}
                  </td>
                  <td>
                    <span className="line-total">{formatETB(tx.total)}</span>
                  </td>
                  {showCosts && <CostCell result={result} t={t} />}
                  {showCosts && (
                    <ProfitCell transaction={tx} result={result} t={t} />
                  )}
                  <td className="muted small">
                    <span className="detail-chip">{details}</span>
                  </td>
                </tr>
                {expandable && isExpanded && (
                  <TransactionDetail
                    row={row}
                    showCosts={showCosts}
                    t={t}
                  />
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TransactionsTable
