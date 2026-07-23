<template>
  <div class="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section class="min-w-0">
        <div class="space-y-6 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <div class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <UiStatusBadge :value="documentVersionLabel" variant="primary" size="sm" />
              <UiStatusBadge :value="documentStatusLabel" :variant="documentStatusVariant" size="sm" />
            </div>
            <div class="space-y-3">
              <h1 class="max-w-3xl text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
                {{ document.title }}
              </h1>
              <p class="max-w-3xl text-base leading-7 text-text-secondary">
                {{ t('terms.description') }}
              </p>
            </div>
          </div>

          <section class="grid gap-3 sm:grid-cols-3" :aria-label="t('terms.documentSummary')">
            <div class="rounded-lg border border-border bg-surface p-4">
              <p class="text-xs font-medium uppercase text-text-tertiary">{{ t('terms.currentVersion') }}</p>
              <p class="mt-2 text-lg font-semibold text-text-primary">{{ document.version }}</p>
            </div>
            <div class="rounded-lg border border-border bg-surface p-4">
              <p class="text-xs font-medium uppercase text-text-tertiary">{{ t('terms.effectiveDate') }}</p>
              <p class="mt-2 text-lg font-semibold text-text-primary">{{ effectiveDateLabel }}</p>
            </div>
            <div class="rounded-lg border border-border bg-surface p-4">
              <p class="text-xs font-medium uppercase text-text-tertiary">{{ t('terms.format') }}</p>
              <p class="mt-2 text-lg font-semibold text-text-primary">PDF</p>
            </div>
          </section>

          <section id="documento" class="rounded-lg border border-border bg-surface p-4 sm:p-6">
            <div class="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="space-y-1">
                <h2 class="text-xl font-semibold text-text-primary">{{ t('terms.legalDocument') }}</h2>
                <p class="text-sm leading-6 text-text-secondary">
                  {{ t('terms.legalDocumentDescription') }}
                </p>
              </div>
              <a
                v-if="sourceUrl"
                :href="sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
              >
                {{ t('terms.openPdfInNewTab') }}
              </a>
            </div>

            <div v-if="isDocumentLoading" class="flex min-h-64 items-center justify-center">
              <div class="flex items-center gap-3 text-sm text-text-secondary">
                <span>{{ t('terms.loading') }}</span>
                <CommonsInlineDots :aria-label="t('terms.loading')" :size="5" />
              </div>
            </div>

            <div v-else class="mt-6 space-y-3">
              <div
                v-if="isPdfDocument"
                class="relative overflow-hidden rounded-lg border border-border bg-white"
              >
                <iframe
                  :src="pdfViewerUrl"
                  :title="t('terms.pdfTitle')"
                  class="h-[72vh] min-h-[640px] w-full bg-white"
                  @load="markPdfLoaded"
                />
              </div>

              <div
                v-if="showPdfFallbackMessage"
                class="rounded-lg border border-status-warning-text/30 bg-status-warning-bg p-4 text-sm leading-6 text-status-warning-text"
              >
                <p>{{ t('terms.pdfLoadError') }}</p>
                <a
                  v-if="sourceUrl"
                  :href="sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-2 inline-flex font-medium underline underline-offset-2"
                >
                  {{ t('terms.openPdfInNewTab') }}
                </a>
              </div>
            </div>
          </section>
        </div>
      </section>

      <aside class="lg:sticky lg:top-6 lg:self-start">
        <section class="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div class="flex items-start gap-3">
            <CheckCircleIcon v-if="isAccepted" class="mt-0.5 h-5 w-5 flex-shrink-0 text-status-success-text" />
            <ExclamationTriangleIcon v-else class="mt-0.5 h-5 w-5 flex-shrink-0 text-status-warning-text" />
            <div class="min-w-0">
              <h2 class="text-lg font-semibold leading-snug text-text-primary">{{ acceptanceTitle }}</h2>
              <p class="mt-1 text-sm leading-6 text-text-secondary">{{ acceptanceDescription }}</p>
            </div>
          </div>

          <div v-if="isAccepted" class="mt-4 rounded-lg bg-status-success-bg p-3 text-sm leading-6 text-status-success-text">
            <p>{{ t('terms.accepted') }}{{ acceptedVersionLabel }}{{ acceptedAtLabel }}.</p>
            <p v-if="isRedirectingAfterAccept" class="mt-2 inline-flex items-center gap-2">
              <UiLoadingDots size="7px" color="currentColor" />
              {{ t('terms.redirectingToPayment') }}
            </p>
          </div>

          <div v-else-if="hasTenantSession" class="mt-5 space-y-4">
            <label
              class="flex items-start gap-3 rounded-lg border border-border p-3 text-sm leading-6 text-text-secondary"
              :class="{ 'opacity-60': !canEnableReadCheckbox }"
            >
              <input
                v-model="hasConfirmedRead"
                type="checkbox"
                class="mt-1 h-4 w-4 flex-shrink-0 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed"
                :disabled="!canEnableReadCheckbox"
              />
              <span>
                {{ t('terms.readConfirmation', { version: document.version }) }}
              </span>
            </label>
            <p v-if="!canEnableReadCheckbox" class="text-xs leading-5 text-text-tertiary">
              {{ t('terms.readConfirmationHint') }}
            </p>

            <button
              type="button"
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              :disabled="!canAcceptTerms || !hasConfirmedRead || isAcceptingOrRedirecting"
              @click="handleAccept"
            >
              <UiLoadingDots v-if="isAcceptingOrRedirecting" size="7px" color="currentColor" />
              <CheckCircleIcon v-else class="h-4 w-4" />
              {{ isAcceptingOrRedirecting ? t('terms.registeringAcceptance') : t('terms.acceptTerms') }}
            </button>

            <p v-if="acceptErrorMessage" class="rounded-lg bg-status-critical-bg p-3 text-sm leading-6 text-status-critical-text">
              {{ acceptErrorMessage }}
            </p>
          </div>

          <NuxtLink
            v-if="isAccepted && returnTarget && !isRedirectingAfterAccept"
            :to="returnTarget"
            class="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          >
            {{ t('terms.continue') }}
            <ArrowLeftIcon class="h-4 w-4 rotate-180" />
          </NuxtLink>
        </section>
      </aside>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import { extractApiError } from '~/composables/useQueryError'
import type { LegalTermsDocument } from '~/composables/useLegalTerms'

// Global-auth legal exception: users must be able to review and accept terms
// before module-gated dashboard workflows are available.
definePageMeta({ layout: 'dashboard' })

/** Wait for iframe @load; if it never fires (common for cross-origin PDF viewers), unlock the checkbox anyway. */
const PDF_LOAD_FALLBACK_MS = 4000

const route = useRoute()
const toast = useToast()
const { t, locale } = useI18n({ useScope: 'global' })
const {
  currentDocument,
  statusData,
  hasTenantSession,
  isInitialLoading,
  isAccepting,
  acceptError,
  acceptTerms,
} = useLegalTerms()

const placeholderDocument: LegalTermsDocument = {
  version: '-',
  status: 'published',
  title: 'Términos y Condiciones de Uso de la Plataforma WARO',
  effective_date: null,
  source_url: null,
  annexes: [],
  sections: [],
}

const hasConfirmedRead = ref(false)
const hasPdfLoaded = ref(false)
const pdfLoadTimedOut = ref(false)
const acceptErrorMessage = ref('')
const hasAcceptedLocally = ref(false)
const isRedirectingAfterAccept = ref(false)
let pdfLoadTimer: ReturnType<typeof setTimeout> | null = null

const document = computed<LegalTermsDocument>(() => currentDocument.value ?? placeholderDocument)
const sourceUrl = computed(() => currentDocument.value?.source_url || '')
const isPdfDocument = computed(() => {
  if (!currentDocument.value || !sourceUrl.value) return false
  if (document.value.display_mode === 'pdf') return true
  return /\.pdf($|[?#])/i.test(sourceUrl.value)
})
const pdfViewerUrl = computed(() => {
  if (!sourceUrl.value) return ''
  const separator = sourceUrl.value.includes('#') ? '&' : '#'
  return `${sourceUrl.value}${separator}navpanes=0&toolbar=1&view=FitH`
})
const isDocumentLoading = computed(() => !currentDocument.value && isInitialLoading.value)
const isAccepted = computed(() => hasAcceptedLocally.value || statusData.value?.accepted === true)
const isAcceptingOrRedirecting = computed(() => isAccepting.value || isRedirectingAfterAccept.value)
const canAcceptTerms = computed(() => hasTenantSession.value && !!currentDocument.value && isPdfDocument.value)

/**
 * Why the checkbox was stuck disabled:
 * - Required hasPdfLoaded (iframe @load) AND hasEngagedWithPdf
 * - Engagement only via window.blur when activeElement === iframe
 * - Mobile / embedded PDF viewers almost never fire that blur path → permanently disabled
 * - No POST /legal/terms/accept reached the API
 *
 * Now: enable once the published PDF document is available. Explicit checkbox remains the consent gate.
 * Iframe load timeout only controls the fallback “open in new tab” message.
 */
const canEnableReadCheckbox = computed(() =>
  !isDocumentLoading.value && !!currentDocument.value && isPdfDocument.value,
)

const showPdfFallbackMessage = computed(() =>
  isPdfDocument.value && !hasPdfLoaded.value && pdfLoadTimedOut.value,
)

function clearPdfLoadTimer() {
  if (pdfLoadTimer) {
    clearTimeout(pdfLoadTimer)
    pdfLoadTimer = null
  }
}

function startPdfLoadTimer() {
  clearPdfLoadTimer()
  pdfLoadTimedOut.value = false
  if (!isPdfDocument.value || !sourceUrl.value) return
  pdfLoadTimer = setTimeout(() => {
    if (!hasPdfLoaded.value) pdfLoadTimedOut.value = true
  }, PDF_LOAD_FALLBACK_MS)
}

const markPdfLoaded = () => {
  hasPdfLoaded.value = true
  pdfLoadTimedOut.value = false
  clearPdfLoadTimer()
}

const returnTarget = computed(() => {
  const raw = Array.isArray(route.query.return) ? route.query.return[0] : route.query.return
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return ''
  return raw
})

const documentVersionLabel = computed(() => t('terms.versionLabel', { version: document.value.version }))
const documentStatusLabel = computed(() => document.value.status === 'draft' ? t('terms.draft') : t('terms.current'))
const documentStatusVariant = computed(() => document.value.status === 'draft' ? 'warning' : 'success')
const effectiveDateLabel = computed(() => formatDate(document.value.effective_date || document.value.published_at))
const acceptedVersionLabel = computed(() => statusData.value?.accepted_version ? t('terms.acceptedVersion', { version: statusData.value.accepted_version }) : '')
const acceptedAtLabel = computed(() => statusData.value?.accepted_at ? t('terms.acceptedAt', { date: formatDate(statusData.value.accepted_at) }) : '')

const acceptanceTitle = computed(() => {
  if (isAccepted.value) return t('terms.acceptanceRecorded')
  return t('terms.acceptancePending')
})

const acceptanceDescription = computed(() => {
  if (isAccepted.value) return t('terms.acceptanceRecordedDescription')
  return t('terms.acceptancePendingDescription')
})

watch(() => statusData.value?.accepted, (accepted) => {
  if (accepted) hasConfirmedRead.value = false
})

watch([currentDocument, isPdfDocument, sourceUrl], () => {
  hasPdfLoaded.value = false
  pdfLoadTimedOut.value = false
  hasConfirmedRead.value = false
  startPdfLoadTimer()
}, { immediate: true })

watch(acceptError, (err) => {
  if (!err) return
  acceptErrorMessage.value = extractApiError(err, t('terms.acceptanceError'))
})

onUnmounted(() => {
  clearPdfLoadTimer()
})

const handleAccept = async () => {
  acceptErrorMessage.value = ''
  isRedirectingAfterAccept.value = false
  try {
    await acceptTerms({ document_id: document.value.id, version: document.value.version })
    hasAcceptedLocally.value = true
    toast.success(t('terms.acceptanceRecorded'), { title: t('terms.title') })
    if (returnTarget.value) {
      isRedirectingAfterAccept.value = true
      await navigateTo(returnTarget.value)
    }
  } catch (err) {
    hasAcceptedLocally.value = false
    isRedirectingAfterAccept.value = false
    acceptErrorMessage.value = extractApiError(err, t('terms.acceptanceError'))
  }
}

function formatDate(value?: string | null) {
  if (!value) return t('terms.pendingPublication')
  return new Intl.DateTimeFormat(toNumberLocaleTag(locale.value), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

useHead({
  title: () => t('terms.pageTitle'),
  meta: [
    {
      name: 'description',
      content: t('terms.metaDescription'),
    },
    { name: 'robots', content: 'noindex, follow' },
  ],
})
</script>
