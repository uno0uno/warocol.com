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

export const isIntegratedFiscalProfile = (
  response?: TenantFinancialProfileResponse | null,
  tenantId?: string | null,
): boolean => Boolean(
  response
  && (!tenantId || response.profile.tenant_id === tenantId)
  && response.capabilities.matias_dian
  && response.profile.document_mode === 'fiscal_integrated'
  && response.profile.fiscal_provider === 'matias',
)

export const isColombiaPucProfile = (
  response?: TenantFinancialProfileResponse | null,
  tenantId?: string | null,
): boolean => Boolean(
  response
  && (!tenantId || response.profile.tenant_id === tenantId)
  && response.capabilities.colombia_puc
  && response.profile.accounting_localization === 'WARO_CO_PUC_V1',
)

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
    enabled: () => import.meta.client && !!currentTenant.value,
    staleTime: 30_000,
  })

  const response = computed(() => {
    if (!data.value || data.value.profile.tenant_id !== currentTenant.value?.id) return null
    return data.value
  })
  const profile = computed(() => response.value?.profile ?? null)
  const isFiscalIntegrated = computed(() =>
    isIntegratedFiscalProfile(response.value, currentTenant.value?.id),
  )
  const isColombiaPuc = computed(() =>
    isColombiaPucProfile(response.value, currentTenant.value?.id),
  )
  const isWaroCommercial = computed(() =>
    profile.value?.document_mode === 'waro_commercial',
  )
  const currencyMinorUnits = computed(() => getCurrencyMinorUnits(
    response.value?.currencies ?? [],
    profile.value?.base_currency_code ?? '',
    0,
  ))

  const saveMutation = useMutation({
    mutation: (draft: FinancialProfileDraft) => {
      if (!canManage.value) throw new Error('Financial profile update is not allowed')
      return $fetch<TenantFinancialProfileResponse>('/api/api/tenant/financial-profile', {
        method: 'PUT',
        body: {
          country_code: draft.country_code,
          base_currency_code: draft.base_currency_code,
        },
      })
    },
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
    isFiscalIntegrated,
    isColombiaPuc,
    isWaroCommercial,
    currencyMinorUnits,
    isLoading: computed(() => !!currentTenant.value && status.value === 'pending'),
    isRefreshing: computed(() => asyncStatus.value === 'loading' && !!data.value),
    queryError: error,
    refresh,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isLoading,
    saveError,
  }
}
