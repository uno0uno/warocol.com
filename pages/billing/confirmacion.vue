<template>
  <div v-if="view === 'loading'" class="flex min-h-[420px] items-center justify-center px-4" role="status">
    <CommonsTheCustomLoader size="large" />
  </div>

  <!-- Thank-you / activating after hosted MoR checkout (#943) -->
  <div
    v-else-if="showThankYou"
    class="mx-auto flex min-h-[420px] max-w-lg items-center justify-center px-4"
  >
    <div
      class="w-full rounded-2xl border bg-surface p-6 text-center sm:p-8"
      :class="statusCardBorderClass(thankYouTone)"
      :role="thankYouWaiting ? 'status' : undefined"
      :aria-live="thankYouWaiting ? 'polite' : undefined"
    >
      <div
        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        :class="statusWellClass(thankYouTone)"
      >
        <component
          :is="thankYouIcon"
          class="h-8 w-8"
          :class="[thankYouIconClass, thankYouWaiting ? 'animate-pulse motion-reduce:animate-none' : '']"
          aria-hidden="true"
        />
      </div>
      <h1 class="mt-5 text-xl font-bold leading-snug text-text-primary text-balance sm:text-2xl">{{ thankYouTitle }}</h1>
      <p class="mt-2 text-sm leading-6 text-text-secondary text-pretty">{{ thankYouDescription }}</p>
      <p v-if="errorMessage" class="mt-3 text-sm text-state-danger-text" role="alert">{{ errorMessage }}</p>
      <div class="mt-6 flex flex-col gap-3">
        <NuxtLink
          v-if="thankYouPhase === 'ready'"
          to="/gestion/billing"
          class="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {{ t('billing.backToBilling') }}
        </NuxtLink>
        <button
          v-else
          type="button"
          class="min-h-11 rounded-md border border-border px-5 py-2 text-sm font-semibold text-text-primary"
          :disabled="pollingStatus"
          @click="pollThankYouOnce"
        >
          {{ pollingStatus ? t('billing.validating') : t('billing.thankYouRefresh') }}
        </button>
        <NuxtLink
          v-if="thankYouPhase !== 'ready'"
          to="/gestion/billing"
          class="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 py-2 text-sm font-semibold text-text-primary"
        >
          {{ t('billing.backToBilling') }}
        </NuxtLink>
      </div>
    </div>
  </div>

  <div v-else class="mx-auto flex min-h-[420px] max-w-lg items-center justify-center px-4">
    <div
      class="w-full rounded-2xl border bg-surface p-6 text-center sm:p-8"
      :class="statusCardBorderClass(returnTone)"
      :role="returnWaiting ? 'status' : undefined"
      :aria-live="returnWaiting ? 'polite' : undefined"
    >
      <div
        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        :class="statusWellClass(returnTone)"
      >
        <component
          :is="icon"
          class="h-8 w-8"
          :class="[iconClass, returnWaiting ? 'animate-pulse motion-reduce:animate-none' : '']"
          aria-hidden="true"
        />
      </div>
      <h1 class="mt-5 text-xl font-bold leading-snug text-text-primary text-balance sm:text-2xl">{{ title }}</h1>
      <p class="mt-2 text-sm leading-6 text-text-secondary text-pretty">{{ description }}</p>
      <p v-if="errorMessage" class="mt-3 text-sm text-state-danger-text" role="alert">{{ errorMessage }}</p>

      <div class="mt-6 flex flex-col gap-3">
        <button
          v-if="isOnboardingReturn && view !== 'failed'"
          type="button"
          class="min-h-11 rounded-md border border-border px-5 py-2 text-sm font-semibold text-text-primary"
          @click="checkReturn"
        >
          {{ t('onboarding.paymentRefresh') }}
        </button>
        <NuxtLink
          v-if="isOnboardingReturn"
          to="/gestion/billing"
          class="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 py-2 text-sm font-semibold text-text-primary"
        >
          {{ view === 'failed' ? t('onboarding.paymentRetry') : t('billing.backToBilling') }}
        </NuxtLink>
        <NuxtLink
          v-else
          to="/gestion/billing"
          class="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {{ t('onboarding.viewSubscription') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import {
  isActiveOnboardingSetupSession,
  isPendingOnboardingSession,
  shouldResumeHostedCheckoutInsteadOfSetupRedirect,
} from '~/utils/onboardingFlow'
import {
  clearCheckoutContext,
  isUuid,
  readCheckoutContext,
  writeCheckoutContext,
  type OnboardingCheckoutContext,
} from '~/utils/onboardingPayment'
import {
  clearHostedCheckoutPending,
  isHostedCheckoutPending,
  normalizeLsCheckoutId,
  readStoredHostedCheckoutId,
} from '~/composables/useHostedBillingCheckout'
import {
  billingThankYouPhaseFromStatus,
  BILLING_THANK_YOU_MAX_ATTEMPTS,
  BILLING_THANK_YOU_POLL_MS,
  type BillingThankYouPhase,
  type BillingCheckoutStatusResponse,
} from '~/utils/billingThankYou'
import {
  returnToneFromView,
  statusCardBorderClass,
  statusWellClass,
  thankYouToneFromPhase,
} from '~/utils/billingConfirmStatus'

// The API remains the auth boundary. This meta only lets pending sessions reach
// the payment return page (Lemon Squeezy / legacy Wompi) without weakening operational guards.
definePageMeta({ publicAccess: true, robots: 'noindex, nofollow' })

type ReturnView = 'loading' | 'approved' | 'pending' | 'failed' | 'unknown' | 'thank_you'

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
const returnAttemptId = ref<string | null>(null)
const lsCheckoutId = ref<string | null>(null)
const thankYouPhase = ref<BillingThankYouPhase>('activating')
const pollingStatus = ref(false)
const pollAttempt = ref(0)
let pollTimer: ReturnType<typeof setTimeout> | null = null

const showThankYou = computed(() => view.value === 'thank_you')

const icon = computed(() => view.value === 'approved'
  ? CheckCircleIcon
  : view.value === 'pending' ? ClockIcon : ExclamationTriangleIcon)
const iconClass = computed(() => view.value === 'approved'
  ? 'text-state-success-icon'
  : view.value === 'pending' ? 'text-state-warning-icon' : 'text-state-danger-icon')
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

const thankYouIcon = computed(() =>
  thankYouPhase.value === 'ready' ? CheckCircleIcon
    : thankYouPhase.value === 'timeout' ? ExclamationTriangleIcon
      : ClockIcon,
)
const thankYouIconClass = computed(() =>
  thankYouPhase.value === 'ready' ? 'text-state-success-icon'
    : thankYouPhase.value === 'timeout' ? 'text-state-warning-icon'
      : 'text-state-warning-icon',
)
const thankYouTitle = computed(() =>
  thankYouPhase.value === 'ready' ? t('billing.thankYouTitle')
    : thankYouPhase.value === 'timeout' ? t('billing.thankYouTimeoutTitle')
      : t('billing.thankYouActivatingTitle'),
)
const thankYouDescription = computed(() =>
  thankYouPhase.value === 'ready' ? t('billing.thankYouDescription')
    : thankYouPhase.value === 'timeout' ? t('billing.thankYouTimeoutDescription')
      : t('billing.thankYouActivatingDescription'),
)

const thankYouWaiting = computed(() => thankYouPhase.value === 'activating')
const returnWaiting = computed(() => view.value === 'pending')
const thankYouTone = computed(() => thankYouToneFromPhase(thankYouPhase.value))
const returnTone = computed(() => returnToneFromView(view.value))

const readLsCheckoutFromRoute = () => {
  const raw = typeof route.query.ls_checkout === 'string'
    ? route.query.ls_checkout
    : (typeof route.query.checkout_id === 'string' ? route.query.checkout_id : null)
  return normalizeLsCheckoutId(raw)
}

const resolveCheckoutId = () => {
  return readLsCheckoutFromRoute()
    || normalizeLsCheckoutId(readStoredHostedCheckoutId())
}

const stopThankYouPoll = () => {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

const scheduleThankYouPoll = () => {
  stopThankYouPoll()
  if (thankYouPhase.value !== 'activating') return
  pollTimer = setTimeout(() => {
    void pollThankYouOnce()
  }, BILLING_THANK_YOU_POLL_MS)
}

const pollThankYouOnce = async () => {
  if (!import.meta.client) return
  pollingStatus.value = true
  errorMessage.value = ''
  try {
    const query: Record<string, string> = {}
    if (lsCheckoutId.value) query.checkout_id = lsCheckoutId.value
    const status = await $fetch<BillingCheckoutStatusResponse>('/api/billing/lemon-squeezy/checkout-status', {
      credentials: 'include',
      query,
    })
    pollAttempt.value += 1
    thankYouPhase.value = billingThankYouPhaseFromStatus(status, pollAttempt.value)
    await cache.invalidateQueries({ key: ['billing'] })
    if (thankYouPhase.value === 'ready') {
      stopThankYouPoll()
      clearHostedCheckoutPending()
      try {
        await Promise.all([authStore.refreshSession(), accessStore.load()])
      } catch {
        /* access may lag; CTA still works */
      }
      return
    }
    if (thankYouPhase.value === 'timeout') {
      clearHostedCheckoutPending()
      return
    }
    if (thankYouPhase.value === 'activating') scheduleThankYouPoll()
  } catch {
    pollAttempt.value += 1
    thankYouPhase.value = billingThankYouPhaseFromStatus(null, pollAttempt.value)
    if (pollAttempt.value >= BILLING_THANK_YOU_MAX_ATTEMPTS) {
      clearHostedCheckoutPending()
      errorMessage.value = t('billing.thankYouPollError')
    } else {
      scheduleThankYouPoll()
    }
  } finally {
    pollingStatus.value = false
  }
}

const startThankYou = async () => {
  view.value = 'thank_you'
  thankYouPhase.value = 'activating'
  pollAttempt.value = 0
  await cache.invalidateQueries({ key: ['billing'] })
  await pollThankYouOnce()
}

const refreshActivatedSession = async () => {
  const session = await authStore.refreshSession()
  if (!isActiveOnboardingSetupSession(session)) return false
  await Promise.all([tenantsStore.fetchUserTenants(), accessStore.load()])
  if (import.meta.client) clearCheckoutContext(sessionStorage)
  clearHostedCheckoutPending()
  await navigateTo('/gestion/billing', { replace: true })
  return true
}

const checkOnboardingReturn = async () => {
  const context = checkoutContext.value
  const attemptId = returnAttemptId.value || context?.attemptId
  if (shouldResumeHostedCheckoutInsteadOfSetupRedirect(lsCheckoutId.value) || isHostedCheckoutPending()) {
    await startThankYou()
    return
  }
  if (!attemptId) {
    view.value = 'unknown'
    return
  }
  try {
    const attempt = await loadPaymentStatus(attemptId)
    const recoveredContext = {
      attemptId: attempt.attempt_id,
      planId: attempt.plan_id,
    }
    checkoutContext.value = recoveredContext
    if (import.meta.client) writeCheckoutContext(sessionStorage, recoveredContext)

    if (attempt.status === 'approved') {
      const status = await loadStatus()
      if (status.lifecycleStatus === 'active' && status.nextStep === 'setup') {
        if (await refreshActivatedSession()) return
      }
      view.value = 'approved'
      return
    }
    view.value = attempt.status === 'declined' || attempt.status === 'error' ? 'failed' : 'pending'
  } catch {
    errorMessage.value = t('onboarding.paymentError')
    view.value = 'unknown'
  }
}

const checkLegacyReturn = async () => {
  const transactionId = typeof route.query.id === 'string' ? route.query.id : null

  if (shouldResumeHostedCheckoutInsteadOfSetupRedirect(lsCheckoutId.value) || isHostedCheckoutPending()) {
    await startThankYou()
    return
  }

  if (!transactionId) {
    // No MoR checkout signal and no legacy Wompi id — do not enter thank-you.
    view.value = 'pending'
    await cache.invalidateQueries({ key: ['billing'] })
    return
  }
  try {
    const result = await $fetch<{ status: string }>('/api/billing/verify-payment', {
      credentials: 'include',
      query: { transaction_id: transactionId },
    })
    view.value = result.status === 'active' ? 'approved' : result.status === 'pending' ? 'pending' : 'failed'
    if (result.status === 'active') await cache.invalidateQueries({ key: ['billing'] })
  } catch {
    errorMessage.value = t('onboarding.paymentError')
    view.value = 'unknown'
  }
}

const checkReturn = async () => {
  view.value = 'loading'
  errorMessage.value = ''
  lsCheckoutId.value = resolveCheckoutId()
  try {
    const session = await authStore.refreshSession()
    if (isPendingOnboardingSession(session) || isActiveOnboardingSetupSession(session)) {
      isOnboardingReturn.value = true
      if (shouldResumeHostedCheckoutInsteadOfSetupRedirect(lsCheckoutId.value) || isHostedCheckoutPending()) {
        await startThankYou()
        return
      }
      if (isActiveOnboardingSetupSession(session) && await refreshActivatedSession()) return
      await checkOnboardingReturn()
      return
    }
    isOnboardingReturn.value = false
    await checkLegacyReturn()
  } catch {
    if (shouldResumeHostedCheckoutInsteadOfSetupRedirect(lsCheckoutId.value) || isHostedCheckoutPending()) {
      isOnboardingReturn.value = false
      await startThankYou()
      return
    }
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
  returnAttemptId.value = queryAttempt
  checkoutContext.value = stored
  await checkReturn()
})

onBeforeUnmount(() => {
  stopThankYouPoll()
})
</script>
