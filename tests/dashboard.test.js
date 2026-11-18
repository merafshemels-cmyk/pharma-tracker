import { test } from 'vitest'
import assert from 'node:assert/strict'
import { buildDashboardCards } from '../src/utils/dashboard.js'
import { formatETB } from '../src/utils/format.js'

const now = new Date(2026, 4, 14, 12, 0, 0)

test('dashboard exposes exactly four shared cards with detail routes', () => {
  const cards = buildDashboardCards({ now })

  assert.deepEqual(
    cards.map((card) => card.label),
    ['Total Medicines', "Today's Sales", 'Low Stock', 'Expiry Alerts'],
  )
  assert.deepEqual(
    cards.map((card) => card.route),
    ['inventory', 'sales', 'inventory', 'expiry'],
  )
  assert.deepEqual(cards[1].params, { period: 'today' })
  assert.deepEqual(cards[2].params, { filter: 'low' })
})

test('empty pharmacy shows zero values and helpful messages', () => {
  const cards = buildDashboardCards({ now })

  assert.equal(cards[0].value, '0')
  assert.equal(cards[1].value, formatETB(0))
  assert.equal(cards[2].value, '0')
  assert.equal(cards[3].value, '0')
  assert.match(cards[0].hint, /No medicines/)
  assert.match(cards[1].hint, /No sales recorded today/)
  assert.match(cards[2].hint, /above their threshold/)
  assert.match(cards[3].hint, /No expired or soon-to-expire batches/)
})

test('dashboard counts real medicines, today sales, low stock, and expiry', () => {
  const medicines = [
    { id: 'm1', dosageForm: 'Tablet', stock: 5, lowStockThreshold: 10 },
    { id: 'm2', dosageForm: 'Syrup', stock: 100, lowStockThreshold: 10 },
    { id: 'm3', dosageForm: 'Tablet', stock: 0, lowStockThreshold: 10 },
  ]
  const transactions = [
    { id: 't1', type: 'sale', date: '2026-05-14T09:00:00', total: 120, quantity: 2 },
    { id: 't2', type: 'sale', date: '2026-05-13T09:00:00', total: 999, quantity: 1 },
    { id: 't3', type: 'purchase', date: '2026-05-14T10:00:00', total: 5000, quantity: 50 },
  ]
  const batches = [
    {
      id: 'b1',
      expiryDate: '2026-06-01',
      quantityRemainingBase: 10,
    },
    {
      id: 'b2',
      expiryDate: '2027-01-01',
      quantityRemainingBase: 10,
    },
    {
      id: 'b3',
      expiryDate: '2026-06-01',
      quantityRemainingBase: 0,
    },
    {
      id: 'b4',
      expiryDate: '2026-04-01',
      quantityRemainingBase: 4,
    },
  ]

  const cards = buildDashboardCards({ medicines, transactions, batches, now })

  assert.equal(cards[0].value, '3')
  assert.equal(cards[1].value, formatETB(120))
  assert.equal(cards[2].value, '2')
  assert.equal(cards[3].value, '2')
  assert.match(cards[3].hint, /1 expired · 1 expiring within 90 days/)
})
