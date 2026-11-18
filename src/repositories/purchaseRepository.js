import { BaseRepository } from './baseRepository.js'

function toPurchaseItemPayload(item) {
  const payload = {
    medicineId: item.medicineId,
    quantity: item.quantity,
    unitCost: item.unitCost,
    batchNumber: item.batchNumber ?? null,
    expiryDate: item.expiryDate ?? null,
  }

  if (item.packagingUnitId) {
    payload.packagingUnitId = item.packagingUnitId
  } else {
    payload.unit = item.unit
  }

  return payload
}

export class PurchaseRepository extends BaseRepository {
  constructor() {
    super('purchases')
  }

  async createPurchaseWithBatches(pharmacyId, purchase, items, clientReference) {
    const { data, error } = await this.client().rpc(
      'create_purchase_with_batches',
      {
        p_pharmacy_id: pharmacyId,
        p_client_reference: clientReference,
        p_items: items.map(toPurchaseItemPayload),
        p_supplier_name: purchase.supplierName,
        p_supplier_id: purchase.supplierId ?? null,
        p_purchase_date: purchase.purchaseDate ?? null,
        p_notes: purchase.notes ?? null,
      },
    )
    if (error) throw error
    return data
  }

  async createPurchaseWithItems(pharmacyId, purchase, items, clientReference) {
    return this.createPurchaseWithBatches(pharmacyId, purchase, items, clientReference)
  }
}
