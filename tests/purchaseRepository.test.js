import { test } from 'vitest'
import assert from 'node:assert/strict'
import { PurchaseRepository } from '../src/repositories/purchaseRepository.js'

function repositoryWith(client) {
  const repository = new PurchaseRepository()
  repository.client = () => client
  return repository
}

test('purchase repository calls batch capture RPC without client totals', async () => {
  const calls = []
  const client = {
    rpc(name, params) {
      calls.push({ name, params })
      return Promise.resolve({
        data: { purchase: { id: 'purchase-1' }, items: [], batches: [] },
        error: null,
      })
    },
  }
  const repository = repositoryWith(client)

  const result = await repository.createPurchaseWithBatches(
    'pharmacy-1',
    {
      supplierName: 'Supplier A',
      supplierId: 'supplier-1',
      purchaseDate: '2026-01-02T00:00:00.000Z',
      notes: 'restock',
      totalCost: 999,
      recordedBy: 'client-user',
    },
    [
      {
        medicineId: 'medicine-1',
        packagingUnitId: 'unit-2',
        unit: 'box',
        quantity: 2,
        unitCost: 100,
        baseQuantity: 999,
        totalCost: 999,
        batchNumber: ' LOT-1 ',
        expiryDate: '2099-12-31',
      },
    ],
    'purchase-ref-1',
  )

  assert.equal(result.purchase.id, 'purchase-1')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'create_purchase_with_batches')
  assert.deepEqual(calls[0].params, {
    p_pharmacy_id: 'pharmacy-1',
    p_client_reference: 'purchase-ref-1',
    p_items: [
      {
        medicineId: 'medicine-1',
        packagingUnitId: 'unit-2',
        quantity: 2,
        unitCost: 100,
        batchNumber: ' LOT-1 ',
        expiryDate: '2099-12-31',
      },
    ],
    p_supplier_name: 'Supplier A',
    p_supplier_id: 'supplier-1',
    p_purchase_date: '2026-01-02T00:00:00.000Z',
    p_notes: 'restock',
  })
  assert.equal(JSON.stringify(calls[0].params).includes('client-user'), false)
})

test('purchase repository falls back to unit and throws RPC errors', async () => {
  const rpcError = new Error('purchase failed')
  const client = {
    rpc(name, params) {
      assert.equal(name, 'create_purchase_with_batches')
      assert.deepEqual(params.p_items, [
        {
          medicineId: 'medicine-1',
          unit: 'tablet',
          quantity: 1,
          unitCost: 5,
          batchNumber: null,
          expiryDate: null,
        },
      ])
      return Promise.resolve({ data: null, error: rpcError })
    },
  }
  const repository = repositoryWith(client)

  await assert.rejects(
    repository.createPurchaseWithItems(
      'pharmacy-1',
      { supplierName: 'Supplier A' },
      [{ medicineId: 'medicine-1', unit: 'tablet', quantity: 1, unitCost: 5 }],
      'purchase-ref-2',
    ),
    (error) => error === rpcError,
  )
})
