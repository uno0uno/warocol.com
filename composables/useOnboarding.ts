import type {
  CountryCurrencyOption,
  CurrencyMetadata,
  TenantFinancialProfile,
} from './useTenantFinancialProfile'
import { resolveOnboardingView } from '~/utils/onboardingFlow'

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

export interface OnboardingBusinessDraft {
  business_name: string
  country_code: string
  base_currency_code: string
}

export const useOnboarding = () => {
  const status = ref<OnboardingStatusData | null>(null)
  const financial = ref<OnboardingFinancialData | null>(null)
  const isLoading = ref(true)
  const isSaving = ref(false)
  const loadError = ref<unknown>(null)
  const saveError = ref<unknown>(null)

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

  return {
    status,
    financial,
    isLoading,
    isSaving,
    loadError,
    saveError,
    load,
    loadStatus,
    loadFinancial,
    saveBusinessProfile,
  }
}
