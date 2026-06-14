import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canUseInternalSession,
  hasExplicitInternalAccessAllow,
  hasExplicitInternalAccessDenial,
} from './internalAccess.ts'

const sessionWithRole = (role: string, overrides: Record<string, unknown> = {}) => ({
  user: { role },
  ...overrides,
})

describe('canUseInternalSession', () => {
  it('allows backend-approved future internal roles before local role fallback', () => {
    assert.equal(
      canUseInternalSession(sessionWithRole('future_backend_role', { has_internal_access: true })),
      true,
    )
  })

  it('denies explicit backend denial even for an internal-looking role', () => {
    assert.equal(
      canUseInternalSession(sessionWithRole('admin', { has_internal_access: false })),
      false,
    )
  })

  it('denies customer role sessions', () => {
    assert.equal(canUseInternalSession(sessionWithRole('customer')), false)
  })

  it('allows known legacy team roles when explicit access is absent', () => {
    assert.equal(canUseInternalSession(sessionWithRole('promotor')), true)
  })

  it('denies unknown legacy roles when explicit access is absent', () => {
    assert.equal(canUseInternalSession(sessionWithRole('future_backend_role')), false)
  })

  it('keeps old no-role session fallback for older API responses', () => {
    assert.equal(canUseInternalSession({ user: { email: 'team@example.com' } }), true)
  })
})

describe('explicit internal access helpers', () => {
  it('recognizes nested user allow aliases', () => {
    assert.equal(
      hasExplicitInternalAccessAllow({ user: { role: 'future_backend_role', has_internal_access: true } }),
      true,
    )
  })

  it('recognizes nested user denial aliases', () => {
    assert.equal(
      hasExplicitInternalAccessDenial({ user: { role: 'admin', has_internal_access: false } }),
      true,
    )
  })
})
