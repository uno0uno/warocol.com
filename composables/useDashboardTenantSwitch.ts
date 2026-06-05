import type { Tenant } from '~/stores/tenants'

export const useDashboardTenantSwitch = () => {
  const router = useRouter()
  const tenantsStore = useTenantsStore()
  const { subscription: billingSubscription, fetchSubscription: fetchBillingSubscription } = useBilling()

  const selectTenantWithBillingGuard = async (tenant: Tenant) => {
    const success = await tenantsStore.selectTenant(tenant)
    if (!success) return false

    if (billingSubscription.value === undefined) {
      try {
        await fetchBillingSubscription()
      } catch {
        return true
      }
    }

    const status = billingSubscription.value?.status
    const hasAccess = status === 'active' || status === 'past_due'
    if (!hasAccess) {
      await router.replace('/gestion/billing')
    }

    return true
  }

  return {
    selectTenantWithBillingGuard,
  }
}
