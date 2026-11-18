import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  filterMedicines,
  matchesMedicine,
  medicineSearchText,
} from '../src/utils/medicineSearch.js'

const medicines = [
  {
    id: 'm1',
    name: 'Amoxicillin',
    strength: '500 mg',
    dosageForm: 'Capsule',
    stock: 120,
    lowStockThreshold: 50,
  },
  {
    id: 'm2',
    name: 'Paracetamol',
    strength: '250 mg',
    dosageForm: 'Tablet',
    stock: 10,
    lowStockThreshold: 20,
  },
  {
    id: 'm3',
    name: 'Paracetamol',
    strength: '1 g',
    dosageForm: 'Tablet',
    stock: 0,
    lowStockThreshold: 20,
  },
]

test('search matches name, strength, and dosage form case-insensitively', () => {
  assert.equal(matchesMedicine(medicines[0], 'amox'), true)
  assert.equal(matchesMedicine(medicines[0], '500 MG'), true)
  assert.equal(matchesMedicine(medicines[0], 'capsule'), true)
  assert.equal(matchesMedicine(medicines[1], 'amox'), false)
})

test('search requires every term to match', () => {
  assert.equal(matchesMedicine(medicines[1], 'paracetamol 250'), true)
  assert.equal(matchesMedicine(medicines[1], 'paracetamol 500'), false)
  assert.equal(matchesMedicine(medicines[1], '   '), true)
})

test('search text joins the fields cashiers search by', () => {
  assert.equal(medicineSearchText(medicines[0]), 'amoxicillin 500 mg capsule')
})

test('filterMedicines returns alphabetical matches with stock filters', () => {
  assert.deepEqual(
    filterMedicines(medicines, 'para').map((item) => item.strength),
    ['250 mg', '1 g'],
  )
  assert.deepEqual(
    filterMedicines(medicines, '', { status: 'low' }).map((item) => item.id),
    ['m2', 'm3'],
  )
  assert.deepEqual(
    filterMedicines(medicines, '', { status: 'out' }).map((item) => item.id),
    ['m3'],
  )
  assert.deepEqual(
    filterMedicines(medicines, '', { status: 'in' }).map((item) => item.id),
    ['m1'],
  )
})
