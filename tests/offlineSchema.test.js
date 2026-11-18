import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  OFFLINE_DB_STORES,
  OFFLINE_DB_VERSION,
  offlineDb,
} from '../src/offline/offlineDb.js'
import { syncContract } from '../src/offline/syncService.js'

test('offline schema upgrade preserves existing stores and adds batches', () => {
  assert.equal(OFFLINE_DB_VERSION, 2)
  assert.equal(offlineDb.verno, 2)

  for (const store of [
    'medicines',
    'pendingSales',
    'pendingPurchases',
    'stockMovements',
    'syncQueue',
    'syncState',
  ]) {
    assert.ok(OFFLINE_DB_STORES[store], `missing existing store ${store}`)
  }

  assert.ok(OFFLINE_DB_STORES.batches.includes('expiryDate'))
  assert.ok(OFFLINE_DB_STORES.stockMovements.includes('purchaseBatchId'))
  assert.ok(
    OFFLINE_DB_STORES.saleBatchAllocations.includes('purchaseBatchId'),
  )
})

test('batch sync contract carries expiry data without claiming client FEFO', () => {
  assert.deepEqual(syncContract.sale.batchAllocation, 'server-fefo')
  assert.ok(syncContract.batch.requiredFields.includes('quantityReceivedBase'))
  assert.ok(syncContract.batch.optionalFields.includes('expiryDate'))
  assert.deepEqual(syncContract.purchase.itemBatchFields, [
    'batchNumber',
    'expiryDate',
  ])
})
