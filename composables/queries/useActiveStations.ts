/**
 * Pinia Colada query for active kitchen stations used in product forms.
 *
 * Key is tenant-scoped so switching tenants triggers a fresh fetch.
 * staleTime: 60s — station list changes infrequently.
 *
 * Usage:
 *   const { activeStations } = useActiveStationsQuery()
 */
export const useActiveStationsQuery = defineQuery(() => {
  const { currentTenant } = useTenantReactive()

  const { data, status, asyncStatus, refetch } = useQuery({
    key: () => ['tenant', 'stations', 'active', currentTenant.value?.id],
    query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations/active'),
    enabled: () => !!currentTenant.value,
    staleTime: 60_000,
  })

  const activeStations = computed(() => (data.value as any)?.data ?? [])

  return { data, status, asyncStatus, refetch, activeStations }
})
