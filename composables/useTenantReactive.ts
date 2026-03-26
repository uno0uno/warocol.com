const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export const useTenantReactive = () => {
  const tenantsStore = useTenantsStore()

  // Referencias reactivas del store
  const currentTenant = computed(() => tenantsStore.selectedTenant)
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

  return {
    currentTenant,
    businessProfile,
    isOpenNow,
    currentDayHours,
  }
}
