/**
 * WaRo rewards catalog CRUD (B2).
 * Proxied: /api/admin/waros/rewards
 */

export type WaroRewardType = 'free_product' | 'fixed_cop_off'

export interface WaroReward {
  id: string
  name: string
  reward_type: WaroRewardType
  waros_cost: number
  fixed_cop_off: number | null
  product_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WaroRewardsResponse {
  rewards: WaroReward[]
}

export interface WaroRewardPayload {
  name: string
  reward_type: WaroRewardType
  waros_cost: number
  fixed_cop_off?: number | null
  product_id?: string | null
  is_active?: boolean
}

export const useWaroRewards = () => {
  const cache = useQueryCache()

  const { data, status, asyncStatus } = useQuery({
    key: ['waros', 'rewards'],
    query: () => $fetch<WaroRewardsResponse>('/api/admin/waros/rewards'),
  })

  const rewards = computed(() => data.value?.rewards ?? [])
  const isLoading = computed(() => status.value === 'pending')
  const isRefreshing = computed(
    () => asyncStatus.value === 'loading' && data.value != null
  )

  const fetchRewards = () =>
    cache.invalidateQueries({ key: ['waros', 'rewards'] })

  const createMutation = useMutation({
    mutation: (payload: WaroRewardPayload) =>
      $fetch('/api/admin/waros/rewards', { method: 'POST', body: payload }),
    onSettled: () => cache.invalidateQueries({ key: ['waros', 'rewards'] }),
  })

  const updateMutation = useMutation({
    mutation: (vars: { id: string; payload: Partial<WaroRewardPayload> }) =>
      $fetch(`/api/admin/waros/rewards/${vars.id}`, {
        method: 'PUT',
        body: vars.payload,
      }),
    onSettled: () => cache.invalidateQueries({ key: ['waros', 'rewards'] }),
  })

  const deleteMutation = useMutation({
    mutation: (id: string) =>
      $fetch(`/api/admin/waros/rewards/${id}`, { method: 'DELETE' }),
    onSettled: () => cache.invalidateQueries({ key: ['waros', 'rewards'] }),
  })

  const apiError = (e: unknown) => {
    const err = e as any
    return err?.data?.detail || err?.message || 'Error al procesar la operación'
  }

  return {
    rewards,
    isLoading,
    isRefreshing,
    fetchRewards,
    createReward: (payload: WaroRewardPayload) =>
      createMutation.mutateAsync(payload),
    updateReward: (id: string, payload: Partial<WaroRewardPayload>) =>
      updateMutation.mutateAsync({ id, payload }),
    deleteReward: (id: string) => deleteMutation.mutateAsync(id),
    isSaving:
      createMutation.isLoading ||
      updateMutation.isLoading ||
      deleteMutation.isLoading,
    apiError,
  }
}
