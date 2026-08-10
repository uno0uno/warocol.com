<template>
  <div v-if="view === 'loading'" class="flex min-h-[420px] items-center justify-center px-4" role="status">
    <CommonsTheCustomLoader size="large" />
  </div>

  <div v-else class="mx-auto flex min-h-[420px] max-w-lg items-center justify-center">
    <div class="w-full rounded-xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
      <component :is="icon" class="mx-auto h-14 w-14" :class="iconClass" aria-hidden="true" />
      <h1 class="mt-4 text-2xl font-bold text-text-primary">{{ title }}</h1>
      <p class="mt-2 text-sm leading-6 text-text-secondary">{{ description }}</p>
      <p v-if="errorMessage" class="mt-3 text-sm text-status-danger-text" role="alert">{{ errorMessage }}</p>

      <div class="mt-6 flex flex-col gap-3">
        <button
          v-if="showContinuePaddleCheckout"
          type="button"
          class="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          :disabled="openingCheckout"
          @click="openPaddleOverlay(true)"
        >
          {{ openingCheckout ? t('billing.processing') : t('billing.continuePaddleCheckout') }}
        </button>
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
          :class="[
            'inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2 text-sm font-semibold',
            showContinuePaddleCheckout
              ? 'border border-border text-text-primary'
              : 'bg-primary text-primary-foreground',
          ]"
        >
          {{ t('onboarding.viewSubscription') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { isActiveOnboardingSetupSession, isPendingOnboardingSession } from '~/utils/onboardingFlow'
import {
  clearCheckoutContext,
  isUuid,
  readCheckoutContext,
  writeCheckoutContext,
  type OnboardingCheckoutContext,
} from '~/utils/onboardingPayment'
import {
  isPaddleTransactionMarkedDone,
  usePaddleCheckout,
} from '~/composables/usePaddleCheckout'

// The API remains the auth boundary. This meta only lets pending sessions reach
// the payment return page (Paddle / legacy Wompi) without weakening operational guards.
definePageMeta({ publicAccess: true, robots: 'noindex, nofollow' })

type ReturnView = 'loading' | 'approved' | 'pending' | 'failed' | 'unknown'

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

const showContinuePaddleCheckout = computed(() =>
  Boolean(
    paddleTxnId.value
    && !paddleCheckoutDone.value
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

const readPaddleTxnFromRoute = () => {
  const paddleTxn = typeof route.query.paddle_txn === 'string'
    ? route.query.paddle_txn
    : (typeof route.query._ptxn === 'string' ? route.query._ptxn : null)
  return paddleTxn && paddleTxn.startsWith('txn_') ? paddleTxn : null
}

const refreshActivatedSession = async () => {
  const session = await authStore.refreshSession()
  if (!isActiveOnboardingSetupSession(session)) return false
  await Promise.all([tenantsStore.fetchUserTenants(), accessStore.load()])
  if (import.meta.client) clearCheckoutContext(sessionStorage)
  await navigateTo('/gestion/billing', { replace: true })
  return true
}

const openPaddleOverlay = async (manual = false) => {
  const txn = paddleTxnId.value
  if (!txn || !import.meta.client) return
  if (!clientToken.value) {
    errorMessage.value = t('billing.paddleTokenMissing')
    view.value = 'unknown'
    return
  }
  if (isPaddleTransactionMarkedDone(txn)) {
    paddleCheckoutDone.value = true
    view.value = 'pending'
    await cache.invalidateQueries({ key: ['billing'] })
    return
  }
  openingCheckout.value = true
  errorMessage.value = ''
  try {
    view.value = 'pending'
    await openTransactionCheckout(txn, {
      onCompleted: async () => {
        paddleCheckoutDone.value = true
        view.value = 'pending'
        await cache.invalidateQueries({ key: ['billing'] })
      },
      onClosed: () => {
        // Keep pending + allow "continue checkout" if not completed
        view.value = 'pending'
      },
      onError: (message) => {
        errorMessage.value = message
      },
    })
  } catch (err: any) {
    const code = String(err?.message || err || '')
    errorMessage.value = code === 'missing_paddle_client_token'
      ? t('billing.paddleTokenMissing')
      : t('billing.paddleCheckoutOpenError')
    view.value = 'unknown'
  } finally {
    openingCheckout.value = false
  }
}

const checkOnboardingReturn = async () => {
  const context = checkoutContext.value
  const attemptId = returnAttemptId.value || context?.attemptId
  // Prefer opening Paddle when landing from default payment link.
  if (paddleTxnId.value) {
    await openPaddleOverlay(false)
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
    await openPaddleOverlay(false)
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
      if (isActiveOnboardingSetupSession(session) && await refreshActivatedSession()) return
      await checkOnboardingReturn()
      return
    }
    isOnboardingReturn.value = false
    await checkLegacyReturn()
  } catch (err: any) {
    // Still open Paddle when ?_ptxn= is present — checkout does not require session.
    if (paddleTxnId.value) {
      isOnboardingReturn.value = false
      await openPaddleOverlay(false)
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
</script>
