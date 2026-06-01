/**
 * Debounced WaRo redemption preview for POS checkout (B1/B2/B3).
 * Proxied: GET /api/admin/waros/preview-redemption
 */

export interface PromoLineForRedemption {
  id: string
  product_id: string
  category_id?: string | null
  quantity: number
  subtotal: number
  promo_opt_out?: boolean
}

export interface WaroRedemptionPreview {
  redemption_enabled: boolean
  subtotal_after_promos: number
  manual_discount_amount: number
  base_after_manual: number
  base_canje: number
  b1_waros: number
  b1_cop: number
  b1_cop_raw: number
  b2_waros: number
  reward_fixed_off: number
  reward_type: string | null
  reward_name: string | null
  waro_reward_id: string | null
  total_waro_discount_cop: number
  total_waros_cost: number
  max_redeem_percent: number
  max_b1_cop_cap: number
  wallet_balance: number
  total_after_redemption: number
}

export interface WaroRedemptionPreviewParams {
  lines: PromoLineForRedemption[]
  customerId?: string | null
  manualDiscountAmount?: number
  discountType?: 'percent' | 'fixed' | null
  discountValue?: number | null
  warosToRedeem?: number
  waroRewardId?: string | null
}

export const useWaroRedemptionPreview = () => {
  const preview = ref<WaroRedemptionPreview | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null
  let requestSeq = 0

  const resetPreview = () => {
    preview.value = null
    error.value = null
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const fetchPreview = async (params: WaroRedemptionPreviewParams) => {
    if (!params.lines.length) {
      resetPreview()
      return null
    }

    const seq = ++requestSeq
    isLoading.value = true
    error.value = null

    try {
      const query: Record<string, string> = {
        lines: JSON.stringify(params.lines),
      }
      if (params.customerId) query.customer_id = params.customerId
      if (params.manualDiscountAmount != null && params.manualDiscountAmount > 0) {
        query.manual_discount_amount = String(params.manualDiscountAmount)
      }
      if (params.discountType && params.discountValue != null && params.discountValue > 0) {
        query.discount_type = params.discountType
        query.discount_value = String(params.discountValue)
      }
      if (params.warosToRedeem != null && params.warosToRedeem > 0) {
        query.waros_to_redeem = String(params.warosToRedeem)
      }
      if (params.waroRewardId) query.waro_reward_id = params.waroRewardId

      const qs = new URLSearchParams(query).toString()
      const data = await $fetch<WaroRedemptionPreview>(
        `/api/admin/waros/preview-redemption?${qs}`,
      )
      if (seq !== requestSeq) return null
      preview.value = data
      return data
    } catch (e: any) {
      if (seq !== requestSeq) return null
      preview.value = null
      const detail = e?.data?.detail
      error.value = Array.isArray(detail)
        ? detail.map((d: any) => d.msg ?? JSON.stringify(d)).join('; ')
        : detail || e?.data?.message || e?.message || 'Error al calcular canje WaRo'
      return null
    } finally {
      if (seq === requestSeq) isLoading.value = false
    }
  }

  const schedulePreview = (params: WaroRedemptionPreviewParams, delayMs = 400) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      void fetchPreview(params)
    }, delayMs)
  }

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })

  return {
    preview,
    isLoading,
    error,
    fetchPreview,
    schedulePreview,
    resetPreview,
  }
}
