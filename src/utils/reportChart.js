import { roundMoney, toDateInputValue } from './format'

function pad(value) {
  return String(value).padStart(2, '0')
}

function addDays(dateString, amount) {
  const [year, month, day] = dateString.split('-').map(Number)
  return toDateInputValue(new Date(year, month - 1, day + amount))
}

function eachDate(from, to) {
  const dates = []
  if (!from || !to || from > to) return dates
  let cursor = from
  let guard = 0
  while (cursor <= to && guard < 400) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
    guard += 1
  }
  return dates
}

function eachMonth(from, to) {
  const keys = []
  if (!from || !to) return keys
  const [startYear, startMonth] = from.split('-').map(Number)
  const [endYear, endMonth] = to.split('-').map(Number)
  let year = startYear
  let month = startMonth
  let guard = 0
  while (
    (year < endYear || (year === endYear && month <= endMonth)) &&
    guard < 24
  ) {
    keys.push(`${year}-${pad(month)}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    guard += 1
  }
  return keys
}

// Month uses daily points so the line shows real activity; quarter/year use
// monthly points. Today/week do not render the chart at all.
export function buildReportSeries(
  transactions,
  { from, to, period = 'month', language = 'en' } = {},
) {
  const monthly = period === 'quarter' || period === 'year'
  const buckets = []

  if (monthly) {
    const monthFormat = new Intl.DateTimeFormat(language, { month: 'short' })
    eachMonth(from, to).forEach((key) => {
      const [year, month] = key.split('-').map(Number)
      buckets.push({
        key,
        label: monthFormat.format(new Date(year, month - 1, 1)),
        sales: 0,
        purchases: 0,
      })
    })
  } else {
    eachDate(from, to).forEach((date) => {
      const [, , day] = date.split('-').map(Number)
      buckets.push({
        key: date,
        label: String(day),
        sales: 0,
        purchases: 0,
      })
    })
  }

  const lookup = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  transactions.forEach((transaction) => {
    const dateKey = toDateInputValue(transaction.date)
    if (!dateKey || (from && dateKey < from) || (to && dateKey > to)) return

    const bucket = lookup.get(monthly ? dateKey.slice(0, 7) : dateKey)
    if (!bucket) return

    const amount = Number(transaction.total) || 0
    if (transaction.type === 'sale') {
      bucket.sales = roundMoney(bucket.sales + amount)
    } else if (transaction.type === 'purchase') {
      bucket.purchases = roundMoney(bucket.purchases + amount)
    }
  })

  return buckets
}
