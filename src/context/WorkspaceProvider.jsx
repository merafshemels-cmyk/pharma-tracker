import { useCallback, useEffect, useMemo, useState } from 'react'
import { WorkspaceContext } from './WorkspaceContext'
import { useAuth } from './AuthContext'
import { offlineDb } from '../offline/offlineDb'
import {
  allocateSaleCost,
  buildCostingSnapshot,
} from '../utils/costing'
import {
  fileToDataUrl,
  removeMedicineImage as removeRemoteMedicineImage,
  uploadMedicineImage as uploadRemoteMedicineImage,
} from '../services/medicineImageService'
import {
  createMedicine as createRemoteMedicine,
  deleteMedicine as deleteRemoteMedicine,
  loadWorkspace,
  recordBulkPurchase,
  recordPurchase as recordRemotePurchase,
  recordSale as recordRemoteSale,
  updateMedicine as updateRemoteMedicine,
  updatePharmacy,
  updateProfile,
  updatePharmacyMember as updateRemotePharmacyMember,
} from '../services/workspaceService'
import { nextTransactionCode, normalizeMedicine } from '../utils/inventory'
import { medicineCreateBlockedReason } from '../utils/medicineDraft'
import {
  buildImportResult,
  buildLocalImportState,
  executeRemoteImport,
  todayIso,
} from '../utils/medicineImport'
import { roundMoney } from '../utils/format'
import { canManageInventory, normalizeRole, ROLE_LABELS } from '../utils/roles'

const LOCAL_STORAGE_KEY = 'pharmatrack-workspace-v1'

const EMPTY_LOCAL_STATE = {
  pharmacy: { name: '', location: '', phone: '' },
  profile: { name: '', phone: '' },
  medicines: [],
  transactions: [],
  batches: [],
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function loadLocalState() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return EMPTY_LOCAL_STATE
    const parsed = JSON.parse(raw)
    return {
      pharmacy: { ...EMPTY_LOCAL_STATE.pharmacy, ...(parsed.pharmacy ?? {}) },
      profile: { ...EMPTY_LOCAL_STATE.profile, ...(parsed.profile ?? {}) },
      medicines: Array.isArray(parsed.medicines)
        ? parsed.medicines.map(normalizeMedicine)
        : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      batches: Array.isArray(parsed.batches) ? parsed.batches : [],
    }
  } catch {
    return EMPTY_LOCAL_STATE
  }
}

function cacheWorkspace(pharmacyId, workspace) {
  Promise.all([
    offlineDb.medicines.bulkPut(
      workspace.medicines.map((medicine) => ({
        id: medicine.id,
        pharmacyId,
        name: medicine.name,
        stock: medicine.stock,
        updatedAt: new Date().toISOString(),
      })),
    ),
    offlineDb.batches.bulkPut(
      workspace.batches.map((batch) => ({
        ...batch,
        pharmacyId,
        updatedAt: new Date().toISOString(),
      })),
    ),
  ]).catch(() => {})
}

export function WorkspaceProvider({ children }) {
  const auth = useAuth()
  const isLocal = auth.isLocal
  const [localData, setLocalData] = useState(loadLocalState)
  const [remoteData, setRemoteData] = useState({
    medicines: [],
    transactions: [],
    batches: [],
    members: [],
  })
  const [loading, setLoading] = useState(!isLocal)
  const [error, setError] = useState('')

  const pharmacyId = auth.pharmacy?.id ?? null
  const role = normalizeRole(auth.role)

  useEffect(() => {
    if (isLocal) {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData))
      } catch {
        // Local storage can be unavailable in private browsing modes.
      }
    }
  }, [isLocal, localData])

  const refresh = useCallback(async () => {
    if (isLocal) return
    if (!pharmacyId) {
      setLoading(false)
      setRemoteData({ medicines: [], transactions: [], batches: [], members: [] })
      return
    }

    setLoading(true)
    setError('')
    try {
      const workspace = await loadWorkspace(pharmacyId)
      setRemoteData(workspace)
      cacheWorkspace(pharmacyId, workspace)
    } catch (loadError) {
      setError(loadError.message || 'Unable to load pharmacy records.')
    } finally {
      setLoading(false)
    }
  }, [isLocal, pharmacyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const data = isLocal ? localData : remoteData

  const pharmacy = useMemo(
    () =>
      isLocal
        ? {
            ...localData.pharmacy,
            name: localData.pharmacy.name || 'Pharmacy workspace',
          }
        : auth.pharmacy,
    [isLocal, localData.pharmacy, auth.pharmacy],
  )

  const profile = isLocal ? localData.profile : auth.profile
  const members = isLocal ? [] : remoteData.members

  const value = {
    pharmacy,
    profile,
    staff: {
      name: profile?.full_name || profile?.name || '',
      phone: profile?.phone || '',
      role: ROLE_LABELS[role],
    },
    medicines: data.medicines,
    transactions: data.transactions,
    batches: data.batches,
    members,
    role,
    roleLabel: ROLE_LABELS[role],
    isLocal,
    loading,
    error: error || auth.error,
    authStatus: auth.status,
    email: auth.user?.email ?? '',
    refresh,
    signIn: auth.signIn,
    signOut: auth.signOut,
  }

  function localAddMedicine(input) {
    const medicine = normalizeMedicine({
      ...input,
      id: makeId('med'),
      imagePath: '',
      imageUrl: '',
    })
    setLocalData((previous) => ({
      ...previous,
      medicines: [...previous.medicines, medicine],
    }))
    return medicine
  }

  function localUpdateMedicine(id, updates) {
    setLocalData((previous) => ({
      ...previous,
      medicines: previous.medicines.map((medicine) =>
        medicine.id === id
          ? normalizeMedicine({
              ...medicine,
              ...updates,
              packaging: updates.packaging ?? medicine.packaging,
            })
          : medicine,
      ),
    }))
  }

  async function addMedicine(input) {
    if (isLocal) return localAddMedicine(input)

    const blockedReason = medicineCreateBlockedReason({
      isLocal,
      online: typeof navigator === 'undefined' ? undefined : navigator.onLine,
    })
    if (blockedReason) throw new Error(blockedReason)

    try {
      const medicine = await createRemoteMedicine(pharmacyId, input)
      await refresh()
      // Return the same shape the picker uses so Sales can select the new
      // medicine before the refreshed list has rendered.
      return normalizeMedicine({
        id: medicine.id,
        name: input.name,
        strength: input.strength,
        dosageForm: input.dosageForm,
        baseUnit: input.baseUnit,
        sellingPrice: input.sellingPrice,
        lowStockThreshold: input.lowStockThreshold,
        stock: input.stock,
        imagePath: '',
        imageUrl: '',
        packaging: input.packaging,
      })
    } catch (createError) {
      throw new Error(createError.message || 'Unable to add the medicine.')
    }
  }

  async function updateMedicine(id, updates) {
    if (isLocal) {
      localUpdateMedicine(id, updates)
      return
    }
    try {
      await updateRemoteMedicine(pharmacyId, id, updates)
      await refresh()
    } catch (updateError) {
      throw new Error(updateError.message || 'Unable to update the medicine.')
    }
  }

  async function updateSettings({ pharmacy: pharmacyUpdates, profile: profileUpdates }) {
    if (isLocal) {
      setLocalData((previous) => ({
        ...previous,
        pharmacy: { ...previous.pharmacy, ...pharmacyUpdates },
        profile: { ...previous.profile, ...profileUpdates },
      }))
      return
    }

    try {
      if (pharmacyUpdates && pharmacyId) {
        await updatePharmacy(pharmacyId, pharmacyUpdates)
      }
      if (profileUpdates) {
        await updateProfile(auth.user.id, profileUpdates)
      }
      await refresh()
    } catch (settingsError) {
      throw new Error(settingsError.message || 'Unable to save settings.')
    }
  }

  async function updateMember(memberId, updates) {
    if (isLocal) return
    try {
      await updateRemotePharmacyMember(pharmacyId, memberId, updates)
      await refresh()
    } catch (memberError) {
      throw new Error(
        memberError.message || 'Unable to update the staff member.',
      )
    }
  }

  async function uploadMedicineImage(medicineId, file) {
    if (isLocal) {
      const dataUrl = await fileToDataUrl(file)
      setLocalData((previous) => ({
        ...previous,
        medicines: previous.medicines.map((medicine) =>
          medicine.id === medicineId
            ? { ...medicine, imagePath: dataUrl, imageUrl: dataUrl }
            : medicine,
        ),
      }))
      return dataUrl
    }

    const medicine = remoteData.medicines.find((item) => item.id === medicineId)
    try {
      const path = await uploadRemoteMedicineImage({
        pharmacyId,
        medicineId,
        file,
        previousPath: medicine?.imagePath ?? '',
      })
      await refresh()
      return path
    } catch (uploadError) {
      throw new Error(
        uploadError.message ||
          'Unable to upload the image. Confirm the medicine image storage migration has been applied.',
      )
    }
  }

  async function removeMedicineImage(medicineId) {
    if (isLocal) {
      setLocalData((previous) => ({
        ...previous,
        medicines: previous.medicines.map((medicine) =>
          medicine.id === medicineId
            ? { ...medicine, imagePath: '', imageUrl: '' }
            : medicine,
        ),
      }))
      return
    }

    const medicine = remoteData.medicines.find((item) => item.id === medicineId)
    try {
      await removeRemoteMedicineImage({
        pharmacyId,
        medicineId,
        imagePath: medicine?.imagePath ?? '',
      })
      await refresh()
    } catch (removeError) {
      throw new Error(removeError.message || 'Unable to remove the image.')
    }
  }

  async function recordSale(input) {
    if (isLocal) {
      const { medicineId, quantity, unitPrice } = input
      const medicine = localData.medicines.find((item) => item.id === medicineId)
      if (!medicine) {
        return { ok: false, error: 'Choose a medicine that exists in the inventory.' }
      }
      // Accept either the full packaging level object (used by the sales
      // picker and remote service) or a unit label for backwards compatibility.
      const level =
        (input.level &&
          medicine.packaging.find((item) => item.unit === input.level.unit)) ||
        medicine.packaging.find((item) => item.unit === input.unit)
      if (!level) return { ok: false, error: 'Choose a valid selling unit.' }
      if (!Number.isInteger(quantity) || quantity < 1) {
        return { ok: false, error: 'Quantity must be a whole number of at least 1.' }
      }
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return { ok: false, error: 'Selling price must be greater than zero.' }
      }

      const baseQuantity = quantity * level.contains
      if (baseQuantity > medicine.stock) {
        return {
          ok: false,
          error: `Not enough stock. Available: ${medicine.stock} ${medicine.baseUnit}(s), requested: ${baseQuantity}.`,
        }
      }

      const recordedAt = new Date().toISOString()
      const total = roundMoney(quantity * unitPrice)
      const costing = buildCostingSnapshot(
        localData.medicines,
        localData.transactions,
        localData.batches,
      )
      const allocation = allocateSaleCost(costing, medicine.id, baseQuantity)
      const nextBatchRemaining = new Map(costing.batchRemaining)
      allocation.allocations.forEach((item) => {
        nextBatchRemaining.set(
          item.batchId,
          Math.max(0, (nextBatchRemaining.get(item.batchId) ?? 0) - item.quantityBase),
        )
      })

      const transaction = {
        id: makeId('sale'),
        saleId: makeId('sale'),
        code: nextTransactionCode(localData.transactions, 'sale'),
        type: 'sale',
        date: recordedAt,
        recordedAt,
        medicineId: medicine.id,
        medicineName: `${medicine.name} ${medicine.strength}`.trim(),
        unit: level.unit,
        unitFactor: level.contains,
        quantity,
        baseQuantity,
        baseUnit: medicine.baseUnit,
        unitPrice: roundMoney(unitPrice),
        total,
        cogs: allocation.cogs,
        costStatus: allocation.costStatus,
        costedBaseQuantity: allocation.costedBase,
        uncostedBaseQuantity: allocation.uncostedBase,
        staff: profile?.full_name || profile?.name || '',
        supplier: '',
        batchNumber: '',
        expiryDate: '',
      }

      setLocalData((previous) => ({
        ...previous,
        medicines: previous.medicines.map((item) =>
          item.id === medicine.id
            ? { ...item, stock: item.stock - baseQuantity }
            : item,
        ),
        batches: previous.batches.map((batch) =>
          nextBatchRemaining.has(batch.id)
            ? { ...batch, quantityRemainingBase: nextBatchRemaining.get(batch.id) }
            : batch,
        ),
        transactions: [transaction, ...previous.transactions],
      }))

      return { ok: true, transaction }
    }

    try {
      const result = await recordRemoteSale(pharmacyId, input)
      await refresh()
      return {
        ok: true,
        transaction: {
          code:
            result?.sale?.client_reference ||
            result?.client_reference ||
            'Sale recorded',
        },
      }
    } catch (saleError) {
      return {
        ok: false,
        error:
          saleError.message ||
          'Unable to record the sale. Confirm the atomic sale migration has been applied.',
      }
    }
  }

  async function recordPurchase(input) {
    if (isLocal) {
      const {
        medicineId,
        supplier,
        quantity,
        unitCost,
        date,
        batchNumber,
        expiryDate,
      } = input
      const medicine = localData.medicines.find((item) => item.id === medicineId)
      if (!medicine) {
        return { ok: false, error: 'Choose a medicine that exists in the inventory.' }
      }
      if (!supplier || !supplier.trim()) {
        return { ok: false, error: 'Supplier name is required.' }
      }
      // Accept the full packaging level object or a unit label.
      const level =
        (input.level &&
          medicine.packaging.find((item) => item.unit === input.level.unit)) ||
        medicine.packaging.find((item) => item.unit === input.unit)
      if (!level) return { ok: false, error: 'Choose a valid packaging unit.' }
      if (!Number.isInteger(quantity) || quantity < 1) {
        return { ok: false, error: 'Quantity must be a whole number of at least 1.' }
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        return { ok: false, error: 'Purchase cost cannot be negative.' }
      }
      if (!date) return { ok: false, error: 'Choose the purchase date.' }

      const baseQuantity = quantity * level.contains
      const total = roundMoney(quantity * unitCost)
      const recordedAt = new Date().toISOString()
      const batchId = makeId('batch')
      const transaction = {
        id: makeId('purchase'),
        purchaseId: makeId('purchase'),
        code: nextTransactionCode(localData.transactions, 'purchase'),
        type: 'purchase',
        date: new Date(`${date}T12:00:00`).toISOString(),
        recordedAt,
        medicineId: medicine.id,
        medicineName: `${medicine.name} ${medicine.strength}`.trim(),
        unit: level.unit,
        unitFactor: level.contains,
        quantity,
        baseQuantity,
        baseUnit: medicine.baseUnit,
        unitPrice: roundMoney(unitCost),
        total,
        purchaseBatchId: batchId,
        staff: profile?.full_name || profile?.name || '',
        supplier: supplier.trim(),
        batchNumber: batchNumber.trim(),
        expiryDate,
      }
      const batch = {
        id: batchId,
        medicineId: medicine.id,
        batchNumber: batchNumber.trim(),
        expiryDate,
        unitCost: roundMoney(unitCost),
        unitCostBase: unitCost / level.contains,
        quantityReceivedBase: baseQuantity,
        quantityRemainingBase: baseQuantity,
        purchaseTransactionId: transaction.id,
        date: transaction.date,
        recordedAt,
        supplier: supplier.trim(),
      }

      setLocalData((previous) => ({
        ...previous,
        medicines: previous.medicines.map((item) =>
          item.id === medicine.id
            ? { ...item, stock: item.stock + baseQuantity }
            : item,
        ),
        batches: [batch, ...previous.batches],
        transactions: [transaction, ...previous.transactions],
      }))

      return { ok: true, transaction }
    }

    try {
      const result = await recordRemotePurchase(pharmacyId, input)
      await refresh()
      return {
        ok: true,
        transaction: {
          code:
            result?.purchase?.client_reference ||
            result?.client_reference ||
            'Purchase recorded',
        },
      }
    } catch (purchaseError) {
      return {
        ok: false,
        error:
          purchaseError.message ||
          'Unable to record the purchase. Confirm the purchase batch migration has been applied.',
      }
    }
  }

  async function importMedicines(rows, { signature = '', fileName = '' } = {}) {
    if (!canManageInventory(role)) {
      throw new Error('Only the owner can import medicines.')
    }

    const validRows = (rows ?? []).filter((row) => row.status === 'valid')
    if (validRows.length === 0) {
      return buildImportResult(rows ?? [], [])
    }

    const blockedReason = medicineCreateBlockedReason({
      isLocal,
      online: typeof navigator === 'undefined' ? undefined : navigator.onLine,
    })
    if (blockedReason) throw new Error(blockedReason)

    if (isLocal) {
      const { state, result } = buildLocalImportState(localData, rows, {
        staff: profile?.full_name || profile?.name || '',
        today: todayIso(),
      })
      setLocalData(state)
      return { ...result, fileName }
    }

    const result = await executeRemoteImport({
      pharmacyId,
      rows,
      signature,
      createMedicine: createRemoteMedicine,
      createPurchase: recordBulkPurchase,
      deleteMedicine: deleteRemoteMedicine,
      today: todayIso(),
    })

    await refresh()
    return { ...result, fileName }
  }

  const providerValue = {
    ...value,
    addMedicine,
    updateMedicine,
    updateSettings,
    updateMember,
    uploadMedicineImage,
    removeMedicineImage,
    recordSale,
    recordPurchase,
    importMedicines,
  }

  return (
    <WorkspaceContext.Provider value={providerValue}>
      {children}
    </WorkspaceContext.Provider>
  )
}
