/**
 * Data Quality Status Composable
 * Polls the analytics data-quality endpoint every 5 minutes.
 *
 * defineQuery ensures all callers share the same data ref and a single interval timer.
 * Pinia Colada deduplicates requests by key automatically.
 * Tenant switching handled by reactive key. Polling lifecycle managed by Pinia Colada.
 *
 * RBAC: `/api/analytics/data-quality` is gated under Module.ANALITICA
 * (api-warolabs#193). Only owner / admin / supervisor roles have access; cashier
 * and kitchen do not. The polling is fired by the sidebar for EVERY authenticated
 * user, so without a role check non-ANALITICA sessions would generate 403 spam
 * every 5 minutes. We gate the `enabled` flag on role to avoid that — the badge
 * simply doesn't appear for staff that wouldn't be able to act on alerts anyway.
 *
 * Session role is read from /api/auth/session (already returns user.role joined
 * from tenant_members.role; no backend change needed).
 */
export const useDataQualityStatus = defineQuery(() => {
  const { currentTenant } = useTenantReactive()

  const { data: sessionData } = useAsyncData(
    'data-quality-current-session-role',
    () => $fetch<{ user?: { role?: string | null } }>('/api/auth/session'),
    { server: false },
  )

  const hasAnaliticaAccess = computed(() => {
    const role = sessionData.value?.user?.role
    return role === 'owner' || role === 'admin' || role === 'supervisor'
  })

  const { data, status } = useQuery({
    key: () => ['analytics', 'data-quality-status', currentTenant.value?.id ?? 'default'],
    query: async () => {
      const res = await $fetch<any>('/api/analytics/data-quality')
      // Preserve dual response shape: { data: { critical: N } } or { critical: N }
      return (res?.data?.critical ?? res?.critical ?? 0) as number
    },
    refetchInterval: 5 * 60_000, // 5 minutes — replaces setInterval
    enabled: () => import.meta.client && !!currentTenant.value && hasAnaliticaAccess.value,
  })

  const hasCritical = computed(() => (data.value ?? 0) > 0)

  const refresh = () =>
    useQueryCache().invalidateQueries({ key: ['analytics', 'data-quality'] })

  return {
    hasCriticalAlerts: readonly(hasCritical),
    refresh,
  }
})
