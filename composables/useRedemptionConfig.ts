/**
 * B1 redemption conversion settings.
 * Proxied: GET/PATCH /api/admin/waros/redemption-config
 */

export interface RedemptionConfig {
  is_enabled: boolean
  redemption_enabled: boolean
  waros_per_1000_cop: number
  max_redeem_percent_per_order: number
  min_waros_to_redeem: number
  earn_on_wallet_payment: boolean
  earn_base_excludes_waro_redemption: boolean
}

export type RedemptionConfigPatch = Partial<
  Pick<
    RedemptionConfig,
    | 'redemption_enabled'
    | 'waros_per_1000_cop'
    | 'max_redeem_percent_per_order'
    | 'min_waros_to_redeem'
  >
>

export const useRedemptionConfig = () => {
  const cache = useQueryCache()

  const { data, status, asyncStatus } = useQuery({
    key: ['waros', 'redemption-config'],
    query: () =>
      $fetch<RedemptionConfig>('/api/admin/waros/redemption-config'),
  })

  const config = computed(() => data.value ?? null)
  const isLoading = computed(() => status.value === 'pending')
  const isRefreshing = computed(
    () => asyncStatus.value === 'loading' && data.value != null
  )

  const fetchConfig = () =>
    cache.invalidateQueries({ key: ['waros', 'redemption-config'] })

  const saveMutation = useMutation({
    mutation: (patch: RedemptionConfigPatch) =>
      $fetch<RedemptionConfig>('/api/admin/waros/redemption-config', {
        method: 'PATCH',
        body: patch,
      }),
    onSettled: () =>
      cache.invalidateQueries({ key: ['waros', 'redemption-config'] }),
  })

  const saveConfig = (patch: RedemptionConfigPatch) =>
    saveMutation.mutateAsync(patch)

  const saveError = computed(() => {
    const e = saveMutation.error.value as any
    return e?.data?.detail || e?.message || null
  })

  return {
    config,
    isLoading,
    isRefreshing,
    fetchConfig,
    saveConfig,
    isSaving: saveMutation.isLoading,
    saveError,
  }
}
