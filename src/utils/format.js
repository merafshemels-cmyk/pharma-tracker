const etbFormatter = new Intl.NumberFormat('en-ET', {
  style: 'currency',
  currency: 'ETB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('en-ET', {
  maximumFractionDigits: 2,
})

const pluralForms = {
  Box: 'boxes',
  box: 'boxes',
  Strip: 'strips',
  strip: 'strips',
  Sachet: 'sachets',
  sachet: 'sachets',
  Vial: 'vials',
  vial: 'vials',
  Bottle: 'bottles',
  bottle: 'bottles',
}

export function formatETB(value) {
  return etbFormatter.format(Number(value) || 0)
}

export function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0)
}

export function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function pluralize(unit, count) {
  if (Number(count) === 1) return unit
  const lower = String(unit).toLowerCase()
  return pluralForms[unit] || pluralForms[lower] || `${unit}s`
}

// The interface language controls date formatting. Numbers and currency stay
// in the existing en-ET format so amounts and ETB labels never change shape.
let dateLocale = 'en-GB'

export function setFormatLocale(language) {
  dateLocale = language === 'am' ? 'am-ET' : 'en-GB'
}

export function formatDate(isoDate) {
  if (!isoDate) return '—'
  return new Intl.DateTimeFormat(dateLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate))
}

export function formatDateTime(isoDate) {
  if (!isoDate) return '—'
  return new Intl.DateTimeFormat(dateLocale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

export function toDateInputValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isToday(isoDate) {
  return toDateInputValue(new Date(isoDate)) === toDateInputValue()
}

export function isSale(transaction) {
  return transaction.type === 'sale'
}
