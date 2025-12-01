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
export const useTenantReactive = () => {
  const tenantsStore = useTenantsStore()
  
  // Referencias reactivas del store
  const currentTenant = computed(() => tenantsStore.selectedTenant)
  const tenantChangeCounter = computed(() => tenantsStore.tenantChangeCounter)
  
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
    forceRefresh
  }
}