<template>
  <main class="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10">
    <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center space-y-4">
      <h1 class="text-xl font-bold text-text-primary">{{ title }}</h1>
      <p class="text-sm text-text-secondary">{{ description }}</p>
      <p v-if="errorMessage" class="text-sm text-state-danger-text" role="alert">{{ errorMessage }}</p>
      <button
        v-if="status !== 'approved'"
        type="button"
        class="w-full min-h-[44px] rounded-xl border border-border font-semibold text-text-primary disabled:opacity-50"
        :disabled="verifying"
        @click="verify"
      >
        {{ verifying ? 'Confirmando…' : 'Volver a comprobar' }}
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
