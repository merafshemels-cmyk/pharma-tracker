function normalizeTerm(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function medicineSearchText(medicine) {
  return [medicine?.name, medicine?.strength, medicine?.dosageForm]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function matchesMedicine(medicine, term) {
  const search = normalizeTerm(term)
  if (!search) return true

  const haystack = medicineSearchText(medicine)
  return search
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => haystack.includes(part))
}

export function filterMedicines(medicines, term, { status = 'all' } = {}) {
  return [...medicines]
    .filter((medicine) => {
      if (!matchesMedicine(medicine, term)) return false
      if (status === 'low') {
        return medicine.stock <= medicine.lowStockThreshold
      }
      if (status === 'out') return medicine.stock <= 0
      if (status === 'in') return medicine.stock > medicine.lowStockThreshold
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
