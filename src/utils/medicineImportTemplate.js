import * as XLSX from 'xlsx'
import {
  IMPORT_COLUMNS,
  IMPORT_EXAMPLE_ROW,
  IMPORT_TEMPLATE_INSTRUCTIONS,
} from './medicineImportConfig'

export const IMPORT_TEMPLATE_FILE_NAME =
  'pharmatrack-medicine-import-template.xlsx'

export function buildTemplateWorkbook() {
  const headers = IMPORT_COLUMNS.map((column) => column.header)
  const example = IMPORT_COLUMNS.map(
    (column) => IMPORT_EXAMPLE_ROW[column.key] ?? '',
  )

  const medicineSheet = XLSX.utils.aoa_to_sheet([headers, example])
  medicineSheet['!cols'] = headers.map((header) => ({
    wch: Math.max(16, Math.min(32, header.length + 4)),
  }))

  const instructionSheet = XLSX.utils.aoa_to_sheet(IMPORT_TEMPLATE_INSTRUCTIONS)
  instructionSheet['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 96 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, medicineSheet, 'Medicines')
  XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions')

  return workbook
}

export function downloadMedicineImportTemplate() {
  XLSX.writeFile(buildTemplateWorkbook(), IMPORT_TEMPLATE_FILE_NAME)
}
