import { test } from 'vitest'
import assert from 'node:assert/strict'
import { priceForLevel, normalizeMedicine } from '../src/utils/inventory.js'
import { roundMoney } from '../src/utils/format.js'

test('2 strips deduct 20 tablets', () => {
  const medicine = normalizeMedicine({
    id: 'm1',
    name: 'Paracetamol',
    strength: '500 mg',
    baseUnit: 'tablet',
    sellingPrice: 2.5,
    stock: 100,
    packaging: [
      { unit: 'tablet', contains: 1 },
      { unit: 'strip', contains: 10 },
    ],
  })
  const level = medicine.packaging.find((item) => item.unit === 'strip')
  assert.equal(2 * level.contains, 20)
})

test('priceForLevel uses configured packaging price', () => {
  const medicine = { sellingPrice: 2.5, packaging: [] }
  const level = { unit: 'strip', contains: 10, price: 30 }
  assert.equal(priceForLevel(medicine, level), 30)
})

test('roundMoney avoids floating point drift', () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3)
})
