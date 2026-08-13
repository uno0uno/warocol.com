<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[9999] bg-black/40"
        @click="close"
        aria-hidden="true"
      />
    </Transition>

    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        :aria-label="t('shell.createTenantTitle')"
        class="fixed z-[10000] flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <BuildingStorefrontIcon class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  {{ t('shell.createTenantTitle') }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ t('shell.createTenantSubtitle') }}
                </p>
                <p class="text-xs text-text-tertiary leading-snug mt-1">
                  {{ t('shell.createTenantResumeHint') }}
                </p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="t('shell.closeCreateTenantPanel')"
              :disabled="saving"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-colors"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div class="flex flex-col gap-1.5">
            <label :for="nameId" class="text-sm font-medium text-text-primary">
              {{ t('onboarding.businessName') }} <span class="text-destructive">*</span>
            </label>
            <input
              :id="nameId"
              ref="nameInput"
              v-model="businessName"
              type="text"
              autocomplete="organization"
              minlength="2"
              maxlength="120"
              :disabled="saving || optionsLoading"
              :class="inputClass"
              :aria-invalid="Boolean(errors.businessName)"
              :aria-describedby="errors.businessName ? `${nameId}-error` : `${nameId}-hint`"
              @input="clearError('businessName')"
            >
            <p :id="`${nameId}-hint`" class="text-xs text-text-tertiary leading-snug">
              {{ t('onboarding.businessNameHint') }}
            </p>
            <p v-if="errors.businessName" :id="`${nameId}-error`" class="text-xs text-destructive" role="alert">
              {{ errors.businessName }}
            </p>
          </div>

          <div class="grid gap-4">
            <div class="flex flex-col gap-1.5 min-w-0">
              <label :for="countryId" class="text-sm font-medium text-text-primary">
                {{ t('onboarding.country') }} <span class="text-destructive">*</span>
              </label>
              <select
                :id="countryId"
                v-model="businessCountryCode"
                required
                :disabled="saving || optionsLoading"
                :class="selectClass"
                :aria-invalid="Boolean(errors.businessCountryCode)"
                @change="handleBusinessCountryChange"
              >
                <option value="" disabled>{{ t('onboarding.selectCountry') }}</option>
                <option
                  v-for="option in catalog"
                  :key="option.country_code"
                  :value="option.country_code"
                >
                  {{ countryLabel(option.country_code) }}
                </option>
              </select>
              <p v-if="errors.businessCountryCode" class="text-xs text-destructive" role="alert">
                {{ errors.businessCountryCode }}
              </p>
            </div>

            <div class="flex flex-col gap-1.5 min-w-0">
              <label :for="currencyId" class="text-sm font-medium text-text-primary">
                {{ t('onboarding.currency') }} <span class="text-destructive">*</span>
              </label>
              <select
                :id="currencyId"
                v-model="baseCurrencyCode"
                required
                :disabled="saving || optionsLoading || !businessCountryCode"
                :class="selectClass"
                :aria-invalid="Boolean(errors.baseCurrencyCode)"
                @change="clearError('baseCurrencyCode')"
              >
                <option value="" disabled>{{ t('onboarding.selectCurrency') }}</option>
                <option v-for="code in compatibleCurrencies" :key="code" :value="code">
                  {{ currencyLabel(code) }}
                </option>
              </select>
              <p v-if="errors.baseCurrencyCode" class="text-xs text-destructive" role="alert">
                {{ errors.baseCurrencyCode }}
              </p>
            </div>
          </div>

          <div v-if="needsJurisdiction" class="flex flex-col gap-1.5">
            <label :for="jurisdictionId" class="text-sm font-medium text-text-primary">
              {{ businessCountryCode === 'CA' ? t('facturacion.tax.provinceLabel') : t('facturacion.tax.stateLabel') }}
              <span class="text-destructive">*</span>
            </label>
            <select
              :id="jurisdictionId"
              v-model="taxJurisdictionCode"
              required
              :disabled="saving || optionsLoading"
              :class="selectClass"
              :aria-invalid="Boolean(errors.taxJurisdictionCode)"
              :aria-describedby="errors.taxJurisdictionCode ? `${jurisdictionId}-error` : `${jurisdictionId}-hint`"
              @change="clearError('taxJurisdictionCode')"
            >
              <option value="" disabled>{{ t('facturacion.tax.jurisdictionPlaceholder') }}</option>
              <option
                v-for="option in jurisdictionOptions"
                :key="option.code"
                :value="option.code"
              >
                {{ option.label }} ({{ option.code }})
              </option>
            </select>
            <p :id="`${jurisdictionId}-hint`" class="text-xs text-text-tertiary leading-snug">
              {{ t('facturacion.tax.jurisdictionHint') }}
            </p>
            <p v-if="errors.taxJurisdictionCode" :id="`${jurisdictionId}-error`" class="text-xs text-destructive" role="alert">
              {{ errors.taxJurisdictionCode }}
            </p>
          </div>

          <p v-if="errors.general" class="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2" role="alert">
            {{ errors.general }}
          </p>
        </div>

        <div class="flex-shrink-0 border-t border-border bg-surface px-6 py-4">
          <div class="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              :disabled="saving"
              class="flex-1 min-h-[44px] py-3 px-4 border-2 border-border rounded-lg text-text-primary font-medium hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
              @click="close"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              :disabled="saving || optionsLoading || !canSubmit"
              class="flex-1 min-h-[44px] py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2"
              @click="submit"
            >
              <UiLoadingDots v-if="saving" size="8px" color="currentColor" />
              <span>{{ saving ? t('shell.createTenantBusy') : t('shell.createTenantSubmit') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { BuildingStorefrontIcon } from '@heroicons/vue/24/outline'
import { suggestCountryFromLocale } from '~/utils/countryLocale'
import {
  extractApiErrorDetail,
  isBusinessIdentityConflict,
} from '~/utils/businessIdentityError'
import {
  countryNeedsJurisdiction,
  normalizeJurisdictionOptions,
  type TaxJurisdictionOption,
} from '~/composables/useTenantTaxProfile'
import type { Tenant } from '~/stores/tenants'

interface CatalogOption {
  country_code: string
  currency_codes: string[]
}

interface AdditionalTenantData {
  tenantId?: string
  tenant_id?: string
  slug: string
  name: string
  resumed?: boolean
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { t, locale } = useI18n({ useScope: 'global' })
const { locale: appLocale } = useAppLocale()
const toast = useToast()
const tenantsStore = useTenantsStore()
const authStore = useAuthStore()
const accessStore = useAccessStore()

const uid = useId()
const nameId = `create-tenant-name-${uid}`
const countryId = `create-tenant-country-${uid}`
const currencyId = `create-tenant-currency-${uid}`
const jurisdictionId = `create-tenant-jurisdiction-${uid}`
const inputClass = 'input-base w-full min-h-11 px-4 py-2'
const selectClass = `${inputClass} min-w-0 pe-10`

const nameInput = ref<HTMLInputElement | null>(null)
const businessName = ref('')
const businessCountryCode = ref('')
const baseCurrencyCode = ref('')
const taxJurisdictionCode = ref('')
const catalog = ref<CatalogOption[]>([])
const taxJurisdictionsByCountry = ref<Record<string, TaxJurisdictionOption[]>>({})
const optionsLoading = ref(false)
const saving = ref(false)
const errors = ref<Record<string, string>>({})

const compatibleCurrencies = computed(() =>
  catalog.value.find(option => option.country_code === businessCountryCode.value)?.currency_codes ?? [],
)
const needsJurisdiction = computed(() => countryNeedsJurisdiction(businessCountryCode.value))
const jurisdictionOptions = computed(() =>
  taxJurisdictionsByCountry.value[businessCountryCode.value.toUpperCase()] ?? [],
)
const canSubmit = computed(() => {
  if (businessName.value.trim().length < 2) return false
  if (!businessCountryCode.value || !baseCurrencyCode.value) return false
  if (needsJurisdiction.value && !taxJurisdictionCode.value) return false
  return catalog.value.length > 0
})

const countryLabel = (code: string) => {
  try {
    return `${new Intl.DisplayNames([locale.value], { type: 'region' }).of(code) || code} (${code})`
  } catch {
    return code
  }
}

const currencyLabel = (code: string) => {
  try {
    return `${new Intl.DisplayNames([locale.value], { type: 'currency' }).of(code) || code} (${code})`
  } catch {
    return code
  }
}

const clearError = (field: string) => {
  delete errors.value[field]
  delete errors.value.general
}

const resetForm = () => {
  businessName.value = ''
  businessCountryCode.value = ''
  baseCurrencyCode.value = ''
  taxJurisdictionCode.value = ''
  errors.value = {}
}

const handleBusinessCountryChange = () => {
  clearError('businessCountryCode')
  if (!compatibleCurrencies.value.includes(baseCurrencyCode.value)) {
    baseCurrencyCode.value = compatibleCurrencies.value[0] || ''
  }
  if (!needsJurisdiction.value) {
    taxJurisdictionCode.value = ''
  } else if (!jurisdictionOptions.value.some(option => option.code === taxJurisdictionCode.value)) {
    taxJurisdictionCode.value = ''
  }
}

const applyCatalogDefaults = () => {
  if (!catalog.value.some(option => option.country_code === businessCountryCode.value)) {
    businessCountryCode.value = ''
    baseCurrencyCode.value = ''
    taxJurisdictionCode.value = ''
  } else if (!compatibleCurrencies.value.includes(baseCurrencyCode.value)) {
    baseCurrencyCode.value = compatibleCurrencies.value[0] || ''
  }
  if (!businessCountryCode.value) {
    const suggested = suggestCountryFromLocale(appLocale.value)
    if (suggested && catalog.value.some(option => option.country_code === suggested)) {
      businessCountryCode.value = suggested
      baseCurrencyCode.value = (
        catalog.value.find(option => option.country_code === suggested)?.currency_codes[0]
        || ''
      )
    }
  }
  if (!needsJurisdiction.value
    || !jurisdictionOptions.value.some(option => option.code === taxJurisdictionCode.value)) {
    taxJurisdictionCode.value = ''
  }
}

const loadOptions = async () => {
  optionsLoading.value = true
  try {
    const response = await $fetch<{
      catalog: CatalogOption[]
      tax_jurisdictions?: Record<string, unknown>
    }>('/api/auth/registration/options', {
      credentials: 'include',
    })
    catalog.value = response.catalog ?? []
    const mapped: Record<string, TaxJurisdictionOption[]> = {}
    for (const [country, rows] of Object.entries(response.tax_jurisdictions || {})) {
      mapped[country.toUpperCase()] = normalizeJurisdictionOptions(rows)
    }
    taxJurisdictionsByCountry.value = mapped
    applyCatalogDefaults()
  } catch {
    errors.value = { general: t('onboarding.loadError') }
  } finally {
    optionsLoading.value = false
  }
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    resetForm()
    await loadOptions()
    await nextTick()
    nameInput.value?.focus()
  },
)

const close = () => {
  if (saving.value) return
  emit('update:modelValue', false)
}

const errorStatus = (err: unknown): number => {
  if (!err || typeof err !== 'object') return 0
  const rec = err as Record<string, unknown>
  return Number(rec.statusCode ?? rec.status ?? 0)
}

const errorCode = (err: unknown): string => {
  const detail = extractApiErrorDetail(err)
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    return String((detail as Record<string, unknown>).code || '')
  }
  return ''
}

const validate = (): boolean => {
  const next: Record<string, string> = {}
  if (businessName.value.trim().length < 2) {
    next.businessName = t('onboarding.businessNameHint')
  }
  if (!businessCountryCode.value) next.businessCountryCode = t('onboarding.selectCountry')
  if (!baseCurrencyCode.value) next.baseCurrencyCode = t('onboarding.selectCurrency')
  if (needsJurisdiction.value && !taxJurisdictionCode.value) {
    next.taxJurisdictionCode = t('facturacion.tax.jurisdictionPlaceholder')
  }
  errors.value = next
  return Object.keys(next).length === 0
}

const tenantFromResponse = (data: AdditionalTenantData): Tenant | null => {
  const id = String(data.tenantId ?? data.tenant_id ?? '')
  const slug = String(data.slug || '')
  const name = String(data.name || '')
  if (!id || !slug) return null
  return { id, slug, name }
}

const submit = async () => {
  if (saving.value || optionsLoading.value || !validate()) return
  saving.value = true
  errors.value = {}
  try {
    const body: Record<string, string> = {
      businessName: businessName.value.trim(),
      country_code: businessCountryCode.value,
      base_currency_code: baseCurrencyCode.value,
    }
    if (needsJurisdiction.value && taxJurisdictionCode.value) {
      body.tax_jurisdiction_code = taxJurisdictionCode.value
    }

    const response = await $fetch<{ success: boolean; data: AdditionalTenantData }>(
      '/api/onboarding/additional-tenant',
      {
        method: 'POST',
        credentials: 'include',
        body,
      },
    )
    const tenant = tenantFromResponse(response?.data ?? {} as AdditionalTenantData)
    if (!tenant) {
      errors.value = { general: t('onboarding.activationError') }
      return
    }

    tenantsStore.upsertUserTenant(tenant)
    const switched = await tenantsStore.selectTenant(tenant)
    if (!switched) {
      errors.value = { general: t('onboarding.activationError') }
      return
    }
    // switch-tenant nukes the query cache; refetch then keep the new row
    // in the selector even if the list snapshot is still stale.
    await tenantsStore.fetchUserTenants()
    tenantsStore.upsertUserTenant(tenant)

    if (response.data?.resumed) {
      toast.info(t('shell.createTenantResumed'))
    }

    emit('update:modelValue', false)
    await navigateTo('/gestion/billing')
  } catch (err: unknown) {
    const status = errorStatus(err)
    if (status === 401) {
      authStore.clearAuth()
      accessStore.clear()
      await navigateTo('/auth/login')
      return
    }
    if (isBusinessIdentityConflict(err)) {
      errors.value = {
        businessName: t('auth.businessIdentityUnavailable'),
        general: t('auth.businessIdentityUnavailable'),
      }
      await nextTick()
      nameInput.value?.focus()
      return
    }
    if (status === 429 || errorCode(err) === 'ADDITIONAL_TENANT_RATE_LIMITED') {
      errors.value = { general: t('shell.additionalTenantRateLimited') }
      return
    }
    if (status === 403) {
      errors.value = { general: t('shell.createTenantForbidden') }
      return
    }
    errors.value = { general: t('shell.createTenantError') }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
