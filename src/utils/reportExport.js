// Small, dependency-free CSV helpers for exporting report data locally.

export function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function reportFileName(prefix, from, to) {
  const datePart = (value) =>
    String(value ?? '').replace(/[^0-9]/g, '') || 'all'
  return `${prefix}-${datePart(from)}-to-${datePart(to)}.csv`
}

// Adds a UTF-8 BOM so Excel opens Amharic text correctly, then triggers a
// browser download. `rows` is an array of arrays of plain values.
export function downloadCsv(filename, rows) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
