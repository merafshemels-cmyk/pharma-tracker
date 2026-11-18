import { requireSupabase } from '../lib/supabaseClient'
import { PurchaseRepository } from '../repositories/purchaseRepository'
import { SaleRepository } from '../repositories/saleRepository'
import { createClientReference } from '../offline/syncService'
import { resolveMedicineImageUrl } from './medicineImageService'

function numberOrZero(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapPackaging(row) {
  const prices = row.medicine_prices ?? []
  return [...(row.packaging_units ?? [])]
    .sort((a, b) => a.contains_base_units - b.contains_base_units)
    .map((unit) => {
      const price = prices.find((item) => item.packaging_unit_id === unit.id)
      return {
        id: unit.id,
        unit: unit.unit,
        contains: numberOrZero(unit.contains_base_units),
        price: numberOrZero(price?.price),
      }
    })
}

async function mapMedicine(row) {
  return {
    id: row.id,
    name: row.name,
    strength: row.strength ?? '',
    dosageForm: row.dosage_form ?? '',
    baseUnit: row.base_unit,
    sellingPrice: numberOrZero(row.selling_price),
    lowStockThreshold: numberOrZero(row.low_stock_threshold),
    stock: numberOrZero(row.stock),
    imagePath: row.image_path ?? '',
    imageUrl: await resolveMedicineImageUrl(row.image_path).catch(() => ''),
    packaging: mapPackaging(row),
  }
}

function mapSaleTransactions(sale, medicineById, profileById) {
  const code = sale.client_reference || `SL-${sale.id.slice(0, 8).toUpperCase()}`
  const staff = profileById.get(sale.recorded_by)?.full_name ?? ''

  return (sale.sale_items ?? []).map((item) => {
    const medicine = medicineById.get(item.medicine_id)
    return {
      id: item.id,
      saleId: sale.id,
      code,
      type: 'sale',
      date: sale.sale_date,
      recordedAt: item.created_at,
      medicineId: item.medicine_id,
      medicineName: medicine
        ? `${medicine.name} ${medicine.strength}`.trim()
        : 'Medicine',
      unit: item.unit,
      unitFactor: numberOrZero(item.unit_factor),
      quantity: numberOrZero(item.quantity),
      baseQuantity: numberOrZero(item.base_quantity),
      baseUnit: medicine?.baseUnit ?? '',
      unitPrice: numberOrZero(item.unit_price),
      total: numberOrZero(item.total),
      cogs: numberOrZero(item.cogs),
      costStatus: item.cost_status,
      costedBaseQuantity: numberOrZero(item.costed_base_quantity),
      uncostedBaseQuantity: numberOrZero(item.uncosted_base_quantity),
      staff,
      supplier: '',
      batchNumber: '',
      expiryDate: '',
    }
  })
}

function mapPurchaseTransactions(purchase, medicineById, profileById) {
  const code =
    purchase.client_reference || `PO-${purchase.id.slice(0, 8).toUpperCase()}`
  const staff = profileById.get(purchase.recorded_by)?.full_name ?? ''

  return (purchase.purchase_items ?? []).map((item) => {
    const medicine = medicineById.get(item.medicine_id)
    const batch = item.purchase_batches?.[0]
    return {
      id: item.id,
      purchaseId: purchase.id,
      code,
      type: 'purchase',
      date: purchase.purchase_date,
      recordedAt: item.created_at,
      medicineId: item.medicine_id,
      medicineName: medicine
        ? `${medicine.name} ${medicine.strength}`.trim()
        : 'Medicine',
      unit: item.unit,
      unitFactor: numberOrZero(item.unit_factor),
      quantity: numberOrZero(item.quantity),
      baseQuantity: numberOrZero(item.base_quantity),
      baseUnit: medicine?.baseUnit ?? '',
      unitPrice: numberOrZero(item.unit_cost),
      total: numberOrZero(item.total_cost),
      staff,
      supplier: purchase.supplier_name,
      batchNumber: batch?.batch_number ?? '',
      expiryDate: batch?.expiry_date ?? '',
      purchaseBatchId: batch?.id ?? '',
    }
  })
}

function mapBatch(row) {
  return {
    id: row.id,
    medicineId: row.medicine_id,
    batchNumber: row.batch_number ?? '',
    expiryDate: row.expiry_date ?? '',
    unitCost: numberOrZero(row.unit_cost),
    unitCostBase: numberOrZero(row.unit_cost_base),
    quantityReceivedBase: numberOrZero(row.quantity_received_base),
    quantityRemainingBase: numberOrZero(row.quantity_remaining_base),
    purchaseTransactionId: row.purchase_id ?? '',
    date: row.received_date,
    recordedAt: row.created_at,
    supplier: row.supplier_name ?? '',
  }
}

export async function listPharmacyMembers(pharmacyId) {
  const client = requireSupabase()
  const { data: members, error } = await client
    .from('pharmacy_members')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .order('created_at', { ascending: true })
  if (error) throw error

  const userIds = (members ?? []).map((member) => member.user_id)
  if (userIds.length === 0) return []

  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', userIds)
  if (profileError) throw profileError

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return (members ?? []).map((member) => ({
    id: member.id,
    userId: member.user_id,
    role: member.role,
    status: member.status,
    name: profileById.get(member.user_id)?.full_name ?? '',
    phone: profileById.get(member.user_id)?.phone ?? '',
  }))
}

export async function loadWorkspace(pharmacyId) {
  const client = requireSupabase()
  const [medicineResult, saleResult, purchaseResult, batchResult, members] =
    await Promise.all([
      client
        .from('medicines')
        .select('*, packaging_units(*), medicine_prices(*)')
        .eq('pharmacy_id', pharmacyId)
        .order('name'),
      client
        .from('sales')
        .select('*, sale_items(*)')
        .eq('pharmacy_id', pharmacyId)
        .order('sale_date', { ascending: false }),
      client
        .from('purchases')
        .select('*, purchase_items(*, purchase_batches(*))')
        .eq('pharmacy_id', pharmacyId)
        .order('purchase_date', { ascending: false }),
      client
        .from('purchase_batches')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('expiry_date', { ascending: true, nullsFirst: false }),
      listPharmacyMembers(pharmacyId),
    ])

  for (const result of [medicineResult, saleResult, purchaseResult, batchResult]) {
    if (result.error) throw result.error
  }

  const medicines = await Promise.all(
    (medicineResult.data ?? []).map((row) => mapMedicine(row)),
  )
  const medicineById = new Map(medicines.map((medicine) => [medicine.id, medicine]))
  const profileById = new Map(
    members
      .filter((member) => member.userId)
      .map((member) => [member.userId, { full_name: member.name }]),
  )

  const sales = (saleResult.data ?? []).flatMap((sale) =>
    mapSaleTransactions(sale, medicineById, profileById),
  )
  const purchases = (purchaseResult.data ?? []).flatMap((purchase) =>
    mapPurchaseTransactions(purchase, medicineById, profileById),
  )

  return {
    medicines,
    transactions: [...sales, ...purchases].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    ),
    batches: (batchResult.data ?? []).map(mapBatch),
    members,
  }
}

export async function createMedicine(pharmacyId, input) {
  const client = requireSupabase()
  const openingStock = Number.isInteger(input.stock) ? input.stock : 0
  // The medicines stock guard requires new rows to start at zero; opening
  // stock is applied by the stock_movements trigger below.
  const { data: medicine, error } = await client
    .from('medicines')
    .insert({
      pharmacy_id: pharmacyId,
      name: input.name,
      strength: input.strength,
      dosage_form: input.dosageForm,
      base_unit: input.baseUnit,
      selling_price: input.sellingPrice,
      low_stock_threshold: input.lowStockThreshold,
      stock: 0,
    })
    .select()
    .single()
  if (error) throw error

  try {
    const unitRows = input.packaging.map((level) => ({
      pharmacy_id: pharmacyId,
      medicine_id: medicine.id,
      unit: level.unit,
      contains_base_units: level.contains,
    }))
    const { data: units, error: unitError } = await client
      .from('packaging_units')
      .insert(unitRows)
      .select()
    if (unitError) throw unitError

    const unitByLabel = new Map((units ?? []).map((unit) => [unit.unit, unit.id]))
    const priceRows = input.packaging
      .map((level) => ({
        pharmacy_id: pharmacyId,
        medicine_id: medicine.id,
        packaging_unit_id: unitByLabel.get(level.unit),
        price: level.price,
      }))
      .filter((row) => row.packaging_unit_id)
    const { error: priceError } = await client
      .from('medicine_prices')
      .insert(priceRows)
    if (priceError) throw priceError

    if (openingStock > 0) {
      const { error: movementError } = await client
        .from('stock_movements')
        .insert({
          pharmacy_id: pharmacyId,
          medicine_id: medicine.id,
          movement_type: 'opening',
          quantity_base: openingStock,
          reason: 'Opening stock',
        })
      if (movementError) throw movementError
    }

    return { ...medicine, stock: openingStock }
  } catch (error) {
    await client
      .from('medicines')
      .delete()
      .eq('pharmacy_id', pharmacyId)
      .eq('id', medicine.id)
    throw error
  }
}

export async function updateMedicine(pharmacyId, medicineId, input) {
  const client = requireSupabase()
  const { error } = await client
    .from('medicines')
    .update({
      name: input.name,
      strength: input.strength,
      dosage_form: input.dosageForm,
      base_unit: input.baseUnit,
      selling_price: input.sellingPrice,
      low_stock_threshold: input.lowStockThreshold,
    })
    .eq('pharmacy_id', pharmacyId)
    .eq('id', medicineId)
  if (error) throw error

  const { data: existingUnits, error: existingError } = await client
    .from('packaging_units')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .eq('medicine_id', medicineId)
  if (existingError) throw existingError

  const existingByLabel = new Map(
    (existingUnits ?? []).map((unit) => [unit.unit.toLowerCase(), unit]),
  )
  const keptIds = new Set()

  for (const level of input.packaging) {
    const existing = existingByLabel.get(level.unit.toLowerCase())
    if (existing) {
      keptIds.add(existing.id)
      const { error: updateError } = await client
        .from('packaging_units')
        .update({ contains_base_units: level.contains })
        .eq('pharmacy_id', pharmacyId)
        .eq('id', existing.id)
      if (updateError) throw updateError

      const { error: priceError } = await client
        .from('medicine_prices')
        .upsert(
          {
            pharmacy_id: pharmacyId,
            medicine_id: medicineId,
            packaging_unit_id: existing.id,
            price: level.price,
          },
          { onConflict: 'medicine_id,packaging_unit_id' },
        )
      if (priceError) throw priceError
    } else {
      const { data: inserted, error: insertError } = await client
        .from('packaging_units')
        .insert({
          pharmacy_id: pharmacyId,
          medicine_id: medicineId,
          unit: level.unit,
          contains_base_units: level.contains,
        })
        .select()
        .single()
      if (insertError) throw insertError
      keptIds.add(inserted.id)

      const { error: priceError } = await client
        .from('medicine_prices')
        .insert({
          pharmacy_id: pharmacyId,
          medicine_id: medicineId,
          packaging_unit_id: inserted.id,
          price: level.price,
        })
      if (priceError) throw priceError
    }
  }

  const removedIds = (existingUnits ?? [])
    .filter((unit) => !keptIds.has(unit.id))
    .map((unit) => unit.id)
  if (removedIds.length > 0) {
    const { error: removeError } = await client
      .from('packaging_units')
      .delete()
      .eq('pharmacy_id', pharmacyId)
      .in('id', removedIds)
    if (removeError) throw removeError
  }
}

export async function updatePharmacy(pharmacyId, updates) {
  const client = requireSupabase()
  const { error } = await client
    .from('pharmacies')
    .update({
      name: updates.name,
      location: updates.location,
      phone: updates.phone,
    })
    .eq('id', pharmacyId)
  if (error) throw error
}

export async function updateProfile(userId, updates) {
  const client = requireSupabase()
  const { error } = await client.from('profiles').upsert({
    id: userId,
    full_name: updates.name,
    phone: updates.phone,
  })
  if (error) throw error
}

export async function updatePharmacyMember(pharmacyId, memberId, updates) {
  const client = requireSupabase()
  const payload = {}
  if (updates.role) payload.role = updates.role
  if (updates.status) payload.status = updates.status
  const { error } = await client
    .from('pharmacy_members')
    .update(payload)
    .eq('pharmacy_id', pharmacyId)
    .eq('id', memberId)
  if (error) throw error
}

export async function recordSale(pharmacyId, { medicineId, level, quantity, unitPrice }) {
  const repository = new SaleRepository()
  return repository.createSaleWithFefo(
    pharmacyId,
    { saleDate: new Date().toISOString() },
    [
      {
        medicineId,
        packagingUnitId: level.id,
        quantity,
        unitPrice,
      },
    ],
    createClientReference('sale'),
  )
}

export async function recordPurchase(
  pharmacyId,
  { medicineId, level, quantity, unitCost, supplier, date, batchNumber, expiryDate },
) {
  const repository = new PurchaseRepository()
  return repository.createPurchaseWithBatches(
    pharmacyId,
    {
      supplierName: supplier,
      purchaseDate: date ? new Date(`${date}T12:00:00`).toISOString() : null,
    },
    [
      {
        medicineId,
        packagingUnitId: level.id,
        quantity,
        unitCost,
        batchNumber,
        expiryDate,
      },
    ],
    createClientReference('purchase'),
  )
}

// Bulk import creates one transactional purchase per supplier group. The RPC
// is idempotent through the client reference, so retrying the same file never
// duplicates batches or stock movements.
export async function recordBulkPurchase(
  pharmacyId,
  { supplierName, purchaseDate, items, clientReference },
) {
  const repository = new PurchaseRepository()
  return repository.createPurchaseWithBatches(
    pharmacyId,
    {
      supplierName,
      purchaseDate: purchaseDate ?? new Date().toISOString(),
    },
    items,
    clientReference,
  )
}

// Used only to roll back a medicine that this import just created when its
// purchase could not be recorded. It is not exposed to the UI.
export async function deleteMedicine(pharmacyId, medicineId) {
  const client = requireSupabase()
  const { error } = await client
    .from('medicines')
    .delete()
    .eq('pharmacy_id', pharmacyId)
    .eq('id', medicineId)
  if (error) throw error
}
