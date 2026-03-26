/**
 * billing-gate.global.ts
 *
 * Redirects any authenticated user without an active subscription to /gestion/billing.
 * Runs after auth.global.js (alphabetical order).
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
    // base URL variants (e.g. /waro-colombia/billing/...)
    '/waro-colombia/billing',
  ]
  const skipExact = ['/', '/bogota']

  if (
    skipExact.includes(to.path) ||
    skipPrefixes.some(p => to.path.startsWith(p)) ||
    to.meta?.layout === 'public-restaurant' ||
    to.meta?.layout === 'customer-portal'
  ) return

  const authStore = useAuthStore()

  // Same check used by tenants.global.js
  if (!authStore.session?.success) return

  const { subscription, fetchSubscription } = useBilling()

  // Invalidate subscription cache when returning from a payment flow (/billing/...)
  if (from?.path?.startsWith('/billing')) {
    await fetchSubscription()
  }

  // Fetch subscription if not yet in cache
  if (subscription.value === undefined) {
    try {
      await fetchSubscription()
    } catch {
      // If fetch fails, don't block navigation
      return
    }
  }

  const status = subscription.value?.status
  const hasAccess = status === 'active' || status === 'past_due'

  if (!hasAccess) {
    return navigateTo('/gestion/billing')
  }
})
