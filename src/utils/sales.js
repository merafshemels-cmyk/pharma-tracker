import { roundMoney } from './format'

export const SALES_PERIODS = [
  { id: 'today', label: 'Today', labelKey: 'period.today' },
  { id: 'week', label: 'This Week', labelKey: 'period.week' },
  { id: 'month', label: 'This Month', labelKey: 'period.month' },
  { id: 'quarter', label: 'This Quarter', labelKey: 'period.quarter' },
  { id: 'year', label: 'This Year', labelKey: 'period.year' },
]

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfWeek(date) {
  const start = startOfDay(date)
  const mondayOffset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - mondayOffset)
  return start
}

export function getPeriodRange(periodId, now = new Date()) {
  const today = startOfDay(now)
  const year = today.getFullYear()
  const month = today.getMonth()

  if (periodId === 'week') {
    const start = startOfWeek(today)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return { start, end }
  }

  if (periodId === 'month') {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 1),
    }
  }

  if (periodId === 'quarter') {
    const quarterStart = Math.floor(month / 3) * 3
    return {
      start: new Date(year, quarterStart, 1),
      end: new Date(year, quarterStart + 3, 1),
    }
  }

  if (periodId === 'year') {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
    }
  }

  const end = new Date(today)
  end.setDate(end.getDate() + 1)
  return { start: today, end }
}

// Shared sale maths for the cashier screen and automated tests. Quantities are
// entered in packaging units but stock is always tracked in base units.
export function buildSaleLine({ medicine, level, quantity, unitPrice }) {
  const quantityNumber = Number(quantity)
  const priceNumber = Number(unitPrice)
  const contains = Number(level?.contains)
  const hasLevel = Boolean(medicine && level && Number.isFinite(contains) && contains > 0)
  const baseQuantity =
    hasLevel && Number.isFinite(quantityNumber) ? quantityNumber * contains : 0
  const maxUnits = hasLevel ? Math.floor(medicine.stock / contains) : 0
  const exceedsStock = Boolean(hasLevel && baseQuantity > medicine.stock)
  const total =
    Number.isFinite(quantityNumber) && Number.isFinite(priceNumber)
      ? roundMoney(quantityNumber * priceNumber)
      : 0

  return {
    quantityNumber,
    priceNumber,
    baseQuantity,
    maxUnits,
    exceedsStock,
    total,
  }
}

export function summarizeSales(transactions, periodId, now = new Date()) {
  const { start, end } = getPeriodRange(periodId, now)
  const sales = transactions
    .filter((transaction) => {
      if (transaction.type !== 'sale') return false
      const date = new Date(transaction.date)
      return date >= start && date < end
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const total = roundMoney(
    sales.reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0),
  )
  const count = sales.length
  const saleCount = new Set(
    sales.map((transaction) => transaction.saleId ?? transaction.id),
  ).size
  const itemCount = sales.reduce(
    (sum, transaction) => sum + (Number(transaction.quantity) || 0),
    0,
  )
  const average = saleCount > 0 ? roundMoney(total / saleCount) : 0

  return { sales, total, count, saleCount, itemCount, average, start, end }
}
