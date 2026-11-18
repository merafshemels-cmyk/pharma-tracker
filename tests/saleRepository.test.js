import { test } from 'vitest'
import assert from 'node:assert/strict'
import { SaleRepository } from '../src/repositories/saleRepository.js'

function repositoryWith(client) {
  const repository = new SaleRepository()
  repository.client = () => client
  return repository
}

test('sale repository calls the atomic FEFO RPC with server-owned fields only', async () => {
  const calls = []
  const client = {
    rpc(name, params) {
      calls.push({ name, params })
      return Promise.resolve({
        data: { sale: { id: 'sale-1' }, items: [], allocations: [] },
        error: null,
      })
    },
  }
  const repository = repositoryWith(client)

  const result = await repository.createSaleWithFefo(
    'pharmacy-1',
    {
      saleDate: '2026-01-01T00:00:00.000Z',
      notes: 'counter sale',
      recordedBy: 'client-user',
      totalAmount: 999,
    },
    [
      {
        medicineId: 'medicine-1',
        packagingUnitId: 'unit-1',
        unit: 'box',
        quantity: 2,
        unitPrice: 10,
        baseQuantity: 999,
        total: 999,
        cogs: 999,
        costStatus: 'available',
        costedBaseQuantity: 999,
        uncostedBaseQuantity: 999,
      },
    ],
    'sale-ref-1',
  )

  assert.equal(result.sale.id, 'sale-1')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'create_sale_with_fefo')
  assert.deepEqual(calls[0].params, {
    p_pharmacy_id: 'pharmacy-1',
    p_client_reference: 'sale-ref-1',
    p_items: [
      {
        medicineId: 'medicine-1',
        packagingUnitId: 'unit-1',
        quantity: 2,
        unitPrice: 10,
      },
    ],
    p_sale_date: '2026-01-01T00:00:00.000Z',
    p_notes: 'counter sale',
  })
  assert.equal(JSON.stringify(calls[0].params).includes('999'), false)
  assert.equal(JSON.stringify(calls[0].params).includes('client-user'), false)
})

test('sale repository falls back to unit and throws RPC errors', async () => {
  const rpcError = Object.assign(new Error('FEFO_CONFLICT'), { code: 'PT409' })
  const client = {
    rpc(name, params) {
      assert.equal(name, 'create_sale_with_fefo')
      assert.deepEqual(params.p_items, [
        {
          medicineId: 'medicine-1',
          unit: 'tablet',
          quantity: 1,
          unitPrice: 5,
        },
      ])
      return Promise.resolve({ data: null, error: rpcError })
    },
  }
  const repository = repositoryWith(client)

  await assert.rejects(
    repository.createSaleWithItems(
      'pharmacy-1',
      {},
      [{ medicineId: 'medicine-1', unit: 'tablet', quantity: 1, unitPrice: 5 }],
      'sale-ref-2',
    ),
    (error) => error === rpcError,
  )
})
