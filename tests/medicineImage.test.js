import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  MAX_IMAGE_BYTES,
  validateImageFile,
} from '../src/services/medicineImageService.js'

test('accepts JPG, PNG, and WebP images up to the size limit', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(validateImageFile({ type, size: 1024 }), '')
  }
  assert.equal(
    validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES }),
    '',
  )
})

test('rejects unsupported formats and oversized images', () => {
  assert.match(
    validateImageFile({ type: 'image/gif', size: 1024 }),
    /JPG, PNG, or WebP/,
  )
  assert.match(
    validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 }),
    /5 MB or smaller/,
  )
})

test('requires an image file', () => {
  assert.match(validateImageFile(null), /Choose an image file/)
})
