import { useState } from 'react'
import Modal from './Modal'
import { Icon } from './icons'
import { usePreferences } from '../context/PreferencesContext'
import { formatDate, toDateInputValue } from '../utils/format'
import { getPeriodRange, SALES_PERIODS } from '../utils/sales'

function rangeFor(periodId) {
  const range = getPeriodRange(periodId)
  return {
    from: toDateInputValue(range.start),
    to: toDateInputValue(new Date(range.end.getTime() - 1)),
  }
}

export default function ExportReportModal({ initialPeriod, onClose, onExport }) {
  const { t } = usePreferences()
  const [selected, setSelected] = useState(initialPeriod ?? 'month')
  const selectedRange = rangeFor(selected)

  const footer = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        {t('common.cancel')}
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => onExport(selected, selectedRange)}
      >
        <Icon name="download" size={16} />
        {t('audit.exportCsv')}
      </button>
    </>
  )

  return (
    <Modal
      className="modal-export"
      title={t('audit.exportCsv')}
      subtitle={t('audit.exportPeriodPrompt')}
      onClose={onClose}
      footer={footer}
    >
      <div
        className="export-period-list"
        role="radiogroup"
        aria-label={t('audit.exportPeriodAria')}
      >
        {SALES_PERIODS.map((item) => {
          const { from, to } = rangeFor(item.id)
          const isActive = selected === item.id

          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={`export-period-option${isActive ? ' is-active' : ''}`}
              onClick={() => setSelected(item.id)}
            >
              <span className="export-period-radio" aria-hidden="true" />
              <span className="export-period-text">
                <span className="export-period-name">{t(item.labelKey)}</span>
                <span className="export-period-range">
                  {formatDate(from)} – {formatDate(to)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="export-period-hint">{t('audit.exportCsvHint')}</p>
    </Modal>
  )
}
