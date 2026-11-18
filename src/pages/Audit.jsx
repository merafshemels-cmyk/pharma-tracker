import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import TransactionsTable, {
  SortHeader,
} from '../components/TransactionsTable'
import ReportChart from '../components/ReportChart'
import ExportReportModal from '../components/ExportReportModal'
import { Icon } from '../components/icons'
import {
  formatDate,
  formatETB,
  formatNumber,
  pluralize,
  toDateInputValue,
} from '../utils/format'
import { getPeriodRange, SALES_PERIODS } from '../utils/sales'
import { buildCostingSnapshot, COST_STATUS } from '../utils/costing'
import { summarizeReport } from '../utils/reports'
import { downloadCsv, reportFileName } from '../utils/reportExport'
import {
  buildReportCsvRows,
  buildStockMovements,
} from '../utils/reportCsv'
import { buildReportSeries } from '../utils/reportChart'

const FOCUS_LABELS = {
  sale: 'audit.focusSales',
  purchase: 'audit.focusPurchases',
  costed: 'audit.focusCosted',
}

const MOVEMENT_COLUMNS = [
  { key: 'name', labelKey: 'inventory.medicine' },
  { key: 'stockIn', labelKey: 'audit.stockIn' },
  { key: 'stockOut', labelKey: 'audit.stockOut' },
  { key: 'net', labelKey: 'audit.netChange' },
]

function Audit() {
  const { medicines, transactions, batches, pharmacy } = useWorkspace()
  const { t, language } = usePreferences()

  const initialRange = getPeriodRange('month')
  const [period, setPeriod] = useState('month')
  const [from, setFrom] = useState(
    toDateInputValue(initialRange.start),
  )
  const [to, setTo] = useState(
    toDateInputValue(new Date(initialRange.end.getTime() - 1)),
  )
  const [movementSort, setMovementSort] = useState({
    key: 'name',
    direction: 'asc',
  })
  const [exportOpen, setExportOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailFocus, setDetailFocus] = useState('all')

  // Summary cards open the matching slice of the detailed report.
  function focusDetails(focus) {
    setDetailFocus(focus)
    setDetailsOpen(true)
    window.requestAnimationFrame(() => {
      document
        .getElementById('audit-details')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  // Printing always includes the full, unfiltered report.
  useEffect(() => {
    function resetForPrint() {
      setDetailFocus('all')
      setDetailsOpen(true)
    }
    window.addEventListener('beforeprint', resetForPrint)
    return () => window.removeEventListener('beforeprint', resetForPrint)
  }, [])

  // The activity chart covers month, quarter and year. Only the very short
  // today/week periods stay table-only.
  const showChart =
    period === 'month' || period === 'quarter' || period === 'year'

  const costing = useMemo(
    () => buildCostingSnapshot(medicines, transactions, batches),
    [medicines, transactions, batches],
  )
  const summary = useMemo(
    () => summarizeReport({ transactions, from, to, costing }),
    [transactions, from, to, costing],
  )

  const {
    filtered,
    salesTotal,
    purchasesTotal,
    salesCount,
    purchaseCount,
    cogs,
    grossProfit,
    allSalesCosted,
    hasReliableCost,
    costedSalesCount,
    partialSalesCount,
    unavailableSalesCount,
    stockReceivedBase,
    stockSoldBase,
  } = summary

  const focusedTransactions = useMemo(() => {
    if (detailFocus === 'sale') {
      return filtered.filter((tx) => tx.type === 'sale')
    }
    if (detailFocus === 'purchase') {
      return filtered.filter((tx) => tx.type === 'purchase')
    }
    if (detailFocus === 'costed') {
      return filtered.filter(
        (tx) =>
          tx.type === 'sale' &&
          costing.saleResults?.get(tx.id)?.costStatus ===
            COST_STATUS.AVAILABLE,
      )
    }
    return filtered
  }, [filtered, detailFocus, costing])

  function applyPeriod(periodId) {
    setPeriod(periodId)
    setDetailFocus('all')
    const range = getPeriodRange(periodId)
    setFrom(toDateInputValue(range.start))
    setTo(toDateInputValue(new Date(range.end.getTime() - 1)))
  }

  function toggleMovementSort(key) {
    setMovementSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'name' ? 'asc' : 'desc' },
    )
  }

  function handleExportCsv(periodId, range) {
    const exportFrom = toDateInputValue(range.start)
    const exportTo = toDateInputValue(new Date(range.end.getTime() - 1))
    const periodLabel = t(
      SALES_PERIODS.find((item) => item.id === periodId)?.labelKey ??
        'audit.period',
    )
    const rows = buildReportCsvRows({
      t,
      transactions,
      costing,
      from: exportFrom,
      to: exportTo,
      periodLabel,
      pharmacyName: pharmacy.name,
    })

    downloadCsv(reportFileName('audit-report', exportFrom, exportTo), rows)
    setExportOpen(false)
  }

  const movements = useMemo(() => buildStockMovements(filtered), [filtered])

  const direction = movementSort.direction === 'asc' ? 1 : -1
  const sortedMovements = [...movements].sort((a, b) => {
    const first = a[movementSort.key]
    const second = b[movementSort.key]
    const comparison =
      typeof first === 'number' && typeof second === 'number'
        ? first - second
        : String(first).localeCompare(String(second))
    return comparison * direction
  })

  const typeLabel = t('audit.allTransactions')

  const costLabelKey =
    salesCount === 0
      ? 'audit.grossProfit'
      : allSalesCosted
        ? hasReliableCost
          ? 'audit.grossProfitEstimated'
          : 'audit.grossProfit'
        : 'audit.grossProfitCosted'
  const grossProfitValue =
    salesCount === 0
      ? t('common.unknown')
      : hasReliableCost
        ? formatETB(grossProfit)
        : t('audit.costUnavailable')

  const chartSeries = useMemo(
    () =>
      showChart
        ? buildReportSeries(filtered, { from, to, period, language })
        : [],
    [filtered, from, to, period, language, showChart],
  )

  return (
    <>
      <div className="print-header">
        <h1>{pharmacy.name}</h1>
        <p>
          {t('audit.printRange', {
            from: formatDate(from),
            to: formatDate(to),
            type: typeLabel,
          })}
        </p>
        <p>{t('audit.printGenerated')}</p>
      </div>

      <div className="page-heading">
        <div>
          <h1>{t('audit.title')}</h1>
          <p className="page-sub">{t('audit.subtitle')}</p>
        </div>
        <div className="heading-actions no-print">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setExportOpen(true)}
          >
            <Icon name="download" size={16} />
            {t('audit.exportCsv')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            {t('audit.print')}
          </button>
        </div>
      </div>

      <div
        className="period-tabs period-tabs-top no-print"
        role="group"
        aria-label={t('audit.periodAria')}
      >
        {SALES_PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`period-tab${period === item.id ? ' is-active' : ''}`}
            aria-pressed={period === item.id}
            onClick={() => applyPeriod(item.id)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <section className="report-summary" aria-label={t('audit.totalsAria')}>
        <div className="summary-primary">
          <button
            type="button"
            className={`summary-highlight is-sales${
              detailFocus === 'sale' ? ' is-focused' : ''
            }`}
            aria-pressed={detailFocus === 'sale'}
            onClick={() => focusDetails('sale')}
          >
            <Icon name="sales" size={18} />
            <span className="summary-label">{t('audit.salesRevenue')}</span>
            <strong>{formatETB(salesTotal)}</strong>
          </button>
          <button
            type="button"
            className={`summary-highlight is-purchases${
              detailFocus === 'purchase' ? ' is-focused' : ''
            }`}
            aria-pressed={detailFocus === 'purchase'}
            onClick={() => focusDetails('purchase')}
          >
            <Icon name="purchases" size={18} />
            <span className="summary-label">{t('audit.purchaseCosts')}</span>
            <strong>{formatETB(purchasesTotal)}</strong>
          </button>
          <button
            type="button"
            className={`summary-highlight is-cost${
              hasReliableCost ? '' : ' is-unavailable'
            }${detailFocus === 'costed' ? ' is-focused' : ''}`}
            aria-pressed={detailFocus === 'costed'}
            onClick={() => focusDetails('costed')}
          >
            <Icon name="file" size={18} />
            <span className="summary-label">{t('audit.cogs')}</span>
            <strong>
              {hasReliableCost ? formatETB(cogs) : t('audit.costUnavailable')}
            </strong>
          </button>
          <button
            type="button"
            className={`summary-highlight is-profit${
              hasReliableCost ? '' : ' is-unavailable'
            }${detailFocus === 'costed' ? ' is-focused' : ''}`}
            aria-pressed={detailFocus === 'costed'}
            onClick={() => focusDetails('costed')}
          >
            <Icon name="audit" size={18} />
            <span className="summary-label">{t(costLabelKey)}</span>
            <strong>{grossProfitValue}</strong>
          </button>
        </div>

        <div className="summary-secondary">
          <button
            type="button"
            className={`summary-mini${
              detailFocus === 'sale' ? ' is-focused' : ''
            }`}
            aria-pressed={detailFocus === 'sale'}
            onClick={() => focusDetails('sale')}
          >
            <span>{t('audit.salesRecorded')}</span>
            <strong>{formatNumber(salesCount)}</strong>
          </button>
          <button
            type="button"
            className={`summary-mini${
              detailFocus === 'purchase' ? ' is-focused' : ''
            }`}
            aria-pressed={detailFocus === 'purchase'}
            onClick={() => focusDetails('purchase')}
          >
            <span>{t('audit.purchasesRecorded')}</span>
            <strong>{formatNumber(purchaseCount)}</strong>
          </button>
          <button
            type="button"
            className={`summary-mini${
              detailFocus === 'purchase' ? ' is-focused' : ''
            }`}
            aria-pressed={detailFocus === 'purchase'}
            onClick={() => focusDetails('purchase')}
          >
            <span>{t('audit.stockReceived')}</span>
            <strong>
              {t('audit.baseUnits', { count: formatNumber(stockReceivedBase) })}
            </strong>
          </button>
          <button
            type="button"
            className={`summary-mini${
              detailFocus === 'sale' ? ' is-focused' : ''
            }`}
            aria-pressed={detailFocus === 'sale'}
            onClick={() => focusDetails('sale')}
          >
            <span>{t('audit.stockSold')}</span>
            <strong>
              {t('audit.baseUnits', { count: formatNumber(stockSoldBase) })}
            </strong>
          </button>
        </div>
      </section>

      {salesCount > 0 && !allSalesCosted && (
        <div className="notice" role="status">
          <strong>{t('audit.incompleteTitle')}</strong>{' '}
          {unavailableSalesCount > 0 &&
            t('audit.incompleteUnavailable', {
              count: unavailableSalesCount,
            })}
          {partialSalesCount > 0 &&
            t('audit.incompletePartial', { count: partialSalesCount })}
          {t('audit.incompleteTail', { count: costedSalesCount })}
        </div>
      )}

      {salesCount > 0 && allSalesCosted && (
        <div className="panel-note">{t('audit.estimateNote')}</div>
      )}

      <section
        id="audit-details"
        className="panel print-section audit-details"
        aria-labelledby="audit-details-title"
      >
        <div className="panel-head">
          <div>
            <h2 id="audit-details-title">{t('audit.detailsTitle')}</h2>
            <p className="panel-sub">{t('audit.detailsSubtitle')}</p>
          </div>
          <div className="audit-details-actions">
            {detailFocus !== 'all' && (
              <button
                type="button"
                className="focus-chip no-print"
                onClick={() => setDetailFocus('all')}
                title={t('audit.focusClear')}
              >
                {t('audit.focusLabel', { label: t(FOCUS_LABELS[detailFocus]) })}
                <span aria-hidden="true">×</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm audit-details-toggle no-print"
              aria-expanded={detailsOpen}
              aria-controls="audit-details-body"
              onClick={() => setDetailsOpen((open) => !open)}
            >
              <span aria-hidden="true">{detailsOpen ? '−' : '+'}</span>
              {detailsOpen ? t('audit.hideDetails') : t('audit.showDetails')}
            </button>
          </div>
        </div>

        <div
          id="audit-details-body"
          className={`audit-details-body${detailsOpen ? ' is-open' : ''}`}
        >
          {showChart && (
            <div className="audit-detail-block">
              <div className="audit-detail-head">
                <h3 id="audit-chart-title">{t('audit.chartTitle')}</h3>
                <p className="panel-sub">{t('audit.chartSubtitle')}</p>
              </div>
              <ReportChart series={chartSeries} />
            </div>
          )}

          <div className="audit-detail-block">
            <div className="audit-detail-head">
              <h3 id="audit-transactions-title">
                {t('audit.filteredTransactions')}
              </h3>
              <p className="panel-sub">
                {t('audit.filteredSubtitle', {
                  from: formatDate(from),
                  to: formatDate(to),
                })}
              </p>
            </div>
            <TransactionsTable
              transactions={focusedTransactions}
              emptyText={t('audit.noMatch')}
              costing={costing}
              showCosts
              sortable
              expandable
              sticky
            />
          </div>

          <div className="audit-detail-block">
            <div className="audit-detail-head">
              <h3 id="audit-movement-title">{t('audit.stockMovements')}</h3>
              <p className="panel-sub">{t('audit.stockMovementsSubtitle')}</p>
            </div>
            <div className="table-wrap is-sticky">
              <table>
                <thead>
                  <tr>
                    {MOVEMENT_COLUMNS.map((column) => (
                      <SortHeader
                        key={column.key}
                        column={column}
                        sort={movementSort}
                        onSort={toggleMovementSort}
                        t={t}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedMovements.length === 0 && (
                    <tr>
                      <td colSpan="4">
                        <div className="empty-state">
                          {t('audit.noMovement')}
                        </div>
                      </td>
                    </tr>
                  )}
                  {sortedMovements.map((movement) => (
                    <tr key={movement.name}>
                      <td className="strong">{movement.name}</td>
                      <td className="stock-in">
                        +{formatNumber(movement.stockIn)}{' '}
                        {pluralize(movement.baseUnit, movement.stockIn)}
                      </td>
                      <td className="stock-out">
                        −{formatNumber(movement.stockOut)}{' '}
                        {pluralize(movement.baseUnit, movement.stockOut)}
                      </td>
                      <td>
                        <span
                          className={
                            movement.net >= 0 ? 'stock-in' : 'stock-out'
                          }
                        >
                          {movement.net >= 0 ? '+' : ''}
                          {formatNumber(movement.net)}{' '}
                          {pluralize(
                            movement.baseUnit,
                            Math.abs(movement.net),
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {exportOpen && (
        <ExportReportModal
          initialPeriod={period}
          onClose={() => setExportOpen(false)}
          onExport={handleExportCsv}
        />
      )}
    </>
  )
}

export default Audit
