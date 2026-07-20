import { CUSTOMER_PORTAL_LOGIN } from '~/utils/internalAccess'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server-side rendering
  if (process.server) return

  // Skip on auth routes, public routes, and non-operator layouts
  const isPublicRestaurant = to.meta?.layout === 'public-restaurant'
  const isPublicAccess = to.meta?.publicAccess === true
  const isCustomerPortal = to.meta?.layout === 'customer-portal'
  const isKds = to.meta?.layout === 'kds'
  if (
    to.path.startsWith('/auth') ||
    to.path === '/' ||
    to.path === '/bogota' ||
    to.path.startsWith('/api') ||
    to.path.startsWith('/proveedor/') ||
    to.path.startsWith('/blog') ||
    to.path.startsWith('/docs') ||
    isPublicRestaurant ||
    isPublicAccess ||
    isCustomerPortal ||
    isKds
  ) return

  const authStore = useAuthStore()
  const accessStore = useAccessStore()
  const tenantsStore = useTenantsStore()

  const clearInternalState = () => {
    authStore.expireSession()
    accessStore.clear()
    tenantsStore.clearTenants()
  }

  // Only fetch tenants if user is authenticated and tenants are not loaded
  if (authStore.session?.success && !tenantsStore.hasTenants && !tenantsStore.isLoading) {
    try {
      await tenantsStore.fetchUserTenants()

      if (tenantsStore.noInternalAccess || (!tenantsStore.hasTenants && !tenantsStore.isLoading)) {
        clearInternalState()
        return navigateTo(CUSTOMER_PORTAL_LOGIN)
      }
      
      // Set selected tenant from URL parameter if available
      const tenantParam = to.query.tenant
      if (tenantParam && !(await tenantsStore.selectTenantBySlug(tenantParam))) {
        // If tenant param in URL is invalid, redirect to first available tenant
        if (tenantsStore.hasTenants) {
          await navigateTo({
            path: to.path,
            query: { ...to.query, tenant: tenantsStore.tenants[0].slug }
          })
        }
      }
    } catch (error) {
      console.error('Error loading tenants in middleware:', error)
    }
  }
})
