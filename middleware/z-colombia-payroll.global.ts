/**
 * z-colombia-payroll.global.ts — warocol.com#1774
 *
 * Deep-link guard for Colombia payroll UI under Equipo.
 * When capabilities.colombia_payroll is false, redirect
 * /equipo/salarios/** and /equipo/nomina → /equipo/miembros.
 *
 * Filename `z-` so this runs after tenants.global.js (Nuxt alphabetical order).
 * Do NOT call useTenantFinancialProfile() here — it creates useQuery on every
 * navigation. Mirror billing-gate: useQueryCache + $fetch.
 */
import {
  financialProfileQueryKey,
  type TenantFinancialProfileResponse,
} from '~/composables/useTenantFinancialProfile'

const isPayrollRoute = (path: string) =>
  path === '/equipo/nomina'
  || path.startsWith('/equipo/nomina/')
  || path === '/equipo/salarios'
  || path.startsWith('/equipo/salarios/')

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return
  if (!isPayrollRoute(to.path)) return

  const authStore = useAuthStore()
  if (!(authStore as any).session?.success) return

  const tenantsStore = useTenantsStore()
  if (!tenantsStore.hasTenants && !tenantsStore.isLoading) {
    try {
      await tenantsStore.fetchUserTenants()
    } catch {
      // Tenant load failed — fail closed on payroll routes
      return navigateTo('/equipo/miembros', { replace: true })
    }
  }

  // Wait briefly if fetch already in flight (tenants.global or parallel)
  if (tenantsStore.isLoading) {
    const started = Date.now()
    while (tenantsStore.isLoading && Date.now() - started < 5000) {
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  const { currentTenant } = useTenantReactive()
  const tenantId = currentTenant.value?.id
  if (!tenantId) {
    return navigateTo('/equipo/miembros', { replace: true })
  }

  const cacheKey = financialProfileQueryKey(tenantId)
  const cache = useQueryCache()

  let profileResponse = cache.getQueryData<TenantFinancialProfileResponse | null>(cacheKey)

  if (profileResponse === undefined) {
    try {
      profileResponse = await $fetch<TenantFinancialProfileResponse>(
        '/api/api/tenant/financial-profile',
      )
      cache.setQueryData(cacheKey, profileResponse)
    } catch {
      // Profile fetch failed — fail closed on payroll routes (API still 409s)
      return navigateTo('/equipo/miembros', { replace: true })
    }
  }

  if (!profileResponse || profileResponse.profile.tenant_id !== tenantId) {
    return navigateTo('/equipo/miembros', { replace: true })
  }

  if (!profileResponse.capabilities.colombia_payroll) {
    return navigateTo('/equipo/miembros', { replace: true })
  }
})
