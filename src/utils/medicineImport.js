import { findDuplicateMedicine } from './medicineDraft'
import { nextTransactionCode, normalizeMedicine } from './inventory'
import { roundMoney } from './format'
import {
  IMPORT_COLUMNS,
  IMPORT_HISTORY_KEY,
  IMPORT_HISTORY_LIMIT,
  IMPORT_MAX_ROWS,
  IMPORT_STATUS,
  canonicalDosageForm,
  findHeaderRow,
  mapImportHeaders,
  packagingPrice,
  validateImportFile,
} from './medicineImportConfig'

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

const HEADER_BY_KEY = Object.fromEntries(
  IMPORT_COLUMNS.map((column) => [column.key, column.header]),
)

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function dateFromParts(year, month, day) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return { error: 'invalidDate' }
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { error: 'invalidDate' }
  }

  return { value: `${year}-${pad(month)}-${pad(day)}` }
}

function dateFromObject(value) {
  if (Number.isNaN(value.getTime())) return { error: 'invalidDate' }

  // SheetJS can return either a local-midnight Date or a UTC-midnight Date
  // depending on how the workbook stored the cell. Prefer UTC when the time is
  // exactly midnight in UTC so the calendar date never shifts.
  const utcMidnight =
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0

  if (utcMidnight) {
    return dateFromParts(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    )
  }

  return dateFromParts(
    value.getFullYear(),
    value.getMonth() + 1,
    value.getDate(),
  )
}

function dateFromExcelSerial(serial) {
  const date = new Date(
    Date.UTC(1899, 11, 30) + Math.round(Number(serial)) * 86400000,
  )
  return dateFromParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  )
}

// The template documents ISO dates (YYYY-MM-DD). Day-first dates (DD/MM/YYYY)
// and Excel date cells are also accepted so spreadsheets edited by hand work.
export function parseImportDate(value) {
  if (value instanceof Date) return dateFromObject(value)

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 0) return { error: 'invalidDate' }
    return dateFromExcelSerial(value)
  }

  const text = String(value ?? '').trim()
  if (!text) return { value: '' }

  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/)
  if (match) {
    return dateFromParts(Number(match[1]), Number(match[2]), Number(match[3]))
  }

  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (match) {
    return dateFromParts(Number(match[3]), Number(match[2]), Number(match[1]))
  }

  match = text.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/)
  if (match) {
    const month = MONTHS[match[2].slice(0, 3).toLowerCase()]
    if (month) {
      return dateFromParts(Number(match[3]), month, Number(match[1]))
    }
  }

  if (/^\d{5}$/.test(text)) return dateFromExcelSerial(Number(text))

  return { error: 'invalidDate' }
}

function parseMoney(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { ok: false, blank: true, value: 0 }
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return { ok: false, blank: false, value: 0 }
    }
    return { ok: true, blank: false, value: roundMoney(value) }
  }

  const cleaned = String(value).replace(/[^0-9.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
    return { ok: false, blank: false, value: 0 }
  }

  const number = Number(cleaned)
  if (!Number.isFinite(number) || number < 0) {
    return { ok: false, blank: false, value: 0 }
  }

  return { ok: true, blank: false, value: roundMoney(number) }
}

function parseWholeNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { ok: true, value: defaultValue }
  }

  const cleaned = String(value).replace(/,/g, '').trim()
  if (!/^\d+$/.test(cleaned)) return { ok: false, value: defaultValue }

  const number = Number(cleaned)
  if (!Number.isSafeInteger(number)) return { ok: false, value: defaultValue }

  return { ok: true, value: number }
}

export function parsePackagingSpec(value, { baseUnit, sellingPrice }) {
  const base = {
    unit: baseUnit,
    contains: 1,
    price: roundMoney(Number(sellingPrice) || 0),
  }
  const text = String(value ?? '').trim()
  if (!text) return { levels: [base], errors: [] }

  const errors = []
  const levels = []
  const seen = new Set([String(baseUnit).toLowerCase()])
  const parts = text
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean)

  parts.forEach((part) => {
    const match = part.match(
      /^(.+?)\s*=\s*(\d+)\s*(?:@\s*([0-9]+(?:\.[0-9]{1,2})?))?$/,
    )

    if (!match) {
      errors.push({ code: 'packagingInvalid', params: { value: part } })
      return
    }

    const unit = match[1].trim()
    const contains = Number(match[2])
    const priceText = match[3]

    if (!unit || seen.has(unit.toLowerCase())) {
      errors.push({ code: 'packagingDuplicate', params: { unit } })
      return
    }
    seen.add(unit.toLowerCase())

    if (!Number.isInteger(contains) || contains <= 1) {
      errors.push({ code: 'packagingContains', params: { unit } })
      return
    }

    let price
    if (priceText !== undefined) {
      price = Number(priceText)
      if (!Number.isFinite(price) || price < 0) {
        errors.push({ code: 'packagingPrice', params: { unit } })
        return
      }
    } else {
      price = packagingPrice(contains, sellingPrice)
    }

    levels.push({ unit, contains, price: roundMoney(price) })
  })

  levels.sort((a, b) => a.contains - b.contains)

  for (let index = 1; index < levels.length; index += 1) {
    if (levels[index].contains <= levels[index - 1].contains) {
      errors.push({
        code: 'packagingOrder',
        params: { unit: levels[index].unit },
      })
    }
  }

  return { levels: [base, ...levels], errors }
}

export function validateImportRow(
  raw,
  { existingMedicines = [], today = todayIso() } = {},
) {
  const errors = []

  const name = String(raw.name ?? '').trim()
  if (!name) errors.push({ code: 'nameRequired' })

  const strength = String(raw.strength ?? '').trim()
  if (!strength) errors.push({ code: 'strengthRequired' })

  const dosageRaw = String(raw.dosageForm ?? '').trim()
  const dosageForm = canonicalDosageForm(dosageRaw)
  if (!dosageRaw) errors.push({ code: 'dosageRequired' })
  else if (!dosageForm) {
    errors.push({ code: 'dosageInvalid', params: { value: dosageRaw } })
  }

  const baseUnit = String(raw.stockUnit ?? '').trim()
  if (!baseUnit) errors.push({ code: 'baseUnitRequired' })

  const sellingPrice = parseMoney(raw.sellingPrice)
  if (sellingPrice.blank) errors.push({ code: 'priceRequired' })
  else if (!sellingPrice.ok) errors.push({ code: 'priceInvalid' })
  else if (sellingPrice.value <= 0) errors.push({ code: 'pricePositive' })

  const stockQuantity = parseWholeNumber(raw.stockQuantity, 0)
  if (!stockQuantity.ok) errors.push({ code: 'stockInvalid' })

  const lowStockThreshold = parseWholeNumber(raw.lowStockThreshold, 0)
  if (!lowStockThreshold.ok) errors.push({ code: 'thresholdInvalid' })

  const purchaseCost = parseMoney(raw.purchaseCost)
  if (stockQuantity.ok && stockQuantity.value > 0) {
    if (purchaseCost.blank) errors.push({ code: 'costRequired' })
    else if (!purchaseCost.ok) errors.push({ code: 'costInvalid' })
  } else if (!purchaseCost.ok && !purchaseCost.blank) {
    errors.push({ code: 'costInvalid' })
  }

  const supplier = String(raw.supplier ?? '').trim()
  if (stockQuantity.ok && stockQuantity.value > 0 && !supplier) {
    errors.push({ code: 'supplierRequired' })
  }

  const batchNumber = String(raw.batchNumber ?? '').trim()

  const expiry = parseImportDate(raw.expiryDate)
  if (expiry.error) {
    errors.push({ code: 'dateInvalid', params: { field: 'expiryDate' } })
  } else if (expiry.value && expiry.value < today) {
    errors.push({ code: 'expiryPast', params: { date: expiry.value } })
  }

  const manufacturing = parseImportDate(raw.manufacturingDate)
  if (manufacturing.error) {
    errors.push({
      code: 'dateInvalid',
      params: { field: 'manufacturingDate' },
    })
  } else if (manufacturing.value && manufacturing.value > today) {
    errors.push({
      code: 'manufacturingFuture',
      params: { date: manufacturing.value },
    })
  }

  if (
    expiry.value &&
    manufacturing.value &&
    expiry.value <= manufacturing.value
  ) {
    errors.push({ code: 'expiryBeforeManufacturing' })
  }

  const packaging = parsePackagingSpec(raw.packaging, {
    baseUnit: baseUnit || 'unit',
    sellingPrice: sellingPrice.ok ? sellingPrice.value : 0,
  })
  errors.push(...packaging.errors)

  const duplicate = findDuplicateMedicine(existingMedicines, { name, strength })

  const parsed = {
    name,
    strength,
    dosageForm,
    baseUnit,
    sellingPrice: sellingPrice.ok ? sellingPrice.value : 0,
    lowStockThreshold: lowStockThreshold.ok ? lowStockThreshold.value : 0,
    packaging: packaging.levels,
    stockQuantity: stockQuantity.ok ? stockQuantity.value : 0,
    purchaseCost: purchaseCost.ok ? purchaseCost.value : null,
    batchNumber,
    expiryDate: expiry.value ?? '',
    manufacturingDate: manufacturing.value ?? '',
    supplier,
    input: {
      name,
      strength,
      dosageForm,
      baseUnit,
      sellingPrice: sellingPrice.ok ? sellingPrice.value : 0,
      lowStockThreshold: lowStockThreshold.ok ? lowStockThreshold.value : 0,
      packaging: packaging.levels,
      stock: 0,
    },
  }

  return { parsed, errors, duplicate }
}

function applyInFileDuplicates(rows) {
  const byMedicine = new Map()

  rows.forEach((row) => {
    if (!row.parsed.name || !row.parsed.strength) return
    const key = `${row.parsed.name.toLowerCase()}|${row.parsed.strength.toLowerCase()}`
    if (!byMedicine.has(key)) byMedicine.set(key, [])
    byMedicine.get(key).push(row)
  })

  byMedicine.forEach((group) => {
    if (group.length < 2) return
    group.forEach((row) => {
      if (row.status !== IMPORT_STATUS.VALID) return
      row.status = IMPORT_STATUS.DUPLICATE
      row.reasons.push({
        code: 'inFileDuplicate',
        params: { count: group.length },
      })
    })
  })

  const byBatch = new Map()

  rows.forEach((row) => {
    if (row.status === IMPORT_STATUS.INVALID) return
    if (!row.parsed.batchNumber || row.parsed.stockQuantity <= 0) return
    const key = [
      row.parsed.name.toLowerCase(),
      row.parsed.strength.toLowerCase(),
      row.parsed.batchNumber.toLowerCase(),
      row.parsed.expiryDate || '',
    ].join('|')
    if (!byBatch.has(key)) byBatch.set(key, [])
    byBatch.get(key).push(row)
  })

  byBatch.forEach((group) => {
    if (group.length < 2) return
    group.forEach((row) => {
      if (row.status === IMPORT_STATUS.INVALID) return
      if (row.reasons.some((reason) => reason.code === 'batchDuplicate')) return
      row.status = IMPORT_STATUS.DUPLICATE
      row.reasons.push({
        code: 'batchDuplicate',
        params: { batch: row.parsed.batchNumber },
      })
    })
  })
}

export function summarizeImportRows(rows) {
  const summary = {
    total: rows.length,
    valid: 0,
    invalid: 0,
    duplicate: 0,
    imported: 0,
    failed: 0,
    skipped: 0,
    stockRows: 0,
    units: 0,
  }

  rows.forEach((row) => {
    summary[row.status] = (summary[row.status] ?? 0) + 1
    if (
      (row.status === IMPORT_STATUS.VALID ||
        row.status === IMPORT_STATUS.IMPORTED) &&
      row.parsed?.stockQuantity > 0
    ) {
      summary.stockRows += 1
      summary.units += row.parsed.stockQuantity
    }
  })

  summary.skipped = summary.invalid + summary.duplicate
  return summary
}

export function analyzeImportRows(
  rows,
  { existingMedicines = [], today = todayIso(), headerRowIndex } = {},
) {
  const headerIndex =
    headerRowIndex === undefined ? findHeaderRow(rows) : headerRowIndex

  if (headerIndex < 0) {
    return {
      ok: false,
      error: 'missingHeaders',
      missingHeaders: IMPORT_COLUMNS.filter((column) => column.required).map(
        (column) => column.header,
      ),
    }
  }

  const { byKey, missing } = mapImportHeaders(rows[headerIndex])

  if (missing.length > 0) {
    return {
      ok: false,
      error: 'missingHeaders',
      missingHeaders: missing.map((key) => HEADER_BY_KEY[key] ?? key),
    }
  }

  const dataRows = rows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => String(cell ?? '').trim()))

  if (dataRows.length === 0) return { ok: false, error: 'emptyFile' }
  if (dataRows.length > IMPORT_MAX_ROWS) {
    return { ok: false, error: 'tooManyRows', max: IMPORT_MAX_ROWS }
  }

  const resultRows = dataRows.map((row, index) => {
    const raw = {}
    IMPORT_COLUMNS.forEach((column) => {
      const cellIndex = byKey[column.key]
      raw[column.key] = cellIndex === undefined ? '' : row[cellIndex]
    })

    const validation = validateImportRow(raw, {
      existingMedicines,
      today,
    })

    let status = IMPORT_STATUS.VALID
    if (validation.errors.length > 0) status = IMPORT_STATUS.INVALID
    else if (validation.duplicate) status = IMPORT_STATUS.DUPLICATE

    const reasons = [...validation.errors]
    if (validation.duplicate) {
      reasons.push({
        code: 'existingDuplicate',
        params: {
          name: validation.parsed.name,
          strength: validation.parsed.strength,
        },
      })
    }

    return {
      rowNumber: headerIndex + index + 2,
      raw,
      parsed: validation.parsed,
      status,
      reasons,
      duplicateMedicineId: validation.duplicate?.id ?? null,
    }
  })

  applyInFileDuplicates(resultRows)

  return {
    ok: true,
    headers: byKey,
    rows: resultRows,
    summary: summarizeImportRows(resultRows),
  }
}

export async function hashBytes(buffer) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  const bytes = new Uint8Array(buffer)
  let hash = 2166136261
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index]
    hash = Math.imul(hash, 16777619)
  }
  return `fnv-${(hash >>> 0).toString(16)}`
}

export async function analyzeMedicineImportFile(
  file,
  { medicines = [], today = todayIso() } = {},
) {
  const fileError = validateImportFile(file)
  if (fileError) return { ok: false, error: fileError }

  try {
    const buffer = await file.arrayBuffer()
    const signature = await hashBytes(buffer)
    const { parseWorkbookRows } = await import('./medicineSpreadsheet')
    const parsed = parseWorkbookRows(buffer, file.name)
    if (!parsed.ok) return parsed

    const analysis = analyzeImportRows(parsed.rows, {
      existingMedicines: medicines,
      today,
    })
    if (!analysis.ok) return analysis

    return {
      ...analysis,
      fileName: file.name,
      fileSize: file.size,
      signature,
    }
  } catch {
    return { ok: false, error: 'parseError' }
  }
}

export async function downloadMedicineImportTemplate() {
  const module = await import('./medicineImportTemplate')
  module.downloadMedicineImportTemplate()
}

function defaultStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readImportHistory(storage = defaultStorage()) {
  if (!storage) return []

  try {
    const parsed = JSON.parse(storage.getItem(IMPORT_HISTORY_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function hasImportSignature(signature, storage = defaultStorage()) {
  if (!signature) return null
  return (
    readImportHistory(storage).find((entry) => entry.signature === signature) ??
    null
  )
}

export function recordImportSignature(entry, storage = defaultStorage()) {
  if (!storage || !entry?.signature) return []

  const history = readImportHistory(storage).filter(
    (item) => item.signature !== entry.signature,
  )
  const next = [
    {
      ...entry,
      importedAt: entry.importedAt ?? new Date().toISOString(),
    },
    ...history,
  ].slice(0, IMPORT_HISTORY_LIMIT)

  try {
    storage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(next))
  } catch {
    // History is a convenience guard; storage can be unavailable.
  }

  return next
}

export function clearImportHistory(storage = defaultStorage()) {
  if (!storage) return
  try {
    storage.removeItem(IMPORT_HISTORY_KEY)
  } catch {
    // Ignore unavailable storage.
  }
}

export function buildLocalImportState(
  state,
  rows,
  { staff = '', today = todayIso() } = {},
) {
  const validRows = rows.filter((row) => row.status === IMPORT_STATUS.VALID)
  const medicines = []
  const batches = []
  const transactions = []
  const recordedAt = new Date().toISOString()
  const purchaseDate = new Date(`${today}T12:00:00`).toISOString()

  validRows.forEach((row, index) => {
    const parsed = row.parsed
    const suffix = `${Date.now()}-${index}`
    const medicine = normalizeMedicine({
      ...parsed.input,
      id: `med-import-${suffix}`,
      stock: parsed.stockQuantity,
      imagePath: '',
      imageUrl: '',
    })
    medicines.push(medicine)

    if (parsed.stockQuantity <= 0) return

    const batchId = `batch-import-${suffix}`
    const transactionId = `purchase-import-${suffix}`
    const transaction = {
      id: transactionId,
      purchaseId: transactionId,
      code: nextTransactionCode(
        [...state.transactions, ...transactions],
        'purchase',
      ),
      type: 'purchase',
      date: purchaseDate,
      recordedAt,
      medicineId: medicine.id,
      medicineName: `${medicine.name} ${medicine.strength}`.trim(),
      unit: medicine.baseUnit,
      unitFactor: 1,
      quantity: parsed.stockQuantity,
      baseQuantity: parsed.stockQuantity,
      baseUnit: medicine.baseUnit,
      unitPrice: roundMoney(parsed.purchaseCost ?? 0),
      total: roundMoney(parsed.stockQuantity * (parsed.purchaseCost ?? 0)),
      purchaseBatchId: batchId,
      staff,
      supplier: parsed.supplier,
      batchNumber: parsed.batchNumber,
      expiryDate: parsed.expiryDate,
    }
    const batch = {
      id: batchId,
      medicineId: medicine.id,
      batchNumber: parsed.batchNumber,
      expiryDate: parsed.expiryDate,
      unitCost: roundMoney(parsed.purchaseCost ?? 0),
      unitCostBase: roundMoney(parsed.purchaseCost ?? 0),
      quantityReceivedBase: parsed.stockQuantity,
      quantityRemainingBase: parsed.stockQuantity,
      purchaseTransactionId: transaction.id,
      date: transaction.date,
      recordedAt,
      supplier: parsed.supplier,
    }

    batches.push(batch)
    transactions.push(transaction)
  })

  const nextState = {
    ...state,
    medicines: [...state.medicines, ...medicines],
    batches: [...batches, ...state.batches],
    transactions: [...transactions, ...state.transactions],
  }

  const importedRows = validRows.map((row) => ({
    ...row,
    status: IMPORT_STATUS.IMPORTED,
  }))

  return {
    state: nextState,
    result: buildImportResult(rows, importedRows),
  }
}

export function buildImportResult(rows, resultRows = []) {
  const byRowNumber = new Map(
    resultRows.map((row) => [row.rowNumber, row]),
  )
  const merged = rows.map((row) => byRowNumber.get(row.rowNumber) ?? row)
  const summary = summarizeImportRows(merged)

  return {
    ok: summary.failed === 0,
    rows: merged,
    summary,
    imported: summary.imported,
    failed: summary.failed,
    invalid: summary.invalid,
    duplicate: summary.duplicate,
  }
}

function errorMessage(error) {
  return String(error?.message || error || 'Import failed')
}

const CLEANUP_NOTE =
  'The medicine record could not be removed automatically. Check Inventory and the Purchases page before retrying.'

export async function executeRemoteImport({
  pharmacyId,
  rows,
  signature = '',
  createMedicine,
  createPurchase,
  deleteMedicine,
  today = todayIso(),
}) {
  const validRows = rows.filter((row) => row.status === IMPORT_STATUS.VALID)
  if (validRows.length === 0) return buildImportResult(rows, [])

  const resultRows = []
  const noStockRows = []
  const supplierGroups = new Map()

  validRows.forEach((row) => {
    if (row.parsed.stockQuantity > 0) {
      const supplier = row.parsed.supplier
      if (!supplierGroups.has(supplier)) supplierGroups.set(supplier, [])
      supplierGroups.get(supplier).push(row)
    } else {
      noStockRows.push(row)
    }
  })

  for (const row of noStockRows) {
    try {
      const medicine = await createMedicine(pharmacyId, row.parsed.input)
      resultRows.push({
        ...row,
        status: IMPORT_STATUS.IMPORTED,
        medicineId: medicine.id,
      })
    } catch (error) {
      resultRows.push({
        ...row,
        status: IMPORT_STATUS.FAILED,
        error: errorMessage(error),
      })
    }
  }

  let groupIndex = 0

  for (const [supplier, groupRows] of supplierGroups) {
    const created = []
    const items = []

    for (const row of groupRows) {
      try {
        const medicine = await createMedicine(pharmacyId, row.parsed.input)
        created.push({ row, medicine })
        items.push({
          medicineId: medicine.id,
          unit: row.parsed.baseUnit,
          quantity: row.parsed.stockQuantity,
          unitCost: row.parsed.purchaseCost,
          batchNumber: row.parsed.batchNumber || null,
          expiryDate: row.parsed.expiryDate || null,
        })
      } catch (error) {
        resultRows.push({
          ...row,
          status: IMPORT_STATUS.FAILED,
          error: errorMessage(error),
        })
      }
    }

    if (items.length > 0) {
      try {
        await createPurchase(pharmacyId, {
          supplierName: supplier,
          purchaseDate: new Date(`${today}T12:00:00`).toISOString(),
          items,
          clientReference: `import-${signature || 'manual'}-${groupIndex}`,
        })

        created.forEach(({ row, medicine }) => {
          resultRows.push({
            ...row,
            status: IMPORT_STATUS.IMPORTED,
            medicineId: medicine.id,
          })
        })
      } catch (error) {
        const message = errorMessage(error)
        let cleanupFailed = false

        for (const { medicine } of created) {
          try {
            await deleteMedicine(pharmacyId, medicine.id)
          } catch {
            cleanupFailed = true
          }
        }

        created.forEach(({ row }) => {
          resultRows.push({
            ...row,
            status: IMPORT_STATUS.FAILED,
            error: cleanupFailed ? `${message} ${CLEANUP_NOTE}` : message,
          })
        })
      }
    }

    groupIndex += 1
  }

  return buildImportResult(rows, resultRows)
}
