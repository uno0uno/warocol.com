<template>
  <main class="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10">
    <div
      v-if="verifying"
      class="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md text-center space-y-4"
      aria-busy="true"
      aria-live="polite"
    >
      <CommonsTheCustomLoader size="large" />
      <h1 class="text-xl font-bold text-text-primary">Estamos confirmando tu pago</h1>
      <p class="text-sm text-text-secondary">
        Si Wompi ya aprobó el cobro, espera un momento. Confirmando…
      </p>
    </div>

    <div
      v-else
      class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center space-y-4"
    >
      <div
        class="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center"
        :class="status === 'approved' ? 'bg-state-success-bg text-state-success-text' : 'bg-primary/10 text-primary'"
        aria-hidden="true"
      >
        <svg
          v-if="status === 'approved'"
          class="w-6 h-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <svg
          v-else
          class="w-6 h-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <h1 class="text-xl font-bold text-text-primary">{{ title }}</h1>
      <p class="text-sm text-text-secondary">{{ description }}</p>
      <p v-if="errorMessage" class="text-sm text-state-danger-text" role="alert">{{ errorMessage }}</p>
      <button
        v-if="status !== 'approved'"
        type="button"
        class="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-border font-semibold text-text-primary transition-all duration-150 hover:bg-surface-secondary active:scale-[0.98] disabled:opacity-50"
        @click="verify"
      >
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
        </svg>
        Volver a comprobar
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  publicAccess: true,
  robots: 'noindex, nofollow',
})

const route = useRoute()
const sessionId = computed(() => String(route.params.sessionId || ''))
const transactionId = computed(() => {
  const raw = route.query.id ?? route.query.transactionId
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? String(value) : ''
})

const verifying = ref(false)
const status = ref('pending')
const errorMessage = ref('')

const title = computed(() => (
  status.value === 'approved' ? 'Pago recibido' : 'Estamos confirmando tu pago'
))
const description = computed(() => (
  status.value === 'approved'
    ? 'El restaurante ya puede ver tu pago. Puedes cerrar esta página.'
    : 'Si Wompi ya aprobó el cobro, espera un momento o vuelve a comprobar.'
))

async function verify () {
  if (!sessionId.value || verifying.value) return
  verifying.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: { status?: string } }>(
      `/api/collections/sessions/${sessionId.value}/verify`,
      {
        method: 'POST',
        body: transactionId.value ? { transactionId: transactionId.value } : {},
      },
    )
    status.value = String(res.data?.status || 'pending').toLowerCase()
  } catch (error: any) {
    errorMessage.value = error?.data?.detail || error?.data?.message || 'No pudimos confirmar el pago todavía'
  } finally {
    verifying.value = false
  }
}

onMounted(() => {
  void verify()
})
</script>
