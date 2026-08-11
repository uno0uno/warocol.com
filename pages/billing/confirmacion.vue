<template>
  <div v-if="view === 'loading'" class="flex min-h-[420px] items-center justify-center px-4" role="status">
    <CommonsTheCustomLoader size="large" />
  </div>

  <!-- Thank-you / activating after Paddle checkout.completed (#2219) -->
  <div
    v-else-if="showThankYou"
    class="mx-auto flex min-h-[420px] max-w-lg items-center justify-center px-4"
  >
    <div class="w-full rounded-xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
      <component :is="thankYouIcon" class="mx-auto h-14 w-14" :class="thankYouIconClass" aria-hidden="true" />
      <h1 class="mt-4 text-2xl font-bold text-text-primary">{{ thankYouTitle }}</h1>
      <p class="mt-2 text-sm leading-6 text-text-secondary">{{ thankYouDescription }}</p>
      <p v-if="errorMessage" class="mt-3 text-sm text-status-danger-text" role="alert">{{ errorMessage }}</p>
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
          @click="pollPaddleThankYouOnce"
        >
          {{ pollingStatus ? t('billing.validating') : t('billing.paddleThankYouRefresh') }}
        </button>
        <NuxtLink
          to="/gestion/billing"
          class="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 py-2 text-sm font-semibold text-text-primary"
        >
          {{ t('billing.backToBilling') }}
        </NuxtLink>
      </div>
    </div>
  </div>

  <!-- Inline Paddle pay surface (#2209) — full page, not overlay modal -->
  <div
    v-else-if="showInlineCheckout"
    class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"
  >
    <div class="mb-6 text-center">
      <h1 class="text-2xl font-bold text-text-primary">{{ t('onboarding.paymentPendingTitle') }}</h1>
      <p class="mt-2 text-sm leading-6 text-text-secondary">
        {{ t('billing.paddleCheckoutPendingDescription') }}
      </p>
      <p v-if="errorMessage" class="mt-3 text-sm text-status-danger-text" role="alert">{{ errorMessage }}</p>
    </div>
    <div
      :class="[PADDLE_INLINE_FRAME_ID, 'min-h-[520px] w-full rounded-xl border border-border bg-surface p-2 sm:p-4']"
      aria-live="polite"
    />
    <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <button
        v-if="isOnboardingReturn"
        type="button"
        class="min-h-11 rounded-md border border-border px-5 py-2 text-sm font-semibold text-text-primary"
        @click="checkReturn"
      >
        {{ t('onboarding.paymentRefresh') }}
      </button>
      <NuxtLink
        to="/gestion/billing"
        class="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 py-2 text-sm font-semibold text-text-primary"
      >
        {{ t('billing.backToBilling') }}
      </NuxtLink>
    </div>
  </div>

  <div v-else class="mx-auto flex min-h-[420px] max-w-lg items-center justify-center">
    <div class="w-full rounded-xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
      <component :is="icon" class="mx-auto h-14 w-14" :class="iconClass" aria-hidden="true" />
      <h1 class="mt-4 text-2xl font-bold text-text-primary">{{ title }}</h1>
      <p class="mt-2 text-sm leading-6 text-text-secondary">{{ description }}</p>
      <p v-if="errorMessage" class="mt-3 text-sm text-status-danger-text" role="alert">{{ errorMessage }}</p>

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
import { isActiveOnboardingSetupSession, isPendingOnboardingSession, shouldOpenPaddleInsteadOfSetupRedirect } from '~/utils/onboardingFlow'
import {
  clearCheckoutContext,
  isUuid,
  readCheckoutContext,
  writeCheckoutContext,
  type OnboardingCheckoutContext,
} from '~/utils/onboardingPayment'
import {
  isPaddleTransactionMarkedDone,
  PADDLE_INLINE_FRAME_ID,
  usePaddleCheckout,
} from '~/composables/usePaddleCheckout'
import {
  paddleThankYouPhaseFromStatus,
  PADDLE_THANK_YOU_MAX_ATTEMPTS,
  PADDLE_THANK_YOU_POLL_MS,
  type PaddleThankYouPhase,
  type PaddleTxnStatusResponse,
} from '~/utils/paddleThankYou'

// The API remains the auth boundary. This meta only lets pending sessions reach
// the payment return page (Paddle / legacy Wompi) without weakening operational guards.
definePageMeta({ publicAccess: true, robots: 'noindex, nofollow' })

type ReturnView = 'loading' | 'approved' | 'pending' | 'failed' | 'unknown' | 'thank_you'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const tenantsStore = useTenantsStore()
const accessStore = useAccessStore()
const cache = useQueryCache()
const { loadStatus, loadPaymentStatus } = useOnboarding()
const { openTransactionCheckout, clientToken } = usePaddleCheckout()

const view = ref<ReturnView>('loading')
const errorMessage = ref('')
const isOnboardingReturn = ref(false)
const checkoutContext = ref<OnboardingCheckoutContext | null>(null)
const returnAttemptId = ref<string | null>(null)
const paddleTxnId = ref<string | null>(null)
const openingCheckout = ref(false)
const paddleCheckoutDone = ref(false)
const inlineCheckoutMounted = ref(false)
const thankYouPhase = ref<PaddleThankYouPhase>('activating')
const pollingStatus = ref(false)
const pollAttempt = ref(0)
let pollTimer: ReturnType<typeof setTimeout> | null = null

const showThankYou = computed(() => view.value === 'thank_you')

const showInlineCheckout = computed(() =>
  Boolean(
    paddleTxnId.value
    && !paddleCheckoutDone.value
    && inlineCheckoutMounted.value
    && (view.value === 'pending' || view.value === 'failed' || view.value === 'unknown'),
  ),
)

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
    ? (paddleTxnId.value
        ? t('billing.paddleCheckoutPendingDescription')
        : t('onboarding.paymentPendingDescription'))
    : view.value === 'failed'
      ? t('onboarding.paymentFailedDescription')
      : t('onboarding.paymentUnknownDescription'))

const thankYouIcon = computed(() =>
  thankYouPhase.value === 'ready' ? CheckCircleIcon
    : thankYouPhase.value === 'timeout' ? ExclamationTriangleIcon
      : ClockIcon,
)
const thankYouIconClass = computed(() =>
  thankYouPhase.value === 'ready' ? 'text-status-success-text'
    : thankYouPhase.value === 'timeout' ? 'text-status-warning-text'
      : 'text-status-warning-text',
)
const thankYouTitle = computed(() =>
  thankYouPhase.value === 'ready' ? t('billing.paddleThankYouTitle')
    : thankYouPhase.value === 'timeout' ? t('billing.paddleThankYouTimeoutTitle')
      : t('billing.paddleThankYouActivatingTitle'),
)
const thankYouDescription = computed(() =>
  thankYouPhase.value === 'ready' ? t('billing.paddleThankYouDescription')
    : thankYouPhase.value === 'timeout' ? t('billing.paddleThankYouTimeoutDescription')
      : t('billing.paddleThankYouActivatingDescription'),
)

const readPaddleTxnFromRoute = () => {
  const paddleTxn = typeof route.query.paddle_txn === 'string'
    ? route.query.paddle_txn
    : (typeof route.query._ptxn === 'string' ? route.query._ptxn : null)
  return paddleTxn && paddleTxn.startsWith('txn_') ? paddleTxn : null
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
    void pollPaddleThankYouOnce()
  }, PADDLE_THANK_YOU_POLL_MS)
}

const pollPaddleThankYouOnce = async () => {
  const txn = paddleTxnId.value
  if (!txn || !import.meta.client) return
  pollingStatus.value = true
  errorMessage.value = ''
  try {
    const status = await $fetch<PaddleTxnStatusResponse>('/api/billing/paddle/transaction-status', {
      credentials: 'include',
      query: { transaction_id: txn },
    })
    pollAttempt.value += 1
    thankYouPhase.value = paddleThankYouPhaseFromStatus(status, pollAttempt.value)
    await cache.invalidateQueries({ key: ['billing'] })
    if (thankYouPhase.value === 'ready') {
      stopThankYouPoll()
      try {
        await Promise.all([authStore.refreshSession(), accessStore.load()])
      } catch {
        /* access may lag; CTA still works */
      }
      return
    }
    if (thankYouPhase.value === 'activating') scheduleThankYouPoll()
  } catch {
    pollAttempt.value += 1
    thankYouPhase.value = paddleThankYouPhaseFromStatus(null, pollAttempt.value)
    if (pollAttempt.value >= PADDLE_THANK_YOU_MAX_ATTEMPTS) {
      errorMessage.value = t('billing.paddleThankYouPollError')
    } else {
      scheduleThankYouPoll()
    }
  } finally {
    pollingStatus.value = false
  }
}

const startPaddleThankYou = async () => {
  paddleCheckoutDone.value = true
  inlineCheckoutMounted.value = false
  view.value = 'thank_you'
  thankYouPhase.value = 'activating'
  pollAttempt.value = 0
  await cache.invalidateQueries({ key: ['billing'] })
  await pollPaddleThankYouOnce()
}

const refreshActivatedSession = async () => {
  const session = await authStore.refreshSession()
  if (!isActiveOnboardingSetupSession(session)) return false
  await Promise.all([tenantsStore.fetchUserTenants(), accessStore.load()])
  if (import.meta.client) clearCheckoutContext(sessionStorage)
  await navigateTo('/gestion/billing', { replace: true })
  return true
}

const openPaddleInline = async () => {
  const txn = paddleTxnId.value
  if (!txn || !import.meta.client) return
  if (!clientToken.value) {
    errorMessage.value = t('billing.paddleTokenMissing')
    view.value = 'unknown'
    inlineCheckoutMounted.value = false
    return
  }
  if (isPaddleTransactionMarkedDone(txn)) {
    await startPaddleThankYou()
    return
  }
  openingCheckout.value = true
  errorMessage.value = ''
  view.value = 'pending'
  inlineCheckoutMounted.value = true
  try {
    await nextTick()
    await openTransactionCheckout(txn, {
      onCompleted: async () => {
        await startPaddleThankYou()
      },
      onClosed: () => {
        view.value = 'pending'
      },
      onError: (message) => {
        errorMessage.value = message
      },
    }, {
      displayMode: 'inline',
      frameTarget: PADDLE_INLINE_FRAME_ID,
    })
  } catch (err: any) {
    const code = String(err?.message || err || '')
    errorMessage.value = code === 'missing_paddle_client_token'
      ? t('billing.paddleTokenMissing')
      : t('billing.paddleCheckoutOpenError')
    view.value = 'unknown'
    inlineCheckoutMounted.value = false
  } finally {
    openingCheckout.value = false
  }
}

const checkOnboardingReturn = async () => {
  const context = checkoutContext.value
  const attemptId = returnAttemptId.value || context?.attemptId
  if (paddleTxnId.value) {
    await openPaddleInline()
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
  } catch (err: any) {
    errorMessage.value = t('onboarding.paymentError')
    view.value = 'unknown'
  }
}

const checkLegacyReturn = async () => {
  const transactionId = typeof route.query.id === 'string' ? route.query.id : null

  if (!transactionId && paddleTxnId.value) {
    await openPaddleInline()
    return
  }

  if (!transactionId) {
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
  } catch (err: any) {
    errorMessage.value = t('onboarding.paymentError')
    view.value = 'unknown'
  }
}

const checkReturn = async () => {
  view.value = 'loading'
  errorMessage.value = ''
  paddleTxnId.value = readPaddleTxnFromRoute()
  try {
    const session = await authStore.refreshSession()
    if (isPendingOnboardingSession(session) || isActiveOnboardingSetupSession(session)) {
      isOnboardingReturn.value = true
      if (shouldOpenPaddleInsteadOfSetupRedirect(paddleTxnId.value)) {
        await openPaddleInline()
        return
      }
      if (isActiveOnboardingSetupSession(session) && await refreshActivatedSession()) return
      await checkOnboardingReturn()
      return
    }
    isOnboardingReturn.value = false
    await checkLegacyReturn()
  } catch (err: any) {
    if (paddleTxnId.value) {
      isOnboardingReturn.value = false
      await openPaddleInline()
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
