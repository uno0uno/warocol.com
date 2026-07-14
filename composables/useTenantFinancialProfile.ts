import { normalizeMinorUnits } from '../utils/currencyDisplay.ts'

export interface TenantFinancialProfile {
  tenant_id: string
  country_code: string
  base_currency_code: string
  accounting_localization: string
  document_mode: string
  fiscal_provider: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface CountryCurrencyOption {
  country_code: string
  currency_codes: string[]
}

export interface CurrencyMetadata {
  currency_code: string
  minor_units: number
}

export interface FinancialCapabilities {
  colombia_puc: boolean
  colombia_payroll: boolean
  matias_dian: boolean
  cop_wallet: boolean
  wompi: boolean
  fixed_cop_discounts: boolean
}

export interface FinancialEligibility {
  eligible: boolean
  lock_type: 'none' | 'temporary' | 'permanent'
  reason_codes: string[]
}

export interface TenantFinancialProfileResponse {
  profile: TenantFinancialProfile
  catalog: CountryCurrencyOption[]
  currencies: CurrencyMetadata[]
  capabilities: FinancialCapabilities
  eligibility: FinancialEligibility
}

export interface FinancialProfileDraft {
  country_code: string
  base_currency_code: string
}

export const financialProfileQueryKey = (tenantId?: string | null) =>
  ['tenant', 'financial-profile', tenantId ?? null] as const

export const createFinancialProfileDraft = (
  profile?: TenantFinancialProfile | null,
): FinancialProfileDraft => ({
  country_code: profile?.country_code ?? '',
  base_currency_code: profile?.base_currency_code ?? '',
})

export const getCompatibleCurrencyCodes = (
  catalog: CountryCurrencyOption[],
  countryCode: string,
): string[] => catalog.find(option => option.country_code === countryCode)?.currency_codes ?? []

export const getCurrencyMinorUnits = (
  currencies: CurrencyMetadata[],
  currencyCode: string,
  fallback = 0,
): number => normalizeMinorUnits(
  currencies.find(currency => currency.currency_code === currencyCode)?.minor_units,
  fallback,
)

export const hasFinancialProfileChanges = (
  profile: TenantFinancialProfile,
  draft: FinancialProfileDraft,
): boolean => (
  profile.country_code !== draft.country_code
  || profile.base_currency_code !== draft.base_currency_code
)

export const canSubmitFinancialProfile = (
  response: TenantFinancialProfileResponse | null,
  draft: FinancialProfileDraft,
): boolean => {
  if (!response?.eligibility.eligible) return false
  if (!hasFinancialProfileChanges(response.profile, draft)) return false
  return getCompatibleCurrencyCodes(response.catalog, draft.country_code)
    .includes(draft.base_currency_code)
}

export const useTenantFinancialProfile = () => {
  const { currentTenant } = useTenantReactive()
  const accessStore = useAccessStore()
  const cache = useQueryCache()

  const canManage = computed(() =>
    accessStore.isLoaded && accessStore.can('mi_negocio'),
  )

  const {
    data,
    status,
    asyncStatus,
    error,
  } = useQuery({
    key: () => financialProfileQueryKey(currentTenant.value?.id),
    query: () => $fetch<TenantFinancialProfileResponse>(
      '/api/api/tenant/financial-profile',
    ),
    enabled: () => import.meta.client && !!currentTenant.value && canManage.value,
    staleTime: 30_000,
  })

  const response = computed(() => data.value ?? null)
  const profile = computed(() => response.value?.profile ?? null)
  const currencyMinorUnits = computed(() => getCurrencyMinorUnits(
    response.value?.currencies ?? [],
    profile.value?.base_currency_code ?? '',
    0,
  ))

  const saveMutation = useMutation({
    mutation: (draft: FinancialProfileDraft) =>
      $fetch<TenantFinancialProfileResponse>('/api/api/tenant/financial-profile', {
        method: 'PUT',
        body: {
          country_code: draft.country_code,
          base_currency_code: draft.base_currency_code,
        },
      }),
    onSettled: async () => {
      await Promise.allSettled([
        cache.invalidateQueries({ key: ['tenant', 'financial-profile'] }),
        cache.invalidateQueries({ key: ['tenant', 'business-profile'] }),
        cache.invalidateQueries({ key: ['operaciones', 'restaurant-context'] }),
      ])
    },
  })

  const refresh = () =>
    cache.invalidateQueries({ key: ['tenant', 'financial-profile'] })

  const saveError = computed(() => {
    const value = saveMutation.error.value as any
    return value?.data?.detail ?? value?.data?.message ?? value?.message ?? null
  })

  return {
    canManage,
    response,
    profile,
    currencyMinorUnits,
    isLoading: computed(() => canManage.value && status.value === 'pending'),
    isRefreshing: computed(() => asyncStatus.value === 'loading' && !!data.value),
    queryError: error,
    refresh,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isLoading,
    saveError,
  }
}
