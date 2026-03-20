/**
 * Waros Customer Composable
 * Fetches wallet summary and handles manual Waros assignment for a single customer.
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
  const summary = ref<WarosSummary | null>(null)
  const isLoadingSummary = ref(false)
  const isSaving = ref(false)
  const summaryError = ref<string | null>(null)

  const fetchSummary = async (profileId: string) => {
    if (!profileId) return
    isLoadingSummary.value = true
    summaryError.value = null
    try {
      const res = await $fetch<WarosSummary>(`/api/admin/waros/customers/${profileId}/summary`)
      summary.value = res
    } catch (e: any) {
      summaryError.value = e?.data?.detail || e?.message || 'Error al cargar Waros'
    } finally {
      isLoadingSummary.value = false
    }
  }

  const assignWaros = async (
    profileId: string,
    waros_amount: number,
    reason?: string
  ): Promise<{ new_balance: number; transaction_id: number }> => {
    isSaving.value = true
    try {
      const res = await $fetch<{
        assigned: boolean
        waros_amount: number
        new_balance: number
        transaction_id: number
      }>('/api/admin/waros/assign', {
        method: 'POST',
        body: {
          profile_id: profileId,
          waros_amount,
          reason: reason || undefined,
        },
      })
      return res
    } finally {
      isSaving.value = false
    }
  }

  return {
    summary,
    isLoadingSummary,
    isSaving,
    summaryError,
    fetchSummary,
    assignWaros,
  }
}
