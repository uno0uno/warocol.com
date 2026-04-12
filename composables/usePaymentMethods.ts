import { ref, readonly } from 'vue'
import { PAYMENT_DEFAULTS, type PosPaymentGroup } from '~/utils/paymentDefaults'

export function usePaymentMethods() {
  const paymentGroups = ref<PosPaymentGroup[]>([...PAYMENT_DEFAULTS])
  const isLoading = ref(false)

  async function fetchPaymentMethods() {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: PosPaymentGroup[] }>('/api/pos/payment-methods')
      const groups = res?.data
      if (Array.isArray(groups) && groups.length > 0) {
        paymentGroups.value = groups
      }
    } catch {
      // Keep defaults on error — user can still operate
    } finally {
      isLoading.value = false
    }
  }

  return {
    paymentGroups: readonly(paymentGroups),
    isLoading: readonly(isLoading),
    fetchPaymentMethods,
  }
}
