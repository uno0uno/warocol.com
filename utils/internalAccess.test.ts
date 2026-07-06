import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canUseInternalSession,
  getAccessAwareRedirect,
  getFirstAccessibleHome,
  hasExplicitInternalAccessAllow,
  hasExplicitInternalAccessDenial,
} from './internalAccess.ts'

const sessionWithRole = (role: string, overrides: Record<string, unknown> = {}) => ({
  user: { role },
  ...overrides,
})

const testRouter = {
  resolve: (target: string) => {
    const moduleByPath: Record<string, string> = {
      '/pos': 'pos',
      '/ventas': 'ventas',
      '/ventas/ordenes': 'ventas',
      '/menu': 'menu',
      '/menu/productos': 'menu',
      '/equipo': 'equipo',
      '/finanzas': 'finanzas',
      '/negocio': 'mi_negocio',
      '/integraciones': 'integraciones',
    }

    const module = moduleByPath[target]
    return module ? { matched: [{ meta: { module } }] } : { matched: [] }
  },
}

const accessStore = (modules: string[]) => ({
  modules,
  can: (module: string) => modules.includes(module),
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

describe('module-aware internal redirects', () => {
  it('sends POS-only cashier away from ventas redirect to POS', () => {
    assert.equal(
      getAccessAwareRedirect('/ventas/ordenes', accessStore(['pos']), testRouter),
      '/pos',
    )
    assert.equal(
      getAccessAwareRedirect('/ventas', accessStore(['pos']), testRouter),
      '/pos',
    )
  })

  it('sends POS-only cashier without redirect to POS', () => {
    assert.equal(
      getAccessAwareRedirect(undefined, accessStore(['pos']), testRouter),
      '/pos',
    )
  })

  it('keeps ventas redirect for users with ventas access', () => {
    assert.equal(
      getAccessAwareRedirect('/ventas/ordenes', accessStore(['pos', 'ventas']), testRouter),
      '/ventas/ordenes',
    )
  })

  it('falls back to the first accessible home for unsafe redirects', () => {
    assert.equal(
      getAccessAwareRedirect('https://example.com', accessStore(['despacho']), testRouter),
      '/despacho/domicilios',
    )
    assert.equal(
      getAccessAwareRedirect('//example.com', accessStore(['pos']), testRouter),
      '/pos',
    )
  })

  it('allows safe internal routes without module metadata', () => {
    assert.equal(
      getAccessAwareRedirect('/terminos-y-condiciones', accessStore(['pos']), testRouter),
      '/terminos-y-condiciones',
    )
  })

  it('returns public home when no modules are available', () => {
    assert.equal(getFirstAccessibleHome([]), '/')
  })
})
