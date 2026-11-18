import { formatETB } from './format'
import { isLowStock } from './inventory'
import { EXPIRY_WINDOW_DAYS, isExpiredBatch, isExpiringBatch } from './expiry'
import { summarizeSales } from './sales'

// The dashboard is shared by every role. Keep the four cards and their
// destinations in one place so Owner and Cashier always see the same layout.
export function buildDashboardCards({
  medicines = [],
  transactions = [],
  batches = [],
  now = new Date(),
} = {}) {
  const todaySummary = summarizeSales(transactions, 'today', now)
  const lowStock = medicines.filter(isLowStock)
  const outOfStock = medicines.filter((item) => item.stock <= 0)
  const expiringSoon = batches.filter((batch) =>
    isExpiringBatch(batch, EXPIRY_WINDOW_DAYS, now),
  )
  const expired = batches.filter((batch) => isExpiredBatch(batch, now))
  const dosageFormCount = new Set(
    medicines.map((item) => item.dosageForm).filter(Boolean),
  ).size
  const expiryCount = expiringSoon.length + expired.length

  return [
    {
      id: 'medicines',
      label: 'Total Medicines',
      labelKey: 'dashboard.cards.medicines',
      value: String(medicines.length),
      hint:
        medicines.length === 0
          ? 'No medicines in the inventory yet'
          : `Across ${dosageFormCount} dosage forms`,
      hintKey:
        medicines.length === 0
          ? 'dashboard.hints.medicinesEmpty'
          : 'dashboard.hints.medicinesForms',
      hintParams: { count: dosageFormCount },
      icon: 'medicines',
      tone: 'navy',
      route: 'inventory',
      params: {},
    },
    {
      id: 'sales',
      label: "Today's Sales",
      labelKey: 'dashboard.cards.sales',
      value: formatETB(todaySummary.total),
      hint:
        todaySummary.saleCount === 0
          ? 'No sales recorded today'
          : `${todaySummary.saleCount} sale${todaySummary.saleCount === 1 ? '' : 's'} · ${todaySummary.itemCount} item${todaySummary.itemCount === 1 ? '' : 's'} sold`,
      hintKey:
        todaySummary.saleCount === 0
          ? 'dashboard.hints.salesEmpty'
          : 'dashboard.hints.salesCount',
      hintParams: {
        sales: todaySummary.saleCount,
        items: todaySummary.itemCount,
      },
      icon: 'sales',
      tone: 'green',
      route: 'sales',
      params: { period: 'today' },
    },
    {
      id: 'low-stock',
      label: 'Low Stock',
      labelKey: 'dashboard.cards.lowStock',
      value: String(lowStock.length),
      hint:
        lowStock.length === 0
          ? 'All medicines are above their threshold'
          : `${outOfStock.length} out of stock · threshold based`,
      hintKey:
        lowStock.length === 0
          ? 'dashboard.hints.lowStockEmpty'
          : 'dashboard.hints.lowStockCount',
      hintParams: { out: outOfStock.length },
      icon: 'alert',
      tone: 'amber',
      route: 'inventory',
      params: { filter: 'low' },
    },
    {
      id: 'expiry',
      label: 'Expiry Alerts',
      labelKey: 'dashboard.cards.expiry',
      value: String(expiryCount),
      hint:
        expiryCount === 0
          ? `No expired or soon-to-expire batches`
          : `${expired.length} expired · ${expiringSoon.length} expiring within ${EXPIRY_WINDOW_DAYS} days`,
      hintKey:
        expiryCount === 0
          ? 'dashboard.hints.expiryEmpty'
          : 'dashboard.hints.expiryCount',
      hintParams: {
        expired: expired.length,
        soon: expiringSoon.length,
        days: EXPIRY_WINDOW_DAYS,
      },
      icon: 'expiry',
      tone: 'blue',
      route: 'expiry',
      params: {},
    },
  ]
}
