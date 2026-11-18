import { requireSupabase } from '../lib/supabaseClient'

export const MEDICINE_IMAGE_BUCKET = 'medicine-images'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_CACHE_NAME = 'pharmatrack-medicine-images-v1'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateImageFile(file) {
  if (!file) return 'Choose an image file.'
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Use a JPG, PNG, or WebP image.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'The image must be 5 MB or smaller.'
  }
  return ''
}

function extensionFor(file) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

function safeFileName(name) {
  return String(name || 'medicine')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function imageCacheRequest(path) {
  return new Request(`https://medicine-image.local/${path}`)
}

export async function fileToDataUrl(file, maxSize = 720) {
  const validation = validateImageFile(file)
  if (validation) throw new Error(validation)

  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Unable to read the image.'))
      reader.readAsDataURL(file)
    })
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', 0.82)
}

export async function uploadMedicineImage({
  pharmacyId,
  medicineId,
  file,
  previousPath = '',
}) {
  const validation = validateImageFile(file)
  if (validation) throw new Error(validation)

  const client = requireSupabase()
  const path = `${pharmacyId}/${medicineId}/${crypto.randomUUID()}-${safeFileName(
    file.name || `medicine.${extensionFor(file)}`,
  )}`
  const { error: uploadError } = await client.storage
    .from(MEDICINE_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    })
  if (uploadError) throw uploadError

  const { error: updateError } = await client
    .from('medicines')
    .update({ image_path: path })
    .eq('pharmacy_id', pharmacyId)
    .eq('id', medicineId)
  if (updateError) throw updateError

  if (previousPath && previousPath !== path) {
    await client.storage.from(MEDICINE_IMAGE_BUCKET).remove([previousPath])
  }

  return path
}

export async function removeMedicineImage({
  pharmacyId,
  medicineId,
  imagePath,
}) {
  const client = requireSupabase()
  const { error } = await client
    .from('medicines')
    .update({ image_path: null })
    .eq('pharmacy_id', pharmacyId)
    .eq('id', medicineId)
  if (error) throw error

  if (imagePath) {
    await client.storage.from(MEDICINE_IMAGE_BUCKET).remove([imagePath])
  }
}

export async function setMedicineImagePath({
  pharmacyId,
  medicineId,
  imagePath,
}) {
  const client = requireSupabase()
  const { error } = await client
    .from('medicines')
    .update({ image_path: imagePath || null })
    .eq('pharmacy_id', pharmacyId)
    .eq('id', medicineId)
  if (error) throw error
}

export async function resolveMedicineImageUrl(path) {
  if (!path) return ''
  if (
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('http')
  ) {
    return path
  }

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(IMAGE_CACHE_NAME)
      const cached = await cache.match(imageCacheRequest(path))
      if (cached) {
        return URL.createObjectURL(await cached.blob())
      }
    } catch {
      // Cache storage is optional; the network URL remains available.
    }
  }

  const { data } = requireSupabase()
    .storage.from(MEDICINE_IMAGE_BUCKET)
    .getPublicUrl(path)

  if (typeof caches !== 'undefined' && data?.publicUrl) {
    fetch(data.publicUrl)
      .then((response) => {
        if (!response.ok) return null
        return caches
          .open(IMAGE_CACHE_NAME)
          .then((cache) => cache.put(imageCacheRequest(path), response))
      })
      .catch(() => {})
  }

  return data?.publicUrl ?? ''
}
