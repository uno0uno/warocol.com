/**
 * colombia-payroll.global.ts — warocol.com#1774
 *
 * Deep-link guard for Colombia payroll UI under Equipo.
 * When capabilities.colombia_payroll is false, redirect
 * /equipo/salarios/** and /equipo/nomina → /equipo/miembros.
 *
 * Do NOT call useTenantFinancialProfile() here — it creates useQuery
 * on every navigation. Mirror billing-gate: useQueryCache + $fetch.
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

  const { currentTenant } = useTenantReactive()
  const tenantId = currentTenant.value?.id
  if (!tenantId) return

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
      // Fail open — API salaries router still returns 409
      return
    }
  }

  if (!profileResponse || profileResponse.profile.tenant_id !== tenantId) return

  if (!profileResponse.capabilities.colombia_payroll) {
    return navigateTo('/equipo/miembros', { replace: true })
  }
})
