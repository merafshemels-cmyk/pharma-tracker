import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './icons'
import { usePreferences } from '../context/PreferencesContext'

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
  className = '',
}) {
  const titleId = useId()
  const { t } = usePreferences()

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  // Render at the document root so page-level transforms/overflow can never
  // clip the dialog or prevent its lower options from being clicked.
  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`modal${wide ? ' modal-wide' : ''}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('modal.close')}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export default Modal
