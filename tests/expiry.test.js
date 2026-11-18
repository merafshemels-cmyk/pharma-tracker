import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  EXPIRY_WINDOW_DAYS,
  expiryStatus,
  isExpiredBatch,
  isExpiringBatch,
} from '../src/utils/expiry.js'

const now = new Date(2026, 4, 14, 12, 0, 0)

test('expiring batches exclude already-expired and depleted batches', () => {
  assert.equal(
    isExpiringBatch(
      { expiryDate: '2026-06-01', quantityRemainingBase: 5 },
      EXPIRY_WINDOW_DAYS,
      now,
    ),
    true,
  )
  assert.equal(
    isExpiringBatch(
      { expiryDate: '2026-04-01', quantityRemainingBase: 5 },
      EXPIRY_WINDOW_DAYS,
      now,
    ),
    false,
  )
  assert.equal(
    isExpiringBatch(
      { expiryDate: '2026-06-01', quantityRemainingBase: 0 },
      EXPIRY_WINDOW_DAYS,
      now,
    ),
    false,
  )
})

test('expired batches are detected separately', () => {
  assert.equal(
    isExpiredBatch({ expiryDate: '2026-04-01', quantityRemainingBase: 5 }, now),
    true,
  )
  assert.equal(
    isExpiredBatch({ expiryDate: '2026-06-01', quantityRemainingBase: 5 }, now),
    false,
  )
  assert.equal(
    isExpiredBatch({ expiryDate: '2026-04-01', quantityRemainingBase: 0 }, now),
    false,
  )
})

test('expiry status reports expired and upcoming dates', () => {
  assert.equal(
    expiryStatus({ expiryDate: '2026-04-01' }, now).tone,
    'out',
  )
  assert.equal(
    expiryStatus({ expiryDate: '2026-05-20' }, now).tone,
    'low',
  )
  assert.equal(
    expiryStatus({ expiryDate: '2027-05-20' }, now).tone,
    'ok',
  )
})
