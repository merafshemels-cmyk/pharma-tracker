import Dexie from 'dexie'

export const OFFLINE_DB_VERSION = 2

const OFFLINE_DB_STORES_V1 = {
  medicines: 'id, pharmacyId, name, updatedAt',
  pendingSales: 'id, pharmacyId, clientReference, status, createdAt',
  pendingPurchases: 'id, pharmacyId, clientReference, status, createdAt',
  stockMovements: 'id, pharmacyId, medicineId, createdAt',
  syncQueue: 'id, pharmacyId, entityType, status, createdAt',
  syncState: 'key',
}

export const OFFLINE_DB_STORES = {
  ...OFFLINE_DB_STORES_V1,
  batches:
    'id, pharmacyId, medicineId, expiryDate, purchaseId, purchaseItemId, updatedAt',
  stockMovements: 'id, pharmacyId, medicineId, purchaseBatchId, createdAt',
  saleBatchAllocations:
    'id, pharmacyId, saleItemId, purchaseBatchId, createdAt',
}

export const offlineDb = new Dexie('pharmatrack-offline')

offlineDb.version(1).stores(OFFLINE_DB_STORES_V1)
offlineDb.version(2).stores(OFFLINE_DB_STORES)

export async function clearOfflinePharmacyData(pharmacyId) {
  await offlineDb.medicines.where('pharmacyId').equals(pharmacyId).delete()
  await offlineDb.pendingSales.where('pharmacyId').equals(pharmacyId).delete()
  await offlineDb.pendingPurchases.where('pharmacyId').equals(pharmacyId).delete()
  await offlineDb.stockMovements.where('pharmacyId').equals(pharmacyId).delete()
  await offlineDb.batches.where('pharmacyId').equals(pharmacyId).delete()
  await offlineDb.saleBatchAllocations.where('pharmacyId').equals(pharmacyId).delete()
  await offlineDb.syncQueue.where('pharmacyId').equals(pharmacyId).delete()
}
