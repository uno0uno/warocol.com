<template>
  <div class="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section class="min-w-0">
        <div class="space-y-6 rounded-xl border border-border bg-surface-secondary/70 p-4 sm:p-6">
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
                Documento contractual para el uso de la plataforma WARO. Revisa la versión vigente, los anexos aplicables y la referencia de tratamiento de datos antes de aceptar.
              </p>
            </div>
          </div>

          <section class="grid gap-3 sm:grid-cols-3" aria-label="Resumen del documento">
            <div class="rounded-lg border border-border bg-surface p-4">
              <p class="text-xs font-medium uppercase text-text-tertiary">Versión vigente</p>
              <p class="mt-2 text-lg font-semibold text-text-primary">{{ document.version }}</p>
            </div>
            <div class="rounded-lg border border-border bg-surface p-4">
              <p class="text-xs font-medium uppercase text-text-tertiary">Fecha de vigencia</p>
              <p class="mt-2 text-lg font-semibold text-text-primary">{{ effectiveDateLabel }}</p>
            </div>
            <div class="rounded-lg border border-border bg-surface p-4">
              <p class="text-xs font-medium uppercase text-text-tertiary">Formato</p>
              <p class="mt-2 text-lg font-semibold text-text-primary">PDF</p>
            </div>
          </section>

          <section id="documento" class="rounded-lg border border-border bg-surface p-4 sm:p-6">
            <div class="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="space-y-1">
                <h2 class="text-xl font-semibold text-text-primary">Documento legal</h2>
                <p class="text-sm leading-6 text-text-secondary">
                  El documento vigente se carga desde el registro legal versionado.
                </p>
              </div>
            </div>

            <div v-if="isDocumentLoading" class="flex min-h-64 items-center justify-center">
              <div class="flex items-center gap-3 text-sm text-text-secondary">
                <span>Cargando términos</span>
                <CommonsInlineDots aria-label="Cargando términos" :size="5" />
              </div>
            </div>

            <div v-else class="mt-6">
              <div v-if="isPdfDocument" class="overflow-hidden rounded-lg border border-border bg-surface-secondary">
                <iframe
                  :src="pdfViewerUrl"
                  title="Términos y Condiciones WARO Colombia"
                  class="h-[72vh] min-h-[640px] w-full bg-white"
                />
              </div>

              <div v-else class="rounded-lg border border-status-warning-text/30 bg-status-warning-bg p-4 text-sm leading-6 text-status-warning-text">
                No se pudo cargar el PDF vigente de términos y condiciones.
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
            <p>Aceptado{{ acceptedVersionLabel }}{{ acceptedAtLabel }}.</p>
            <p v-if="isRedirectingAfterAccept" class="mt-2 inline-flex items-center gap-2">
              <UiLoadingDots size="7px" color="currentColor" />
              Redirigiendo al pago
            </p>
          </div>

          <div v-else-if="hasTenantSession" class="mt-5 space-y-4">
            <label class="flex items-start gap-3 rounded-lg border border-border p-3 text-sm leading-6 text-text-secondary">
              <input
                v-model="hasConfirmedRead"
                type="checkbox"
                class="mt-1 h-4 w-4 flex-shrink-0 rounded border-border text-primary focus:ring-primary"
              />
              <span>
                He leído el PDF vigente de Términos y Condiciones versión {{ document.version }}.
              </span>
            </label>

            <button
              type="button"
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              :disabled="!canAcceptTerms || !hasConfirmedRead || isAcceptingOrRedirecting"
              @click="handleAccept"
            >
              <UiLoadingDots v-if="isAcceptingOrRedirecting" size="7px" color="currentColor" />
              <CheckCircleIcon v-else class="h-4 w-4" />
              {{ isAcceptingOrRedirecting ? 'Registrando aceptación' : 'Aceptar términos' }}
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
            Continuar
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

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const toast = useToast()
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
const acceptErrorMessage = ref('')
const hasAcceptedLocally = ref(false)
const isRedirectingAfterAccept = ref(false)

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
const returnTarget = computed(() => {
  const raw = Array.isArray(route.query.return) ? route.query.return[0] : route.query.return
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return ''
  return raw
})

const documentVersionLabel = computed(() => `Versión ${document.value.version}`)
const documentStatusLabel = computed(() => document.value.status === 'draft' ? 'Borrador' : 'Vigente')
const documentStatusVariant = computed(() => document.value.status === 'draft' ? 'warning' : 'success')
const effectiveDateLabel = computed(() => formatDate(document.value.effective_date || document.value.published_at))
const acceptedVersionLabel = computed(() => statusData.value?.accepted_version ? ` versión ${statusData.value.accepted_version}` : '')
const acceptedAtLabel = computed(() => statusData.value?.accepted_at ? ` el ${formatDate(statusData.value.accepted_at)}` : '')

const acceptanceTitle = computed(() => {
  if (isAccepted.value) return 'Aceptación registrada'
  return 'Aceptación pendiente'
})

const acceptanceDescription = computed(() => {
  if (isAccepted.value) return 'Tu establecimiento ya aceptó la versión vigente registrada para estos términos.'
  return 'Marca la casilla solo después de revisar el PDF vigente.'
})

watch(() => statusData.value?.accepted, (accepted) => {
  if (accepted) hasConfirmedRead.value = false
})

watch(acceptError, (err) => {
  if (!err) return
  acceptErrorMessage.value = extractApiError(err, 'No se pudo registrar la aceptación.')
})

const handleAccept = async () => {
  acceptErrorMessage.value = ''
  isRedirectingAfterAccept.value = false
  try {
    await acceptTerms({ document_id: document.value.id, version: document.value.version })
    hasAcceptedLocally.value = true
    toast.success('Aceptación registrada', { title: 'Términos y Condiciones' })
    if (returnTarget.value) {
      isRedirectingAfterAccept.value = true
      await navigateTo(returnTarget.value)
    }
  } catch (err) {
    hasAcceptedLocally.value = false
    isRedirectingAfterAccept.value = false
    acceptErrorMessage.value = extractApiError(err, 'No se pudo registrar la aceptación.')
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'Pendiente de publicación'
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

useHead({
  title: 'Términos y Condiciones — WARO Colombia',
  meta: [
    {
      name: 'description',
      content: 'Consulta el PDF vigente de los Términos y Condiciones de WARO Colombia y registra su aceptación explícita.',
    },
    { name: 'robots', content: 'noindex, follow' },
  ],
})
</script>
