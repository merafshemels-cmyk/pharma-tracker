import { offlineDb } from './offlineDb.js'

// Offline-to-cloud synchronization foundation.
// Screens are not connected to this yet; this module defines the contract and
// idempotent operation shape used by future repository calls.

export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed',
  CONFLICT: 'conflict',
}

export function createClientReference(prefix = 'op') {
  return `${prefix}-${crypto.randomUUID()}`
}

export function createPendingOperation(entityType, payload, pharmacyId) {
  return {
    id: crypto.randomUUID(),
    pharmacyId,
    entityType,
    payload,
    status: SYNC_STATUS.PENDING,
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function markOperationStatus(operation, status, error = null) {
  return {
    ...operation,
    status,
    lastError: error ? String(error.message || error) : null,
    updatedAt: new Date().toISOString(),
  }
}

export function createPendingSale({
  pharmacyId,
  items,
  saleDate = null,
  notes = null,
  clientReference = createClientReference('sale'),
}) {
  if (!pharmacyId) {
    throw new Error('pharmacyId is required to queue a sale')
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('items are required to queue a sale')
  }

  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    pharmacyId,
    clientReference,
    items,
    saleDate,
    notes,
    status: SYNC_STATUS.PENDING,
    attempts: 0,
    lastError: null,
    serverSaleId: null,
    serverPayload: null,
    createdAt: now,
    updatedAt: now,
  }
}

export async function savePendingSale(operation) {
  await offlineDb.pendingSales.put(operation)
  await offlineDb.syncQueue.put({
    id: operation.id,
    pharmacyId: operation.pharmacyId,
    entityType: 'sale',
    clientReference: operation.clientReference,
    status: operation.status,
    attempts: operation.attempts,
    lastError: operation.lastError,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
  })
  return operation
}

export async function queuePendingSale(input) {
  const pending = createPendingSale(input)
  const existing = await offlineDb.pendingSales
    .where('clientReference')
    .equals(pending.clientReference)
    .first()
  if (existing) return existing
  return savePendingSale(pending)
}

export function isSaleConflict(error) {
  const code = error?.code ?? error?.details?.code
  const message = String(error?.message ?? '')
  return code === 'PT409' || message.includes('FEFO_CONFLICT')
}

export async function syncSaleOperation(
  operation,
  saleRepository,
  { save = savePendingSale } = {},
) {
  const syncing = await markOperationStatus(
    {
      ...operation,
      attempts: (operation.attempts ?? 0) + 1,
    },
    SYNC_STATUS.SYNCING,
  )
  await save(syncing)

  try {
    const payload = await saleRepository.createSaleWithFefo(
      syncing.pharmacyId,
      {
        saleDate: syncing.saleDate,
        notes: syncing.notes,
      },
      syncing.items,
      syncing.clientReference,
    )
    const synced = await markOperationStatus(
      {
        ...syncing,
        serverSaleId: payload?.sale?.id ?? null,
        serverPayload: payload ?? null,
      },
      SYNC_STATUS.SYNCED,
    )
    await save(synced)
    return synced
  } catch (error) {
    const failed = await markOperationStatus(
      syncing,
      isSaleConflict(error) ? SYNC_STATUS.CONFLICT : SYNC_STATUS.FAILED,
      error,
    )
    await save(failed)
    return failed
  }
}

export const syncPendingSale = syncSaleOperation

export async function flushPendingSales(saleRepository, { pharmacyId } = {}) {
  const operations = await offlineDb.pendingSales.toArray()
  const candidates = operations.filter(
    (operation) =>
      (!pharmacyId || operation.pharmacyId === pharmacyId) &&
      (operation.status === SYNC_STATUS.PENDING ||
        operation.status === SYNC_STATUS.SYNCING ||
        operation.status === SYNC_STATUS.FAILED),
  )

  const results = []
  for (const operation of candidates) {
    results.push(await syncSaleOperation(operation, saleRepository))
  }
  return results
}

// Implementations must be idempotent: retrying the same clientReference must not
// create duplicate sales or purchases. Server-side unique constraints enforce this.
// Expiry is batch-level data. Offline batches are a cache of purchase_batches;
// stock_movements and the server-side FEFO allocator remain authoritative.
export const syncContract = {
  sale: {
    requiredFields: ['pharmacyId', 'clientReference', 'items'],
    idempotencyKey: 'clientReference',
    batchAllocation: 'server-fefo',
  },
  purchase: {
    requiredFields: ['pharmacyId', 'clientReference', 'items'],
    idempotencyKey: 'clientReference',
    itemBatchFields: ['batchNumber', 'expiryDate'],
  },
  batch: {
    requiredFields: [
      'pharmacyId',
      'medicineId',
      'quantityReceivedBase',
      'quantityRemainingBase',
    ],
    optionalFields: [
      'purchaseId',
      'purchaseItemId',
      'batchNumber',
      'expiryDate',
      'unitCost',
      'unitCostBase',
      'supplierName',
      'receivedDate',
    ],
    idempotencyKey: 'id',
  },
}
