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
      <ol class="grid gap-3 sm:grid-cols-3">
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

      <div v-else-if="currentView === 'complete'" class="py-10 text-center" role="status">
        <CheckCircleIcon class="mx-auto h-12 w-12 text-status-success-text" aria-hidden="true" />
        <h2 class="mt-4 text-2xl font-semibold text-text-primary">{{ t('onboarding.completeTitle') }}</h2>
        <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">
          {{ t('onboarding.completeDescription') }}
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon } from '@heroicons/vue/24/outline'
import OnboardingBusinessStep from '~/components/onboarding/OnboardingBusinessStep.vue'
import OnboardingTermsStep from '~/components/onboarding/OnboardingTermsStep.vue'
import type { OnboardingBusinessDraft } from '~/composables/useOnboarding'
import { extractApiError } from '~/composables/useQueryError'
import { resolveOnboardingView } from '~/utils/onboardingFlow'

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
  { key: 'terms', label: 'onboarding.stepTerms' },
]
const stepPanel = ref<HTMLElement | null>(null)

const currentView = computed(() => resolveOnboardingView(status.value))
const currentStepIndex = computed(() => {
  if (currentView.value === 'business') return 1
  if (currentView.value === 'terms') return 2
  if (currentView.value === 'complete') return 2
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

const reload = async () => {
  try {
    await load()
  } catch {
    // The reactive error state renders the recovery UI.
  }
}

const handleBusinessSubmit = async (draft: OnboardingBusinessDraft) => {
  try {
    await saveBusinessProfile(draft)
  } catch {
    // Keep the child draft mounted for a retry.
  }
}

const handleTermsAccepted = async () => {
  await reload()
}

watch(currentView, async (nextView, previousView) => {
  if (!previousView || nextView === previousView) return
  await nextTick()
  stepPanel.value?.focus()
})

onMounted(reload)
</script>
