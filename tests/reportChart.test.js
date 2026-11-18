import { test } from 'vitest'
import assert from 'node:assert/strict'
import { buildReportSeries } from '../src/utils/reportChart.js'

const transactions = [
  { type: 'sale', date: '2026-05-14T09:15:00', total: 120 },
  { type: 'sale', date: '2026-05-14T21:30:00', total: 80 },
  { type: 'purchase', date: '2026-05-14T10:00:00', total: 500 },
  { type: 'purchase', date: '2026-05-12T10:00:00', total: 250 },
  { type: 'sale', date: '2026-04-02T10:00:00', total: 999 },
]

test('Month produces one daily bucket per day with day labels', () => {
  const series = buildReportSeries(transactions, {
    from: '2026-05-01',
    to: '2026-05-31',
    period: 'month',
  })
  assert.equal(series.length, 31)
  assert.equal(series[0].key, '2026-05-01')
  assert.equal(series[0].label, '1')
  assert.equal(series[13].sales, 200)
  assert.equal(series[13].purchases, 500)
  assert.equal(series[11].purchases, 250)
  assert.equal(series.reduce((sum, bucket) => sum + bucket.sales, 0), 200)
  assert.equal(series.reduce((sum, bucket) => sum + bucket.purchases, 0), 750)
})

test('monthly bucket key for a month range still matches the full range', () => {
  const series = buildReportSeries(transactions, {
    from: '2026-04-01',
    to: '2026-04-30',
    period: 'month',
  })
  assert.equal(series.length, 30)
  assert.equal(series[1].sales, 999)
})

test('Quarter produces three monthly buckets', () => {
  const series = buildReportSeries(transactions, {
    from: '2026-04-01',
    to: '2026-06-30',
    period: 'quarter',
    language: 'en',
  })
  assert.equal(series.length, 3)
  assert.deepEqual(
    series.map((bucket) => bucket.label),
    ['Apr', 'May', 'Jun'],
  )
  assert.equal(series[0].sales, 999)
  assert.equal(series[1].purchases, 750)
  assert.equal(series[2].sales, 0)
})

test('Year produces twelve monthly buckets with translated labels', () => {
  const series = buildReportSeries(transactions, {
    from: '2026-01-01',
    to: '2026-12-31',
    period: 'year',
    language: 'en',
  })
  assert.equal(series.length, 12)
  assert.equal(series[0].label, 'Jan')
  assert.equal(series[11].label, 'Dec')
  assert.equal(series[3].sales, 999)
  assert.equal(series[4].sales, 200)
  assert.equal(series[4].purchases, 750)
})

test('an empty range produces no buckets', () => {
  const series = buildReportSeries(transactions, {
    from: '',
    to: '',
  })
  assert.deepEqual(series, [])
})
