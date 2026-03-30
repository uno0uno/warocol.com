/**
 * Data Quality Status Composable
 * Polls the analytics data-quality endpoint every 5 minutes.
 *
 * defineQuery ensures all callers share the same data ref and a single interval timer.
 * Pinia Colada deduplicates requests by key automatically.
 * Tenant switching handled by reactive key. Polling lifecycle managed by Pinia Colada.
 */
export const useDataQualityStatus = defineQuery(() => {
  const { currentTenant } = useTenantReactive()

  const { data, status } = useQuery({
    key: () => ['analytics', 'data-quality-status', currentTenant.value?.id ?? 'default'],
    query: async () => {
      const res = await $fetch<any>('/api/analytics/data-quality')
      // Preserve dual response shape: { data: { critical: N } } or { critical: N }
      return (res?.data?.critical ?? res?.critical ?? 0) as number
    },
    refetchInterval: 5 * 60_000, // 5 minutes — replaces setInterval
    enabled: () => !!currentTenant.value,
  })

  const hasCritical = computed(() => (data.value ?? 0) > 0)

  const refresh = () =>
    useQueryCache().invalidateQueries({ key: ['analytics', 'data-quality'] })

  return {
    hasCriticalAlerts: readonly(hasCritical),
    refresh,
  }
})
