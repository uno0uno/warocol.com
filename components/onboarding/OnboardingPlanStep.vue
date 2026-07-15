<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-text-primary">{{ t('onboarding.planTitle') }}</h2>
      <p class="mt-2 text-sm leading-6 text-text-secondary">{{ t('onboarding.planDescription') }}</p>
    </div>

    <div v-if="loading" class="flex min-h-48 items-center justify-center" role="status">
      <TheCustomLoader />
      <span class="sr-only">{{ t('onboarding.plansLoading') }}</span>
    </div>

    <div v-else-if="error" class="rounded-lg border border-status-danger-border bg-status-danger-bg p-4" role="alert">
      <p class="text-sm text-status-danger-text">{{ error }}</p>
      <button type="button" class="mt-3 min-h-11 rounded-md border border-border px-4 py-2 text-sm font-medium" @click="emit('retry')">
        {{ t('common.retry') }}
      </button>
    </div>

    <div v-else-if="plans.length === 0" class="rounded-lg border border-border bg-surface-secondary p-6 text-center" role="status">
      <h3 class="font-semibold text-text-primary">{{ t('onboarding.plansEmptyTitle') }}</h3>
      <p class="mt-2 text-sm text-text-secondary">{{ t('onboarding.plansEmptyDescription') }}</p>
      <button type="button" class="mt-4 min-h-11 rounded-md border border-border px-4 py-2 text-sm font-medium" @click="emit('retry')">
        {{ t('common.retry') }}
      </button>
    </div>

    <form v-else class="space-y-6" @submit.prevent="emit('continue')">
      <fieldset class="grid gap-4 md:grid-cols-2">
        <legend class="sr-only">{{ t('onboarding.selectPlan') }}</legend>
        <label
          v-for="plan in plans"
          :key="plan.id"
          class="relative flex cursor-pointer flex-col rounded-xl border p-5 transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
          :class="modelValue === plan.id ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/40'"
        >
          <div class="flex items-start gap-3">
            <input
              type="radio"
              name="onboarding-plan"
              :value="plan.id"
              :checked="modelValue === plan.id"
              class="mt-1 h-4 w-4 text-primary"
              @change="emit('update:modelValue', plan.id)"
            >
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-semibold text-text-primary">{{ plan.name }}</h3>
              <p v-if="plan.description" class="mt-1 text-sm leading-5 text-text-secondary">{{ plan.description }}</p>
            </div>
          </div>
          <p class="mt-5 text-2xl font-bold text-text-primary">
            {{ formatAnnualCop(plan.priceAnnual) }}
            <span class="text-sm font-normal text-text-secondary">/{{ t('onboarding.year') }}</span>
          </p>
          <ul v-if="featureLabels(plan.features).length" class="mt-4 space-y-2 text-sm text-text-secondary">
            <li v-for="feature in featureLabels(plan.features)" :key="feature" class="flex gap-2">
              <CheckIcon class="mt-0.5 h-4 w-4 flex-none text-status-success-text" aria-hidden="true" />
              <span>{{ feature }}</span>
            </li>
          </ul>
        </label>
      </fieldset>

      <p v-if="submitError" class="text-sm text-status-danger-text" role="alert">{{ submitError }}</p>
      <button
        type="submit"
        class="min-h-11 w-full rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        :disabled="!modelValue || submitting"
      >
        {{ submitting ? t('onboarding.checkoutCreating') : t('onboarding.continueToPayment') }}
      </button>
      <p class="text-xs leading-5 text-text-tertiary">{{ t('onboarding.annualPaymentNotice') }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/outline'
import type { OnboardingPlan } from '~/utils/onboardingPayment'
import { featureLabels, formatAnnualCop } from '~/utils/onboardingPayment'

defineProps<{
  plans: OnboardingPlan[]
  modelValue: string
  loading: boolean
  submitting: boolean
  error?: string
  submitError?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  continue: []
  retry: []
}>()
const { t } = useI18n()
</script>
