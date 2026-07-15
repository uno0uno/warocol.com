<template>
  <div class="py-6 text-center">
    <div v-if="loading" class="space-y-4" role="status">
      <TheCustomLoader size="large" />
      <p class="text-sm text-text-secondary">{{ t('onboarding.paymentChecking') }}</p>
    </div>

    <template v-else>
      <component :is="icon" class="mx-auto h-12 w-12" :class="iconClass" aria-hidden="true" />
      <h2 class="mt-4 text-2xl font-semibold text-text-primary">{{ title }}</h2>
      <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">{{ description }}</p>
      <p v-if="error" class="mx-auto mt-3 max-w-lg text-sm text-status-danger-text" role="alert">{{ error }}</p>

      <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          class="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          @click="emit('refresh')"
        >
          {{ t('onboarding.paymentRefresh') }}
        </button>
        <button
          v-if="status !== 'approved'"
          type="button"
          class="min-h-11 rounded-md border border-border px-5 py-2 text-sm font-medium text-text-primary"
          @click="emit('retry')"
        >
          {{ t('onboarding.paymentRetry') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import type { OnboardingPaymentStatus } from '~/utils/onboardingPayment'

const props = defineProps<{
  status: OnboardingPaymentStatus
  loading: boolean
  error?: string
}>()
const emit = defineEmits<{ refresh: []; retry: [] }>()
const { t } = useI18n()

const isFailure = computed(() => props.status === 'declined' || props.status === 'error')
const icon = computed(() => props.status === 'approved' ? CheckCircleIcon : isFailure.value ? ExclamationTriangleIcon : ClockIcon)
const iconClass = computed(() => props.status === 'approved'
  ? 'text-status-success-text'
  : isFailure.value ? 'text-status-danger-text' : 'text-status-warning-text')
const title = computed(() => props.status === 'approved'
  ? t('onboarding.paymentApprovedTitle')
  : isFailure.value ? t('onboarding.paymentFailedTitle') : t('onboarding.paymentPendingTitle'))
const description = computed(() => props.status === 'approved'
  ? t('onboarding.paymentApprovedDescription')
  : isFailure.value ? t('onboarding.paymentFailedDescription') : t('onboarding.paymentPendingDescription'))
</script>
