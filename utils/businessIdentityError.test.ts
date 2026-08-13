import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractApiErrorDetail,
  isBusinessIdentityConflict,
  normalizeStorefrontSlug,
  resolveProfileSaveErrorMessage,
} from './businessIdentityError.ts'

test('normalizeStorefrontSlug lowercases and hyphenates', () => {
  assert.equal(normalizeStorefrontSlug('  Pizza en leña  '), 'pizza-en-lena')
  assert.equal(normalizeStorefrontSlug('Cafe___Central'), 'cafe-central')
  assert.equal(normalizeStorefrontSlug('@@@'), '')
})

test('detects opaque API identity codes', () => {
  assert.equal(
    isBusinessIdentityConflict({
      data: { detail: { code: 'BUSINESS_IDENTITY_UNAVAILABLE', message: 'Choose a different business name.' } },
    }),
    true,
  )
  assert.equal(
    isBusinessIdentityConflict({
      data: { detail: { code: 'BUSINESS_NAME_INVALID', message: 'Choose a different business name.' } },
    }),
    true,
  )
})

test('maps leaky slug-taken strings without exposing them', () => {
  const err = { data: { detail: "Slug 'pizza' is already taken" } }
  assert.equal(isBusinessIdentityConflict(err), true)
  assert.equal(
    resolveProfileSaveErrorMessage(err, 'opaque', 'fallback', () => 'leaked'),
    'opaque',
  )
})

test('extractApiErrorDetail reads ofetch-shaped errors', () => {
  assert.deepEqual(
    extractApiErrorDetail({ data: { detail: { code: 'BUSINESS_IDENTITY_UNAVAILABLE' } } }),
    { code: 'BUSINESS_IDENTITY_UNAVAILABLE' },
  )
})

test('non-identity errors fall through to formatter', () => {
  const err = { data: { detail: 'timezone invalid' } }
  assert.equal(isBusinessIdentityConflict(err), false)
  assert.equal(
    resolveProfileSaveErrorMessage(err, 'opaque', 'fallback', (d, f) => String(d ?? f)),
    'timezone invalid',
  )
})
