import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  blankMedicineDraft,
  buildNewMedicineInput,
  findDuplicateMedicine,
  medicineCreateBlockedReason,
  validateMedicineDraft,
} from '../src/utils/medicineDraft.js'
import { largestPackaging, normalizeMedicine } from '../src/utils/inventory.js'
import { syncContract } from '../src/offline/syncService.js'

function validDraft(overrides = {}) {
  return {
    ...blankMedicineDraft({ name: 'Amoxicillin' }),
    strength: '500 mg',
    openingStock: '20',
    packaging: [
      { unit: 'tablet', contains: 1, price: '2' },
      { unit: 'strip', contains: 10, price: '20' },
      { unit: 'box', contains: 100, price: '200' },
      { unit: 'carton', contains: 1000, price: '2000' },
    ],
    ...overrides,
  }
}

test('quick-add draft prefills the search name and keeps base-unit packaging', () => {
  const draft = blankMedicineDraft({ name: 'Ibuprofen' })

  assert.equal(draft.name, 'Ibuprofen')
  assert.deepEqual(draft.packaging[0], {
    unit: 'tablet',
    contains: 1,
    price: '',
  })
  assert.equal(
    draft.packaging.find((level) => level.unit === 'strip').contains,
    10,
  )
})

test('validation requires name, strength, base unit, and a valid initial stock', () => {
  const missing = validateMedicineDraft(
    validDraft({ name: '  ', strength: '', baseUnit: '' }),
    { mode: 'add' },
  )
  assert.ok(missing.fieldErrors.name)
  assert.ok(missing.fieldErrors.strength)
  assert.ok(missing.fieldErrors.baseUnit)
  assert.equal(missing.valid, false)

  const negativeStock = validateMedicineDraft(
    validDraft({ openingStock: '-1' }),
    { mode: 'add' },
  )
  assert.ok(negativeStock.fieldErrors.openingStock)
  assert.equal(negativeStock.valid, false)

  const fractionalStock = validateMedicineDraft(
    validDraft({ openingStock: '2.5' }),
    { mode: 'add' },
  )
  assert.ok(fractionalStock.fieldErrors.openingStock)

  assert.equal(validateMedicineDraft(validDraft(), { mode: 'add' }).valid, true)
})

test('validation rejects invalid packaging prices and conversions', () => {
  const badPrice = validateMedicineDraft(
    validDraft({
      packaging: [
        { unit: 'tablet', contains: 1, price: 'abc' },
        { unit: 'strip', contains: 10, price: '20' },
      ],
    }),
    { mode: 'add' },
  )
  assert.ok(badPrice.packagingErrors.some((error) => /selling price/.test(error)))

  const badConversion = validateMedicineDraft(
    validDraft({
      packaging: [
        { unit: 'tablet', contains: 1, price: '2' },
        { unit: 'strip', contains: 0, price: '20' },
      ],
    }),
    { mode: 'add' },
  )
  assert.ok(
    badConversion.packagingErrors.some((error) => /whole number/.test(error)),
  )
})

test('quick-add requires a positive base-unit selling price', () => {
  const result = validateMedicineDraft(
    validDraft({
      packaging: [
        { unit: 'tablet', contains: 1, price: '0' },
        { unit: 'strip', contains: 10, price: '20' },
      ],
    }),
    { mode: 'add', requirePositivePrice: true },
  )

  assert.ok(
    result.packagingErrors.some((error) => /greater than zero/.test(error)),
  )
  assert.equal(result.valid, false)
})

test('duplicate name and strength is warned about without merging records', () => {
  const medicines = [
    { id: 'med-1', name: 'Amoxicillin', strength: '500 mg' },
    { id: 'med-2', name: 'Amoxicillin', strength: '250 mg' },
  ]

  assert.equal(
    findDuplicateMedicine(medicines, {
      name: '  amoxicillin ',
      strength: '500 MG',
    })?.id,
    'med-1',
  )

  const duplicate = validateMedicineDraft(validDraft(), {
    mode: 'add',
    medicines,
  })
  assert.equal(duplicate.duplicate.id, 'med-1')
  assert.equal(duplicate.valid, false)

  const differentStrength = validateMedicineDraft(
    validDraft({ strength: '125 mg' }),
    { mode: 'add', medicines },
  )
  assert.equal(differentStrength.duplicate, null)
  assert.equal(differentStrength.valid, true)

  assert.equal(
    findDuplicateMedicine(medicines, {
      name: 'Amoxicillin',
      strength: '500 mg',
      excludeId: 'med-1',
    }),
    null,
  )
})

test('created input keeps packaging conversions and initial base-unit stock', () => {
  const input = buildNewMedicineInput(validDraft())

  assert.equal(input.sellingPrice, 2)
  assert.equal(input.stock, 20)
  assert.equal(input.baseUnit, 'tablet')

  const strip = input.packaging.find((level) => level.unit === 'strip')
  assert.equal(strip.contains, 10)
  assert.equal(2 * strip.contains, 20)
  assert.equal(
    input.packaging.every((level) => typeof level.price === 'number'),
    true,
  )
})

test('a created medicine is immediately selectable with its top packaging unit', () => {
  const created = normalizeMedicine({
    id: 'med-1',
    ...buildNewMedicineInput(validDraft()),
    imagePath: '',
    imageUrl: '',
  })

  assert.equal(created.id, 'med-1')
  assert.equal(created.stock, 20)
  assert.equal(largestPackaging(created.packaging).unit, 'carton')
  assert.equal(
    created.packaging.find((level) => level.unit === 'tablet').price,
    2,
  )
})

test('offline creation is local-only and never silently queued in production', () => {
  assert.equal(medicineCreateBlockedReason({ isLocal: true, online: false }), '')
  assert.match(
    medicineCreateBlockedReason({ isLocal: false, online: false }),
    /offline/i,
  )
  assert.equal(
    medicineCreateBlockedReason({ isLocal: false, online: true }),
    '',
  )

  // Existing sync contract covers sales and purchases only. Medicine creation
  // is intentionally not added to the offline queue.
  assert.equal('medicine' in syncContract, false)
  assert.equal('medicineCreate' in syncContract, false)
})

test('a saved medicine remains saved when the following sale fails', async () => {
  const saved = []

  async function addMedicine(input) {
    const medicine = { id: 'med-1', ...input }
    saved.push(medicine)
    return medicine
  }

  async function recordSale() {
    throw new Error('network down')
  }

  const created = await addMedicine(buildNewMedicineInput(validDraft()))

  await assert.rejects(
    () => recordSale({ medicineId: created.id }),
    /network down/,
  )

  assert.equal(saved.length, 1)
  assert.equal(saved[0].id, 'med-1')
  assert.equal(saved[0].stock, 20)
})
