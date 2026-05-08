/**
 * billing-gate.global.ts
 *
 * Redirects any authenticated user without an active subscription to /gestion/billing.
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
  const skipExact = ['/', '/bogota']

  if (
    skipExact.includes(to.path) ||
    skipPrefixes.some(p => to.path.startsWith(p)) ||
    to.meta?.layout === 'public-restaurant' ||
    to.meta?.layout === 'customer-portal' ||
    to.meta?.layout === 'kds'
  ) return

  const authStore = useAuthStore()

  // Same check used by tenants.global.js
  if (!authStore.session?.success) return

  const { currentTenant } = useTenantReactive()
  const tenantId = currentTenant.value?.id ?? 'none'
  const cacheKey = ['billing', 'subscription', tenantId]

  const cache = useQueryCache()

  // Invalidate subscription cache when returning from a payment flow (/billing/...)
  if (from?.path?.startsWith('/billing')) {
    await cache.invalidateQueries({ key: cacheKey })
  }

  // Try to get cached subscription without creating a new useQuery instance
  let subscription = cache.getQueryData<{ status: string } | null>(cacheKey)

  if (subscription === undefined) {
    // Not in cache — fetch directly and populate cache
    try {
      subscription = await $fetch<{ status: string } | null>('/api/billing/subscription')
        .catch((err: any) => {
          if (err?.status === 404 || err?.statusCode === 404) return null
          throw err
        })
      cache.setQueryData(cacheKey, subscription)
    } catch {
      // If fetch fails, don't block navigation
      return
    }
  }

  const status = subscription?.status
  const hasAccess = status === 'active' || status === 'past_due'

  if (!hasAccess) {
    return navigateTo('/gestion/billing')
  }
})
