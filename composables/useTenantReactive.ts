const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export const useTenantReactive = () => {
  const tenantsStore = useTenantsStore()
  const { timezone, zonedParts } = useTenantTimezone()

  // Referencias reactivas del store
  const currentTenant = computed(() => tenantsStore.selectedTenant)
  const businessProfile = computed(() => tenantsStore.businessProfile)

  /**
   * Returns today's business hours entry using the tenant operational timezone.
   * Returns null if no profile or no hours configured for today.
   */
  const currentDayHours = computed(() => {
    const hours = businessProfile.value?.business_hours
    if (!hours) return null
    const weekday = zonedParts(new Date()).weekday
    const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday ?? '')
    return hours[DAY_NAMES[Math.max(weekdayIndex, 0)]] ?? null
  })

  /**
   * Whether the restaurant is currently open in tenant local time.
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
    const nowParts = zonedParts(new Date())
    const now = Number(nowParts.hour) * 60 + Number(nowParts.minute)
    const [oH, oM] = hours.open.split(':').map(Number)
    const [cH, cM] = hours.close.split(':').map(Number)
    const open = oH * 60 + oM
    const close = cH * 60 + cM
    return close > open ? now >= open && now < close : now >= open || now < close
  })

  return {
    currentTenant,
    businessProfile,
    timezone,
    isOpenNow,
    currentDayHours,
  }
}
