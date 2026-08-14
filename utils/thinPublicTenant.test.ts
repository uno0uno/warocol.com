import { describe, expect, it } from 'vitest'
import { isThinPublicTenantSlug, shouldNoindexPublicTenant } from './thinPublicTenant'

describe('thinPublicTenant', () => {
  it('flags onboarding and test slugs', () => {
    expect(isThinPublicTenantSlug('onboarding-a59cd6a740294f8a')).toBe(true)
    expect(isThinPublicTenantSlug('TEST-EEUU-12-06-2026')).toBe(true)
    expect(isThinPublicTenantSlug('mi-restaurante')).toBe(false)
  })

  it('noindexes missing or empty public profiles', () => {
    expect(shouldNoindexPublicTenant({ slug: 'cafe', hasRestaurant: false, productCount: 0 })).toBe(true)
    expect(shouldNoindexPublicTenant({ slug: 'cafe', hasRestaurant: true, productCount: 0 })).toBe(true)
    expect(shouldNoindexPublicTenant({ slug: 'cafe', hasRestaurant: true, productCount: 3 })).toBe(false)
    expect(shouldNoindexPublicTenant({
      slug: 'onboarding-abc',
      hasRestaurant: true,
      productCount: 10,
    })).toBe(true)
  })
})
