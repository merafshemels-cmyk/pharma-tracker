import { BaseRepository } from './baseRepository.js'

export class PharmacyRepository extends BaseRepository {
  constructor() {
    super('pharmacies')
  }

  async getById(pharmacyId) {
    const { data, error } = await this.from()
      .select('*')
      .eq('id', pharmacyId)
      .single()
    if (error) throw error
    return data
  }

  async listForCurrentUser() {
    const { data, error } = await this.from().select('*')
    if (error) throw error
    return data ?? []
  }
}

export class PharmacyMemberRepository extends BaseRepository {
  constructor() {
    super('pharmacy_members')
  }

  async listByPharmacy(pharmacyId) {
    const { data, error } = await this.from()
      .select('*')
      .eq('pharmacy_id', pharmacyId)
    if (error) throw error
    return data ?? []
  }
}
