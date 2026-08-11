import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractAuthLoginRawMessage,
  extractAuthLoginStatus,
  resolveAuthLoginErrorKey,
} from './authLoginErrors.ts'

test('never returns raw API message — only i18n keys', () => {
  const key = resolveAuthLoginErrorKey(
    { statusCode: 500, data: { message: 'psycopg2.OperationalError: connection refused at /app/db.py:42' } },
    'magic_link',
  )
  assert.equal(key, 'auth.magicLinkError')
  assert.equal(key.startsWith('auth.'), true)
})

test('maps invalid verification code API message to invalidCode', () => {
  assert.equal(
    resolveAuthLoginErrorKey(
      { statusCode: 401, data: { message: 'Invalid or expired verification code' } },
      'verify_code',
    ),
    'auth.invalidCode',
  )
})

test('maps Spanish-looking code errors to invalidCode (no raw display)', () => {
  assert.equal(
    resolveAuthLoginErrorKey(
      { statusCode: 400, data: { message: 'Código inválido o expirado' } },
      'verify_code',
    ),
    'auth.invalidCode',
  )
})

test('maps failed magic link send to magicLinkError', () => {
  assert.equal(
    resolveAuthLoginErrorKey(
      { statusCode: 400, data: { message: 'Failed to send magic link' } },
      'magic_link',
    ),
    'auth.magicLinkError',
  )
})

test('maps 429 to rateLimited', () => {
  assert.equal(
    resolveAuthLoginErrorKey({ statusCode: 429, data: { message: 'Too many requests' } }, 'magic_link'),
    'auth.rateLimited',
  )
})

test('maps network-ish failures without status to networkError', () => {
  assert.equal(
    resolveAuthLoginErrorKey({ message: 'Failed to fetch' }, 'magic_link'),
    'auth.networkError',
  )
  assert.equal(
    resolveAuthLoginErrorKey({}, 'verify_code'),
    'auth.networkError',
  )
})

test('extractors read ofetch-shaped errors', () => {
  const err = {
    statusCode: 401,
    data: { message: 'Invalid or expired verification code' },
  }
  assert.equal(extractAuthLoginStatus(err), 401)
  assert.equal(extractAuthLoginRawMessage(err), 'Invalid or expired verification code')
})
