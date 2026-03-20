/**
 * Waros Estimate Composable
 * Fetches estimated Waros for a cart total + customer (read-only, never writes to DB).
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
  const estimatedWaros = ref<number | null>(null)
  const isLoadingEstimate = ref(false)
  // null = unknown (card hidden until first API response confirms system_enabled)
  const systemEnabled = ref<boolean | null>(null)

  const fetchEstimate = async (totalAmount: number, customerId?: string) => {
    if (totalAmount <= 0) return
    isLoadingEstimate.value = true
    try {
      const params: Record<string, string> = {
        total_amount: String(totalAmount),
      }
      if (customerId) params.customer_id = customerId

      const res = await $fetch<WarosEstimateResult>('/api/admin/waros/estimate', { params })
      estimatedWaros.value = res.estimated_waros
      systemEnabled.value = res.system_enabled
    } catch {
      // Silently fail — don't break checkout if Waros is unavailable
      estimatedWaros.value = null
    } finally {
      isLoadingEstimate.value = false
    }
  }

  return {
    estimatedWaros,
    isLoadingEstimate,
    systemEnabled,
    fetchEstimate,
  }
}
