import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import PackagingEditor from './PackagingEditor'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import {
  DOSAGE_FORMS,
  blankMedicineDraft,
  buildMedicineInput,
  buildNewMedicineInput,
  findDuplicateMedicine,
  medicineToDraft,
  validateMedicineDraft,
} from '../utils/medicineDraft'
import { validateImageFile } from '../services/medicineImageService'
import { translateDosage } from '../i18n/translations'

function MedicineFormModal({
  medicine,
  mode,
  onClose,
  onSaved,
  initialName = '',
  quickAdd = false,
}) {
  const {
    medicines,
    addMedicine,
    updateMedicine,
    uploadMedicineImage,
    removeMedicineImage,
  } = useWorkspace()
  const { t } = usePreferences()
  const [form, setForm] = useState(() =>
    mode === 'edit' && medicine
      ? medicineToDraft(medicine)
      : blankMedicineDraft({ name: initialName }),
  )
  const [fieldErrors, setFieldErrors] = useState({})
  const [packagingErrors, setPackagingErrors] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(medicine?.imageUrl ?? '')
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const previewUrlRef = useRef('')
  const fileInputRef = useRef(null)
  const duplicate = findDuplicateMedicine(medicines, {
    name: form.name,
    strength: form.strength,
    excludeId: mode === 'edit' ? medicine?.id : undefined,
  })

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  function setField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function handleBaseUnitChange(value) {
    setForm((previous) => ({
      ...previous,
      baseUnit: value,
      packaging: previous.packaging.map((level, index) =>
        index === 0 ? { ...level, unit: value } : level,
      ),
    }))
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const validation = validateImageFile(file)
    if (validation) {
      setImageError(validation)
      return
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    setImageFile(file)
    setImagePreview(url)
    setRemoveImage(false)
    setImageError('')
  }

  function handleRemoveImage() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }
    setImageFile(null)
    setImagePreview('')
    setRemoveImage(true)
    setImageError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    const validation = validateMedicineDraft(form, {
      mode,
      medicines,
      excludeId: mode === 'edit' ? medicine?.id : undefined,
      requirePositivePrice: mode === 'add' && quickAdd,
    })

    setFieldErrors(validation.fieldErrors)
    setPackagingErrors(validation.packagingErrors)

    if (!validation.valid) {
      if (validation.duplicate) {
        setSubmitError(
          t('form.duplicateError', {
            name: validation.duplicate.name,
            strength: validation.duplicate.strength,
          }),
        )
      }
      return
    }

    const input = buildMedicineInput(form)

    setSaving(true)
    try {
      if (mode === 'edit' && medicine) {
        await updateMedicine(medicine.id, input)
        if (removeImage) await removeMedicineImage(medicine.id)
        if (imageFile) await uploadMedicineImage(medicine.id, imageFile)
        onSaved?.(medicine)
      } else {
        const created = await addMedicine(buildNewMedicineInput(form))
        let imageWarning = ''
        if (imageFile && created?.id) {
          try {
            await uploadMedicineImage(created.id, imageFile)
          } catch (uploadError) {
            // The medicine is already saved. Keep it and report the image
            // problem without offering a retry that would duplicate it.
            imageWarning =
              uploadError.message || t('form.imageSaveError')
          }
        }
        onSaved?.(created, { imageWarning })
      }
      onClose()
    } catch (error) {
      setSubmitError(error.message || t('form.saveError'))
      setSaving(false)
    }
  }

  return (
    <Modal
      title={
        mode === 'edit'
          ? t('form.editTitle')
          : quickAdd
            ? t('form.quickAddTitle')
            : t('form.addTitle')
      }
      subtitle={
        quickAdd ? t('form.quickAddSubtitle') : t('form.subtitle')
      }
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            form="medicine-form"
            disabled={saving}
          >
            {saving
              ? t('form.saving')
              : mode === 'edit'
                ? t('form.saveChanges')
                : quickAdd
                  ? t('form.addContinue')
                  : t('form.addMedicine')}
          </button>
        </>
      }
    >
      <form id="medicine-form" onSubmit={handleSubmit} noValidate>
        {(submitError || imageError) && (
          <div className="notice notice-error" role="alert">
            {submitError || imageError}
          </div>
        )}

        <div className="form-section">
          <h3>{t('form.imageSection')}</h3>
          <div className="image-field">
            {imagePreview ? (
              <img
                className="image-preview"
                src={imagePreview}
                alt={t('form.previewAlt')}
              />
            ) : (
              <div className="image-preview image-preview-empty">
                {t('form.noImage')}
              </div>
            )}
            <div className="image-actions">
              <input
                ref={fileInputRef}
                id="medicine-image"
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? t('form.replaceImage') : t('form.uploadImage')}
              </button>
              {imagePreview && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleRemoveImage}
                >
                  {t('common.remove')}
                </button>
              )}
              <p className="hint">{t('form.imageHint')}</p>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="medicine-name">{t('form.name')}</label>
            <input
              id="medicine-name"
              type="text"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder={t('form.namePlaceholder')}
            />
            {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
          </div>

          <div className="field">
            <label htmlFor="medicine-strength">{t('form.strength')}</label>
            <input
              id="medicine-strength"
              type="text"
              value={form.strength}
              onChange={(event) => setField('strength', event.target.value)}
              placeholder={t('form.strengthPlaceholder')}
            />
            {fieldErrors.strength && (
              <p className="field-error">{fieldErrors.strength}</p>
            )}
            {duplicate && (
              <p className="field-warning" role="status">
                {t('form.duplicateWarning', {
                  name: duplicate.name,
                  strength: duplicate.strength,
                })}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="medicine-form-type">{t('form.dosageForm')}</label>
            <select
              id="medicine-form-type"
              value={form.dosageForm}
              onChange={(event) => setField('dosageForm', event.target.value)}
            >
              {DOSAGE_FORMS.map((formType) => (
                <option key={formType} value={formType}>
                  {translateDosage(t, formType)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="medicine-base-unit">{t('form.baseUnit')}</label>
            <input
              id="medicine-base-unit"
              type="text"
              value={form.baseUnit}
              onChange={(event) => handleBaseUnitChange(event.target.value)}
              placeholder={t('form.baseUnitPlaceholder')}
            />
            {fieldErrors.baseUnit && (
              <p className="field-error">{fieldErrors.baseUnit}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="medicine-threshold">{t('form.threshold')}</label>
            <input
              id="medicine-threshold"
              type="number"
              min="0"
              step="1"
              value={form.lowStockThreshold}
              onChange={(event) =>
                setField('lowStockThreshold', event.target.value)
              }
            />
            {fieldErrors.lowStockThreshold && (
              <p className="field-error">{fieldErrors.lowStockThreshold}</p>
            )}
          </div>

          {mode === 'add' && (
            <div className="field">
              <label htmlFor="medicine-opening">
                {t('form.openingStock', {
                  unit: form.baseUnit || t('form.baseUnits'),
                })}
              </label>
              <input
                id="medicine-opening"
                type="number"
                min="0"
                step="1"
                value={form.openingStock}
                onChange={(event) => setField('openingStock', event.target.value)}
              />
              <p className="hint">
                {t('form.openingHint', {
                  unit: form.baseUnit || t('form.baseUnits'),
                })}
              </p>
              {fieldErrors.openingStock && (
                <p className="field-error">{fieldErrors.openingStock}</p>
              )}
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>{t('form.packagingSection')}</h3>
          <p className="hint">{t('form.packagingHint')}</p>
          <PackagingEditor
            levels={form.packaging}
            baseUnit={form.baseUnit || t('form.baseUnitFallback')}
            basePrice={form.packaging.find((level) => Number(level.contains) === 1)?.price}
            onChange={(packaging) => setField('packaging', packaging)}
          />
          {packagingErrors.length > 0 && (
            <ul className="form-error-list">
              {packagingErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </Modal>
  )
}

export default MedicineFormModal
