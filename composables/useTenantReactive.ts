/**
 * Composable para manejar la reactividad global cuando cambia el tenant
 *
 * Uso:
 * const { onTenantChange, currentTenant, tenantChangeCounter } = useTenantReactive()
 *
 * // Opción 1: Watch automático
 * onTenantChange(() => {
 *   // Esta función se ejecuta cada vez que cambia el tenant
 *   refreshData()
 * })
 *
 * // Opción 2: Watch manual del counter
 * watch(tenantChangeCounter, () => {
 *   refreshData()
 * })
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export const useTenantReactive = () => {
  const tenantsStore = useTenantsStore()

  // Referencias reactivas del store
  const currentTenant = computed(() => tenantsStore.selectedTenant)
  const tenantChangeCounter = computed(() => tenantsStore.tenantChangeCounter)
  const businessProfile = computed(() => tenantsStore.businessProfile)

  /**
   * Returns today's business hours entry using Colombia timezone (America/Bogota, UTC-5).
   * Returns null if no profile or no hours configured for today.
   */
  const currentDayHours = computed(() => {
    const hours = businessProfile.value?.business_hours
    if (!hours) return null
    const bogotaDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
    )
    return hours[DAY_NAMES[bogotaDate.getDay()]] ?? null
  })

  /**
   * Whether the restaurant is currently open in Colombia time.
   * Fail-open: returns true when no profile or no hours configured.
   * Note: recomputes when businessProfile changes (tenant switch / fetch),
   * not on a live clock — suitable for dashboard load and tenant switches.
   */
  const isOpenNow = computed(() => {
    if (!businessProfile.value) return true        // no profile → fail-open
    if (businessProfile.value.is_manually_open === false) return false  // manual override
    const hours = currentDayHours.value
    if (!hours) return true
    if (hours.closed) return false
    if (!hours.open || !hours.close) return true   // missing times → fail-open
    const bogotaDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
    )
    const now = bogotaDate.getHours() * 60 + bogotaDate.getMinutes()
    const [oH, oM] = hours.open.split(':').map(Number)
    const [cH, cM] = hours.close.split(':').map(Number)
    const open = oH * 60 + oM
    const close = cH * 60 + cM
    return close > open ? now >= open && now < close : now >= open || now < close
  })

  /**
   * Registra un callback que se ejecuta cuando cambia el tenant
   * @param callback Función a ejecutar cuando cambie el tenant
   * @param options Opciones del watcher
   */
  const onTenantChange = (
    callback: () => void | Promise<void>,
    options: { immediate?: boolean } = { immediate: false }
  ) => {
    watch(
      tenantChangeCounter,
      async (newCounter, oldCounter) => {
        // Solo ejecutar si realmente cambió el counter (no en la inicialización)
        if (newCounter !== oldCounter && newCounter > 0) {
          await callback()
        }
      },
      { immediate: options.immediate }
    )
  }

  /**
   * Fuerza una recarga de datos sin cambiar tenant
   * Útil para refrescar datos manualmente
   */
  const forceRefresh = () => {
    tenantsStore.tenantChangeCounter++
  }

  return {
    currentTenant,
    tenantChangeCounter,
    onTenantChange,
    forceRefresh,
    businessProfile,
    isOpenNow,
    currentDayHours,
  }
}
