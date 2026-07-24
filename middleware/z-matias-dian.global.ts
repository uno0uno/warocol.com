/**
 * z-matias-dian.global.ts — warocol.com#1775
 *
 * Deep-link guard for DIAN-only Facturación audit.
 * When capabilities.matias_dian is false, redirect
 * /facturacion/audit → /facturacion.
 *
 * Filename `z-` so this runs after tenants.global.js (Nuxt alphabetical order).
 * Do NOT call useTenantFinancialProfile() here — it creates useQuery on every
 * navigation. Mirror billing-gate / z-colombia-payroll: useQueryCache + $fetch.
 */
import {
  financialProfileQueryKey,
  type TenantFinancialProfileResponse,
} from '~/composables/useTenantFinancialProfile'

const isDianAuditRoute = (path: string) =>
  path === '/facturacion/audit'
  || path.startsWith('/facturacion/audit/')

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return
  if (!isDianAuditRoute(to.path)) return

  const authStore = useAuthStore()
  if (!(authStore as any).session?.success) return

  const tenantsStore = useTenantsStore()
  if (!tenantsStore.hasTenants && !tenantsStore.isLoading) {
    try {
      await tenantsStore.fetchUserTenants()
    } catch {
      return navigateTo('/facturacion', { replace: true })
    }
  }

  if (tenantsStore.isLoading) {
    const started = Date.now()
    while (tenantsStore.isLoading && Date.now() - started < 5000) {
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  const { currentTenant } = useTenantReactive()
  if (!currentTenant.value?.id && tenantsStore.hasTenants) {
    await nextTick()
    const started = Date.now()
    while (!currentTenant.value?.id && Date.now() - started < 1000) {
      await new Promise((r) => setTimeout(r, 25))
    }
  }

  const tenantId = currentTenant.value?.id
  if (!tenantId) {
    return navigateTo('/facturacion', { replace: true })
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
      return navigateTo('/facturacion', { replace: true })
    }
  }

  if (!profileResponse || profileResponse.profile.tenant_id !== tenantId) {
    return navigateTo('/facturacion', { replace: true })
  }

  if (!profileResponse.capabilities.matias_dian) {
    return navigateTo('/facturacion', { replace: true })
  }
})
