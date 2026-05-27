/**
 * POS receipt print settings from restaurant-context (warocol.com#930).
 * Used by receipt print components starting batch #931.
 */
export function useReceiptPrintSettings() {
  const { currentTenant } = useTenantReactive()
  const { businessProfile } = useTenantReactive()

  const { data: settingsData } = useQuery({
    key: () => ['pos', 'restaurant-context', currentTenant.value?.id ?? null],
    query: () => $fetch<{ success: boolean; data: any }>('/api/pos/restaurant-context'),
    enabled: () => !!currentTenant.value,
    staleTime: 30_000,
  })

  const receiptPrintSettings = computed(() =>
    settingsData.value?.data?.receipt_print_settings ?? { document_label: 'Prefactura', show_logo: true },
  )

  const receiptLogoUrl = computed(() => {
    if (!receiptPrintSettings.value.show_logo) return null
    const url = settingsData.value?.data?.logo_url ?? businessProfile.value?.logo_url ?? null
    return url && String(url).startsWith('http') ? url : null
  })

  return { receiptPrintSettings, receiptLogoUrl, settingsData }
}
