import { useRef, useState, useSyncExternalStore } from 'react'
import Modal from './Modal'
import { Icon } from './icons'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import {
  analyzeMedicineImportFile,
  downloadMedicineImportTemplate,
  hasImportSignature,
  recordImportSignature,
  todayIso,
} from '../utils/medicineImport'
import { validateImportFile } from '../utils/medicineImportConfig'
import { canManageInventory } from '../utils/roles'
import { formatDate, formatETB, formatNumber } from '../utils/format'

const STATUS_KEYS = {
  valid: 'import.statusValid',
  invalid: 'import.statusInvalid',
  duplicate: 'import.statusDuplicate',
  imported: 'import.statusImported',
  failed: 'import.statusFailed',
}

const STEPS = [
  { key: 'template', labelKey: 'import.stepTemplate' },
  { key: 'upload', labelKey: 'import.stepUpload' },
  { key: 'preview', labelKey: 'import.stepPreview' },
  { key: 'import', labelKey: 'import.stepImport' },
]

function subscribeOnline(callback) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOnlineSnapshot() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function getServerOnlineSnapshot() {
  return true
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function ImportMedicinesModal({ onClose }) {
  const { medicines, importMedicines, isLocal, role } = useWorkspace()
  const { t } = usePreferences()
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  )
  const fileInputRef = useRef(null)
  const [step, setStep] = useState('upload')
  const [file, setFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [historyEntry, setHistoryEntry] = useState(null)

  const allowed = canManageInventory(role)
  const stepIndex = step === 'upload' ? 1 : step === 'preview' ? 2 : 3
  const offlineBlocked = !isLocal && !online
  const canImport =
    allowed &&
    step === 'preview' &&
    Boolean(analysis) &&
    analysis.summary.valid > 0 &&
    confirmed &&
    !historyEntry &&
    !offlineBlocked &&
    !busy

  async function handleFile(nextFile) {
    setError('')
    setResult(null)
    setConfirmed(false)
    setHistoryEntry(null)

    const fileError = validateImportFile(nextFile)
    if (fileError) {
      setFile(null)
      setAnalysis(null)
      setStep('upload')
      setError(t(`import.${fileError}`))
      return
    }

    setFile(nextFile)
    setBusy(true)

    try {
      const next = await analyzeMedicineImportFile(nextFile, {
        medicines,
        today: todayIso(),
      })

      if (!next.ok) {
        setAnalysis(null)
        setStep('upload')
        if (next.error === 'missingHeaders') {
          setError(
            t('import.missingHeaders', {
              columns: next.missingHeaders.join(', '),
            }),
          )
        } else {
          setError(t(`import.${next.error}`, { max: next.max ?? '' }))
        }
        return
      }

      setAnalysis(next)
      setHistoryEntry(hasImportSignature(next.signature))
      setStep('preview')
    } catch {
      setAnalysis(null)
      setStep('upload')
      setError(t('import.parseError'))
    } finally {
      setBusy(false)
    }
  }

  function handleInputChange(event) {
    const nextFile = event.target.files?.[0]
    if (nextFile) handleFile(nextFile)
    event.target.value = ''
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    const nextFile = event.dataTransfer.files?.[0]
    if (nextFile) handleFile(nextFile)
  }

  async function handleDownload() {
    setError('')
    try {
      await downloadMedicineImportTemplate()
    } catch {
      setError(t('import.templateError'))
    }
  }

  async function handleImport() {
    if (!canImport) return

    setBusy(true)
    setError('')

    try {
      const next = await importMedicines(analysis.rows, {
        signature: analysis.signature,
        fileName: analysis.fileName,
      })
      setResult(next)
      setStep('result')

      if (next.failed === 0 && next.imported > 0) {
        recordImportSignature({
          signature: analysis.signature,
          fileName: analysis.fileName,
          imported: next.imported,
        })
      }
    } catch (importError) {
      setError(importError.message || t('import.importError'))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setStep('upload')
    setFile(null)
    setAnalysis(null)
    setResult(null)
    setError('')
    setConfirmed(false)
    setHistoryEntry(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function statusLabel(status) {
    return t(STATUS_KEYS[status] ?? 'import.statusSkipped')
  }

  function reasonText(reason) {
    return t(`import.reason.${reason.code}`, reason.params)
  }

  const footer =
    step === 'result' ? (
      <>
        <button type="button" className="btn btn-secondary" onClick={reset}>
          {t('import.importAnother')}
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t('import.done')}
        </button>
      </>
    ) : (
      <>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          disabled={busy}
        >
          {t('common.cancel')}
        </button>
        {step === 'preview' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!canImport}
          >
            {busy
              ? t('import.importing')
              : t('import.importButton', {
                  count: analysis?.summary.valid ?? 0,
                })}
          </button>
        )}
      </>
    )

  return (
    <Modal
      title={t('import.title')}
      subtitle={t('import.subtitle')}
      onClose={onClose}
      wide
      footer={footer}
    >
      <div className="import-steps">
        {STEPS.map((item, index) => (
          <div
            key={item.key}
            className={`import-step${index === stepIndex ? ' is-active' : ''}${
              index < stepIndex ? ' is-done' : ''
            }`}
          >
            <span className="import-step-number">{index + 1}</span>
            <span>{t(item.labelKey)}</span>
          </div>
        ))}
      </div>

      {!allowed && (
        <div className="notice notice-error">{t('import.ownerOnly')}</div>
      )}

      {error && <div className="notice notice-error">{error}</div>}

      {step === 'result' && result ? (
        <section className="import-section">
          <h3>{t('import.resultTitle')}</h3>

          <div className="import-summary">
            <div className="import-summary-card is-valid">
              <span className="import-summary-value">{result.imported}</span>
              <span>{t('import.resultImported')}</span>
            </div>
            <div className="import-summary-card is-invalid">
              <span className="import-summary-value">{result.failed}</span>
              <span>{t('import.resultFailed')}</span>
            </div>
            <div className="import-summary-card is-duplicate">
              <span className="import-summary-value">
                {result.invalid + result.duplicate}
              </span>
              <span>{t('import.resultSkipped')}</span>
            </div>
          </div>

          <p className="hint">
            {t('import.resultSummary', {
              imported: result.imported,
              total: result.summary.total,
            })}
          </p>

          {result.failed > 0 && (
            <>
              <div className="notice notice-error">
                {t('import.partialNotice')}
              </div>
              <h4>{t('import.resultFailedTitle')}</h4>
              <ul className="import-failed-list">
                {result.rows
                  .filter((row) => row.status === 'failed')
                  .map((row) => (
                    <li key={row.rowNumber}>
                      <span className="strong">
                        {t('import.rowNumber', { row: row.rowNumber })}
                      </span>{' '}
                      {row.parsed.name} {row.parsed.strength} — {row.error}
                    </li>
                  ))}
              </ul>
            </>
          )}

          {result.invalid + result.duplicate > 0 && (
            <details className="import-skipped">
              <summary>
                {t('import.skippedDetails', {
                  count: result.invalid + result.duplicate,
                })}
              </summary>
              <ul className="import-failed-list">
                {result.rows
                  .filter(
                    (row) =>
                      row.status === 'invalid' || row.status === 'duplicate',
                  )
                  .map((row) => (
                    <li key={row.rowNumber}>
                      <span className="strong">
                        {t('import.rowNumber', { row: row.rowNumber })}
                      </span>{' '}
                      {row.parsed.name} {row.parsed.strength} —{' '}
                      {row.reasons.map((reason) => reasonText(reason)).join(' · ')}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
      ) : (
        <>
          <section className="import-section">
            <h3>{t('import.templateTitle')}</h3>
            <p className="hint">{t('import.templateBody')}</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownload}
              disabled={busy}
            >
              <Icon name="download" size={16} />
              {t('import.downloadTemplate')}
            </button>
          </section>

          <section className="import-section">
            <h3>{t('import.uploadTitle')}</h3>
            <div
              className={`import-dropzone${dragging ? ' is-dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <Icon
                name="upload"
                size={26}
                className="import-dropzone-icon"
              />
              <p>{t('import.uploadHint')}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                {t('import.chooseFile')}
              </button>
              <span className="hint">{t('import.supported')}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={handleInputChange}
              />
            </div>

            {file && (
              <div className="import-file">
                <Icon name="file" size={16} />
                <span className="strong">{file.name}</span>
                <span className="hint">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  {t('import.replaceFile')}
                </button>
              </div>
            )}

            {busy && <p className="hint">{t('import.analyzing')}</p>}
          </section>

          {step === 'preview' && analysis && (
            <section className="import-section">
              <h3>{t('import.previewTitle')}</h3>

              {historyEntry && (
                <div className="notice notice-error">
                  {t('import.alreadyImported', {
                    date: formatDate(historyEntry.importedAt),
                  })}
                </div>
              )}

              {offlineBlocked && (
                <div className="notice notice-error">
                  {t('import.offline')}
                </div>
              )}

              {isLocal && (
                <div className="notice notice-success">
                  {t('import.localNotice')}
                </div>
              )}

              <div className="import-summary">
                <div className="import-summary-card is-valid">
                  <span className="import-summary-value">
                    {analysis.summary.valid}
                  </span>
                  <span>{t('import.valid')}</span>
                </div>
                <div className="import-summary-card is-invalid">
                  <span className="import-summary-value">
                    {analysis.summary.invalid}
                  </span>
                  <span>{t('import.invalid')}</span>
                </div>
                <div className="import-summary-card is-duplicate">
                  <span className="import-summary-value">
                    {analysis.summary.duplicate}
                  </span>
                  <span>{t('import.duplicate')}</span>
                </div>
                <div className="import-summary-card">
                  <span className="import-summary-value">
                    {analysis.summary.total}
                  </span>
                  <span>{t('import.total')}</span>
                </div>
              </div>

              <div className="table-wrap">
                <table className="import-preview-table">
                  <caption className="sr-only">
                    {t('import.rowsCaption')}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('import.colMedicine')}</th>
                      <th scope="col">{t('import.colStrength')}</th>
                      <th scope="col">{t('import.colForm')}</th>
                      <th scope="col">{t('import.colPrice')}</th>
                      <th scope="col">{t('import.colStock')}</th>
                      <th scope="col">{t('import.colBatch')}</th>
                      <th scope="col">{t('import.colExpiry')}</th>
                      <th scope="col">{t('import.colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.rows.map((row) => (
                      <tr key={row.rowNumber} className={`is-${row.status}`}>
                        <td className="strong">{row.parsed.name || '—'}</td>
                        <td>{row.parsed.strength || '—'}</td>
                        <td>{row.parsed.dosageForm || '—'}</td>
                        <td>{formatETB(row.parsed.sellingPrice)}</td>
                        <td>
                          {formatNumber(row.parsed.stockQuantity)}{' '}
                          {row.parsed.baseUnit}
                        </td>
                        <td>{row.parsed.batchNumber || '—'}</td>
                        <td>
                          {row.parsed.expiryDate
                            ? formatDate(row.parsed.expiryDate)
                            : '—'}
                        </td>
                        <td>
                          <span className={`import-status is-${row.status}`}>
                            {statusLabel(row.status)}
                          </span>
                          {row.reasons.length > 0 && (
                            <span className="import-reasons">
                              {row.reasons
                                .map((reason) => reasonText(reason))
                                .join(' · ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="import-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={!allowed || Boolean(historyEntry) || offlineBlocked}
                />
                <span>{t('import.confirm')}</span>
              </label>

              {analysis.summary.valid === 0 && (
                <div className="notice notice-error">
                  {t('import.noValidRows')}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </Modal>
  )
}

export default ImportMedicinesModal
