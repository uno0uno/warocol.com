/**
 * Waros Estimate Composable
 * Fetches estimated Waros for a cart total + customer (read-only, never writes to DB).
 *
 * Migrated to Pinia Colada useMutation — eliminates manual loading/error refs.
 *
 * API endpoint (proxied via Nuxt nitro → api.warolabs.com):
 *   GET /api/admin/waros/estimate?total_amount=X&customer_id=uuid&payment_method=customer_wallet
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
  earn_eligible?: boolean
  earn_block_reason?: string
}

export const useWarosEstimate = () => {
  const estimateMutation = useMutation({
    mutation: (vars: { totalAmount: number; customerId?: string; paymentMethod?: string }) => {
      const params: Record<string, string> = {
        total_amount: String(vars.totalAmount),
      }
      if (vars.customerId) params.customer_id = vars.customerId
      if (vars.paymentMethod) params.payment_method = vars.paymentMethod
      return $fetch<WarosEstimateResult>('/api/admin/waros/estimate', { params })
    },
  })

  const estimatedWaros = computed(() => estimateMutation.data.value?.estimated_waros ?? null)
  const earnEligible = computed(() => estimateMutation.data.value?.earn_eligible !== false)
  // null = unknown (card hidden until first API response confirms system_enabled)
  const systemEnabled = computed(() => estimateMutation.data.value?.system_enabled ?? null)
  const isLoadingEstimate = estimateMutation.isLoading

  const fetchEstimate = async (
    totalAmount: number,
    customerId?: string,
    paymentMethod?: string,
  ) => {
    if (totalAmount <= 0) return
    try {
      await estimateMutation.mutateAsync({ totalAmount, customerId, paymentMethod })
    } catch {
      // Silently fail — don't break checkout if Waros is unavailable
      estimateMutation.reset()
    }
  }

  const resetEstimate = () => estimateMutation.reset()

  return {
    estimatedWaros,
    earnEligible,
    isLoadingEstimate,
    systemEnabled,
    fetchEstimate,
    resetEstimate,
  }
}
