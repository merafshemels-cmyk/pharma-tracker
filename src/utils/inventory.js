import { formatNumber, pluralize, roundMoney } from './format'

export function sortPackaging(packaging) {
  return [...packaging].sort((a, b) => a.contains - b.contains)
}

export function largestPackaging(packaging) {
  const sorted = sortPackaging(packaging)
  return sorted[sorted.length - 1]
}

export function baseUnitOf(medicine) {
  return medicine.baseUnit
}

export function priceForLevel(medicine, level) {
  const rawPrice = level?.price
  const saved = Number(rawPrice)
  const hasSavedPrice =
    rawPrice !== '' &&
    rawPrice !== null &&
    rawPrice !== undefined &&
    Number.isFinite(saved) &&
    saved >= 0

  if (hasSavedPrice) {
    return roundMoney(saved)
  }

  const basePrice = Number(medicine?.sellingPrice)
  const contains = Number(level?.contains)

  if (!Number.isFinite(basePrice) || !Number.isFinite(contains)) {
    return 0
  }

  return roundMoney(basePrice * contains)
}

export function pricePerUnit(medicine, level) {
  return priceForLevel(medicine, level)
}

export function normalizeMedicine(medicine) {
  const packaging = sortPackaging(
    (medicine.packaging ?? []).map((level) => ({
      ...level,
      price: priceForLevel(medicine, level),
    })),
  )
  const baseLevel = packaging.find((level) => Number(level.contains) === 1)
  const sellingPrice = baseLevel
    ? baseLevel.price
    : roundMoney(Number(medicine.sellingPrice) || 0)

  return { ...medicine, packaging, sellingPrice }
}

export function stockStatus(medicine) {
  if (medicine.stock <= 0) {
    return { label: 'Out of stock', key: 'status.outOfStock', tone: 'out' }
  }
  if (medicine.stock <= medicine.lowStockThreshold) {
    return { label: 'Low stock', key: 'status.lowStock', tone: 'low' }
  }
  return { label: 'In stock', key: 'status.inStock', tone: 'ok' }
}

export function isLowStock(medicine) {
  return medicine.stock <= medicine.lowStockThreshold
}

export function stockPercent(medicine) {
  const target = Math.max(medicine.lowStockThreshold * 3, 1)
  return Math.min(100, Math.round((medicine.stock / target) * 100))
}

export function describeStock(stock, packaging) {
  const sorted = sortPackaging(packaging)
  const base = sorted[0]
  if (stock <= 0) {
    return `0 ${pluralize(base.unit, 0)}`
  }

  let remaining = stock
  const parts = []

  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const level = sorted[index]
    const amount = Math.floor(remaining / level.contains)
    if (amount > 0) {
      parts.push(`${formatNumber(amount)} ${pluralize(level.unit, amount)}`)
      remaining -= amount * level.contains
    }
  }

  return parts.join(', ')
}

export function packagingChain(packaging) {
  const sorted = sortPackaging(packaging)
  const top = sorted[sorted.length - 1]
  const parts = [`1 ${top.unit}`]

  for (let index = sorted.length - 2; index >= 0; index -= 1) {
    const level = sorted[index]
    const amount = top.contains / level.contains
    parts.push(`${formatNumber(amount)} ${pluralize(level.unit, amount)}`)
  }

  return parts.join(' = ')
}

export function validatePackaging(packaging, baseUnit) {
  const errors = []

  if (!Array.isArray(packaging) || packaging.length === 0) {
    return ['Add at least one packaging level.']
  }

  const sorted = sortPackaging(packaging)

  if (sorted[0].contains !== 1) {
    errors.push(`The smallest unit must be 1 ${baseUnit}.`)
  }

  if (sorted[0].unit.toLowerCase() !== String(baseUnit).toLowerCase()) {
    errors.push(`The smallest packaging unit must match the base unit (${baseUnit}).`)
  }

  const seen = new Set()

  sorted.forEach((level, index) => {
    const unit = level.unit.trim()

    if (!unit) {
      errors.push('Every packaging level needs a unit name.')
    } else if (seen.has(unit.toLowerCase())) {
      errors.push(`Packaging unit names must be unique (${unit}).`)
    }
    seen.add(unit.toLowerCase())

    if (!Number.isInteger(level.contains) || level.contains < 1) {
      errors.push(`Each packaging level must contain a whole number of ${baseUnit}s.`)
    }

    const price = Number(level.price)
    const hasPrice =
      level.price !== '' &&
      level.price !== null &&
      level.price !== undefined &&
      Number.isFinite(price) &&
      price >= 0

    if (!hasPrice) {
      errors.push(
        `Enter a valid non-negative selling price for ${unit || 'each packaging level'}.`,
      )
    }

    if (index > 0 && level.contains <= sorted[index - 1].contains) {
      errors.push('Each larger packaging level must contain more base units than the one before it.')
    }
  })

  return [...new Set(errors)]
}

export function nextTransactionCode(transactions, type) {
  const prefix = type === 'sale' ? 'SL' : 'PO'
  const number = 1000 + transactions.filter((item) => item.type === type).length + 1
  return `${prefix}-${number}`
}
