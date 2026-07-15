import assert from 'node:assert/strict'
import test from 'node:test'

import { isSessionAuthError, isSessionRecoveryPublicPath } from './useSessionExpiry.ts'

test('treats registration and existing public areas as session recovery safe', () => {
  assert.equal(isSessionRecoveryPublicPath('/registro'), true)
  assert.equal(isSessionRecoveryPublicPath('/auth/login'), true)
  assert.equal(isSessionRecoveryPublicPath('/blog/registro'), true)
  assert.equal(isSessionRecoveryPublicPath('/ventas'), false)
  assert.equal(isSessionRecoveryPublicPath('/registro-interno'), false)
})

test('recognizes session-shaped 401 responses only', () => {
  assert.equal(isSessionAuthError({ status: 401, data: { detail: 'No valid session' } }), true)
  assert.equal(isSessionAuthError({ status: 401, data: { detail: 'Invalid registration code' } }), false)
  assert.equal(isSessionAuthError({ status: 422, data: { detail: 'No valid session' } }), false)
})
