<template>
  <main class="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10">
    <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center space-y-4">
      <h1 class="text-xl font-bold text-text-primary">Pagar en el restaurante</h1>
      <p class="text-sm text-text-secondary">
        Serás enviado a Wompi para completar el pago. WARO no recibe tu dinero.
      </p>
      <p v-if="errorMessage" class="text-sm text-state-danger-text" role="alert">{{ errorMessage }}</p>
      <p v-else-if="loading" class="text-sm text-text-secondary">Cargando cobro…</p>
      <p v-else-if="approved" class="text-sm text-state-success-text">Este cobro ya fue aprobado.</p>
      <button
        v-else
        type="button"
        class="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
        :disabled="!checkoutUrl"
        @click="goToWompi"
      >
        Continuar a Wompi
      </button>
      <NuxtLink
        v-if="approved"
        :to="`/cobro/${sessionId}/gracias`"
        class="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-border px-4 font-semibold text-text-primary"
      >
        Ver confirmación
      </NuxtLink>
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

const loading = ref(true)
const errorMessage = ref('')
const checkoutUrl = ref('')
const approved = ref(false)

const goToWompi = () => {
  if (!checkoutUrl.value) return
  window.location.href = checkoutUrl.value
}

onMounted(async () => {
  if (!sessionId.value) {
    errorMessage.value = 'Cobro no encontrado'
    loading.value = false
    return
  }
  try {
    const res = await $fetch<{ success: boolean; data: { checkoutUrl: string; status: string } }>(
      `/api/collections/sessions/${sessionId.value}`,
    )
    checkoutUrl.value = res.data.checkoutUrl
    approved.value = res.data.status === 'approved'
    if (approved.value) {
      await router.replace(`/cobro/${sessionId.value}/gracias`)
    }
  } catch (error: any) {
    errorMessage.value = error?.data?.detail || error?.data?.message || 'No encontramos este cobro'
  } finally {
    loading.value = false
  }
})
</script>
