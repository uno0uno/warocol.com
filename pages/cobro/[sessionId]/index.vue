<template>
  <main class="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10">
    <div v-if="errorMessage" class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center space-y-4">
      <h1 class="text-xl font-bold text-text-primary">Pagar en el restaurante</h1>
      <p class="text-sm text-state-danger-text" role="alert">{{ errorMessage }}</p>
    </div>
    <div v-else class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
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

onMounted(async () => {
  if (!sessionId.value) {
    errorMessage.value = 'Cobro no encontrado'
    return
  }
  try {
    const res = await $fetch<{ success: boolean; data: { checkoutUrl: string; status: string } }>(
      `/api/collections/sessions/${sessionId.value}`,
    )
    if (res.data.status === 'approved') {
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
