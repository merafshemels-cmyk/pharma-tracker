const DAY_MS = 24 * 60 * 60 * 1000

export const EXPIRY_WINDOW_DAYS = 90

function startOfDay(value) {
  const date = new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysUntilExpiry(expiryDate, now = new Date()) {
  if (!expiryDate) return null
  const expiry = startOfDay(expiryDate)
  const today = startOfDay(now)
  return Math.round((expiry - today) / DAY_MS)
}

export function isExpiredBatch(batch, now = new Date()) {
  if (!batch?.expiryDate || Number(batch.quantityRemainingBase) <= 0) return false
  const remainingDays = daysUntilExpiry(batch.expiryDate, now)
  return remainingDays !== null && remainingDays < 0
}

export function isExpiringBatch(batch, days = EXPIRY_WINDOW_DAYS, now = new Date()) {
  if (!batch?.expiryDate || Number(batch.quantityRemainingBase) <= 0) return false
  const remainingDays = daysUntilExpiry(batch.expiryDate, now)
  return remainingDays !== null && remainingDays >= 0 && remainingDays <= days
}

export function expiryStatus(batch, now = new Date()) {
  const days = daysUntilExpiry(batch.expiryDate, now)
  if (days === null) {
    return { label: 'No expiry', key: 'status.noExpiry', tone: 'muted', days }
  }
  if (days < 0) {
    return { label: 'Expired', key: 'status.expired', tone: 'out', days }
  }
  if (days <= EXPIRY_WINDOW_DAYS) {
    return {
      label: `Expires in ${days} day${days === 1 ? '' : 's'}`,
      key: 'status.expiresIn',
      tone: 'low',
      days,
    }
  }
  return {
    label: `Expires in ${days} days`,
    key: 'status.expiresIn',
    tone: 'ok',
    days,
  }
}
