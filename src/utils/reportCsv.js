import { COST_STATUS } from './costing'
import {
  formatDateTime,
  formatETB,
  formatNumber,
  pluralize,
  roundMoney,
} from './format'
import { summarizeReport } from './reports'

// Aggregated per-medicine stock movement for a set of transactions.
export function buildStockMovements(filtered) {
  const movementMap = new Map()

  filtered.forEach((transaction) => {
    const current = movementMap.get(transaction.medicineId) ?? {
      name: transaction.medicineName,
      baseUnit: transaction.baseUnit,
      stockIn: 0,
      stockOut: 0,
    }

    if (transaction.type === 'purchase') {
      current.stockIn += transaction.baseQuantity
    } else {
      current.stockOut += transaction.baseQuantity
    }

    movementMap.set(transaction.medicineId, current)
  })

  return [...movementMap.values()].map((movement) => ({
    ...movement,
    net: movement.stockIn - movement.stockOut,
  }))
}

function costResultFor(transaction, costing) {
  return (
    costing?.saleResults?.get(transaction.id) ??
    (transaction.costStatus
      ? {
          cogs: Number(transaction.cogs) || 0,
          costStatus: transaction.costStatus,
        }
      : null)
  )
}

// Builds the full CSV (header, summary, transactions, movements) for any
// date range, independent of what the report page currently displays.
export function buildReportCsvRows({
  t,
  transactions,
  costing,
  from,
  to,
  periodLabel,
  pharmacyName,
}) {
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
    stockReceivedBase,
    stockSoldBase,
  } = summarizeReport({ transactions, from, to, costing })

  const movements = buildStockMovements(filtered)

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

  return [
    [t('audit.csvTitle')],
    [t('audit.csvPharmacy'), pharmacyName],
    [t('audit.period'), `${from} – ${to}`],
    [t('audit.csvSelectedPeriod'), periodLabel],
    [t('audit.transactionType'), t('audit.allTransactions')],
    [t('audit.csvGenerated'), new Date().toLocaleString()],
    [],
    [t('audit.csvSummary')],
    [t('audit.csvMetric'), t('audit.csvValue')],
    [t('audit.salesRevenue'), formatETB(salesTotal)],
    [t('audit.purchaseCosts'), formatETB(purchasesTotal)],
    [
      t('audit.cogs'),
      hasReliableCost ? formatETB(cogs) : t('audit.costUnavailable'),
    ],
    [t(costLabelKey), grossProfitValue],
    [t('audit.salesRecorded'), formatNumber(salesCount)],
    [t('audit.purchasesRecorded'), formatNumber(purchaseCount)],
    [t('audit.stockReceived'), formatNumber(stockReceivedBase)],
    [t('audit.stockSold'), formatNumber(stockSoldBase)],
    [],
    [t('audit.filteredTransactions')],
    [
      t('tx.reference'),
      t('tx.date'),
      t('tx.medicine'),
      t('tx.type'),
      t('tx.quantity'),
      t('tx.stockChange'),
      t('tx.unitPrice'),
      t('tx.lineTotal'),
      t('tx.cogs'),
      t('tx.grossProfit'),
      t('tx.details'),
    ],
    ...filtered.map((transaction) => {
      const result = costResultFor(transaction, costing)
      const profit =
        result?.costStatus === COST_STATUS.AVAILABLE
          ? roundMoney((Number(transaction.total) || 0) - result.cogs)
          : null
      const unitPrice = Number.isFinite(Number(transaction.unitPrice))
        ? Number(transaction.unitPrice)
        : transaction.quantity
          ? Number(transaction.total) / Number(transaction.quantity)
          : 0
      const details =
        transaction.type === 'purchase'
          ? [transaction.supplier, transaction.batchNumber]
              .filter(Boolean)
              .join(' · ')
          : transaction.staff ?? ''

      return [
        transaction.code,
        formatDateTime(transaction.date),
        transaction.medicineName,
        transaction.type === 'sale' ? t('tx.sale') : t('tx.purchase'),
        `${formatNumber(transaction.quantity)} ${pluralize(transaction.unit, transaction.quantity)}`,
        `${transaction.type === 'sale' ? '−' : '+'}${formatNumber(transaction.baseQuantity)} ${pluralize(transaction.baseUnit, transaction.baseQuantity)}`,
        `${formatETB(unitPrice)} / ${transaction.unit}`,
        formatETB(transaction.total),
        result ? formatETB(result.cogs) : t('common.unknown'),
        profit === null ? t('common.unknown') : formatETB(profit),
        details,
      ]
    }),
    [],
    [t('audit.stockMovements')],
    [
      t('inventory.medicine'),
      t('audit.stockIn'),
      t('audit.stockOut'),
      t('audit.netChange'),
    ],
    ...movements.map((movement) => [
      movement.name,
      `${formatNumber(movement.stockIn)} ${pluralize(movement.baseUnit, movement.stockIn)}`,
      `${formatNumber(movement.stockOut)} ${pluralize(movement.baseUnit, movement.stockOut)}`,
      `${movement.net >= 0 ? '+' : ''}${formatNumber(movement.net)} ${pluralize(movement.baseUnit, Math.abs(movement.net))}`,
    ]),
  ]
}
