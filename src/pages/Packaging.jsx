import { useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import PackagingEditor from '../components/PackagingEditor'
import {
  packagingChain,
  priceForLevel,
  validatePackaging,
} from '../utils/inventory'
import { formatETB, formatNumber, pluralize } from '../utils/format'

function Packaging() {
  const { medicines, updateMedicine } = useWorkspace()
  const { t } = usePreferences()
  const [selectedId, setSelectedId] = useState(medicines[0]?.id ?? '')
  const [draft, setDraft] = useState(() =>
    medicines[0]
      ? medicines[0].packaging.map((level) => ({
          ...level,
          price: String(priceForLevel(medicines[0], level)),
        }))
      : [],
  )
  const [errors, setErrors] = useState([])
  const [notice, setNotice] = useState('')

  const selected = medicines.find((medicine) => medicine.id === selectedId)

  function selectMedicine(nextId) {
    const nextMedicine = medicines.find((medicine) => medicine.id === nextId)
    setSelectedId(nextId)
    setDraft(
      nextMedicine
        ? nextMedicine.packaging.map((level) => ({
            ...level,
            price: String(priceForLevel(nextMedicine, level)),
          }))
        : [],
    )
    setErrors([])
    setNotice('')
  }

  if (!selected) {
    return (
      <section className="panel">
        <div className="empty-state">{t('packaging.noMedicines')}</div>
      </section>
    )
  }

  const sortedDraft = [...draft].sort((a, b) => a.contains - b.contains)
  const canPreview =
    sortedDraft.length > 0 &&
    sortedDraft.every(
      (level) => level.unit.trim() && Number(level.contains) >= 1,
    ) &&
    sortedDraft[0].contains === 1
  const top = sortedDraft[sortedDraft.length - 1]
  const sellLevel =
    sortedDraft.length > 1
      ? sortedDraft[sortedDraft.length - 2]
      : sortedDraft[0]

  async function handleSave() {
    const normalized = draft.map((level) => ({
      unit: level.unit.trim(),
      contains: Number(level.contains),
      price: level.price,
    }))
    const validation = validatePackaging(normalized, selected.baseUnit)

    if (validation.length > 0) {
      setErrors(validation)
      setNotice('')
      return
    }

    const priced = normalized.map((level) => ({
      ...level,
      price: Number(level.price),
    }))
    const baseLevel = priced.find((level) => level.contains === 1)

    try {
      await updateMedicine(selected.id, {
        packaging: priced,
        sellingPrice: baseLevel ? baseLevel.price : selected.sellingPrice,
      })
    } catch (error) {
      setErrors([error.message || t('packaging.saveError')])
      setNotice('')
      return
    }

    setDraft(
      [...priced]
        .sort((a, b) => a.contains - b.contains)
        .map((level) => ({ ...level, price: String(level.price) })),
    )
    setErrors([])
    setNotice(
      t('packaging.saved', {
        name: selected.name,
        count: formatNumber(selected.stock),
        unit: pluralize(selected.baseUnit, selected.stock),
      }),
    )
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('packaging.title')}</h1>
          <p className="page-sub">{t('packaging.subtitle')}</p>
        </div>
      </div>

      {notice && (
        <div className="notice notice-success" role="status">
          {notice}
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t('packaging.selectTitle')}</h2>
            <p className="panel-sub">{t('packaging.selectSubtitle')}</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="field" style={{ maxWidth: '420px' }}>
            <label htmlFor="packaging-medicine">{t('packaging.medicine')}</label>
            <select
              id="packaging-medicine"
              value={selectedId}
              onChange={(event) => selectMedicine(event.target.value)}
            >
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.name} {medicine.strength}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="two-col">
        <section className="panel" aria-labelledby="packaging-editor-title">
          <div className="panel-head">
            <div>
              <h2 id="packaging-editor-title">
                {selected.name} {selected.strength}
              </h2>
              <p className="panel-sub">
                {t('packaging.baseUnitCurrent', {
                  unit: selected.baseUnit,
                  count: formatNumber(selected.stock),
                  unitLabel: pluralize(selected.baseUnit, selected.stock),
                })}
              </p>
            </div>
          </div>
          <div className="panel-body">
            <PackagingEditor
              levels={draft}
              baseUnit={selected.baseUnit}
              basePrice={
                draft.find((level) => Number(level.contains) === 1)?.price
              }
              onChange={(levels) => {
                setDraft(levels)
                setErrors([])
                setNotice('')
              }}
            />

            {errors.length > 0 && (
              <ul className="form-error-list">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                {t('packaging.save')}
              </button>
            </div>

            <p className="hint">
              {t('packaging.hint', { unit: selected.baseUnit })}
            </p>
          </div>
        </section>

        <section className="panel" aria-labelledby="packaging-preview-title">
          <div className="panel-head">
            <div>
              <h2 id="packaging-preview-title">
                {t('packaging.previewTitle')}
              </h2>
              <p className="panel-sub">{t('packaging.previewSubtitle')}</p>
            </div>
          </div>
          <div className="panel-body">
            {canPreview ? (
              <>
                <p className="chain">{packagingChain(draft)}</p>

                <div className="detail-grid">
                  <div>
                    <span className="detail-label">
                      {t('packaging.receivingExample')}
                    </span>
                    <span className="detail-value">
                      {t('packaging.adds', {
                        unit: top.unit,
                        count: formatNumber(top.contains),
                        base: pluralize(selected.baseUnit, top.contains),
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="detail-label">
                      {t('packaging.sellingExample')}
                    </span>
                    <span className="detail-value">
                      {t('packaging.removes', {
                        unit: pluralize(sellLevel.unit, 2),
                        count: formatNumber(sellLevel.contains * 2),
                        base: pluralize(
                          selected.baseUnit,
                          sellLevel.contains * 2,
                        ),
                      })}
                    </span>
                  </div>
                </div>

                <div className="form-section">
                  <h3>{t('packaging.unitPrices')}</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">{t('packaging.unit')}</th>
                          <th scope="col">{t('packaging.contains')}</th>
                          <th scope="col">{t('packaging.price')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...draft]
                          .sort((a, b) => b.contains - a.contains)
                          .map((level) => (
                            <tr key={level.unit}>
                              <td className="strong">
                                {level.unit || t('common.unknown')}
                              </td>
                              <td>
                                {formatNumber(level.contains)}{' '}
                                {pluralize(selected.baseUnit, level.contains)}
                              </td>
                              <td>
                                {formatETB(priceForLevel(selected, level))}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <p className="hint">{t('packaging.completeLevels')}</p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

export default Packaging
