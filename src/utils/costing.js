import { roundMoney } from './format'

export const COST_STATUS = {
  AVAILABLE: 'available',
  PARTIAL: 'partial',
  UNAVAILABLE: 'unavailable',
}

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function transactionTime(transaction) {
  const value = transaction.recordedAt || transaction.date
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function costPerBaseFromBatch(batch, purchase) {
  const unitCostBase = Number(batch?.unitCostBase)
  if (Number.isFinite(unitCostBase)) return unitCostBase

  const unitCost = Number(batch?.unitCost ?? purchase?.unitPrice)
  const factor = Number(purchase?.unitFactor) || 1
  if (!Number.isFinite(unitCost) || factor <= 0) return 0
  return unitCost / factor
}

function hasBatchCostInfo(batch) {
  if (!batch) return false
  if (!Number.isFinite(Number(batch.unitCostBase))) return false
  return Number.isFinite(Number(batch.unitCost)) && Number(batch.unitCost) >= 0
}

export function openingUncostedBase(medicine, transactions) {
  const purchases = transactions.filter(
    (transaction) =>
      transaction.medicineId === medicine.id && transaction.type === 'purchase',
  )
  const sales = transactions.filter(
    (transaction) =>
      transaction.medicineId === medicine.id && transaction.type === 'sale',
  )

  const purchasedBase = purchases.reduce(
    (sum, transaction) => sum + numberOrZero(transaction.baseQuantity),
    0,
  )
  const soldBase = sales.reduce(
    (sum, transaction) => sum + numberOrZero(transaction.baseQuantity),
    0,
  )

  return Math.max(0, numberOrZero(medicine.stock) - purchasedBase + soldBase)
}

function allocate(state, baseQuantity) {
  let remaining = Math.max(0, numberOrZero(baseQuantity))
  const allocations = []

  const fromUncosted = Math.min(state.uncostedRemainingBase, remaining)
  state.uncostedRemainingBase -= fromUncosted
  remaining -= fromUncosted

  state.lots.forEach((lot) => {
    if (remaining <= 0) return
    const used = Math.min(lot.remainingBase, remaining)
    if (used <= 0) return
    lot.remainingBase -= used
    remaining -= used
    allocations.push({
      batchId: lot.batchId,
      quantityBase: used,
      unitCostBase: lot.unitCostBase,
    })
  })

  const costedBase = allocations.reduce(
    (sum, allocation) => sum + allocation.quantityBase,
    0,
  )
  const cogs = roundMoney(
    allocations.reduce(
      (sum, allocation) => sum + allocation.quantityBase * allocation.unitCostBase,
      0,
    ),
  )
  const uncostedBase = roundMoney(remaining + fromUncosted)
  const costStatus =
    uncostedBase === 0
      ? COST_STATUS.AVAILABLE
      : costedBase === 0
        ? COST_STATUS.UNAVAILABLE
        : COST_STATUS.PARTIAL

  return {
    cogs,
    costStatus,
    costedBase,
    uncostedBase,
    allocations,
  }
}

export function buildCostingSnapshot(medicines, transactions, batches) {
  const medicineById = new Map(medicines.map((medicine) => [medicine.id, medicine]))
  const batchById = new Map((batches ?? []).map((batch) => [batch.id, batch]))
  const batchByPurchase = new Map(
    (batches ?? [])
      .filter((batch) => batch.purchaseTransactionId)
      .map((batch) => [batch.purchaseTransactionId, batch]),
  )

  const byMedicine = new Map()
  medicines.forEach((medicine) => {
    byMedicine.set(medicine.id, {
      medicineId: medicine.id,
      uncostedRemainingBase: openingUncostedBase(medicine, transactions),
      lots: [],
    })
  })

  const chronological = transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((a, b) => {
      const timeDifference = transactionTime(a.transaction) - transactionTime(b.transaction)
      if (timeDifference !== 0) return timeDifference
      return b.index - a.index
    })

  const saleResults = new Map()
  const batchRemaining = new Map()

  chronological.forEach(({ transaction }) => {
    const medicine = medicineById.get(transaction.medicineId)
    const state = byMedicine.get(transaction.medicineId)
    if (!medicine || !state) return

    if (transaction.type === 'purchase') {
      const batch =
        batchById.get(transaction.purchaseBatchId) ??
        batchByPurchase.get(transaction.id)

      if (batch && hasBatchCostInfo(batch)) {
        const quantityReceivedBase = numberOrZero(
          batch.quantityReceivedBase ?? transaction.baseQuantity,
        )
        state.lots.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber || '',
          expiryDate: batch.expiryDate || '',
          date: batch.date || transaction.date,
          supplier: batch.supplier || transaction.supplier || '',
          purchaseTransactionId: transaction.id,
          remainingBase: quantityReceivedBase,
          receivedBase: quantityReceivedBase,
          unitCost: numberOrZero(batch.unitCost ?? transaction.unitPrice),
          unitCostBase: costPerBaseFromBatch(batch, transaction),
        })
      }
      return
    }

    if (transaction.type === 'sale') {
      const result = allocate(state, transaction.baseQuantity)
      saleResults.set(transaction.id, result)
    }
  })

  byMedicine.forEach((state) => {
    state.lots.forEach((lot) => {
      batchRemaining.set(lot.batchId, lot.remainingBase)
    })
  })

  ;(batches ?? []).forEach((batch) => {
    if (!batchRemaining.has(batch.id)) {
      batchRemaining.set(
        batch.id,
        numberOrZero(batch.quantityRemainingBase ?? batch.quantityReceivedBase),
      )
    }
  })

  return { byMedicine, saleResults, batchRemaining }
}

export function allocateSaleCost(snapshot, medicineId, baseQuantity) {
  const state = snapshot.byMedicine.get(medicineId)

  if (!state) {
    return {
      cogs: 0,
      costStatus: COST_STATUS.UNAVAILABLE,
      costedBase: 0,
      uncostedBase: baseQuantity,
      allocations: [],
    }
  }

  return allocate(state, baseQuantity)
}

export function getMedicineCostSummary(snapshot, medicineId) {
  const state = snapshot.byMedicine.get(medicineId)

  if (!state) {
    return {
      lots: [],
      knownBase: 0,
      uncostedBase: 0,
      knownValue: 0,
      averageCostPerBase: null,
    }
  }

  const lots = state.lots.filter((lot) => lot.remainingBase > 0)
  const knownBase = lots.reduce((sum, lot) => sum + lot.remainingBase, 0)
  const knownValue = lots.reduce(
    (sum, lot) => sum + lot.remainingBase * lot.unitCostBase,
    0,
  )

  return {
    lots,
    knownBase,
    uncostedBase: state.uncostedRemainingBase,
    knownValue: roundMoney(knownValue),
    averageCostPerBase: knownBase > 0 ? knownValue / knownBase : null,
  }
}

export function getSaleCosting(snapshot, transactionId) {
  return snapshot.saleResults.get(transactionId) ?? null
}
