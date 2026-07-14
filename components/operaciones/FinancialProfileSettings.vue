<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  canSubmitFinancialProfile,
  createFinancialProfileDraft,
  getCompatibleCurrencyCodes,
  type FinancialProfileDraft,
} from '~/composables/useTenantFinancialProfile'

const { t, locale } = useI18n({ useScope: 'global' })
const toast = useToast()
const {
  response,
  profile,
  isLoading,
  queryError,
  refresh,
  save,
  isSaving,
  saveError,
} = useTenantFinancialProfile()

const draft = ref<FinancialProfileDraft>(createFinancialProfileDraft())
const showConfirmation = ref(false)

watch(profile, (nextProfile) => {
  if (nextProfile) draft.value = createFinancialProfileDraft(nextProfile)
}, { immediate: true })

const compatibleCurrencyCodes = computed(() => getCompatibleCurrencyCodes(
  response.value?.catalog ?? [],
  draft.value.country_code,
))

watch(() => draft.value.country_code, () => {
  if (!compatibleCurrencyCodes.value.includes(draft.value.base_currency_code)) {
    draft.value.base_currency_code = compatibleCurrencyCodes.value[0] ?? ''
  }
})

const canSubmit = computed(() => canSubmitFinancialProfile(response.value, draft.value))
const isLocked = computed(() => response.value?.eligibility.eligible === false)
const lockTone = computed(() =>
  response.value?.eligibility.lock_type === 'permanent' ? 'danger' : 'warning',
)

const makeDisplayNames = (type: 'region' | 'currency') => {
  try {
    return new Intl.DisplayNames([locale.value], { type })
  } catch {
    return null
  }
}

const countryLabel = (code: string) => makeDisplayNames('region')?.of(code) ?? code
const currencyLabel = (code: string) => {
  const name = makeDisplayNames('currency')?.of(code)
  return name && name !== code ? `${name} (${code})` : code
}

const reasonLabel = (code: string) => {
  const knownReasons: Record<string, string> = {
    PERMANENT_FINANCIAL_ACTIVITY: 'permanentActivity',
    TEMPORARY_OPERATIONAL_ACTIVITY: 'temporaryActivity',
    permanent_orders: 'permanentOrders',
    permanent_payments: 'permanentPayments',
    permanent_journals: 'permanentJournals',
    permanent_invoices: 'permanentInvoices',
    permanent_wallet_movements: 'permanentWallet',
    temporary_open_orders: 'temporaryOrders',
    temporary_open_shifts: 'temporaryShifts',
    temporary_activity: 'temporaryActivity',
  }
  const key = knownReasons[code]
  return key
    ? t(`operaciones.personalizar.financial.lockReasons.${key}`)
    : t('operaciones.personalizar.financial.lockReasons.unknown', { code })
}

const queryErrorMessage = computed(() => {
  const value = queryError.value as any
  return value?.data?.detail
    ?? value?.data?.message
    ?? value?.message
    ?? t('operaciones.personalizar.financial.loadError')
})

const confirmationMessage = computed(() => {
  if (!profile.value) return ''
  return t('operaciones.personalizar.financial.confirmMessage', {
    currentCountry: countryLabel(profile.value.country_code),
    currentCurrency: currencyLabel(profile.value.base_currency_code),
    nextCountry: countryLabel(draft.value.country_code),
    nextCurrency: currencyLabel(draft.value.base_currency_code),
  })
})

const requestConfirmation = () => {
  if (!canSubmit.value) return
  showConfirmation.value = true
}

const confirmSave = async () => {
  if (!canSubmit.value || isSaving.value) return
  try {
    await save({ ...draft.value })
    showConfirmation.value = false
    toast.success(t('operaciones.personalizar.financial.saveSuccess'), {
      title: t('operaciones.personalizar.savedTitle'),
    })
  } catch {
    showConfirmation.value = false
    toast.error(saveError.value || t('operaciones.personalizar.financial.saveError'), {
      title: t('operaciones.comandas.error'),
    })
  }
}
</script>

<template>
  <section
    class="rounded-xl border-2 border-border bg-surface px-4 py-4 sm:px-5"
    aria-labelledby="financial-profile-title"
  >
    <div class="flex flex-col gap-1">
      <h2 id="financial-profile-title" class="text-sm font-semibold text-text-primary">
        {{ t('operaciones.personalizar.financial.title') }}
      </h2>
      <p class="text-xs leading-snug text-text-secondary">
        {{ t('operaciones.personalizar.financial.help') }}
      </p>
    </div>

    <div v-if="isLoading" class="flex min-h-28 items-center justify-center" role="status">
      <span class="sr-only">{{ t('operaciones.personalizar.financial.loading') }}</span>
      <CommonsTheCustomLoader size="small" />
    </div>

    <div
      v-else-if="!response"
      class="mt-4 rounded-lg border border-state-danger-border bg-state-danger-bg p-4"
      role="alert"
    >
      <p class="text-sm font-semibold text-state-danger-text">
        {{ t('operaciones.personalizar.financial.loadError') }}
      </p>
      <p class="mt-1 text-xs text-state-danger-text/90">{{ queryErrorMessage }}</p>
      <button
        type="button"
        class="mt-3 min-h-11 rounded-lg border-2 border-state-danger-border px-4 py-2 text-sm font-semibold text-state-danger-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        @click="refresh"
      >
        {{ t('operaciones.personalizar.financial.retry') }}
      </button>
    </div>

    <template v-else>
      <div
        v-if="isLocked"
        class="mt-4 rounded-lg border p-4"
        :class="lockTone === 'danger'
          ? 'border-state-danger-border bg-state-danger-bg'
          : 'border-state-warning-border bg-state-warning-bg'"
        role="status"
        aria-live="polite"
      >
        <p
          class="text-sm font-semibold"
          :class="lockTone === 'danger' ? 'text-state-danger-text' : 'text-state-warning-text'"
        >
          {{ response.eligibility.lock_type === 'permanent'
            ? t('operaciones.personalizar.financial.permanentLockTitle')
            : t('operaciones.personalizar.financial.temporaryLockTitle') }}
        </p>
        <p
          class="mt-1 text-xs leading-snug"
          :class="lockTone === 'danger' ? 'text-state-danger-text/90' : 'text-state-warning-text/90'"
        >
          {{ response.eligibility.lock_type === 'permanent'
            ? t('operaciones.personalizar.financial.permanentLockHelp')
            : t('operaciones.personalizar.financial.temporaryLockHelp') }}
        </p>
        <ul v-if="response.eligibility.reason_codes.length" class="mt-2 list-disc space-y-1 ps-5 text-xs">
          <li
            v-for="reason in response.eligibility.reason_codes"
            :key="reason"
            :class="lockTone === 'danger' ? 'text-state-danger-text' : 'text-state-warning-text'"
          >
            {{ reasonLabel(reason) }}
          </li>
        </ul>
      </div>

      <fieldset class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" :disabled="isLocked || isSaving">
        <legend class="sr-only">{{ t('operaciones.personalizar.financial.fieldsLegend') }}</legend>
        <div class="flex flex-col gap-1">
          <label for="financial-country" class="text-sm font-medium text-text-primary">
            {{ t('operaciones.personalizar.financial.country') }}
          </label>
          <select
            id="financial-country"
            v-model="draft.country_code"
            class="min-h-11 rounded-lg border-2 border-form-control-border bg-form-control-bg px-3 py-2 text-sm text-form-control-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option
              v-for="option in response.catalog"
              :key="option.country_code"
              :value="option.country_code"
            >
              {{ countryLabel(option.country_code) }}
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label for="financial-currency" class="text-sm font-medium text-text-primary">
            {{ t('operaciones.personalizar.financial.currency') }}
          </label>
          <select
            id="financial-currency"
            v-model="draft.base_currency_code"
            class="min-h-11 rounded-lg border-2 border-form-control-border bg-form-control-bg px-3 py-2 text-sm text-form-control-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option v-for="code in compatibleCurrencyCodes" :key="code" :value="code">
              {{ currencyLabel(code) }}
            </option>
          </select>
          <p class="text-xs leading-snug text-form-control-help">
            {{ t('operaciones.personalizar.financial.currencyHelp') }}
          </p>
        </div>
      </fieldset>

      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p class="max-w-2xl text-xs leading-snug text-text-secondary">
          {{ t('operaciones.personalizar.financial.irreversibleHelp') }}
        </p>
        <button
          type="button"
          :disabled="!canSubmit || isSaving"
          class="min-h-11 flex-shrink-0 rounded-lg bg-action-primary-bg px-4 py-2 text-sm font-semibold text-action-primary-text transition-colors hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          @click="requestConfirmation"
        >
          {{ isSaving
            ? t('operaciones.personalizar.financial.saving')
            : t('operaciones.personalizar.financial.reviewChange') }}
        </button>
      </div>
    </template>

    <UiConfirmActionModal
      v-model="showConfirmation"
      :title="t('operaciones.personalizar.financial.confirmTitle')"
      :message="confirmationMessage"
      :confirm-label="t('operaciones.personalizar.financial.confirmAction')"
      :cancel-label="t('operaciones.personalizar.financial.cancel')"
      :loading-label="t('operaciones.personalizar.financial.saving')"
      :loading="isSaving"
      variant="destructive"
      @confirm="confirmSave"
    />
  </section>
</template>
