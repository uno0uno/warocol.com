/** Thin public tenant URLs that should not be indexed (#2313). */
export function isThinPublicTenantSlug(slug: string): boolean {
  const value = String(slug || '').trim().toLowerCase()
  return value.startsWith('onboarding-') || value.startsWith('test-')
}

export function shouldNoindexPublicTenant(options: {
  slug: string
  hasRestaurant: boolean
  productCount: number
}): boolean {
  if (isThinPublicTenantSlug(options.slug)) return true
  if (!options.hasRestaurant) return true
  return options.productCount <= 0
}
