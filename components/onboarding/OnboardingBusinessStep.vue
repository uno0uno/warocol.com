<template>
  <form class="space-y-6" :aria-busy="saving" @submit.prevent="handleSubmit">
    <div>
      <h2 class="text-2xl font-semibold text-text-primary">{{ t('onboarding.businessTitle') }}</h2>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        {{ t('onboarding.businessDescription') }}
      </p>
    </div>

    <div class="space-y-2">
      <label for="onboarding-business-name" class="block text-sm font-medium text-text-primary">
        {{ t('onboarding.businessName') }}
      </label>
      <input
        id="onboarding-business-name"
        v-model="draft.business_name"
        type="text"
        autocomplete="organization"
        minlength="2"
        maxlength="120"
        required
        :disabled="saving"
        :aria-describedby="error ? 'onboarding-business-error' : undefined"
        class="block min-h-11 w-full rounded-md border-border bg-surface text-text-primary shadow-sm focus:border-primary focus:ring-primary disabled:opacity-60"
      />
      <p class="text-xs leading-5 text-text-tertiary">{{ t('onboarding.businessNameHint') }}</p>
    </div>

    <div class="grid gap-5 sm:grid-cols-2">
      <div class="space-y-2">
        <label for="onboarding-country" class="block text-sm font-medium text-text-primary">
          {{ t('onboarding.country') }}
        </label>
        <select
          id="onboarding-country"
          v-model="draft.country_code"
          required
          :disabled="saving"
          class="block min-h-11 w-full rounded-md border-border bg-surface text-text-primary shadow-sm focus:border-primary focus:ring-primary disabled:opacity-60"
          @change="handleCountryChange"
        >
          <option value="" disabled>{{ t('onboarding.selectCountry') }}</option>
          <option v-for="option in financial.catalog" :key="option.country_code" :value="option.country_code">
            {{ countryLabel(option.country_code) }}
          </option>
        </select>
      </div>

      <div class="space-y-2">
        <label for="onboarding-currency" class="block text-sm font-medium text-text-primary">
          {{ t('onboarding.currency') }}
        </label>
        <select
          id="onboarding-currency"
          v-model="draft.base_currency_code"
          required
          :disabled="saving || !draft.country_code"
          class="block min-h-11 w-full rounded-md border-border bg-surface text-text-primary shadow-sm focus:border-primary focus:ring-primary disabled:opacity-60"
        >
          <option value="" disabled>{{ t('onboarding.selectCurrency') }}</option>
          <option v-for="code in compatibleCurrencies" :key="code" :value="code">
            {{ currencyLabel(code) }}
          </option>
        </select>
      </div>
    </div>

    <p
      v-if="error"
      id="onboarding-business-error"
      role="alert"
      class="rounded-lg bg-status-critical-bg p-3 text-sm leading-6 text-status-critical-text"
    >
      {{ error }}
    </p>

    <div class="flex justify-end">
      <button
        type="submit"
        class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
        :disabled="!canSubmit || saving"
      >
        <UiLoadingDots v-if="saving" size="7px" color="currentColor" />
        {{ saving ? t('onboarding.saving') : t('onboarding.saveContinue') }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { OnboardingBusinessDraft, OnboardingFinancialData } from '~/composables/useOnboarding'
import { getEditableBusinessName } from '~/utils/onboardingFlow'

const props = defineProps<{
  financial: OnboardingFinancialData
  saving: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (event: 'submit', draft: OnboardingBusinessDraft): void
}>()

const { t, locale } = useI18n()
const draft = reactive<OnboardingBusinessDraft>({
  business_name: getEditableBusinessName(props.financial.businessName),
  country_code: props.financial.profile?.country_code || '',
  base_currency_code: props.financial.profile?.base_currency_code || '',
})

const compatibleCurrencies = computed(() =>
  props.financial.catalog.find(option => option.country_code === draft.country_code)?.currency_codes ?? [],
)

const canSubmit = computed(() =>
  draft.business_name.trim().length >= 2
  && compatibleCurrencies.value.includes(draft.base_currency_code),
)

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

const handleCountryChange = () => {
  if (!compatibleCurrencies.value.includes(draft.base_currency_code)) {
    draft.base_currency_code = compatibleCurrencies.value[0] || ''
  }
}

const handleSubmit = () => {
  if (!canSubmit.value || props.saving) return
  emit('submit', {
    business_name: draft.business_name.trim().replace(/\s+/g, ' '),
    country_code: draft.country_code,
    base_currency_code: draft.base_currency_code,
  })
}
</script>
