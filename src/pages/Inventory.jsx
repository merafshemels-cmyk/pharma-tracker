import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import Modal from '../components/Modal'
import MedicineFormModal from '../components/MedicineFormModal'
import ImportMedicinesModal from '../components/ImportMedicinesModal'
import MedicineImage from '../components/MedicineImage'
import {
  describeStock,
  isLowStock,
  largestPackaging,
  packagingChain,
  priceForLevel,
  stockStatus,
} from '../utils/inventory'
import { buildCostingSnapshot, getMedicineCostSummary } from '../utils/costing'
import { formatDate, formatETB, formatNumber, pluralize } from '../utils/format'
import { canManageInventory } from '../utils/roles'
import { matchesMedicine } from '../utils/medicineSearch'
import { translateDosage } from '../i18n/translations'

function Inventory({ query, onQueryChange, navigate, initialStatus = 'all' }) {
  const { medicines, transactions, batches, role } = useWorkspace()
  const { t } = usePreferences()
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [modal, setModal] = useState(null)
  const canManage = canManageInventory(role)
  const costing = useMemo(
    () => buildCostingSnapshot(medicines, transactions, batches),
    [medicines, transactions, batches],
  )

  useEffect(() => {
    if (initialStatus) setStatusFilter(initialStatus)
  }, [initialStatus])

  const filtered = [...medicines]
    .filter((medicine) => {
      if (!matchesMedicine(medicine, query)) return false
      if (statusFilter === 'low') return isLowStock(medicine)
      if (statusFilter === 'out') return medicine.stock <= 0
      if (statusFilter === 'in') return medicine.stock > medicine.lowStockThreshold
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const selectedMedicine =
    modal?.medicineId && medicines.find((item) => item.id === modal.medicineId)
  const selectedCost = selectedMedicine
    ? getMedicineCostSummary(costing, selectedMedicine.id)
    : null

  function openAdd() {
    setModal({ type: 'add' })
  }

  function openImport() {
    setModal({ type: 'import' })
  }

  function openView(medicineId) {
    setModal({ type: 'view', medicineId })
  }

  function openEdit(medicineId) {
    setModal({ type: 'edit', medicineId })
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('inventory.title')}</h1>
          <p className="page-sub">{t('inventory.subtitle')}</p>
        </div>
        {canManage && (
          <div className="heading-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('packaging')}
            >
              {t('inventory.managePackaging')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={openImport}
            >
              {t('inventory.importExcel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              {t('inventory.addMedicine')}
            </button>
          </div>
        )}
      </div>

      <section className="panel" aria-labelledby="inventory-title">
        <div className="panel-head panel-head-wrap">
          <div>
            <h2 id="inventory-title">{t('inventory.panelTitle')}</h2>
            <p className="panel-sub">
              {t('inventory.showing', {
                shown: filtered.length,
                total: medicines.length,
              })}
            </p>
          </div>
          <div className="toolbar">
            <div className="field-inline">
              <label className="sr-only" htmlFor="inventory-search">
                {t('inventory.searchAria')}
              </label>
              <input
                id="inventory-search"
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t('inventory.searchPlaceholder')}
              />
            </div>
            <div className="field-inline">
              <label className="sr-only" htmlFor="inventory-filter">
                {t('inventory.filterAria')}
              </label>
              <select
                id="inventory-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">{t('inventory.allStock')}</option>
                <option value="in">{t('inventory.inStock')}</option>
                <option value="low">{t('inventory.lowStock')}</option>
                <option value="out">{t('inventory.outOfStock')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="inventory-table">
            <caption className="sr-only">{t('inventory.caption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('inventory.medicine')}</th>
                <th scope="col">{t('inventory.packaging')}</th>
                <th scope="col">{t('inventory.stockOnHand')}</th>
                <th scope="col">{t('inventory.sellingPrice')}</th>
                {canManage && <th scope="col">{t('inventory.purchaseCost')}</th>}
                <th scope="col">{t('inventory.status')}</th>
                <th scope="col">{t('inventory.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 6}>
                    <div className="empty-state">
                      {t('inventory.noMatch')}
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((medicine) => {
                const status = stockStatus(medicine)
                const top = largestPackaging(medicine.packaging)
                const cost = getMedicineCostSummary(costing, medicine.id)

                return (
                  <tr
                    key={medicine.id}
                    className={`inventory-row tone-${status.tone}`}
                  >
                    <td>
                      <div className="medicine-cell">
                        <MedicineImage medicine={medicine} />
                        <span>
                          <span className="strong">{medicine.name}</span>
                          <span className="cell-sub">
                            {medicine.strength} ·{' '}
                            {translateDosage(t, medicine.dosageForm)}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="packaging-main">
                        1 {top.unit} = {formatNumber(top.contains)}{' '}
                        {pluralize(medicine.baseUnit, top.contains)}
                      </span>
                      <span className="level-chip">
                        {t('inventory.levelCount', {
                          count: medicine.packaging.length,
                        })}
                      </span>
                    </td>
                    <td>
                      <div className={`stock-cell tone-${status.tone}`}>
                        <span className="stock-amount">
                          {formatNumber(medicine.stock)}{' '}
                          <small>
                            {pluralize(medicine.baseUnit, medicine.stock)}
                          </small>
                        </span>
                        <span className="stock-pack">
                          {describeStock(medicine.stock, medicine.packaging)}
                        </span>
                      </div>
                    </td>
                    <td>
                      {[...medicine.packaging]
                        .sort((a, b) => a.contains - b.contains)
                        .map((level, index) => (
                          <span
                            key={level.unit}
                            className={`price-line ${
                              index === 0 ? 'price-primary' : 'price-secondary'
                            }`}
                          >
                            {t('inventory.perUnit', {
                              price: formatETB(priceForLevel(medicine, level)),
                              unit: level.unit,
                            })}
                          </span>
                        ))}
                    </td>
                    {canManage && (
                      <td>
                        {cost.averageCostPerBase === null ? (
                          <span className="cost-flag is-unavailable">
                            {t('inventory.costUnavailable')}
                          </span>
                        ) : (
                          <>
                            <span className="cost-primary">
                              {formatETB(cost.averageCostPerBase)}{' '}
                              <small>/ {medicine.baseUnit}</small>
                            </span>
                            <span className="cell-sub">
                              {t('inventory.costed', {
                                count: formatNumber(cost.knownBase),
                                unit: pluralize(
                                  medicine.baseUnit,
                                  cost.knownBase,
                                ),
                              })}
                            </span>
                            {cost.uncostedBase > 0 && (
                              <span className="cost-flag is-partial">
                                {t('inventory.uncosted', {
                                  count: formatNumber(cost.uncostedBase),
                                })}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                    )}
                    <td>
                      <span className={`status-badge is-${status.tone}`}>
                        {t(status.key)}
                      </span>
                      <span className="cell-sub">
                        {t('inventory.threshold', {
                          count: formatNumber(medicine.lowStockThreshold),
                        })}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openView(medicine.id)}
                        >
                          {t('common.view')}
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(medicine.id)}
                          >
                            {t('common.edit')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.type === 'add' && (
        <MedicineFormModal mode="add" onClose={() => setModal(null)} />
      )}

      {modal?.type === 'import' && (
        <ImportMedicinesModal onClose={() => setModal(null)} />
      )}

      {modal?.type === 'edit' && selectedMedicine && (
        <MedicineFormModal
          mode="edit"
          medicine={selectedMedicine}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'view' && selectedMedicine && (
        <Modal
          title={`${selectedMedicine.name} ${selectedMedicine.strength}`}
          subtitle={t('inventory.detailSubtitle', {
            form: translateDosage(t, selectedMedicine.dosageForm),
            unit: selectedMedicine.baseUnit,
          })}
          onClose={() => setModal(null)}
          wide
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModal(null)}
              >
                {t('common.close')}
              </button>
              {canManage && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openEdit(selectedMedicine.id)}
                >
                  {t('inventory.editMedicine')}
                </button>
              )}
            </>
          }
        >
          <div className="medicine-detail-head">
            <MedicineImage
              medicine={selectedMedicine}
              className="medicine-thumb-lg"
            />
            <div>
              <span className="detail-label">
                {t('inventory.medicineLabel')}
              </span>
              <span className="detail-value">
                {selectedMedicine.name} {selectedMedicine.strength}
              </span>
              <span className="hint">
                {translateDosage(t, selectedMedicine.dosageForm)}
              </span>
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <span className="detail-label">
                {t('inventory.stockOnHand')}
              </span>
              <span className="detail-value">
                {formatNumber(selectedMedicine.stock)}{' '}
                {pluralize(selectedMedicine.baseUnit, selectedMedicine.stock)}
              </span>
            </div>
            <div>
              <span className="detail-label">
                {t('inventory.lowStockThreshold')}
              </span>
              <span className="detail-value">
                {formatNumber(selectedMedicine.lowStockThreshold)}{' '}
                {pluralize(
                  selectedMedicine.baseUnit,
                  selectedMedicine.lowStockThreshold,
                )}
              </span>
            </div>
            <div>
              <span className="detail-label">
                {t('inventory.sellingPrice')}
              </span>
              <span className="detail-value">
                {formatETB(selectedMedicine.sellingPrice)} /{' '}
                {selectedMedicine.baseUnit}
              </span>
            </div>
            {canManage && (
              <div>
                <span className="detail-label">
                  {t('inventory.purchaseCostBasis')}
                </span>
                <span className="detail-value">
                  {selectedCost.averageCostPerBase === null
                    ? t('inventory.costUnavailable')
                    : `${formatETB(selectedCost.averageCostPerBase)} / ${selectedMedicine.baseUnit}`}
                </span>
                {selectedCost.uncostedBase > 0 && (
                  <span className="hint">
                    {t('inventory.openingNoCost', {
                      count: formatNumber(selectedCost.uncostedBase),
                      unit: pluralize(
                        selectedMedicine.baseUnit,
                        selectedCost.uncostedBase,
                      ),
                    })}
                  </span>
                )}
              </div>
            )}
            <div>
              <span className="detail-label">{t('inventory.status')}</span>
              <span
                className={`status is-${stockStatus(selectedMedicine).tone}`}
              >
                {t(stockStatus(selectedMedicine).key)}
              </span>
            </div>
          </div>

          <div className="form-section">
            <h3>{t('inventory.stockBreakdown')}</h3>
            <p className="hint">
              {describeStock(
                selectedMedicine.stock,
                selectedMedicine.packaging,
              )}{' '}
              = {formatNumber(selectedMedicine.stock)}{' '}
              {pluralize(selectedMedicine.baseUnit, selectedMedicine.stock)}
            </p>
            <p className="hint">{packagingChain(selectedMedicine.packaging)}</p>
          </div>

          <div className="form-section">
            <h3>{t('inventory.packagingAndPrices')}</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t('packaging.unit')}</th>
                    <th scope="col">{t('inventory.baseUnitsPerUnit')}</th>
                    <th scope="col">{t('inventory.sellingPrice')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...selectedMedicine.packaging]
                    .sort((a, b) => b.contains - a.contains)
                    .map((level) => (
                      <tr key={level.unit}>
                        <td className="strong">{level.unit}</td>
                        <td>
                          {formatNumber(level.contains)}{' '}
                          {pluralize(
                            selectedMedicine.baseUnit,
                            level.contains,
                          )}
                        </td>
                        <td>
                          {formatETB(priceForLevel(selectedMedicine, level))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {canManage && (
            <div className="form-section">
              <h3>{t('inventory.purchaseBatches')}</h3>
              <p className="hint">{t('inventory.purchaseBatchesHint')}</p>
              {selectedCost.lots.length === 0 ? (
                <div className="empty-state">
                  {t('inventory.noPurchaseCost')}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">{t('inventory.batch')}</th>
                        <th scope="col">{t('inventory.purchaseDate')}</th>
                        <th scope="col">{t('inventory.received')}</th>
                        <th scope="col">{t('inventory.remaining')}</th>
                        <th scope="col">
                          {t('inventory.costPerBase', {
                            unit: selectedMedicine.baseUnit,
                          })}
                        </th>
                        <th scope="col">{t('inventory.expiry')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCost.lots.map((lot) => (
                        <tr key={lot.batchId}>
                          <td className="strong">
                            {lot.batchNumber || t('common.unknown')}
                          </td>
                          <td>{formatDate(lot.date)}</td>
                          <td>
                            {formatNumber(lot.receivedBase)}{' '}
                            {pluralize(
                              selectedMedicine.baseUnit,
                              lot.receivedBase,
                            )}
                          </td>
                          <td>
                            {formatNumber(lot.remainingBase)}{' '}
                            {pluralize(
                              selectedMedicine.baseUnit,
                              lot.remainingBase,
                            )}
                          </td>
                          <td>{formatETB(lot.unitCostBase)}</td>
                          <td>
                            {lot.expiryDate
                              ? formatDate(lot.expiryDate)
                              : t('common.unknown')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

export default Inventory
