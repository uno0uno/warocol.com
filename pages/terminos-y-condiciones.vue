<template>
  <main class="min-h-screen bg-background text-text-primary">
    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <NuxtLink to="/" class="inline-flex items-center gap-3 text-text-primary">
          <span class="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            W
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-semibold leading-tight">WARO Colombia</span>
            <span class="block text-xs text-text-secondary">Términos y Condiciones</span>
          </span>
        </NuxtLink>

        <div class="flex flex-wrap items-center gap-2">
          <NuxtLink
            v-if="returnTarget"
            :to="returnTarget"
            class="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          >
            <ArrowLeftIcon class="h-4 w-4" />
            Volver
          </NuxtLink>
          <NuxtLink
            v-if="!hasTenantSession"
            :to="loginRedirect"
            class="inline-flex min-h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Iniciar sesión
          </NuxtLink>
        </div>
      </div>
    </header>

    <div class="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
      <section class="min-w-0 space-y-6">
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
            <p class="text-xs font-medium uppercase text-text-tertiary">Anexos aplicables</p>
            <p class="mt-2 text-lg font-semibold text-text-primary">{{ applicableAnnexes.length }}</p>
          </div>
        </section>

        <section id="documento" class="rounded-lg border border-border bg-surface p-4 sm:p-6">
          <div class="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-1">
              <h2 class="text-xl font-semibold text-text-primary">Documento legal</h2>
              <p class="text-sm leading-6 text-text-secondary">
                El contenido se carga desde el registro legal versionado cuando está disponible.
              </p>
            </div>
            <a
              v-if="document.source_url"
              :href="document.source_url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              <DocumentTextIcon class="h-4 w-4" />
              Fuente
              <ArrowTopRightOnSquareIcon class="h-4 w-4" />
            </a>
          </div>

          <div v-if="isInitialLoading" class="flex min-h-64 items-center justify-center">
            <div class="flex items-center gap-3 text-sm text-text-secondary">
              <UiLoadingDots size="8px" color="currentColor" />
              Cargando términos
            </div>
          </div>

          <div v-else class="mt-6 space-y-6">
            <div v-if="usesFallbackDocument" class="rounded-lg border border-status-warning-text/30 bg-status-warning-bg p-4 text-sm leading-6 text-status-warning-text">
              La versión editable del backend legal todavía no está disponible. Esta página muestra una base renderizable del borrador local `TyC_WARO_v1.0_BORRADOR.pdf`; la aceptación se registrará contra la versión indicada por el endpoint cuando esté activo.
            </div>

            <div v-if="document.body_html" class="legal-html" v-html="document.body_html" />

            <div v-else class="space-y-5">
              <article
                v-for="section in document.sections"
                :id="section.id"
                :key="section.id || section.title"
                class="scroll-mt-6 border-b border-border pb-5 last:border-b-0 last:pb-0"
              >
                <h3 class="text-lg font-semibold leading-snug text-text-primary">{{ section.title }}</h3>
                <p class="mt-2 whitespace-pre-line text-sm leading-7 text-text-secondary">{{ section.body }}</p>
              </article>
            </div>
          </div>
        </section>

        <section id="anexos" class="space-y-3">
          <div>
            <h2 class="text-xl font-semibold text-text-primary">Anexos y política de datos</h2>
            <p class="mt-1 text-sm leading-6 text-text-secondary">
              Estos elementos forman parte de la lectura previa a la aceptación.
            </p>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <article
              v-for="annex in applicableAnnexes"
              :key="annex.id || annex.title"
              class="rounded-lg border border-border bg-surface p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <h3 class="text-base font-semibold leading-snug text-text-primary">{{ annex.title }}</h3>
                <UiStatusBadge v-if="annex.version" :value="annex.version" variant="secondary" size="sm" />
              </div>
              <p v-if="annex.description" class="mt-2 text-sm leading-6 text-text-secondary">{{ annex.description }}</p>
            </article>

            <article id="politica-datos-personales" class="rounded-lg border border-border bg-surface p-4">
              <div class="flex items-start justify-between gap-3">
                <h3 class="text-base font-semibold leading-snug text-text-primary">Política de Tratamiento de Datos Personales</h3>
                <UiStatusBadge value="Referencia" variant="info" size="sm" />
              </div>
              <p class="mt-2 text-sm leading-6 text-text-secondary">
                La aceptación de los términos debe leerse junto con la política de tratamiento de datos personales publicada por WARO.
              </p>
              <a
                :href="privacyPolicyUrl"
                class="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
              >
                Ver política
                <ArrowTopRightOnSquareIcon v-if="isExternalPrivacyPolicy" class="h-4 w-4" />
              </a>
            </article>
          </div>
        </section>
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
          </div>

          <div v-else-if="hasTenantSession" class="mt-5 space-y-4">
            <label class="flex items-start gap-3 rounded-lg border border-border p-3 text-sm leading-6 text-text-secondary">
              <input
                v-model="hasConfirmedRead"
                type="checkbox"
                class="mt-1 h-4 w-4 flex-shrink-0 rounded border-border text-primary focus:ring-primary"
              />
              <span>
                He leído la versión {{ document.version }}, sus anexos aplicables y la referencia de tratamiento de datos personales.
              </span>
            </label>

            <button
              type="button"
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              :disabled="!hasConfirmedRead || isAccepting"
              @click="handleAccept"
            >
              <UiLoadingDots v-if="isAccepting" size="7px" color="currentColor" />
              <CheckCircleIcon v-else class="h-4 w-4" />
              {{ isAccepting ? 'Registrando aceptación' : 'Aceptar términos' }}
            </button>

            <p v-if="acceptErrorMessage" class="rounded-lg bg-status-critical-bg p-3 text-sm leading-6 text-status-critical-text">
              {{ acceptErrorMessage }}
            </p>
          </div>

          <div v-else class="mt-5 space-y-3">
            <NuxtLink
              :to="loginRedirect"
              class="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Iniciar sesión para aceptar
            </NuxtLink>
            <p class="text-xs leading-5 text-text-tertiary">
              Puedes leer el documento sin iniciar sesión. La aceptación requiere un establecimiento activo.
            </p>
          </div>

          <NuxtLink
            v-if="isAccepted && returnTarget"
            :to="returnTarget"
            class="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          >
            Continuar
            <ArrowLeftIcon class="h-4 w-4 rotate-180" />
          </NuxtLink>
        </section>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import { extractApiError } from '~/composables/useQueryError'
import type { LegalTermsDocument } from '~/composables/useLegalTerms'

definePageMeta({ layout: false, publicAccess: true })

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

const fallbackDocument: LegalTermsDocument = {
  version: 'v1.0-borrador',
  status: 'draft',
  title: 'Términos y Condiciones de Uso de la Plataforma WARO',
  effective_date: null,
  privacy_policy_url: '#politica-datos-personales',
  source_url: null,
  annexes: [
    {
      id: 'facturacion-electronica',
      title: 'Anexo de Facturación Electrónica',
      version: 'v1.0',
      applies: true,
      description: 'Define el rol de WARO frente a MATÍAS API, DIAN, firma digital y emisión de documentos electrónicos.',
    },
    {
      id: 'servicios-complementarios',
      title: 'Anexo de Servicios Complementarios',
      version: 'v1.0',
      applies: true,
      description: 'Cubre billetera digital, consumos adicionales, procesamiento con IA y servicios debitables fuera del plan base.',
    },
  ],
  sections: [
    {
      id: 'partes',
      title: 'Identificación de las partes',
      body: 'El proveedor opera la plataforma tecnológica WARO disponible en warocol.com. El establecimiento es la persona natural o jurídica que adquiere uno o más planes de suscripción y cuyos datos se capturan electrónicamente al registrarse y aceptar estos términos.',
    },
    {
      id: 'aceptacion',
      title: 'Aceptación digital',
      body: 'La contratación y uso de WARO está condicionada a la aceptación previa, expresa e informada. La plataforma debe conservar evidencia electrónica de aceptación, incluyendo establecimiento, documento de identificación, correo, fecha y hora, IP de origen y versión aceptada.',
    },
    {
      id: 'servicio',
      title: 'Objeto y naturaleza del servicio',
      body: 'WARO concede una licencia no exclusiva, no transferible y limitada a la vigencia del plan contratado para usar la plataforma SaaS de gestión gastronómica: POS, mesas, comandas, domicilios, inventario, recetas, QR, reportes y módulos habilitados por plan.',
    },
    {
      id: 'facturacion',
      title: 'Facturación electrónica y proveedor tecnológico aliado',
      body: 'WARO integra funcionalidades de facturación electrónica mediante un proveedor tecnológico aliado. La emisión, transmisión, validación y respuesta ante la DIAN dependen de esa integración y de los sistemas externos involucrados.',
    },
    {
      id: 'planes',
      title: 'Planes, precios y cobro',
      body: 'Los planes se contratan en modalidad anual anticipada. El borrador base describe un Plan Básico y un Plan con Facturación Electrónica, además de reglas de renovación, precio, pasarelas de pago y posibles servicios complementarios.',
    },
    {
      id: 'datos',
      title: 'Datos personales y contenido del establecimiento',
      body: 'El tratamiento de datos personales y el contenido cargado por el establecimiento deben leerse junto con la política de tratamiento de datos personales de WARO y los anexos aplicables publicados para la versión vigente.',
    },
    {
      id: 'soporte',
      title: 'Disponibilidad, soporte y responsabilidades',
      body: 'El documento base define alcance de soporte, continuidad del servicio, propiedad intelectual, responsabilidades, causales de terminación y condiciones generales de uso de la plataforma.',
    },
  ],
}

const hasConfirmedRead = ref(false)
const acceptErrorMessage = ref('')

const document = computed<LegalTermsDocument>(() => currentDocument.value ?? fallbackDocument)
const usesFallbackDocument = computed(() => !currentDocument.value)
const applicableAnnexes = computed(() => (document.value.annexes ?? []).filter(annex => annex.applies !== false))
const isAccepted = computed(() => statusData.value?.accepted === true)
const returnTarget = computed(() => {
  const raw = Array.isArray(route.query.return) ? route.query.return[0] : route.query.return
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return ''
  return raw
})

const loginRedirect = computed(() => {
  const path = route.fullPath || '/terminos-y-condiciones'
  return `/auth/login?redirect=${encodeURIComponent(path)}`
})

const privacyPolicyUrl = computed(() => document.value.privacy_policy_url || '#politica-datos-personales')
const isExternalPrivacyPolicy = computed(() => /^https?:\/\//.test(privacyPolicyUrl.value))
const documentVersionLabel = computed(() => `Versión ${document.value.version}`)
const documentStatusLabel = computed(() => document.value.status === 'draft' ? 'Borrador' : 'Vigente')
const documentStatusVariant = computed(() => document.value.status === 'draft' ? 'warning' : 'success')
const effectiveDateLabel = computed(() => formatDate(document.value.effective_date || document.value.published_at))
const acceptedVersionLabel = computed(() => statusData.value?.accepted_version ? ` versión ${statusData.value.accepted_version}` : '')
const acceptedAtLabel = computed(() => statusData.value?.accepted_at ? ` el ${formatDate(statusData.value.accepted_at)}` : '')

const acceptanceTitle = computed(() => {
  if (isAccepted.value) return 'Aceptación registrada'
  if (hasTenantSession.value) return 'Aceptación pendiente'
  return 'Lectura pública'
})

const acceptanceDescription = computed(() => {
  if (isAccepted.value) return 'Tu establecimiento ya aceptó la versión vigente registrada para estos términos.'
  if (hasTenantSession.value) return 'Marca la casilla solo después de revisar la versión vigente, los anexos y la política de datos.'
  return 'Inicia sesión con un establecimiento activo para registrar la aceptación de la versión vigente.'
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
  try {
    await acceptTerms({ document_id: document.value.id, version: document.value.version })
    toast.success('Aceptación registrada', { title: 'Términos y Condiciones' })
    if (returnTarget.value) await navigateTo(returnTarget.value)
  } catch (err) {
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
      content: 'Consulta la versión vigente de los Términos y Condiciones de WARO Colombia, anexos aplicables y aceptación explícita.',
    },
    { name: 'robots', content: 'noindex, follow' },
  ],
})
</script>

<style scoped>
.legal-html :deep(h1),
.legal-html :deep(h2),
.legal-html :deep(h3) {
  margin-top: 1.5rem;
  color: hsl(var(--text-primary));
  font-weight: 700;
  line-height: 1.25;
}

.legal-html :deep(h1) {
  font-size: 1.875rem;
}

.legal-html :deep(h2) {
  font-size: 1.25rem;
}

.legal-html :deep(h3) {
  font-size: 1.125rem;
}

.legal-html :deep(p),
.legal-html :deep(li) {
  color: hsl(var(--text-secondary));
  font-size: 0.875rem;
  line-height: 1.75;
}

.legal-html :deep(ul),
.legal-html :deep(ol) {
  margin-top: 0.75rem;
  padding-left: 1.25rem;
}
</style>
