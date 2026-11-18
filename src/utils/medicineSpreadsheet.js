import * as XLSX from 'xlsx'

// Kept in its own module so the xlsx dependency is only loaded when a user
// actually uploads a file. The modal imports this module dynamically.

export function parseWorkbookRows(buffer, fileName = '') {
  const isCsv = /\.csv$/i.test(String(fileName))

  try {
    const source = isCsv
      ? new TextDecoder('utf-8').decode(new Uint8Array(buffer))
      : new Uint8Array(buffer)

    const workbook = XLSX.read(source, {
      type: isCsv ? 'string' : 'array',
      cellDates: true,
      raw: true,
    })

    const sheetName = workbook.SheetNames?.[0]
    if (!sheetName) return { ok: false, error: 'emptyFile' }

    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: '',
      blankrows: false,
    })

    if (!rows.some((row) => row.some((cell) => String(cell ?? '').trim()))) {
      return { ok: false, error: 'emptyFile' }
    }

    return { ok: true, rows }
  } catch {
    return { ok: false, error: 'parseError' }
  }
}
