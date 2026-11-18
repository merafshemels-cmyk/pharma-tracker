import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  SYNC_STATUS,
  createPendingSale,
  isSaleConflict,
  syncSaleOperation,
} from '../src/offline/syncService.js'

function fakeSaleRepository({ payload, error } = {}) {
  const calls = []
  return {
    calls,
    async createSaleWithFefo(pharmacyId, sale, items, clientReference) {
      calls.push({ pharmacyId, sale, items, clientReference })
      if (error) throw error
      return payload
    },
  }
}

test('pending sale keeps its client reference for idempotent retries', () => {
  const pending = createPendingSale({
    pharmacyId: 'pharmacy-1',
    clientReference: 'sale-ref-1',
    items: [{ medicineId: 'medicine-1', quantity: 1, unitPrice: 5 }],
    saleDate: '2026-01-01T00:00:00.000Z',
  })

  assert.equal(pending.status, SYNC_STATUS.PENDING)
  assert.equal(pending.clientReference, 'sale-ref-1')
  assert.equal(pending.attempts, 0)
  assert.equal(pending.serverSaleId, null)
})

test('pending sale requires a pharmacy and at least one item', () => {
  assert.throws(
    () => createPendingSale({ pharmacyId: null, items: [] }),
    /pharmacyId/,
  )
  assert.throws(
    () => createPendingSale({ pharmacyId: 'pharmacy-1', items: [] }),
    /items/,
  )
})

test('sale sync marks synced only after server confirmation', async () => {
  const repository = fakeSaleRepository({
    payload: { sale: { id: 'sale-1' }, items: [], allocations: [] },
  })
  const saved = []
  const operation = createPendingSale({
    pharmacyId: 'pharmacy-1',
    clientReference: 'sale-ref-1',
    items: [{ medicineId: 'medicine-1', quantity: 2, unitPrice: 5 }],
  })

  const result = await syncSaleOperation(operation, repository, {
    save: async (value) => {
      saved.push(value)
      return value
    },
  })

  assert.equal(result.status, SYNC_STATUS.SYNCED)
  assert.equal(result.serverSaleId, 'sale-1')
  assert.equal(result.attempts, 1)
  assert.deepEqual(
    saved.map((value) => value.status),
    [SYNC_STATUS.SYNCING, SYNC_STATUS.SYNCED],
  )
  assert.deepEqual(repository.calls, [
    {
      pharmacyId: 'pharmacy-1',
      sale: { saleDate: null, notes: null },
      items: [{ medicineId: 'medicine-1', quantity: 2, unitPrice: 5 }],
      clientReference: 'sale-ref-1',
    },
  ])
})

test('a FEFO conflict is marked as a conflict, not failed', async () => {
  const conflict = Object.assign(
    new Error('FEFO_CONFLICT: insufficient unexpired batch stock'),
    { code: 'PT409' },
  )
  const repository = fakeSaleRepository({ error: conflict })
  const saved = []
  const operation = createPendingSale({
    pharmacyId: 'pharmacy-1',
    clientReference: 'sale-ref-conflict',
    items: [{ medicineId: 'medicine-1', quantity: 100, unitPrice: 5 }],
  })

  const result = await syncSaleOperation(operation, repository, {
    save: async (value) => {
      saved.push(value)
      return value
    },
  })

  assert.equal(isSaleConflict(conflict), true)
  assert.equal(result.status, SYNC_STATUS.CONFLICT)
  assert.match(result.lastError, /FEFO_CONFLICT/)
  assert.equal(result.attempts, 1)
  assert.deepEqual(
    saved.map((value) => value.status),
    [SYNC_STATUS.SYNCING, SYNC_STATUS.CONFLICT],
  )
})

test('a network failure is retryable and reuses the same client reference', async () => {
  const networkError = new Error('network unavailable')
  const failedRepository = fakeSaleRepository({ error: networkError })
  const retryRepository = fakeSaleRepository({
    payload: { sale: { id: 'sale-retry' } },
  })
  const operation = createPendingSale({
    pharmacyId: 'pharmacy-1',
    clientReference: 'sale-ref-retry',
    items: [{ medicineId: 'medicine-1', quantity: 1, unitPrice: 5 }],
  })
  const save = async (value) => value

  const failed = await syncSaleOperation(operation, failedRepository, { save })
  const retried = await syncSaleOperation(failed, retryRepository, { save })

  assert.equal(failed.status, SYNC_STATUS.FAILED)
  assert.equal(failed.lastError, 'network unavailable')
  assert.equal(retried.status, SYNC_STATUS.SYNCED)
  assert.equal(retried.attempts, 2)
  assert.equal(failedRepository.calls[0].clientReference, 'sale-ref-retry')
  assert.equal(retryRepository.calls[0].clientReference, 'sale-ref-retry')
})
