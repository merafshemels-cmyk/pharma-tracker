import { BaseRepository } from './baseRepository.js'

function toSaleItemPayload(item) {
  const payload = {
    medicineId: item.medicineId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }

  if (item.packagingUnitId) {
    payload.packagingUnitId = item.packagingUnitId
  } else {
    payload.unit = item.unit
  }

  return payload
}

export class SaleRepository extends BaseRepository {
  constructor() {
    super('sales')
  }

  async createSaleWithFefo(pharmacyId, sale, items, clientReference) {
    const { data, error } = await this.client().rpc('create_sale_with_fefo', {
      p_pharmacy_id: pharmacyId,
      p_client_reference: clientReference,
      p_items: items.map(toSaleItemPayload),
      p_sale_date: sale.saleDate ?? null,
      p_notes: sale.notes ?? null,
    })
    if (error) throw error
    return data
  }

  async createSaleWithItems(pharmacyId, sale, items, clientReference) {
    return this.createSaleWithFefo(pharmacyId, sale, items, clientReference)
  }

  async listByPharmacy(pharmacyId, { from, to } = {}) {
    let query = this.from()
      .select('*, sale_items(*)')
      .eq('pharmacy_id', pharmacyId)
      .order('sale_date', { ascending: false })
    if (from) query = query.gte('sale_date', from)
    if (to) query = query.lte('sale_date', to)
    const { data, error } = await query
    if (error) throw error
    return data ?? []
  }
}
