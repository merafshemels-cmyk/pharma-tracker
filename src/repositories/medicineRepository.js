import { BaseRepository } from './baseRepository.js'

export class MedicineRepository extends BaseRepository {
  constructor() {
    super('medicines')
  }

  async listByPharmacy(pharmacyId) {
    const { data, error } = await this.from()
      .select('*, packaging_units(*), medicine_prices(*)')
      .eq('pharmacy_id', pharmacyId)
      .order('name')
    if (error) throw error
    return data ?? []
  }

  async create(pharmacyId, medicine) {
    const { data, error } = await this.from()
      .insert({ ...medicine, pharmacy_id: pharmacyId })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(pharmacyId, medicineId, updates) {
    const { data, error } = await this.from()
      .update(updates)
      .eq('pharmacy_id', pharmacyId)
      .eq('id', medicineId)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
