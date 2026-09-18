<template>
  <UModal v-model:open="open" :dismissible="false" :close="false" title="Términos actualizados">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm leading-6 text-text-secondary">
          Hemos actualizado los Términos y Condiciones. Debes aceptarlos para continuar.
        </p>
        <div class="flex gap-2">
          <UButton variant="outline" to="/terminos-y-condiciones" @click="open = false">Ver detalle</UButton>
          <UButton :loading="isAccepting" @click="handleAccept">Aceptar</UButton>
        </div>
        <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const { statusData, acceptTerms, isAccepting } = useLegalTerms()
const open = computed(() => !!statusData.value && statusData.value.pending === true && statusData.value.accepted === false)
const errorMsg = ref('')
const handleAccept = async () => {
  errorMsg.value = ''
  try {
    await acceptTerms({ source: 'modal' })
  } catch (e: any) {
    errorMsg.value = e?.message || 'No se pudo registrar la aceptación'
  }
}
</script>
