<template>
  <div class="space-y-8">
    <header class="max-w-3xl">
      <p class="text-sm font-semibold uppercase tracking-wide text-primary">{{ t('onboarding.eyebrow') }}</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
        {{ t('onboarding.title') }}
      </h1>
      <p class="mt-3 text-base leading-7 text-text-secondary">{{ t('onboarding.description') }}</p>
    </header>

    <nav :aria-label="t('onboarding.progressLabel')">
      <ol class="grid gap-3 sm:grid-cols-5">
        <li
          v-for="(step, index) in steps"
          :key="step.key"
          class="flex items-center gap-3 rounded-lg border p-3"
          :class="index <= currentStepIndex ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface'"
          :aria-current="index === currentStepIndex ? 'step' : undefined"
        >
          <span
            class="flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-semibold"
            :class="index <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-surface-secondary text-text-tertiary'"
            aria-hidden="true"
          >
            {{ index + 1 }}
          </span>
          <span class="text-sm font-medium text-text-primary">{{ t(step.label) }}</span>
        </li>
      </ol>
    </nav>

    <section
      ref="stepPanel"
      tabindex="-1"
      class="rounded-xl border border-border bg-surface p-5 shadow-sm outline-none sm:p-8"
    >
      <div v-if="isLoading" class="flex min-h-72 items-center justify-center" role="status">
        <div class="text-center">
          <TheCustomLoader size="large" />
          <p class="mt-4 text-sm text-text-secondary">{{ t('onboarding.loading') }}</p>
        </div>
      </div>

      <div v-else-if="loadError || currentView === 'error'" role="alert" class="py-10 text-center">
        <h2 class="text-xl font-semibold text-text-primary">{{ t('onboarding.loadErrorTitle') }}</h2>
        <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">
          {{ loadErrorMessage }}
        </p>
        <button
          type="button"
          class="mt-5 min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          @click="reload"
        >
          {{ t('common.retry') }}
        </button>
      </div>

      <OnboardingBusinessStep
        v-else-if="currentView === 'business' && financial"
        :financial="financial"
        :saving="isSaving"
        :error="saveErrorMessage"
        @submit="handleBusinessSubmit"
      />

      <OnboardingTermsStep
        v-else-if="currentView === 'terms'"
        @accepted="handleTermsAccepted"
      />

      <OnboardingPlanStep
        v-else-if="currentView === 'plan'"
        v-model="selectedPlanId"
        :plans="plans"
        :loading="isPlansLoading"
        :submitting="isCheckoutLoading"
        :error="plansErrorMessage"
        :submit-error="checkoutErrorMessage"
        @continue="handleCheckout"
        @retry="loadAvailablePlans"
      />

      <OnboardingPaymentStep
        v-else-if="currentView === 'payment'"
        :status="paymentStatus"
        :loading="isPaymentLoading"
        :error="paymentErrorMessage"
        @refresh="refreshPayment"
        @retry="retryPayment"
      />

      <OnboardingSetupStep v-else-if="currentView === 'setup'" />
    </section>
  </div>
</template>

<script setup lang="ts">
import OnboardingBusinessStep from '~/components/onboarding/OnboardingBusinessStep.vue'
import OnboardingPaymentStep from '~/components/onboarding/OnboardingPaymentStep.vue'
import OnboardingPlanStep from '~/components/onboarding/OnboardingPlanStep.vue'
import OnboardingSetupStep from '~/components/onboarding/OnboardingSetupStep.vue'
import OnboardingTermsStep from '~/components/onboarding/OnboardingTermsStep.vue'
import type { OnboardingBusinessDraft } from '~/composables/useOnboarding'
import { extractApiError } from '~/composables/useQueryError'
import { resolveOnboardingView } from '~/utils/onboardingFlow'
import { trackOnboardingEvent } from '~/utils/onboardingAnalytics'
import { readPublicCtaAnalyticsContext } from '~/utils/publicCta'
import {
  clearCheckoutContext,
  readCheckoutContext,
  writeCheckoutContext,
  type OnboardingCheckoutContext,
} from '~/utils/onboardingPayment'

definePageMeta({
  layout: 'onboarding',
  onboardingAccess: true,
  robots: 'noindex, nofollow',
})

const { t } = useI18n()
useHead({ title: () => t('onboarding.pageTitle') })

const {
  status,
  financial,
  plans,
  paymentAttempt,
  isLoading,
  isSaving,
  isPlansLoading,
  isCheckoutLoading,
  isPaymentLoading,
  loadError,
  saveError,
  plansError,
  checkoutError,
  paymentError,
  load,
  loadStatus,
  saveBusinessProfile,
  loadPlans,
  createCheckout,
  loadPaymentStatus,
} = useOnboarding()

const steps = [
  { key: 'account', label: 'onboarding.stepAccount' },
  { key: 'business', label: 'onboarding.stepBusiness' },
  { key: 'terms', label: 'onboarding.stepTerms' },
  { key: 'payment', label: 'onboarding.stepPayment' },
  { key: 'setup', label: 'onboarding.stepSetup' },
]
const stepPanel = ref<HTMLElement | null>(null)
const selectedPlanId = ref('')
const checkoutContext = ref<OnboardingCheckoutContext | null>(null)
const isRedirectingToCheckout = ref(false)
const authStore = useAuthStore()
const tenantsStore = useTenantsStore()
const accessStore = useAccessStore()

const serverView = computed(() => resolveOnboardingView(status.value))
const currentView = computed(() =>
  serverView.value === 'plan' && checkoutContext.value ? 'payment' : serverView.value,
)
const currentStepIndex = computed(() => {
  if (currentView.value === 'business') return 1
  if (currentView.value === 'terms') return 2
  if (currentView.value === 'plan' || currentView.value === 'payment') return 3
  if (currentView.value === 'setup') return 4
  return 0
})
const loadErrorMessage = computed(() =>
  loadError.value
    ? extractApiError(loadError.value, t('onboarding.loadError'))
    : t('onboarding.unknownStep'),
)
const saveErrorMessage = computed(() =>
  saveError.value ? extractApiError(saveError.value, t('onboarding.saveError')) : '',
)
const plansErrorMessage = computed(() =>
  plansError.value ? extractApiError(plansError.value, t('onboarding.plansError')) : '',
)
const checkoutErrorMessage = computed(() =>
  checkoutError.value ? extractApiError(checkoutError.value, t('onboarding.checkoutError')) : '',
)
const paymentErrorMessage = computed(() =>
  paymentError.value ? extractApiError(paymentError.value, t('onboarding.paymentError')) : '',
)
const paymentStatus = computed(() => paymentAttempt.value?.status ?? 'pending')

const analyticsStorage = () => import.meta.client ? sessionStorage : null
const publicAnalyticsContext = () => readPublicCtaAnalyticsContext(analyticsStorage())

const refreshActiveStores = async () => {
  const session = await authStore.refreshSession()
  if (session?.lifecycleStatus !== 'active' && session?.lifecycle_status !== 'active') return false
  await Promise.all([tenantsStore.fetchUserTenants(), accessStore.load()])
  return true
}

const redirectToBilling = async () => {
  await refreshActiveStores()
  if (import.meta.client) clearCheckoutContext(sessionStorage)
  window.location.assign('/gestion/billing')
}

const finishActivation = async () => {
  const currentStatus = await loadStatus()
  if (currentStatus.lifecycleStatus !== 'active' || currentStatus.nextStep !== 'setup') return false
  if (import.meta.client) clearCheckoutContext(sessionStorage)
  checkoutContext.value = null
  await refreshActiveStores()
  return true
}

const loadAvailablePlans = async () => {
  try {
    await loadPlans()
  } catch {
    // The plan step renders the recoverable request error.
  }
}

const recoverLatestPayment = async () => {
  try {
    const attempt = await loadPaymentStatus()
    const context = { attemptId: attempt.attempt_id, planId: attempt.plan_id }
    if (import.meta.client) writeCheckoutContext(sessionStorage, context)
    checkoutContext.value = context
    trackOnboardingEvent('payment_result', {
      planId: context.planId,
      paymentStatus: attempt.status,
      dedupeId: `${context.attemptId}:${attempt.status}`,
    }, undefined, analyticsStorage())
    if (attempt.status === 'approved') await finishActivation()
    return true
  } catch {
    // A 404 means this tenant has not started checkout yet.
    paymentError.value = null
    return false
  }
}

const refreshPayment = async () => {
  const context = checkoutContext.value
  if (!context) {
    await reload()
    return
  }
  try {
    const attempt = await loadPaymentStatus(context.attemptId)
    trackOnboardingEvent('payment_result', {
      planId: context.planId,
      paymentStatus: attempt.status,
      dedupeId: `${context.attemptId}:${attempt.status}`,
    }, undefined, analyticsStorage())
    if (attempt.status === 'approved') await finishActivation()
  } catch {
    // The payment step remains mounted and offers an explicit retry.
  }
}

const syncCurrentStep = async () => {
  if (serverView.value === 'setup') {
    await refreshActiveStores()
    return
  }
  if (serverView.value === 'plan' && status.value?.lifecycleStatus === 'active') {
    await redirectToBilling()
    return
  }
  if (serverView.value !== 'plan' && serverView.value !== 'payment') return
  if (checkoutContext.value) {
    await refreshPayment()
  } else if (!await recoverLatestPayment()) {
    await loadAvailablePlans()
  }
}

const reload = async () => {
  try {
    await load()
    await syncCurrentStep()
  } catch {
    // The reactive error state renders the recovery UI.
  }
}

const handleBusinessSubmit = async (draft: OnboardingBusinessDraft) => {
  try {
    await saveBusinessProfile(draft)
    trackOnboardingEvent('business_profile_completed', {
      ...publicAnalyticsContext(),
      dedupeId: 'business-profile',
    }, undefined, analyticsStorage())
  } catch {
    // Keep the child draft mounted for a retry.
  }
}

const handleTermsAccepted = async () => {
  await redirectToBilling()
}

const handleCheckout = async () => {
  if (!selectedPlanId.value || isCheckoutLoading.value) return
  try {
    const checkout = await createCheckout(selectedPlanId.value)
    const context = { attemptId: checkout.attempt_id, planId: checkout.plan_id }
    if (import.meta.client) writeCheckoutContext(sessionStorage, context)
    checkoutContext.value = context
    trackOnboardingEvent('checkout_started', {
      ...publicAnalyticsContext(),
      planId: context.planId,
      dedupeId: context.attemptId,
    }, undefined, analyticsStorage())
    isRedirectingToCheckout.value = true
    window.location.assign(checkout.checkout_url)
  } catch {
    // The plan step keeps the selection and renders the recoverable error.
  }
}

const retryPayment = async () => {
  if (import.meta.client) clearCheckoutContext(sessionStorage)
  checkoutContext.value = null
  paymentAttempt.value = null
  await loadAvailablePlans()
}

watch(selectedPlanId, (planId) => {
  if (!planId) return
  trackOnboardingEvent('plan_selected', { planId, dedupeId: planId }, undefined, analyticsStorage())
})

watch(currentView, async (nextView, previousView) => {
  if (!previousView || nextView === previousView) return
  await nextTick()
  stepPanel.value?.focus()
})

onMounted(async () => {
  checkoutContext.value = import.meta.client ? readCheckoutContext(sessionStorage) : null
  await reload()
})

onBeforeUnmount(() => {
  if (currentView.value !== 'plan' || !selectedPlanId.value || isRedirectingToCheckout.value) return
  trackOnboardingEvent('checkout_abandoned', {
    planId: selectedPlanId.value,
    dedupeId: selectedPlanId.value,
  }, undefined, analyticsStorage())
})
</script>
