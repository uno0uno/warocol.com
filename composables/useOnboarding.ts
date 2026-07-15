import type {
  CountryCurrencyOption,
  CurrencyMetadata,
  TenantFinancialProfile,
} from './useTenantFinancialProfile'
import { resolveOnboardingView } from '~/utils/onboardingFlow'
import {
  buildOnboardingCheckoutBody,
  isSafeCheckoutUrl,
  type OnboardingCheckoutResult,
  type OnboardingPaymentAttempt,
  type OnboardingPlan,
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
  subscriptionStatus?: string | null
  subscription_status?: string | null
  trialStartedAt?: string | null
  trial_started_at?: string | null
  trialEndsAt?: string | null
  trial_ends_at?: string | null
  trialDaysRemaining?: number | null
  trial_days_remaining?: number | null
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

export interface OnboardingBusinessDraft {
  business_name: string
  country_code: string
  base_currency_code: string
}

export const useOnboarding = () => {
  const status = ref<OnboardingStatusData | null>(null)
  const financial = ref<OnboardingFinancialData | null>(null)
  const plans = ref<OnboardingPlan[]>([])
  const paymentAttempt = ref<OnboardingPaymentAttempt | null>(null)
  const isLoading = ref(true)
  const isSaving = ref(false)
  const isPlansLoading = ref(false)
  const isCheckoutLoading = ref(false)
  const isPaymentLoading = ref(false)
  const loadError = ref<unknown>(null)
  const saveError = ref<unknown>(null)
  const plansError = ref<unknown>(null)
  const checkoutError = ref<unknown>(null)
  const paymentError = ref<unknown>(null)

  const loadStatus = async () => {
    const response = await $fetch<ApiEnvelope<OnboardingStatusData>>('/api/onboarding/status', {
      credentials: 'include',
    })
    status.value = response.data
    return response.data
  }

  const loadFinancial = async () => {
    const response = await $fetch<ApiEnvelope<OnboardingFinancialData>>('/api/onboarding/financial-profile', {
      credentials: 'include',
    })
    financial.value = response.data
    return response.data
  }

  const load = async () => {
    isLoading.value = true
    loadError.value = null
    try {
      const currentStatus = await loadStatus()
      if (resolveOnboardingView(currentStatus) === 'business') await loadFinancial()
      return currentStatus
    } catch (err) {
      loadError.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const saveBusinessProfile = async (draft: OnboardingBusinessDraft) => {
    isSaving.value = true
    saveError.value = null
    try {
      const response = await $fetch<ApiEnvelope<OnboardingFinancialData>>('/api/onboarding/financial-profile', {
        method: 'PUT',
        credentials: 'include',
        body: draft,
      })
      financial.value = response.data
      await loadStatus()
      return response.data
    } catch (err) {
      saveError.value = err
      throw err
    } finally {
      isSaving.value = false
    }
  }

  const loadPlans = async () => {
    isPlansLoading.value = true
    plansError.value = null
    try {
      const response = await $fetch<ApiEnvelope<OnboardingPlan[]>>('/api/onboarding/plans', {
        credentials: 'include',
      })
      plans.value = response.data ?? []
      return plans.value
    } catch (err) {
      plansError.value = err
      throw err
    } finally {
      isPlansLoading.value = false
    }
  }

  const createCheckout = async (planId: string) => {
    isCheckoutLoading.value = true
    checkoutError.value = null
    try {
      const response = await $fetch<OnboardingCheckoutResult>('/api/onboarding/checkout', {
        method: 'POST',
        credentials: 'include',
        body: buildOnboardingCheckoutBody(planId),
      })
      if (!isSafeCheckoutUrl(response.checkout_url)) {
        throw new Error('ONBOARDING_CHECKOUT_URL_INVALID')
      }
      return response
    } catch (err) {
      checkoutError.value = err
      throw err
    } finally {
      isCheckoutLoading.value = false
    }
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
    financial,
    plans,
    paymentAttempt,
    isLoading,
    isSaving,
    isPlansLoading,
    isCheckoutLoading,
    isPaymentLoading,
    loadError,
    saveError,
    plansError,
    checkoutError,
    paymentError,
    load,
    loadStatus,
    loadFinancial,
    saveBusinessProfile,
    loadPlans,
    createCheckout,
    loadPaymentStatus,
  }
}
