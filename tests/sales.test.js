import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  SALES_PERIODS,
  buildSaleLine,
  getPeriodRange,
  summarizeSales,
} from '../src/utils/sales.js'

const now = new Date(2026, 4, 14, 12, 0, 0) // Thursday, 14 May 2026

test('sales history exposes Today, Week, Month, Quarter, and Year', () => {
  assert.deepEqual(
    SALES_PERIODS.map((period) => period.label),
    ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year'],
  )
})

test('period ranges start and end on calendar boundaries', () => {
  const today = getPeriodRange('today', now)
  assert.deepEqual(
    [today.start, today.end],
    [new Date(2026, 4, 14), new Date(2026, 4, 15)],
  )

  const week = getPeriodRange('week', now)
  assert.deepEqual(
    [week.start, week.end],
    [new Date(2026, 4, 11), new Date(2026, 4, 18)],
  )

  const month = getPeriodRange('month', now)
  assert.deepEqual(
    [month.start, month.end],
    [new Date(2026, 4, 1), new Date(2026, 5, 1)],
  )

  const quarter = getPeriodRange('quarter', now)
  assert.deepEqual(
    [quarter.start, quarter.end],
    [new Date(2026, 3, 1), new Date(2026, 6, 1)],
  )

  const year = getPeriodRange('year', now)
  assert.deepEqual(
    [year.start, year.end],
    [new Date(2026, 0, 1), new Date(2027, 0, 1)],
  )
})

test('sales totals only include sales inside the selected period', () => {
  const transactions = [
    { id: 's1', type: 'sale', date: '2026-05-14T09:00:00', total: 100, quantity: 2 },
    { id: 's2', type: 'sale', date: '2026-05-14T10:00:00', total: 50, quantity: 1 },
    { id: 's3', type: 'sale', date: '2026-05-12T10:00:00', total: 30, quantity: 3 },
    { id: 's4', type: 'sale', date: '2026-04-02T10:00:00', total: 200, quantity: 4 },
    { id: 's5', type: 'sale', date: '2025-12-31T10:00:00', total: 500, quantity: 5 },
    { id: 'p1', type: 'purchase', date: '2026-05-14T10:00:00', total: 900, quantity: 9 },
  ]

  const today = summarizeSales(transactions, 'today', now)
  assert.equal(today.total, 150)
  assert.equal(today.saleCount, 2)
  assert.equal(today.itemCount, 3)
  assert.equal(today.average, 75)
  assert.deepEqual(
    today.sales.map((sale) => sale.id),
    ['s2', 's1'],
  )

  assert.equal(summarizeSales(transactions, 'week', now).total, 180)
  assert.equal(summarizeSales(transactions, 'month', now).total, 180)
  assert.equal(summarizeSales(transactions, 'quarter', now).total, 380)
  assert.equal(summarizeSales(transactions, 'year', now).total, 380)
})

test('packaging units convert to base units and respect available stock', () => {
  const medicine = { stock: 95, baseUnit: 'tablet' }
  const strip = { unit: 'strip', contains: 10 }

  const line = buildSaleLine({
    medicine,
    level: strip,
    quantity: '2',
    unitPrice: '30',
  })

  assert.equal(line.baseQuantity, 20)
  assert.equal(line.maxUnits, 9)
  assert.equal(line.exceedsStock, false)
  assert.equal(line.total, 60)

  const tooMany = buildSaleLine({
    medicine,
    level: strip,
    quantity: '10',
    unitPrice: '30',
  })

  assert.equal(tooMany.baseQuantity, 100)
  assert.equal(tooMany.maxUnits, 9)
  assert.equal(tooMany.exceedsStock, true)
})

test('sale line falls back to zero when nothing is selected', () => {
  const line = buildSaleLine({
    medicine: undefined,
    level: undefined,
    quantity: '',
    unitPrice: '',
  })

  assert.equal(line.baseQuantity, 0)
  assert.equal(line.maxUnits, 0)
  assert.equal(line.exceedsStock, false)
  assert.equal(line.total, 0)
})
