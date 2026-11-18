import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  buildReportCsvRows,
  buildStockMovements,
} from '../src/utils/reportCsv.js'
import { toCsv } from '../src/utils/reportExport.js'

const t = (key) => key

const transactions = [
  {
    id: 's1',
    code: 'SO-1',
    type: 'sale',
    date: '2026-05-14T09:15:00',
    total: 120,
    quantity: 2,
    unit: 'Strip',
    baseQuantity: 2,
    baseUnit: 'Tablet',
    medicineId: 'm1',
    medicineName: 'Amoxicillin',
    staff: 'Cleo',
  },
  {
    id: 'p1',
    code: 'PO-1',
    type: 'purchase',
    date: '2026-05-14T10:00:00',
    total: 500,
    quantity: 10,
    unit: 'Box',
    baseQuantity: 100,
    baseUnit: 'Tablet',
    medicineId: 'm1',
    medicineName: 'Amoxicillin',
    supplier: 'Acme',
    batchNumber: 'B1',
  },
  {
    id: 'p2',
    code: 'PO-2',
    type: 'purchase',
    date: '2026-04-02T10:00:00',
    total: 999,
    quantity: 5,
    unit: 'Box',
    baseQuantity: 50,
    baseUnit: 'Tablet',
    medicineId: 'm2',
    medicineName: 'Paracetamol',
    supplier: 'Acme',
  },
]

function rowsFor(from, to, periodLabel) {
  return buildReportCsvRows({
    t,
    transactions,
    costing: null,
    from,
    to,
    periodLabel,
    pharmacyName: 'Test Pharmacy',
  })
}

test('monthly export contains only that month and records the selected period', () => {
  const rows = rowsFor('2026-05-01', '2026-05-31', 'This Month')
  const csv = toCsv(rows)

  assert.match(csv, /SO-1/)
  assert.match(csv, /PO-1/)
  assert.doesNotMatch(csv, /PO-2/)
  assert.ok(
    rows.some(
      (row) => row[0] === 'audit.csvSelectedPeriod' && row[1] === 'This Month',
    ),
  )
})

test('yearly export includes transactions from earlier months', () => {
  const rows = rowsFor('2026-01-01', '2026-12-31', 'This Year')
  const csv = toCsv(rows)

  assert.match(csv, /SO-1/)
  assert.match(csv, /PO-1/)
  assert.match(csv, /PO-2/)
  assert.ok(
    rows.some(
      (row) => row[0] === 'audit.csvSelectedPeriod' && row[1] === 'This Year',
    ),
  )
})

test('stock movements are aggregated per medicine for the chosen range', () => {
  const monthMovements = buildStockMovements(
    transactions.filter((tx) => tx.date.startsWith('2026-05')),
  )
  const yearMovements = buildStockMovements(transactions)

  assert.equal(monthMovements.length, 1)
  assert.equal(monthMovements[0].name, 'Amoxicillin')
  assert.equal(monthMovements[0].stockIn, 100)
  assert.equal(yearMovements.length, 2)
})
