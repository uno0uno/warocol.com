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
      <ol class="grid gap-3 sm:grid-cols-2">
        <li
          v-for="(step, index) in steps"
          :key="step.key"
          class="flex items-center gap-3 rounded-lg border p-3"
          :class="index <= currentStepIndex ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface'"
          :aria-current="currentView === 'business' && index === currentStepIndex ? 'step' : undefined"
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

      <div v-else-if="loadError || activationError || currentView === 'error'" role="alert" class="py-10 text-center">
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

      <div v-else-if="currentView === 'welcome'" class="mx-auto max-w-2xl py-6 text-center sm:py-10">
        <div
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" class="h-9 w-9" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m5 12 4 4L19 6" />
          </svg>
        </div>
        <h2 class="mt-5 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {{ t('onboarding.welcomeTitle') }}
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-base leading-7 text-text-secondary">
          {{ t('onboarding.welcomeDescription') }}
        </p>
        <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">
          {{ t('onboarding.welcomeAdvisor') }}
        </p>
        <p
          class="mt-6 text-sm font-medium text-text-primary"
          role="timer"
          aria-live="off"
          aria-atomic="true"
        >
          {{ t('onboarding.welcomeCountdown', { seconds: countdownSeconds }) }}
        </p>
        <button
          type="button"
          class="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-wait disabled:opacity-70"
          :disabled="isRedirecting"
          @click="continueToBilling('cta')"
        >
          {{ isRedirecting ? t('onboarding.welcomeRedirecting') : t('onboarding.welcomeCta') }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import OnboardingBusinessStep from '~/components/onboarding/OnboardingBusinessStep.vue'
import type { OnboardingBusinessDraft } from '~/composables/useOnboarding'
import { extractApiError } from '~/composables/useQueryError'
import { trackOnboardingEvent } from '~/utils/onboardingAnalytics'
import { getSessionLifecycle, resolveOnboardingView } from '~/utils/onboardingFlow'
import {
  clearOnboardingWelcome,
  createOnboardingWelcomeCountdown,
  hasOnboardingWelcome,
  markOnboardingWelcome,
} from '~/utils/onboardingWelcome'
import { readPublicCtaAnalyticsContext } from '~/utils/publicCta'

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
  isLoading,
  isSaving,
  loadError,
  saveError,
  load,
  saveBusinessProfile,
} = useOnboarding()

const steps = [
  { key: 'account', label: 'onboarding.stepAccount' },
  { key: 'business', label: 'onboarding.stepBusiness' },
]
const stepPanel = ref<HTMLElement | null>(null)
const countdownSeconds = ref(10)
const activationError = ref(false)
const isRedirecting = ref(false)
const authStore = useAuthStore()
const tenantsStore = useTenantsStore()
const accessStore = useAccessStore()
let countdown: ReturnType<typeof createOnboardingWelcomeCountdown> | null = null
let welcomeStarted = false

const currentView = computed(() => resolveOnboardingView(status.value))
const currentStepIndex = 1
const loadErrorMessage = computed(() => {
  if (activationError.value) return t('onboarding.activationError')
  return loadError.value
    ? extractApiError(loadError.value, t('onboarding.loadError'))
    : t('onboarding.unknownStep')
})
const saveErrorMessage = computed(() =>
  saveError.value ? extractApiError(saveError.value, t('onboarding.saveError')) : '',
)

const analyticsStorage = () => import.meta.client ? sessionStorage : null
const publicAnalyticsContext = () => readPublicCtaAnalyticsContext(analyticsStorage())

const refreshActiveStores = async () => {
  const session = await authStore.refreshSession()
  if (getSessionLifecycle(session) !== 'active') return false
  await Promise.all([tenantsStore.fetchUserTenants(), accessStore.load()])
  return true
}

const continueToBilling = (method: 'cta' | 'automatic') => {
  if (isRedirecting.value) return
  isRedirecting.value = true
  countdown?.cancel()
  trackOnboardingEvent('billing_continued', {
    ...publicAnalyticsContext(),
    method,
    dedupeId: 'welcome',
  }, undefined, analyticsStorage())
  if (import.meta.client) clearOnboardingWelcome(sessionStorage)
  window.location.assign('/gestion/billing')
}

const startWelcome = async () => {
  if (welcomeStarted) return
  if (!import.meta.client) return
  if (!hasOnboardingWelcome(sessionStorage)) {
    window.location.assign('/gestion/billing')
    return
  }

  try {
    if (!await refreshActiveStores()) {
      activationError.value = true
      return
    }
  } catch {
    activationError.value = true
    return
  }

  welcomeStarted = true
  activationError.value = false
  trackOnboardingEvent('welcome_shown', {
    ...publicAnalyticsContext(),
    dedupeId: 'welcome',
  }, undefined, analyticsStorage())
  await nextTick()
  stepPanel.value?.focus()
  countdown = createOnboardingWelcomeCountdown({
    seconds: 10,
    onTick: remaining => { countdownSeconds.value = remaining },
    onComplete: () => continueToBilling('automatic'),
  })
  countdown.start()
}

const syncCurrentStep = async () => {
  if (currentView.value === 'welcome') await startWelcome()
}

const reload = async () => {
  activationError.value = false
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
    if (import.meta.client) markOnboardingWelcome(sessionStorage)
    trackOnboardingEvent('business_profile_completed', {
      ...publicAnalyticsContext(),
      dedupeId: 'business-profile',
    }, undefined, analyticsStorage())
    await syncCurrentStep()
  } catch {
    // Keep the child draft mounted for a retry.
  }
}

watch(currentView, async (nextView, previousView) => {
  if (!previousView || nextView === previousView) return
  await nextTick()
  stepPanel.value?.focus()
})

onMounted(reload)

onBeforeUnmount(() => {
  countdown?.cancel()
  if (import.meta.client) clearOnboardingWelcome(sessionStorage)
})
</script>
