import { roundMoney } from './format'

// Bulk medicine import configuration. Every column maps to a real field in the
// medicines, packaging_units, or medicine_prices tables. Category is not part of
// the schema, so it is intentionally absent from the template.

export const IMPORT_MAX_ROWS = 500
export const IMPORT_MAX_BYTES = 10 * 1024 * 1024
export const IMPORT_EXTENSIONS = ['.xlsx', '.xls', '.csv']
export const IMPORT_HISTORY_KEY = 'pharmatrack-import-history-v1'
export const IMPORT_HISTORY_LIMIT = 20

export const IMPORT_STATUS = {
  VALID: 'valid',
  INVALID: 'invalid',
  DUPLICATE: 'duplicate',
  IMPORTED: 'imported',
  FAILED: 'failed',
}

export const IMPORT_COLUMNS = [
  {
    key: 'name',
    header: 'Medicine Name',
    aliases: ['medicine name', 'medicine', 'name', 'drug name'],
    required: true,
  },
  {
    key: 'strength',
    header: 'Strength',
    aliases: ['strength', 'dose', 'dosage strength'],
    required: true,
  },
  {
    key: 'dosageForm',
    header: 'Dosage Form',
    aliases: ['dosage form', 'dosage', 'form', 'medicine form'],
    required: true,
  },
  {
    key: 'sellingPrice',
    header: 'Selling Price',
    aliases: [
      'selling price',
      'selling price per stock unit',
      'sale price',
      'unit price',
      'price',
    ],
    required: true,
  },
  {
    key: 'purchaseCost',
    header: 'Purchase Cost',
    aliases: [
      'purchase cost',
      'purchase cost per stock unit',
      'cost price',
      'buying price',
      'cost',
    ],
    required: false,
  },
  {
    key: 'stockQuantity',
    header: 'Stock Quantity',
    aliases: [
      'stock quantity',
      'quantity',
      'qty',
      'stock on hand',
      'opening stock',
    ],
    required: false,
  },
  {
    key: 'stockUnit',
    header: 'Stock Unit',
    aliases: ['stock unit', 'base unit', 'unit of stock', 'unit'],
    required: true,
  },
  {
    key: 'packaging',
    header: 'Packaging',
    aliases: ['packaging', 'packaging levels', 'packaging units', 'pack'],
    required: false,
  },
  {
    key: 'lowStockThreshold',
    header: 'Minimum Threshold',
    aliases: [
      'minimum threshold',
      'low stock threshold',
      'minimum stock',
      'threshold',
      'min threshold',
    ],
    required: false,
  },
  {
    key: 'batchNumber',
    header: 'Batch Number',
    aliases: ['batch number', 'batch no', 'batch'],
    required: false,
  },
  {
    key: 'expiryDate',
    header: 'Expiry Date',
    aliases: ['expiry date', 'expiry', 'expiration date', 'expires'],
    required: false,
  },
  {
    key: 'manufacturingDate',
    header: 'Manufacturing Date',
    aliases: [
      'manufacturing date',
      'manufacture date',
      'manufactured date',
      'mfg date',
      'mfg',
    ],
    required: false,
  },
  {
    key: 'supplier',
    header: 'Supplier',
    aliases: ['supplier', 'supplier name', 'distributor', 'vendor'],
    required: false,
  },
]

export const REQUIRED_IMPORT_KEYS = IMPORT_COLUMNS.filter(
  (column) => column.required,
).map((column) => column.key)

export const IMPORT_EXAMPLE_ROW = {
  name: 'Amoxicillin',
  strength: '500 mg',
  dosageForm: 'Capsule',
  sellingPrice: 2.5,
  purchaseCost: 1.8,
  stockQuantity: 100,
  stockUnit: 'capsule',
  packaging: 'strip=10@25, box=100@240',
  lowStockThreshold: 50,
  batchNumber: 'AMX-2026-01',
  expiryDate: '2027-12-31',
  manufacturingDate: '2025-01-01',
  supplier: 'Addis Pharma Distributors',
}

export const IMPORT_TEMPLATE_INSTRUCTIONS = [
  ['PharmaTrack medicine import template'],
  [],
  [
    'Use one row per medicine. Do not repeat the same medicine name and strength in one file.',
  ],
  [
    'Required columns: Medicine Name, Strength, Dosage Form, Selling Price, and Stock Unit.',
  ],
  [
    'Selling Price and Purchase Cost are per Stock Unit (the smallest unit you sell).',
  ],
  [
    'Stock Quantity is expressed in Stock Unit. Leave it blank or enter 0 to create a catalogue record without stock.',
  ],
  [
    'Packaging syntax: strip=10, box=100. The number is how many Stock Units the package contains. Add @price to set a package price, for example strip=10@25. If the price is omitted, PharmaTrack calculates it from Selling Price x contains.',
  ],
  [
    'Minimum Threshold is a whole number of Stock Units. Leave it blank to use 0.',
  ],
  [
    'Dates must use YYYY-MM-DD (for example 2027-12-31). Expiry dates cannot be in the past. Manufacturing dates cannot be in the future or after the expiry date.',
  ],
  [
    'Supplier is required when Stock Quantity is greater than zero.',
  ],
  [
    'Batch Number and Expiry Date are optional. Leave them blank when they are unknown; PharmaTrack never invents them.',
  ],
  [
    'Existing medicines with the same name and strength are reported as duplicates and are not imported. Add stock to them from the Purchases page instead.',
  ],
  [
    'Every file is validated and previewed before anything is saved. Invalid or duplicate rows are never silently discarded.',
  ],
  [],
  ['Supported dosage forms'],
  ['Tablet, Capsule, Syrup, Injection, Injection pen, Sachet, Cream, Drops, Inhaler, Vial, Other'],
  [],
  ['Column reference'],
  ['Header', 'Required', 'Description'],
  ...IMPORT_COLUMNS.map((column) => [
    column.header,
    column.required ? 'Yes' : 'No',
    columnDescription(column.key),
  ]),
]

function columnDescription(key) {
  const descriptions = {
    name: 'Medicine name, for example Amoxicillin.',
    strength: 'Strength exactly as it should appear, for example 500 mg.',
    dosageForm: 'One of the supported dosage forms.',
    sellingPrice: 'Selling price for one Stock Unit. Must be greater than zero.',
    purchaseCost: 'Purchase cost for one Stock Unit. Required when stock is imported.',
    stockQuantity: 'Whole number of Stock Units received. Blank or 0 means no stock.',
    stockUnit: 'Smallest unit used for stock, for example tablet, capsule, or ml.',
    packaging:
      'Optional package sizes, for example strip=10, box=100. Prices are optional.',
    lowStockThreshold: 'Whole number of Stock Units used for the low-stock warning.',
    batchNumber: 'Optional batch number. Never generated by PharmaTrack.',
    expiryDate: 'Optional expiry date in YYYY-MM-DD format.',
    manufacturingDate: 'Optional manufacturing date in YYYY-MM-DD format.',
    supplier: 'Supplier name. Required when stock is imported.',
  }
  return descriptions[key] ?? ''
}

export const DOSAGE_FORM_ALIASES = {
  tab: 'Tablet',
  tabs: 'Tablet',
  tablet: 'Tablet',
  tablets: 'Tablet',
  cap: 'Capsule',
  caps: 'Capsule',
  capsule: 'Capsule',
  capsules: 'Capsule',
  syr: 'Syrup',
  syrup: 'Syrup',
  inj: 'Injection',
  injection: 'Injection',
  pen: 'Injection pen',
  'injection pen': 'Injection pen',
  sachet: 'Sachet',
  cream: 'Cream',
  drop: 'Drops',
  drops: 'Drops',
  inhaler: 'Inhaler',
  vial: 'Vial',
  other: 'Other',
}

export function normalizeHeader(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
}

const HEADER_ALIAS_INDEX = IMPORT_COLUMNS.flatMap((column) =>
  column.aliases.map((alias) => ({
    key: column.key,
    alias: normalizeHeader(alias),
  })),
).sort((a, b) => b.alias.length - a.alias.length)

// Match a spreadsheet header to a known column. Longer aliases win so that
// "Stock Unit" is not mistaken for "Stock Quantity".
export function matchImportHeader(value) {
  const normalized = normalizeHeader(value)
  if (!normalized) return null

  const match = HEADER_ALIAS_INDEX.find(
    (entry) => normalized === entry.alias || normalized.startsWith(entry.alias),
  )
  return match?.key ?? null
}

export function mapImportHeaders(headerRow) {
  const byKey = {}
  const unknown = []

  ;(headerRow ?? []).forEach((cell, index) => {
    const key = matchImportHeader(cell)
    if (!key) {
      if (String(cell ?? '').trim()) unknown.push(String(cell).trim())
      return
    }
    if (byKey[key] === undefined) byKey[key] = index
  })

  const missing = REQUIRED_IMPORT_KEYS.filter((key) => byKey[key] === undefined)
  return { byKey, missing, unknown }
}

export function findHeaderRow(rows) {
  const limit = Math.min(rows.length, 20)

  for (let index = 0; index < limit; index += 1) {
    const { byKey } = mapImportHeaders(rows[index])
    const matched = Object.keys(byKey).length
    if (matched >= 3 && byKey.name !== undefined) return index
  }

  return -1
}

export function canonicalDosageForm(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return ''
  return DOSAGE_FORM_ALIASES[normalized] ?? ''
}

export function validateImportFile(file) {
  if (!file) return 'noFile'

  const name = String(file.name ?? '').toLowerCase()
  if (!IMPORT_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return 'unsupportedFile'
  }
  if (Number(file.size) > IMPORT_MAX_BYTES) return 'fileTooLarge'
  return ''
}

export function packagingPrice(contains, sellingPrice) {
  return roundMoney(Number(sellingPrice) * Number(contains))
}
