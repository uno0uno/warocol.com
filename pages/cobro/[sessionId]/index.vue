<template>
  <main class="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10">
    <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center space-y-4">
      <h1 class="text-xl font-bold text-text-primary">Pagar en el restaurante</h1>
      <p class="text-sm text-text-secondary">
        Serás enviado a Wompi para completar el pago. WARO no recibe tu dinero.
      </p>
      <p v-if="errorMessage" class="text-sm text-state-danger-text" role="alert">{{ errorMessage }}</p>
      <div
        v-else
        class="flex flex-col items-center justify-center gap-3 py-6"
        aria-busy="true"
        aria-live="polite"
      >
        <UiLoadingMatrix size="8px" />
        <p class="text-sm text-text-secondary">
          {{ approved ? 'Este cobro ya fue aprobado.' : 'Abriendo Wompi…' }}
        </p>
      </div>
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
const router = useRouter()
const sessionId = computed(() => String(route.params.sessionId || ''))

const errorMessage = ref('')
const approved = ref(false)

onMounted(async () => {
  if (!sessionId.value) {
    errorMessage.value = 'Cobro no encontrado'
    return
  }
  try {
    const res = await $fetch<{ success: boolean; data: { checkoutUrl: string; status: string } }>(
      `/api/collections/sessions/${sessionId.value}`,
    )
    approved.value = res.data.status === 'approved'
    if (approved.value) {
      await router.replace(`/cobro/${sessionId.value}/gracias`)
      return
    }
    const checkoutUrl = res.data.checkoutUrl
    if (!checkoutUrl) {
      errorMessage.value = 'No encontramos este cobro'
      return
    }
    window.location.href = checkoutUrl
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.data?.detail || 'No encontramos este cobro'
  }
})
</script>
