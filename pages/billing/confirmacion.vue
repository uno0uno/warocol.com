<template>
  <div class="mx-auto flex min-h-[420px] max-w-lg items-center justify-center">
    <div class="w-full rounded-xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
      <div v-if="view === 'loading'" class="space-y-4" role="status">
        <TheCustomLoader size="large" />
        <p class="text-sm text-text-secondary">{{ t('onboarding.paymentChecking') }}</p>
      </div>

      <template v-else>
        <component :is="icon" class="mx-auto h-14 w-14" :class="iconClass" aria-hidden="true" />
        <h1 class="mt-4 text-2xl font-bold text-text-primary">{{ title }}</h1>
        <p class="mt-2 text-sm leading-6 text-text-secondary">{{ description }}</p>
        <p v-if="errorMessage" class="mt-3 text-sm text-status-danger-text" role="alert">{{ errorMessage }}</p>

        <div class="mt-6 flex flex-col gap-3">
          <button
            v-if="isOnboardingReturn && view !== 'failed'"
            type="button"
            class="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            @click="checkReturn"
          >
            {{ t('onboarding.paymentRefresh') }}
          </button>
          <NuxtLink
            v-if="isOnboardingReturn"
            to="/onboarding"
            class="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 py-2 text-sm font-semibold text-text-primary"
          >
            {{ view === 'failed' ? t('onboarding.paymentRetry') : t('onboarding.backToOnboarding') }}
          </NuxtLink>
          <NuxtLink
            v-else
            to="/gestion/billing"
            class="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            {{ t('onboarding.viewSubscription') }}
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { isActiveOnboardingSetupSession, isPendingOnboardingSession } from '~/utils/onboardingFlow'
import { trackOnboardingEvent } from '~/utils/onboardingAnalytics'
import {
  clearCheckoutContext,
  isUuid,
  readCheckoutContext,
  type OnboardingCheckoutContext,
} from '~/utils/onboardingPayment'

// The API remains the auth boundary. This meta only lets pending sessions reach
// the Wompi return page without weakening the guards on any operational route.
definePageMeta({ layout: 'onboarding', publicAccess: true, robots: 'noindex, nofollow' })

type ReturnView = 'loading' | 'approved' | 'pending' | 'failed' | 'unknown'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const tenantsStore = useTenantsStore()
const accessStore = useAccessStore()
const cache = useQueryCache()
const { loadStatus, loadPaymentStatus } = useOnboarding()

const view = ref<ReturnView>('loading')
const errorMessage = ref('')
const isOnboardingReturn = ref(false)
const checkoutContext = ref<OnboardingCheckoutContext | null>(null)

const icon = computed(() => view.value === 'approved'
  ? CheckCircleIcon
  : view.value === 'pending' ? ClockIcon : ExclamationTriangleIcon)
const iconClass = computed(() => view.value === 'approved'
  ? 'text-status-success-text'
  : view.value === 'pending' ? 'text-status-warning-text' : 'text-status-danger-text')
const title = computed(() => view.value === 'approved'
  ? t('onboarding.paymentApprovedTitle')
  : view.value === 'pending'
    ? t('onboarding.paymentPendingTitle')
    : view.value === 'failed'
      ? t('onboarding.paymentFailedTitle')
      : t('onboarding.paymentUnknownTitle'))
const description = computed(() => view.value === 'approved'
  ? t('onboarding.paymentApprovedDescription')
  : view.value === 'pending'
    ? t('onboarding.paymentPendingDescription')
    : view.value === 'failed'
      ? t('onboarding.paymentFailedDescription')
      : t('onboarding.paymentUnknownDescription'))

const refreshActivatedSession = async () => {
  const session = await authStore.refreshSession()
  if (!isActiveOnboardingSetupSession(session)) return false
  await Promise.all([tenantsStore.fetchUserTenants(), accessStore.load()])
  if (import.meta.client) clearCheckoutContext(sessionStorage)
  await navigateTo('/onboarding', { replace: true })
  return true
}

const checkOnboardingReturn = async () => {
  const context = checkoutContext.value
  if (!context) {
    view.value = 'unknown'
    return
  }
  try {
    const attempt = await loadPaymentStatus(context.attemptId)
    trackOnboardingEvent('payment_result', {
      planId: context.planId,
      paymentStatus: attempt.status,
      dedupeId: `${context.attemptId}:${attempt.status}`,
    }, undefined, import.meta.client ? sessionStorage : null)

    if (attempt.status === 'approved') {
      const status = await loadStatus()
      if (status.lifecycleStatus === 'active' && status.nextStep === 'setup') {
        if (await refreshActivatedSession()) return
      }
      view.value = 'approved'
      return
    }
    view.value = attempt.status === 'declined' || attempt.status === 'error' ? 'failed' : 'pending'
  } catch (err: any) {
    errorMessage.value = t('onboarding.paymentError')
    view.value = 'unknown'
  }
}

const checkLegacyReturn = async () => {
  const transactionId = typeof route.query.id === 'string' ? route.query.id : null
  if (!transactionId) {
    view.value = 'pending'
    return
  }
  try {
    const result = await $fetch<{ status: string }>('/api/billing/verify-payment', {
      credentials: 'include',
      query: { transaction_id: transactionId },
    })
    view.value = result.status === 'active' ? 'approved' : result.status === 'pending' ? 'pending' : 'failed'
    if (result.status === 'active') await cache.invalidateQueries({ key: ['billing'] })
  } catch (err: any) {
    errorMessage.value = t('onboarding.paymentError')
    view.value = 'unknown'
  }
}

const checkReturn = async () => {
  view.value = 'loading'
  errorMessage.value = ''
  try {
    const session = await authStore.refreshSession()
    if (isPendingOnboardingSession(session) || isActiveOnboardingSetupSession(session)) {
      isOnboardingReturn.value = true
      if (isActiveOnboardingSetupSession(session) && await refreshActivatedSession()) return
      await checkOnboardingReturn()
      return
    }
    isOnboardingReturn.value = false
    await checkLegacyReturn()
  } catch (err: any) {
    isOnboardingReturn.value = true
    errorMessage.value = t('onboarding.paymentSessionError')
    view.value = 'unknown'
  }
}

onMounted(async () => {
  const queryAttempt = typeof route.query.attempt_id === 'string' && isUuid(route.query.attempt_id)
    ? route.query.attempt_id
    : null
  const stored = import.meta.client ? readCheckoutContext(sessionStorage) : null
  checkoutContext.value = queryAttempt && stored
    ? { ...stored, attemptId: queryAttempt }
    : stored
  await checkReturn()
})
</script>
