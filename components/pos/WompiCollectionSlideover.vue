<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[80] bg-overlay-backdrop/40"
        aria-hidden="true"
        @click="handleClose"
      />
    </Transition>

    <Transition name="panel">
      <div
        v-if="modelValue"
        class="fixed z-[81] flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto
               md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full
               md:border-s md:border-border"
        role="dialog"
        aria-modal="true"
        @click.stop
      >
        <div class="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0" aria-hidden="true">
          <div class="w-10 h-1 rounded-full bg-sheet-border" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
                aria-hidden="true"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  Cobro Wompi
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  El pago queda pendiente hasta que Wompi lo apruebe
                </p>
              </div>
            </div>
            <button
              type="button"
              @click="handleClose"
              aria-label="Cerrar cobro Wompi"
              class="flex-shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 transition-colors"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p v-if="errorMessage" class="text-sm text-state-danger-text" role="alert">{{ errorMessage }}</p>

          <div class="rounded-xl border border-border bg-background px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-text-tertiary font-semibold">Monto</p>
            <p class="text-lg font-bold text-text-primary mt-1">{{ formatCurrency(amount) }}</p>
          </div>

          <div
            v-if="creating"
            class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-4 py-10"
            aria-busy="true"
            aria-live="polite"
          >
            <UiLoadingMatrix size="8px" />
            <p class="text-sm text-text-secondary">Generando enlace de cobro…</p>
          </div>

          <template v-else>
            <label class="block">
              <span class="text-sm font-medium text-text-primary">Correo del comensal</span>
              <input
                v-model="emailDraft"
                type="email"
                autocomplete="email"
                class="mt-1.5 w-full px-3 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base"
                placeholder="correo@ejemplo.com"
              />
              <span class="mt-1 block text-xs text-text-tertiary">
                Obligatorio para enviar el enlace. Copiar no requiere correo.
              </span>
            </label>

            <div v-if="landingUrl" class="rounded-xl border border-dashed border-border px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-text-tertiary font-semibold">Enlace WARO</p>
              <p class="mt-1 text-sm break-all text-text-primary">{{ landingUrl }}</p>
            </div>

            <p v-if="waiting" class="text-sm text-text-secondary">
              Esperando aprobación de Wompi. No marques esta venta como pagada.
            </p>
          </template>
        </div>

        <div class="flex-shrink-0 border-t border-border px-6 py-4 space-y-2">
          <button
            type="button"
            class="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            :disabled="creating || !landingUrl"
            @click="copyLandingUrl"
          >
            {{ copied ? 'Enlace copiado' : 'Copiar enlace WARO' }}
          </button>
          <button
            type="button"
            class="w-full min-h-[44px] rounded-xl border border-border font-semibold text-text-primary disabled:opacity-50"
            :disabled="creating || !canSend"
            @click="sendLandingUrl"
          >
            Enviar por correo
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  isValidCollectionEmail,
  waroCollectionLandingUrl,
  waroCollectionThankYouUrl,
} from '~/utils/wompiCollections'

const props = defineProps<{
  modelValue: boolean
  orderId: string | null
  amount: number
  customerId?: string | null
  email?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  approved: []
  error: [message: string]
}>()

const { formatCurrency } = useFormatters()
const { siteUrl } = usePublicSiteUrl()
const siteOrigin = siteUrl

const emailDraft = ref('')
const sessionId = ref<string | null>(null)
const creating = ref(false)
const waiting = ref(false)
const copied = ref(false)
const errorMessage = ref('')

const landingUrl = computed(() => (
  sessionId.value ? waroCollectionLandingUrl(siteOrigin.value, sessionId.value) : ''
))
const canSend = computed(() => Boolean(landingUrl.value && isValidCollectionEmail(emailDraft.value)))

const handleClose = () => {
  emit('update:modelValue', false)
}

async function createSession () {
  if (!props.orderId || creating.value || sessionId.value) return
  creating.value = true
  errorMessage.value = ''
  try {
    const email = isValidCollectionEmail(emailDraft.value) ? emailDraft.value.trim() : undefined
    const res = await $fetch<{ success: boolean; data: { id: string } }>('/api/collections/sessions', {
      method: 'POST',
      body: {
        orderId: props.orderId,
        amount: props.amount,
        customerId: props.customerId || undefined,
        linkEmail: email,
        redirectUrl: waroCollectionThankYouUrl(siteOrigin.value, '{sessionId}'),
      },
    })
    sessionId.value = res.data.id
    waiting.value = true
  } catch (error: any) {
    const message = error?.data?.message || error?.data?.detail || error?.message || 'No se pudo crear el cobro Wompi'
    errorMessage.value = typeof message === 'string' ? message : 'No se pudo crear el cobro Wompi'
    emit('error', errorMessage.value)
  } finally {
    creating.value = false
  }
}

async function copyLandingUrl () {
  if (!landingUrl.value) return
  try {
    await navigator.clipboard.writeText(landingUrl.value)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 2000)
  } catch {
    errorMessage.value = 'No se pudo copiar el enlace'
  }
}

function sendLandingUrl () {
  if (!canSend.value || !landingUrl.value) return
  const subject = encodeURIComponent('Paga tu cuenta en el restaurante')
  const body = encodeURIComponent(`Usa este enlace de WARO para pagar:\n${landingUrl.value}`)
  window.location.href = `mailto:${emailDraft.value.trim()}?subject=${subject}&body=${body}`
}

watch(() => props.modelValue, (open) => {
  if (!open) {
    sessionId.value = null
    waiting.value = false
    copied.value = false
    errorMessage.value = ''
    return
  }
  emailDraft.value = props.email || ''
  void createSession()
})

watch(() => props.email, (value) => {
  if (!sessionId.value) emailDraft.value = value || ''
})
</script>
