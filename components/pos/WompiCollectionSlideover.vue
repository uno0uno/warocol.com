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
                  {{ paid ? 'Wompi ya aprobó este cobro.' : 'El comensal paga en Wompi. Esta venta sigue pendiente.' }}
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

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p v-if="errorMessage" class="text-sm text-state-danger-text" role="alert">{{ errorMessage }}</p>

          <div
            v-if="creating"
            class="flex items-center justify-center min-h-[280px]"
            aria-busy="true"
            aria-live="polite"
          >
            <CommonsTheCustomLoader size="large" />
          </div>

          <template v-else>
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-text-primary">Estado</p>
              <UiStatusBadge :variant="paid ? 'success' : 'warning'">
                {{ paid ? 'Pago recibido' : 'Pendiente en Wompi' }}
              </UiStatusBadge>
            </div>

            <dl class="rounded-xl border border-border bg-background px-4 py-3">
              <dt class="text-xs uppercase tracking-wide text-text-tertiary font-semibold">A cobrar</dt>
              <dd class="text-2xl font-bold text-text-primary mt-1 tabular-nums">{{ formatCurrency(amount) }}</dd>
            </dl>

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
                Solo hace falta si vas a enviar el enlace. Copiar no pide correo.
              </span>
            </label>

            <div v-if="landingUrl" class="rounded-xl border border-border bg-surface-secondary/40 px-4 py-3 space-y-1">
              <p class="text-xs uppercase tracking-wide text-text-tertiary font-semibold">Enlace para el comensal</p>
              <p class="text-sm break-all text-text-primary font-medium">{{ landingUrl }}</p>
              <p class="text-xs text-text-tertiary leading-relaxed">
                Ábrelo en el celular del comensal o cópialo. Si Wompi dice que el link no está disponible, genera uno nuevo abajo.
              </p>
            </div>
          </template>
        </div>

        <div class="flex-shrink-0 border-t border-border px-6 py-4 space-y-2">
          <button
            type="button"
            class="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold transition-all duration-150 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            :disabled="creating || !landingUrl"
            @click="copyLandingUrl"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75m9 10.5V7.875c0-.621-.504-1.125-1.125-1.125H9.375c-.621 0-1.125.504-1.125 1.125v9.375m9 0h1.5a1.125 1.125 0 0 0 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125h-3.375m-6.75 0H6.375c-.621 0-1.125.504-1.125 1.125v1.5" />
            </svg>
            {{ copied ? 'Enlace copiado' : 'Copiar enlace' }}
          </button>
          <button
            type="button"
            class="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-border font-semibold text-text-primary transition-all duration-150 hover:bg-surface-secondary active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            :disabled="creating || !canSend"
            @click="sendLandingUrl"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            Enviar por correo
          </button>
          <button
            v-if="sessionId && !paid"
            type="button"
            class="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-border font-semibold text-text-primary transition-all duration-150 hover:bg-surface-secondary active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            :disabled="creating || verifying"
            @click="verifySession"
          >
            <CommonsTheCustomLoader v-if="verifying" size="small" :show-phrase="false" />
            <svg
              v-else
              class="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {{ verifying ? 'Confirmando…' : 'Comprobar pago' }}
          </button>
          <button
            v-if="sessionId && !paid"
            type="button"
            class="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-text-secondary transition-all duration-150 hover:text-text-primary hover:bg-surface-secondary active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            :disabled="creating || verifying"
            @click="regenerateSession"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Generar enlace nuevo
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { subscribeOrderPaymentApproved } from '~/composables/useNotifications'
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
const verifying = ref(false)
const copied = ref(false)
const paid = ref(false)
const errorMessage = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null
let unsubscribeApproved: (() => void) | null = null

const landingUrl = computed(() => (
  sessionId.value ? waroCollectionLandingUrl(siteOrigin.value, sessionId.value) : ''
))
const canSend = computed(() => Boolean(landingUrl.value && isValidCollectionEmail(emailDraft.value)))

const sessionBody = () => ({
  orderId: props.orderId,
  amount: props.amount,
  customerId: props.customerId || undefined,
  linkEmail: isValidCollectionEmail(emailDraft.value) ? emailDraft.value.trim() : undefined,
  redirectUrl: waroCollectionThankYouUrl(siteOrigin.value, '{sessionId}'),
})

const handleClose = () => {
  emit('update:modelValue', false)
}

function markApproved () {
  if (paid.value) return
  paid.value = true
  emit('approved')
}

async function pollSessionStatus () {
  if (!props.orderId || paid.value) return
  try {
    const res = await $fetch<{ success: boolean; data: { id?: string; status?: string } }>(
      '/api/collections/sessions',
      { query: { orderId: props.orderId } },
    )
    const status = String(res.data?.status || '').toLowerCase()
    if (res.data?.id) sessionId.value = res.data.id
    if (status === 'approved') markApproved()
  } catch {
    /* still pending or session not created yet */
  }
}

function stopWatchingApproval () {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  unsubscribeApproved?.()
  unsubscribeApproved = null
}

function startWatchingApproval () {
  stopWatchingApproval()
  unsubscribeApproved = subscribeOrderPaymentApproved((payload) => {
    if (payload.order_id && payload.order_id === props.orderId) markApproved()
  })
  void pollSessionStatus()
  pollTimer = setInterval(() => { void pollSessionStatus() }, 2500)
}

async function verifySession () {
  if (!sessionId.value || verifying.value || paid.value) return
  verifying.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{ success: boolean; data: { applied?: boolean; status?: string } }>(
      `/api/collections/sessions/${sessionId.value}/verify`,
      { method: 'POST', body: {} },
    )
    const status = String(result.data?.status || '').toLowerCase()
    if (result.data?.applied || status === 'approved') {
      markApproved()
      return
    }
    errorMessage.value = 'Wompi aún no aprueba este cobro'
  } catch (error: any) {
    const message = error?.data?.detail || error?.data?.message || error?.message || 'No se pudo comprobar el pago'
    errorMessage.value = typeof message === 'string' ? message : 'No se pudo comprobar el pago'
  } finally {
    verifying.value = false
  }
}

async function createSession () {
  if (!props.orderId || creating.value || sessionId.value) return
  creating.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: { id: string } }>('/api/collections/sessions', {
      method: 'POST',
      body: sessionBody(),
    })
    sessionId.value = res.data.id
  } catch (error: any) {
    const message = error?.data?.message || error?.data?.detail || error?.message || 'No se pudo crear el cobro Wompi'
    errorMessage.value = typeof message === 'string' ? message : 'No se pudo crear el cobro Wompi'
    emit('error', errorMessage.value)
  } finally {
    creating.value = false
  }
}

async function regenerateSession () {
  if (!props.orderId || creating.value) return
  creating.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: { id: string } }>('/api/collections/sessions/regenerate', {
      method: 'POST',
      body: sessionBody(),
    })
    sessionId.value = res.data.id
    copied.value = false
  } catch (error: any) {
    const message = error?.data?.message || error?.data?.detail || error?.message || 'No se pudo generar un enlace nuevo'
    errorMessage.value = typeof message === 'string' ? message : 'No se pudo generar un enlace nuevo'
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
    stopWatchingApproval()
    sessionId.value = null
    copied.value = false
    paid.value = false
    verifying.value = false
    errorMessage.value = ''
    return
  }
  emailDraft.value = props.email || ''
  startWatchingApproval()
  void createSession()
})

watch(() => props.email, (value) => {
  if (!sessionId.value) emailDraft.value = value || ''
})

onUnmounted(() => {
  stopWatchingApproval()
})
</script>
