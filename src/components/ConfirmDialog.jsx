import Modal from './Modal'
import { usePreferences } from '../context/PreferencesContext'

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  danger = false,
}) {
  const { t } = usePreferences()

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel ?? t('common.confirm')}
          </button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
    </Modal>
  )
}

export default ConfirmDialog
