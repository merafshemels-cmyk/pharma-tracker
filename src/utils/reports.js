import { roundMoney, toDateInputValue } from './format'
import { COST_STATUS } from './costing'

export function transactionDateValue(transaction) {
  return toDateInputValue(transaction.date)
}

export function filterTransactions(
  transactions,
  { from = '', to = '', type = 'all' } = {},
) {
  return transactions
    .filter((transaction) => {
      const date = transactionDateValue(transaction)
      if (from && date < from) return false
      if (to && date > to) return false
      if (type !== 'all' && transaction.type !== type) return false
      return true
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function summarizeReport({
  transactions,
  from = '',
  to = '',
  type = 'all',
  costing = null,
}) {
  const filtered = filterTransactions(transactions, { from, to, type })
  const sales = filtered.filter((transaction) => transaction.type === 'sale')
  const purchases = filtered.filter(
    (transaction) => transaction.type === 'purchase',
  )

  const salesTotal = roundMoney(
    sales.reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0),
  )
  const purchasesTotal = roundMoney(
    purchases.reduce(
      (sum, transaction) => sum + (Number(transaction.total) || 0),
      0,
    ),
  )

  let cogs = 0
  let revenueCosted = 0
  let costedSalesCount = 0
  let partialSalesCount = 0
  let unavailableSalesCount = 0

  sales.forEach((sale) => {
    const result =
      (costing ? costing.saleResults.get(sale.id) : null) ?? {
        cogs: Number(sale.cogs) || 0,
        costStatus: sale.costStatus,
      }

    if (result.costStatus === COST_STATUS.AVAILABLE) {
      costedSalesCount += 1
      revenueCosted += Number(sale.total) || 0
      cogs += Number(result.cogs) || 0
    } else if (result.costStatus === COST_STATUS.PARTIAL) {
      partialSalesCount += 1
    } else {
      unavailableSalesCount += 1
    }
  })

  cogs = roundMoney(cogs)
  const grossProfit = roundMoney(revenueCosted - cogs)
  const allSalesCosted =
    sales.length > 0 && unavailableSalesCount === 0 && partialSalesCount === 0

  const stockReceivedBase = purchases.reduce(
    (sum, transaction) => sum + (Number(transaction.baseQuantity) || 0),
    0,
  )
  const stockSoldBase = sales.reduce(
    (sum, transaction) => sum + (Number(transaction.baseQuantity) || 0),
    0,
  )

  return {
    filtered,
    sales,
    purchases,
    salesTotal,
    purchasesTotal,
    salesCount: sales.length,
    purchaseCount: purchases.length,
    stockReceivedBase,
    stockSoldBase,
    cogs,
    revenueCosted: roundMoney(revenueCosted),
    grossProfit,
    grossProfitReliable: allSalesCosted,
    hasReliableCost: costedSalesCount > 0,
    allSalesCosted,
    costedSalesCount,
    partialSalesCount,
    unavailableSalesCount,
    fullyCostedSalesValue: roundMoney(revenueCosted),
  }
}
