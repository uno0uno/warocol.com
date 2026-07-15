<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-text-primary">{{ t('onboarding.termsTitle') }}</h2>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        {{ t('onboarding.termsDescription') }}
      </p>
    </div>

    <div v-if="isInitialLoading" class="flex min-h-64 items-center justify-center" role="status">
      <span class="text-sm text-text-secondary">{{ t('terms.loading') }}</span>
    </div>

    <div v-else-if="!currentDocument" role="alert" class="rounded-lg bg-status-critical-bg p-4 text-sm text-status-critical-text">
      {{ t('onboarding.termsUnavailable') }}
    </div>

    <template v-else>
      <section class="overflow-hidden rounded-lg border border-border bg-surface-secondary" :aria-label="currentDocument.title">
        <iframe
          v-if="isPdfDocument"
          :src="pdfViewerUrl"
          :title="t('terms.pdfTitle')"
          class="h-[60vh] min-h-[420px] w-full bg-white"
        />
        <div v-else class="p-6 text-center">
          <p class="text-sm leading-6 text-text-secondary">{{ t('terms.pdfLoadError') }}</p>
          <a
            v-if="sourceUrl"
            :href="sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface"
          >
            {{ t('onboarding.openTerms') }}
          </a>
        </div>
      </section>

      <label class="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm leading-6 text-text-secondary">
        <input
          v-model="confirmedRead"
          type="checkbox"
          class="mt-1 h-4 w-4 flex-shrink-0 rounded border-border text-primary focus:ring-primary"
        />
        <span>{{ t('terms.readConfirmation', { version: currentDocument.version }) }}</span>
      </label>

      <p v-if="errorMessage" role="alert" class="rounded-lg bg-status-critical-bg p-3 text-sm text-status-critical-text">
        {{ errorMessage }}
      </p>

      <div class="flex justify-end">
        <button
          type="button"
          class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
          :disabled="!confirmedRead || isAccepting || !sourceUrl"
          @click="handleAccept"
        >
          <UiLoadingDots v-if="isAccepting" size="7px" color="currentColor" />
          {{ isAccepting ? t('terms.registeringAcceptance') : t('terms.acceptTerms') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { extractApiError } from '~/composables/useQueryError'

const emit = defineEmits<{
  (event: 'accepted'): void
}>()

const { t } = useI18n()
const confirmedRead = ref(false)
const errorMessage = ref('')
const {
  currentDocument,
  isInitialLoading,
  isAccepting,
  acceptTerms,
  refreshTermsStatus,
} = useLegalTerms()

const sourceUrl = computed(() => currentDocument.value?.source_url || '')
const isPdfDocument = computed(() =>
  currentDocument.value?.display_mode === 'pdf' || /\.pdf($|[?#])/i.test(sourceUrl.value),
)
const pdfViewerUrl = computed(() => {
  if (!sourceUrl.value) return ''
  const separator = sourceUrl.value.includes('#') ? '&' : '#'
  return `${sourceUrl.value}${separator}navpanes=0&toolbar=1&view=FitH`
})

const handleAccept = async () => {
  if (!confirmedRead.value || isAccepting.value) return
  errorMessage.value = ''
  try {
    await acceptTerms({
      document_id: currentDocument.value?.id,
      version: currentDocument.value?.version,
    })
    await refreshTermsStatus()
    emit('accepted')
  } catch (err) {
    errorMessage.value = extractApiError(err, t('terms.acceptanceError'))
  }
}
</script>
