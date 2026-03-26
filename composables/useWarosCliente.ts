/**
 * Waros Customer Composable
 * Fetches wallet summary and handles manual Waros assignment for a single customer.
 *
 * Migrated to Pinia Colada useMutation — eliminates manual loading/error refs.
 *
 * API endpoints (proxied via Nuxt nitro → api.warolabs.com):
 *   GET  /api/admin/waros/customers/{profileId}/summary
 *   POST /api/admin/waros/assign
 */

export interface WaroTransaction {
  id: number
  created_at: string
  transaction_type: string
  waros_amount: number
  description: string
  related_entity_type: string | null
  related_entity_id: string | null
}

export interface WarosSummary {
  profile_id: string
  current_balance: number
  lifetime_earned: number
  lifetime_spent: number
  recent_transactions: WaroTransaction[]
}

export const useWarosCliente = () => {
  const summaryMutation = useMutation({
    mutation: (profileId: string) =>
      $fetch<WarosSummary>(`/api/admin/waros/customers/${profileId}/summary`),
  })

  const assignMutation = useMutation({
    mutation: (vars: { profileId: string; waros_amount: number; reason?: string }) =>
      $fetch<{ assigned: boolean; waros_amount: number; new_balance: number; transaction_id: number }>(
        '/api/admin/waros/assign',
        {
          method: 'POST',
          body: {
            profile_id: vars.profileId,
            waros_amount: vars.waros_amount,
            reason: vars.reason || undefined,
          },
        }
      ),
  })

  const summaryError = computed(() => {
    const e = summaryMutation.error.value as any
    return e?.data?.detail || e?.message || null
  })

  const fetchSummary = (profileId: string) => {
    if (!profileId) return Promise.resolve()
    return summaryMutation.mutateAsync(profileId)
  }

  const assignWaros = (
    profileId: string,
    waros_amount: number,
    reason?: string
  ): Promise<{ new_balance: number; transaction_id: number }> =>
    assignMutation.mutateAsync({ profileId, waros_amount, reason })

  const resetSummary = () => summaryMutation.reset()

  return {
    summary: summaryMutation.data,
    isLoadingSummary: summaryMutation.isLoading,
    isSaving: assignMutation.isLoading,
    summaryError,
    fetchSummary,
    assignWaros,
    resetSummary,
  }
}
