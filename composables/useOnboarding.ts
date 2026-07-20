import type {
  CountryCurrencyOption,
  CurrencyMetadata,
  TenantFinancialProfile,
} from './useTenantFinancialProfile'
import {
  type OnboardingPaymentAttempt,
} from '~/utils/onboardingPayment'

export interface OnboardingStatusData {
  tenantId: string
  lifecycleStatus: 'pending' | 'active' | 'suspended' | 'cancelled'
  state: string | null
  nextStep: string | null
  emailVerifiedAt?: string | null
  businessName: string
  financialProfile?: TenantFinancialProfile | null
  termsAccepted: boolean
  termsVersion?: string | null
}

export interface OnboardingFinancialData {
  businessName: string
  profile: TenantFinancialProfile | null
  catalog: CountryCurrencyOption[]
  currencies: CurrencyMetadata[]
  state: string
  nextStep: string | null
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
}

export const useOnboarding = () => {
  const status = ref<OnboardingStatusData | null>(null)
  const paymentAttempt = ref<OnboardingPaymentAttempt | null>(null)
  const isLoading = ref(true)
  const isPaymentLoading = ref(false)
  const loadError = ref<unknown>(null)
  const paymentError = ref<unknown>(null)

  const loadStatus = async () => {
    const response = await $fetch<ApiEnvelope<OnboardingStatusData>>('/api/onboarding/status', {
      credentials: 'include',
    })
    status.value = response.data
    return response.data
  }

  const loadPaymentStatus = async (attemptId?: string) => {
    isPaymentLoading.value = true
    paymentError.value = null
    try {
      const response = await $fetch<OnboardingPaymentAttempt>('/api/onboarding/payment-status', {
        credentials: 'include',
        query: attemptId ? { attempt_id: attemptId } : undefined,
      })
      paymentAttempt.value = response
      return response
    } catch (err) {
      paymentError.value = err
      throw err
    } finally {
      isPaymentLoading.value = false
    }
  }

  return {
    status,
    paymentAttempt,
    isLoading,
    isPaymentLoading,
    loadError,
    paymentError,
    loadStatus,
    loadPaymentStatus,
  }
}
