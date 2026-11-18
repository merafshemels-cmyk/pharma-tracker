import { priceForLevel, validatePackaging } from './inventory'

export const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Injection pen',
  'Sachet',
  'Cream',
  'Drops',
  'Inhaler',
  'Vial',
  'Other',
]

// Defaults used by both the Inventory form and the Sales quick-add form. The
// base level always contains exactly one base unit so packaging conversions
// keep working with the existing stock ledger.
export function blankMedicineDraft({ name = '' } = {}) {
  return {
    name,
    strength: '',
    dosageForm: 'Tablet',
    baseUnit: 'tablet',
    lowStockThreshold: '100',
    openingStock: '0',
    packaging: [
      { unit: 'tablet', contains: 1, price: '' },
      { unit: 'strip', contains: 10, price: '' },
      { unit: 'box', contains: 100, price: '' },
      { unit: 'carton', contains: 1000, price: '' },
    ],
  }
}

export function medicineToDraft(medicine) {
  return {
    name: medicine.name,
    strength: medicine.strength,
    dosageForm: medicine.dosageForm,
    baseUnit: medicine.baseUnit,
    lowStockThreshold: String(medicine.lowStockThreshold),
    openingStock: '0',
    packaging: medicine.packaging.map((level) => ({
      ...level,
      price: String(priceForLevel(medicine, level)),
    })),
  }
}

export function normalizeMedicineDraft(draft) {
  return {
    name: String(draft.name ?? '').trim(),
    strength: String(draft.strength ?? '').trim(),
    dosageForm: draft.dosageForm ?? 'Tablet',
    baseUnit: String(draft.baseUnit ?? '').trim(),
    lowStockThreshold: Number(draft.lowStockThreshold),
    openingStock: Number(draft.openingStock),
    packaging: (draft.packaging ?? []).map((level) => ({
      unit: String(level.unit ?? '').trim(),
      contains: Number(level.contains),
      price: level.price,
    })),
  }
}

// Exact (case-insensitive) name + strength match. The database enforces the
// same uniqueness, so the UI warns instead of silently merging records.
export function findDuplicateMedicine(
  medicines,
  { name, strength, excludeId } = {},
) {
  const normalizedName = String(name ?? '').trim().toLowerCase()
  const normalizedStrength = String(strength ?? '').trim().toLowerCase()

  if (!normalizedName || !normalizedStrength) return null

  return (
    (medicines ?? []).find((medicine) => {
      if (excludeId && medicine.id === excludeId) return false
      return (
        String(medicine.name ?? '').trim().toLowerCase() === normalizedName &&
        String(medicine.strength ?? '').trim().toLowerCase() ===
          normalizedStrength
      )
    }) ?? null
  )
}

export function validateMedicineDraft(
  draft,
  {
    mode = 'add',
    medicines = [],
    excludeId,
    requirePositivePrice = false,
  } = {},
) {
  const normalized = normalizeMedicineDraft(draft)
  const fieldErrors = {}

  if (!normalized.name) {
    fieldErrors.name = 'Medicine name is required.'
  }
  if (!normalized.strength) {
    fieldErrors.strength = 'Strength is required (for example, 500 mg).'
  }
  if (!normalized.baseUnit) {
    fieldErrors.baseUnit = 'Base unit is required (for example, tablet).'
  }
  if (
    !Number.isInteger(normalized.lowStockThreshold) ||
    normalized.lowStockThreshold < 0
  ) {
    fieldErrors.lowStockThreshold =
      'Threshold must be a whole number, 0 or more.'
  }
  if (
    mode === 'add' &&
    (!Number.isInteger(normalized.openingStock) || normalized.openingStock < 0)
  ) {
    fieldErrors.openingStock = 'Opening stock must be a whole number, 0 or more.'
  }

  const packagingErrors = validatePackaging(
    normalized.packaging,
    normalized.baseUnit,
  )

  if (requirePositivePrice) {
    const baseLevel = normalized.packaging.find(
      (level) => level.contains === 1,
    )
    if (!baseLevel || !(Number(baseLevel.price) > 0)) {
      packagingErrors.push(
        `Enter a selling price greater than zero for 1 ${normalized.baseUnit || 'base unit'}.`,
      )
    }
  }

  const duplicate = findDuplicateMedicine(medicines, {
    name: normalized.name,
    strength: normalized.strength,
    excludeId: excludeId ?? (mode === 'edit' ? draft.id : undefined),
  })

  return {
    fieldErrors,
    packagingErrors: [...new Set(packagingErrors)],
    duplicate,
    valid:
      Object.keys(fieldErrors).length === 0 &&
      packagingErrors.length === 0 &&
      !duplicate,
  }
}

export function buildMedicineInput(draft) {
  const normalized = normalizeMedicineDraft(draft)
  const packaging = normalized.packaging.map((level) => ({
    ...level,
    price: Number(level.price),
  }))
  const baseLevel = packaging.find((level) => level.contains === 1)

  return {
    name: normalized.name,
    strength: normalized.strength,
    dosageForm: normalized.dosageForm,
    baseUnit: normalized.baseUnit,
    sellingPrice: baseLevel ? baseLevel.price : 0,
    lowStockThreshold: normalized.lowStockThreshold,
    packaging,
  }
}

// Opening stock is always expressed in base units and recorded through the
// existing stock_movements path by the workspace service.
export function buildNewMedicineInput(draft) {
  const normalized = normalizeMedicineDraft(draft)
  return {
    ...buildMedicineInput(draft),
    stock: normalized.openingStock,
  }
}

// Production medicine creation writes straight to Supabase. The existing
// offline queue only covers sales and purchases, so production creation is
// blocked with a clear message while local mode keeps working offline.
export function medicineCreateBlockedReason({ isLocal, online } = {}) {
  if (isLocal) return ''
  if (online === false) {
    return 'You are offline. Adding a medicine needs a connection; your existing records are unchanged.'
  }
  return ''
}
