/**
 * Tenant printer assignments (caja + kitchen stations) — warocol.com#1949.
 */
export type StationPrinterRow = {
  station_id: string
  printer_name: string
}

export type ActiveStationRow = {
  id: string
  name: string
  kitchen_name?: string | null
}

export type PrinterAssignmentsPayload = {
  caja_printer_name: string | null
  stations: StationPrinterRow[]
  active_stations: ActiveStationRow[]
  resolved: Record<string, string | null>
  resolved_caja: string | null
}

export type PrinterAssignmentsPutBody = {
  caja_printer_name: string | null
  stations: Array<{ station_id: string; printer_name: string | null }>
}

export function usePrinterAssignments() {
  const { currentTenant } = useTenantReactive()

  const { data, asyncStatus, error, refetch } = useQuery({
    key: () => ['operaciones', 'printers', currentTenant.value?.id ?? 'none'],
    query: () =>
      $fetch<{ success: boolean; data: PrinterAssignmentsPayload }>('/api/operaciones/printers'),
    enabled: () => !!currentTenant.value,
    staleTime: 15_000,
  })

  const assignments = computed(() => data.value?.data ?? null)
  const isLoading = computed(() => !data.value && !error.value)
  const isRefreshing = computed(
    () => asyncStatus.value === 'loading' && data.value != null,
  )

  async function saveAssignments(body: PrinterAssignmentsPutBody) {
    const res = await $fetch<{ success: boolean; data: PrinterAssignmentsPayload }>(
      '/api/operaciones/printers',
      { method: 'PUT', body },
    )
    await refetch()
    return res.data
  }

  return {
    assignments,
    isLoading,
    isRefreshing,
    error,
    refetch,
    saveAssignments,
  }
}
