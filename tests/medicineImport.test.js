import { test } from 'vitest'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import {
  IMPORT_COLUMNS,
  IMPORT_EXAMPLE_ROW,
  validateImportFile,
  mapImportHeaders,
} from '../src/utils/medicineImportConfig.js'
import { buildTemplateWorkbook } from '../src/utils/medicineImportTemplate.js'
import { parseWorkbookRows } from '../src/utils/medicineSpreadsheet.js'
import {
  analyzeImportRows,
  analyzeMedicineImportFile,
  buildImportResult,
  buildLocalImportState,
  clearImportHistory,
  executeRemoteImport,
  hashBytes,
  hasImportSignature,
  parseImportDate,
  parsePackagingSpec,
  readImportHistory,
  recordImportSignature,
  validateImportRow,
} from '../src/utils/medicineImport.js'
import { medicineCreateBlockedReason } from '../src/utils/medicineDraft.js'

const TODAY = '2026-06-01'

const HEADERS = IMPORT_COLUMNS.map((column) => column.header)

function baseRow(overrides = {}) {
  return {
    name: 'Amoxicillin',
    strength: '500 mg',
    dosageForm: 'Capsule',
    sellingPrice: 2.5,
    purchaseCost: 1.8,
    stockQuantity: 100,
    stockUnit: 'capsule',
    packaging: 'strip=10, box=100@240',
    lowStockThreshold: 50,
    batchNumber: 'AMX-2026-01',
    expiryDate: '2027-12-31',
    manufacturingDate: '2025-01-01',
    supplier: 'Addis Pharma Distributors',
    ...overrides,
  }
}

function rowsTable(rows, headers = HEADERS) {
  return [
    headers,
    ...rows.map((row) =>
      headers.map((header) => {
        const key = IMPORT_COLUMNS.find((column) => column.header === header)?.key
        const value = key ? row[key] : ''
        return value === undefined || value === null ? '' : value
      }),
    ),
  ]
}

function analyze(rows, options = {}) {
  return analyzeImportRows(rows, { today: TODAY, ...options })
}

function analyzeRows(rows, options = {}) {
  return analyze(rowsTable(rows), options)
}

function reasons(row) {
  return row.reasons.map((reason) => reason.code)
}

function xlsxBuffer(table, sheetName = 'Medicines') {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(table),
    sheetName,
  )
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
}

function mockFile(name, buffer) {
  const bytes = new Uint8Array(buffer)
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer,
  }
}

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

test('template workbook contains medicine columns and an instructions sheet', () => {
  const workbook = buildTemplateWorkbook()

  assert.deepEqual(workbook.SheetNames, ['Medicines', 'Instructions'])

  const medicineSheet = workbook.Sheets.Medicines
  const headers = XLSX.utils.sheet_to_json(medicineSheet, {
    header: 1,
    defval: '',
  })[0]

  assert.deepEqual(headers, HEADERS)
  assert.ok(!headers.includes('Category'))
  assert.ok(headers.includes('Manufacturing Date'))

  const example = XLSX.utils.sheet_to_json(medicineSheet, {
    header: 1,
    defval: '',
  })[1]
  assert.equal(example[HEADERS.indexOf('Medicine Name')], IMPORT_EXAMPLE_ROW.name)
  assert.equal(
    example[HEADERS.indexOf('Packaging')],
    IMPORT_EXAMPLE_ROW.packaging,
  )

  const instructions = XLSX.utils.sheet_to_json(
    workbook.Sheets.Instructions,
    { header: 1, defval: '' },
  )
  const text = instructions.flat().join(' ')
  assert.match(text, /YYYY-MM-DD/)
  assert.match(text, /strip=10/)
  assert.match(text, /Smallest unit/i)
  assert.match(text, /Supplier/)
})

// ---------------------------------------------------------------------------
// Spreadsheet parsing
// ---------------------------------------------------------------------------

test('parses an Excel workbook into row arrays', () => {
  const table = rowsTable([baseRow()])
  const parsed = parseWorkbookRows(xlsxBuffer(table), 'medicines.xlsx')

  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.rows[0], HEADERS)
  assert.equal(parsed.rows[1][0], 'Amoxicillin')
})

test('parses a CSV file with quoted packaging values', () => {
  const csv = [
    HEADERS.join(','),
    [
      'Paracetamol',
      '500 mg',
      'Tablet',
      '1.5',
      '1',
      '200',
      'tablet',
      '"strip=10@15, box=100@140"',
      '100',
      'PAR-2026-01',
      '2028-01-31',
      '2025-02-01',
      'Local Distributor',
    ].join(','),
  ].join('\n')
  const buffer = new TextEncoder().encode(csv).buffer

  const parsed = parseWorkbookRows(buffer, 'medicines.csv')
  assert.equal(parsed.ok, true)

  const result = analyze(parsed.rows)
  assert.equal(result.ok, true)
  assert.equal(result.summary.valid, 1)
  assert.equal(result.rows[0].parsed.packaging[1].unit, 'strip')
  assert.equal(result.rows[0].parsed.packaging[2].price, 140)
})

test('analyzes an uploaded file and creates a repeat-import signature', async () => {
  const buffer = xlsxBuffer(rowsTable([baseRow()]))
  const file = mockFile('medicines.xlsx', buffer)

  const result = await analyzeMedicineImportFile(file, { today: TODAY })

  assert.equal(result.ok, true)
  assert.equal(result.fileName, 'medicines.xlsx')
  assert.match(result.signature, /^[a-f0-9]{64}$/)
  assert.equal(result.summary.valid, 1)

  const otherFile = mockFile('different.xlsx', xlsxBuffer(rowsTable([baseRow()])))
  assert.equal(
    (await analyzeMedicineImportFile(otherFile, { today: TODAY })).signature,
    result.signature,
  )
})

test('rejects unsupported, empty, and oversized files', async () => {
  assert.equal(validateImportFile(null), 'noFile')
  assert.equal(validateImportFile({ name: 'medicines.pdf', size: 10 }), 'unsupportedFile')
  assert.equal(
    validateImportFile({ name: 'big.xlsx', size: 11 * 1024 * 1024 }),
    'fileTooLarge',
  )

  const empty = mockFile('empty.xlsx', xlsxBuffer(rowsTable([])))
  assert.equal((await analyzeMedicineImportFile(empty)).error, 'emptyFile')
})

// ---------------------------------------------------------------------------
// Header validation
// ---------------------------------------------------------------------------

test('finds headers after title rows and accepts common aliases', () => {
  const table = [
    ['My pharmacy import'],
    [],
    ['Medicine', 'Dose', 'Form', 'Price', 'Qty', 'Unit'],
    ['Amoxicillin', '500 mg', 'caps', 2.5, 10, 'capsule'],
  ]

  const result = analyze(table)
  assert.equal(result.ok, true)
  assert.equal(result.rows[0].rowNumber, 4)
  assert.equal(result.rows[0].parsed.dosageForm, 'Capsule')
  assert.equal(result.rows[0].parsed.stockQuantity, 10)
})

test('reports all missing required columns', () => {
  const table = [
    ['Medicine Name', 'Dosage Form', 'Selling Price', 'Stock Unit'],
    ['Amoxicillin', 'Capsule', '2.5', 'capsule'],
  ]

  const result = analyze(table)
  assert.equal(result.ok, false)
  assert.equal(result.error, 'missingHeaders')
  assert.deepEqual(result.missingHeaders, ['Strength'])
})

test('matches long headers before short ones', () => {
  const result = mapImportHeaders([
    'Stock Unit',
    'Stock Quantity',
    'Selling Price',
  ])
  assert.equal(result.byKey.stockUnit, 0)
  assert.equal(result.byKey.stockQuantity, 1)
})

// ---------------------------------------------------------------------------
// Row validation
// ---------------------------------------------------------------------------

test('validates a complete row', () => {
  const result = validateImportRow(baseRow(), { today: TODAY })

  assert.deepEqual(result.errors, [])
  assert.equal(result.parsed.name, 'Amoxicillin')
  assert.equal(result.parsed.sellingPrice, 2.5)
  assert.equal(result.parsed.purchaseCost, 1.8)
  assert.equal(result.parsed.lowStockThreshold, 50)
  assert.equal(result.parsed.baseUnit, 'capsule')
  assert.equal(result.parsed.stockQuantity, 100)
  assert.equal(result.parsed.input.stock, 0)
})

test('rejects invalid prices and quantities with exact row reasons', () => {
  const result = analyzeRows([
    baseRow({ sellingPrice: 0 }),
    baseRow({ sellingPrice: 'abc' }),
    baseRow({ stockQuantity: -5 }),
    baseRow({ stockQuantity: '2.5' }),
    baseRow({ purchaseCost: '' }),
    baseRow({ supplier: '' }),
  ])

  assert.equal(result.ok, true)
  assert.deepEqual(result.summary.invalid, 6)
  for (const row of result.rows) assert.equal(row.status, 'invalid')

  const codes = result.rows.flatMap(reasons)
  assert.ok(codes.includes('pricePositive'))
  assert.ok(codes.includes('priceInvalid'))
  assert.ok(codes.includes('stockInvalid'))
  assert.ok(codes.includes('costRequired'))
  assert.ok(codes.includes('supplierRequired'))
})

test('allows catalogue rows without stock, cost, supplier, or batch', () => {
  const result = analyzeRows([
    baseRow({
      stockQuantity: 0,
      purchaseCost: '',
      supplier: '',
      batchNumber: '',
      expiryDate: '',
      manufacturingDate: '',
    }),
  ])

  assert.equal(result.summary.valid, 1)
  assert.equal(result.rows[0].parsed.stockQuantity, 0)
  assert.equal(result.rows[0].parsed.batchNumber, '')
})

test('rejects unsupported dosage forms and packaging units matching the base unit', () => {
  const result = analyzeRows([
    baseRow({ dosageForm: 'Powder' }),
    baseRow({ packaging: 'capsule=10' }),
    baseRow({ packaging: 'strip=1' }),
    baseRow({ packaging: 'strip=abc' }),
  ])

  assert.equal(result.summary.invalid, 4)
  const codes = result.rows.flatMap(reasons)
  assert.ok(codes.includes('dosageInvalid'))
  assert.ok(codes.includes('packagingDuplicate'))
  assert.ok(codes.includes('packagingContains'))
  assert.ok(codes.includes('packagingInvalid'))
})

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

test('parses ISO, day-first, and Excel serial dates', () => {
  assert.deepEqual(parseImportDate('2027-12-31'), { value: '2027-12-31' })
  assert.deepEqual(parseImportDate('31/12/2027'), { value: '2027-12-31' })
  assert.deepEqual(parseImportDate(46203), { value: '2026-06-30' })
  assert.deepEqual(parseImportDate(''), { value: '' })
  assert.deepEqual(parseImportDate('2027-02-30'), { error: 'invalidDate' })
})

test('rejects invalid, past, future, and reversed dates', () => {
  const result = analyzeRows([
    baseRow({ expiryDate: 'not-a-date' }),
    baseRow({ expiryDate: '2026-05-31' }),
    baseRow({ manufacturingDate: '2026-07-01' }),
    baseRow({ expiryDate: '2027-01-01', manufacturingDate: '2027-06-01' }),
  ])

  assert.equal(result.summary.invalid, 4)
  const codes = result.rows.flatMap(reasons)
  assert.ok(codes.includes('dateInvalid'))
  assert.ok(codes.includes('expiryPast'))
  assert.ok(codes.includes('manufacturingFuture'))
  assert.ok(codes.includes('expiryBeforeManufacturing'))
})

// ---------------------------------------------------------------------------
// Packaging
// ---------------------------------------------------------------------------

test('converts packaging levels and keeps explicit package prices', () => {
  const result = parsePackagingSpec('strip=10, box=100@240', {
    baseUnit: 'capsule',
    sellingPrice: 2.5,
  })

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.levels, [
    { unit: 'capsule', contains: 1, price: 2.5 },
    { unit: 'strip', contains: 10, price: 25 },
    { unit: 'box', contains: 100, price: 240 },
  ])
})

test('rejects repeated packaging levels and sorts levels by size', () => {
  const repeated = parsePackagingSpec('strip=10; strip=20', {
    baseUnit: 'tablet',
    sellingPrice: 2,
  })
  assert.ok(repeated.errors.some((error) => error.code === 'packagingDuplicate'))

  const unordered = parsePackagingSpec('box=100, strip=10', {
    baseUnit: 'tablet',
    sellingPrice: 2,
  })
  assert.deepEqual(unordered.levels[1].unit, 'strip')
  assert.deepEqual(unordered.levels[2].unit, 'box')
  assert.deepEqual(unordered.errors, [])
})

// ---------------------------------------------------------------------------
// Duplicates
// ---------------------------------------------------------------------------

test('marks existing medicines as duplicates without invalidating other rows', () => {
  const existing = [
    { id: 'existing-1', name: 'amoxicillin', strength: '500 mg' },
  ]
  const result = analyzeRows(
    [
      baseRow({ name: 'Amoxicillin', strength: '500 mg' }),
      baseRow({ name: 'Amoxicillin', strength: '250 mg' }),
      baseRow({ name: 'Ibuprofen', strength: '400 mg' }),
    ],
    { existingMedicines: existing },
  )

  assert.equal(result.summary.duplicate, 1)
  assert.equal(result.summary.valid, 2)
  assert.equal(result.rows[0].status, 'duplicate')
  assert.equal(result.rows[0].duplicateMedicineId, 'existing-1')
  assert.ok(reasons(result.rows[0]).includes('existingDuplicate'))
  assert.equal(result.rows[1].status, 'valid')
})

test('marks every repeated medicine and repeated batch in the file as duplicate', () => {
  const result = analyzeRows([
    baseRow(),
    baseRow({ supplier: 'Other Distributor' }),
    baseRow({ name: 'Ibuprofen', strength: '400 mg', batchNumber: 'IBU-1' }),
    baseRow({ name: 'Ibuprofen', strength: '400 mg', batchNumber: 'IBU-1' }),
  ])

  assert.equal(result.summary.duplicate, 4)
  assert.ok(result.rows[0].reasons.some((r) => r.code === 'inFileDuplicate'))
  assert.ok(result.rows[2].reasons.some((r) => r.code === 'batchDuplicate'))
})

test('different strengths and medicines are not merged', () => {
  // The database uniqueness is (pharmacy, name, strength), so a different
  // strength stays a separate catalogue record instead of being merged.
  const result = analyzeRows([
    baseRow({ name: 'Amoxicillin', strength: '500 mg', dosageForm: 'Capsule' }),
    baseRow({ name: 'Amoxicillin', strength: '250 mg', dosageForm: 'Capsule' }),
    baseRow({ name: 'Ibuprofen', strength: '400 mg', dosageForm: 'Tablet' }),
  ])

  assert.equal(result.summary.valid, 3)
  assert.equal(result.summary.duplicate, 0)
})

test('same name and strength is a duplicate even when the dosage form differs', () => {
  const result = analyzeRows([
    baseRow({ strength: '500 mg', dosageForm: 'Capsule' }),
    baseRow({ strength: '500 mg', dosageForm: 'Tablet' }),
  ])

  assert.equal(result.summary.duplicate, 2)
  assert.ok(result.rows.every((row) => reasons(row).includes('inFileDuplicate')))
})

// ---------------------------------------------------------------------------
// Local / offline behaviour
// ---------------------------------------------------------------------------

test('local import builds medicines, batches, movements, and a result atomically', () => {
  const analysis = analyzeRows([
    baseRow(),
    baseRow({
      name: 'Ibuprofen',
      strength: '400 mg',
      stockQuantity: 0,
      purchaseCost: '',
      supplier: '',
      batchNumber: '',
      expiryDate: '',
      manufacturingDate: '',
    }),
  ])

  const previousState = { medicines: [], batches: [], transactions: [] }
  const { state, result } = buildLocalImportState(previousState, analysis.rows, {
    staff: 'Owner',
    today: TODAY,
  })

  assert.equal(state.medicines.length, 2)
  assert.equal(state.batches.length, 1)
  assert.equal(state.transactions.length, 1)
  assert.equal(state.batches[0].quantityRemainingBase, 100)
  assert.equal(state.transactions[0].code, 'PO-1001')
  assert.equal(state.transactions[0].supplier, 'Addis Pharma Distributors')
  assert.equal(result.imported, 2)
  assert.equal(result.failed, 0)
  assert.equal(result.summary.units, 100)
  assert.equal(previousState.medicines.length, 0)
})

test('remote medicine creation is blocked while offline but available in demo mode', () => {
  assert.match(medicineCreateBlockedReason({ isLocal: false, online: false }), /offline/i)
  assert.equal(medicineCreateBlockedReason({ isLocal: false, online: true }), '')
  assert.equal(medicineCreateBlockedReason({ isLocal: true, online: false }), '')
})

// ---------------------------------------------------------------------------
// Remote import
// ---------------------------------------------------------------------------

test('remote import records per-supplier purchases and reports failed rows', async () => {
  const analysis = analyzeRows([
    baseRow(),
    baseRow({
      name: 'Ibuprofen',
      strength: '400 mg',
      supplier: 'Addis Pharma Distributors',
      batchNumber: 'IBU-1',
    }),
    baseRow({
      name: 'Paracetamol',
      strength: '500 mg',
      supplier: 'Second Supplier',
      stockUnit: 'tablet',
      packaging: 'strip=10',
    }),
  ])

  const created = []
  const purchases = []
  const result = await executeRemoteImport({
    pharmacyId: 'pharmacy-1',
    rows: analysis.rows,
    signature: 'abc123',
    createMedicine: async (_id, input) => {
      created.push(input)
      if (input.name === 'Ibuprofen') throw new Error('Network error')
      return { id: `med-${input.name}` }
    },
    createPurchase: async (id, purchase) => {
      purchases.push(purchase)
      return {}
    },
    deleteMedicine: async () => {},
    today: TODAY,
  })

  assert.equal(created.length, 3)
  assert.equal(purchases.length, 2)
  assert.equal(result.imported, 2)
  assert.equal(result.failed, 1)
  assert.equal(result.ok, false)
  assert.equal(
    purchases[0].clientReference,
    'import-abc123-0',
  )
  assert.equal(purchases[0].items.length, 1)
  assert.equal(purchases[0].items[0].batchNumber, 'AMX-2026-01')
  assert.equal(purchases[1].supplierName, 'Second Supplier')
  assert.equal(
    result.rows.find((row) => row.parsed.name === 'Ibuprofen').error,
    'Network error',
  )
})

test('remote import deletes newly created medicines when a purchase fails', async () => {
  const analysis = analyzeRows([baseRow()])
  const deleted = []
  const result = await executeRemoteImport({
    pharmacyId: 'pharmacy-1',
    rows: analysis.rows,
    signature: 'abc123',
    createMedicine: async () => ({ id: 'med-new' }),
    createPurchase: async () => {
      throw new Error('Purchase RPC failed')
    },
    deleteMedicine: async (_id, medicineId) => {
      deleted.push(medicineId)
    },
    today: TODAY,
  })

  assert.deepEqual(deleted, ['med-new'])
  assert.equal(result.imported, 0)
  assert.equal(result.failed, 1)
  assert.match(result.rows[0].error, /Purchase RPC failed/)
})

test('remote import processes catalogue-only rows without stock movements', async () => {
  const analysis = analyzeRows([
    baseRow({
      stockQuantity: 0,
      purchaseCost: '',
      supplier: '',
      batchNumber: '',
      expiryDate: '',
    }),
  ])
  let purchaseCalls = 0

  const result = await executeRemoteImport({
    pharmacyId: 'pharmacy-1',
    rows: analysis.rows,
    createMedicine: async () => ({ id: 'med-new' }),
    createPurchase: async () => {
      purchaseCalls += 1
    },
    deleteMedicine: async () => {},
    today: TODAY,
  })

  assert.equal(purchaseCalls, 0)
  assert.equal(result.imported, 1)
  assert.equal(result.summary.stockRows, 0)
})

// ---------------------------------------------------------------------------
// Duplicate import prevention
// ---------------------------------------------------------------------------

test('import history blocks re-importing an identical file', () => {
  const storage = memoryStorage()
  clearImportHistory(storage)

  assert.equal(readImportHistory(storage).length, 0)
  recordImportSignature(
    { signature: 'sig-1', fileName: 'medicines.xlsx', imported: 2 },
    storage,
  )
  assert.ok(hasImportSignature('sig-1', storage))
  assert.equal(hasImportSignature('sig-1', storage).imported, 2)
  assert.equal(hasImportSignature('sig-2', storage), null)

  recordImportSignature(
    { signature: 'sig-1', fileName: 'medicines.xlsx', imported: 2 },
    storage,
  )
  assert.equal(readImportHistory(storage).length, 1)
  assert.equal(readImportHistory(storage)[0].signature, 'sig-1')

  clearImportHistory(storage)
  assert.equal(readImportHistory(storage).length, 0)
})

test('hashing is deterministic and distinguishes different files', async () => {
  const first = new Uint8Array([1, 2, 3]).buffer
  const second = new Uint8Array([1, 2, 4]).buffer
  assert.equal(await hashBytes(first), await hashBytes(first))
  assert.notEqual(await hashBytes(first), await hashBytes(second))
})

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

test('buildImportResult preserves skipped rows and counts failures', () => {
  const analysis = analyzeRows(
    [
      baseRow(),
      baseRow({ name: 'Paracetamol', strength: '500 mg', sellingPrice: '' }),
      baseRow({ name: 'Ibuprofen', strength: '400 mg' }),
      baseRow({ name: 'Aspirin', strength: '100 mg', sellingPrice: '' }),
    ],
    {
      existingMedicines: [
        { id: 'existing-1', name: 'Ibuprofen', strength: '400 mg' },
      ],
    },
  )
  const result = buildImportResult(analysis.rows, [
    { ...analysis.rows[0], status: 'imported' },
    { ...analysis.rows[1], status: 'failed', error: 'DB error' },
  ])

  assert.equal(result.imported, 1)
  assert.equal(result.failed, 1)
  assert.equal(result.invalid + result.duplicate, 2)
  assert.equal(result.summary.total, 4)
  assert.equal(result.rows[2].status, 'duplicate')
  assert.equal(result.rows[3].status, 'invalid')
  assert.equal(result.ok, false)
})
