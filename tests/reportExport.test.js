import { test } from 'vitest'
import assert from 'node:assert/strict'
import { csvCell, toCsv, reportFileName } from '../src/utils/reportExport.js'

test('csvCell leaves plain values untouched', () => {
  assert.equal(csvCell('Amoxicillin'), 'Amoxicillin')
  assert.equal(csvCell(100), '100')
  assert.equal(csvCell(0), '0')
  assert.equal(csvCell(''), '')
  assert.equal(csvCell(null), '')
  assert.equal(csvCell(undefined), '')
})

test('csvCell quotes and escapes commas, quotes, and newlines', () => {
  assert.equal(csvCell('ETB 1,800'), '"ETB 1,800"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"')
})

test('toCsv joins rows with CRLF and cells with commas', () => {
  const csv = toCsv([
    ['Reference', 'Line total'],
    ['PO-1001', 'ETB 180'],
    ['SO-2', 'ETB 1,200'],
  ])
  assert.equal(
    csv,
    'Reference,Line total\r\nPO-1001,ETB 180\r\nSO-2,"ETB 1,200"',
  )
})

test('reportFileName keeps only digits in dates and falls back to all', () => {
  assert.equal(reportFileName('audit-report', '2026-05-01', '2026-05-14'), 'audit-report-20260501-to-20260514.csv')
  assert.equal(reportFileName('audit-report', '', ''), 'audit-report-all-to-all.csv')
})
