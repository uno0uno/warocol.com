/**
 * Waros Estimate Composable
 * Fetches estimated Waros for a cart total + customer (read-only, never writes to DB).
 *
 * Migrated to Pinia Colada useMutation — eliminates manual loading/error refs.
 *
 * API endpoint (proxied via Nuxt nitro → api.warolabs.com):
 *   GET /api/admin/waros/estimate?total_amount=X&customer_id=uuid
 */

export interface WarosEstimateBreakdown {
  rule_type: string
  waros: number
  is_active: boolean
}

export interface WarosEstimateResult {
  estimated_waros: number
  system_enabled: boolean
  breakdown: WarosEstimateBreakdown[]
}

export const useWarosEstimate = () => {
  const estimateMutation = useMutation({
    mutation: (vars: { totalAmount: number; customerId?: string }) => {
      const params: Record<string, string> = {
        total_amount: String(vars.totalAmount),
      }
      if (vars.customerId) params.customer_id = vars.customerId
      return $fetch<WarosEstimateResult>('/api/admin/waros/estimate', { params })
    },
  })

  const estimatedWaros = computed(() => estimateMutation.data.value?.estimated_waros ?? null)
  // null = unknown (card hidden until first API response confirms system_enabled)
  const systemEnabled = computed(() => estimateMutation.data.value?.system_enabled ?? null)
  const isLoadingEstimate = estimateMutation.isLoading

  const fetchEstimate = async (totalAmount: number, customerId?: string) => {
    if (totalAmount <= 0) return
    try {
      await estimateMutation.mutateAsync({ totalAmount, customerId })
    } catch {
      // Silently fail — don't break checkout if Waros is unavailable
      estimateMutation.reset()
    }
  }

  const resetEstimate = () => estimateMutation.reset()

  return {
    estimatedWaros,
    isLoadingEstimate,
    systemEnabled,
    fetchEstimate,
    resetEstimate,
  }
}
