/**
 * billing-gate.global.ts
 *
 * Redirects authenticated users without billable access to /gestion/billing.
 * Runs after auth.global.js (alphabetical order).
 *
 * IMPORTANT: Do NOT call useBilling() here — it creates 7 Pinia Colada instances
 * (5 useQuery + 2 useMutation) on every navigation, accumulating reactive watchers
 * that eventually overflow the call stack. Instead, use useQueryCache() + $fetch directly.
 */
export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.server) return

  // Skip billing, auth, and public routes to avoid infinite redirects
  const skipPrefixes = [
    '/auth/',
    '/gestion/billing',
    '/billing',
    '/proveedor/',
    '/blog',
    '/docs',
    // base URL variants (e.g. /waro-colombia/billing/...)
    '/waro-colombia/billing',
  ]
  const skipExact = ['/', '/bogota', '/terminos-y-condiciones']

  if (
    skipExact.includes(to.path) ||
    skipPrefixes.some(p => to.path.startsWith(p)) ||
    to.meta?.layout === 'public-restaurant' ||
    to.meta?.publicAccess === true ||
    to.meta?.layout === 'customer-portal' ||
    to.meta?.layout === 'kds' ||
    to.meta?.onboardingAccess === true
  ) return

  const authStore = useAuthStore()

  // Same check used by tenants.global.js
  if (!(authStore as any).session?.success) return

  const { currentTenant } = useTenantReactive()
  const tenantId = currentTenant.value?.id ?? 'none'
  const cacheKey = ['billing', 'subscription', tenantId]
  const accessStatusCacheKey = ['billing', 'access-status', tenantId]

  const cache = useQueryCache()

  // Invalidate billing access cache when returning from a payment flow (/billing/...)
  if (from?.path?.startsWith('/billing')) {
    await cache.invalidateQueries({ key: cacheKey })
    await cache.invalidateQueries({ key: accessStatusCacheKey })
  }

  // Try to get cached access status without creating a new useQuery instance
  let accessStatus = cache.getQueryData<{ level: string } | null>(accessStatusCacheKey)

  if (accessStatus === undefined) {
    // Not in cache — fetch directly and populate cache
    try {
      accessStatus = await $fetch<{ level: string }>('/api/billing/access-status')
      cache.setQueryData(accessStatusCacheKey, accessStatus)
    } catch {
      // If fetch fails, don't block navigation
      return
    }
  }

  const level = accessStatus?.level
  // Trial lifecycle never grants access by itself. The API remains authoritative
  // and maps trialing/read-only expiry to one of these explicit access levels.
  const hasAccess = isAllowedBillingAccess(level)

  if (!hasAccess) {
    return navigateTo('/gestion/billing')
  }
})
