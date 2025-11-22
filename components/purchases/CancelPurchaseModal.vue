<template>
  <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center">
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="closeModal"></div>

    <div class="relative w-full h-full md:h-auto md:max-w-2xl bg-surface md:rounded-xl shadow-2xl border-2 border-border flex flex-col md:max-h-[90vh]">
        <!-- Header -->
        <div class="flex-shrink-0 border-b-2 border-border p-4 md:p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-red-500/10 p-3 rounded-lg">
                <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">Cancelar Orden de Compra</h2>
                <p class="text-sm text-text-secondary">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <button @click="closeModal" class="text-text-secondary hover:text-text-primary transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body (Scrollable) -->
        <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <!-- Warning -->
          <div class="bg-red-500/10 border-2 border-red-500/20 rounded-lg p-4">
            <div class="flex space-x-3">
              <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 class="text-sm font-medium text-red-500">Advertencia</h3>
                <p class="text-sm text-text-secondary mt-1">
                  Al cancelar esta orden, no podrá revertir esta acción. Asegúrate de haber notificado al proveedor si es necesario.
                </p>
              </div>
            </div>
          </div>

          <!-- Cancellation Reason -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Razón de Cancelación *
            </label>
            <textarea
              v-model="formData.cancellation_reason"
              rows="4"
              required
              minlength="10"
              class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              placeholder="Describe el motivo de la cancelación (mínimo 10 caracteres)..."
            ></textarea>
            <p class="mt-1 text-xs text-text-secondary">
              {{ formData.cancellation_reason.length }} / 10 caracteres mínimo
            </p>
          </div>

          <!-- Additional Notes -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Notas Adicionales (Opcional)
            </label>
            <textarea
              v-model="formData.notes"
              rows="3"
              class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              placeholder="Información adicional sobre la cancelación..."
            ></textarea>
          </div>

          <!-- Confirmation Checkbox -->
          <div class="flex items-start space-x-3 p-4 bg-background border-2 border-border rounded-lg">
            <input
              v-model="confirmCancel"
              type="checkbox"
              id="confirm-cancel"
              class="mt-1 w-4 h-4 text-red-500 border-border rounded focus:ring-red-500"
            />
            <label for="confirm-cancel" class="text-sm text-text-primary cursor-pointer">
              <span class="font-medium">Confirmo que deseo cancelar esta orden de compra</span>
              <span class="block text-xs text-text-secondary mt-1">
                He revisado la información y entiendo que esta acción es permanente
              </span>
            </label>
          </div>
        </div>

        <!-- Actions (Fixed at bottom) -->
        <div class="flex-shrink-0 flex justify-end space-x-3 p-4 md:p-6 border-t-2 border-border bg-surface">
          <button
            type="button"
            @click="closeModal"
            :disabled="loading"
            class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Volver
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="loading || !confirmCancel || formData.cancellation_reason.length < 10"
            class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <CommonsTheCustomLoader v-if="loading" size="small" />
            <span>{{ loading ? 'Cancelando...' : 'Cancelar Orden' }}</span>
          </button>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  purchaseId: string
}>()

const emit = defineEmits<{
  close: []
  cancelled: []
}>()

const loading = ref(false)
const confirmCancel = ref(false)
const formData = ref({
  cancellation_reason: '',
  notes: ''
})

// Reset form when modal opens
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    formData.value = {
      cancellation_reason: '',
      notes: ''
    }
    confirmCancel.value = false
  }
})

const closeModal = () => {
  if (!loading.value) {
    emit('close')
  }
}

const handleSubmit = async () => {
  if (formData.value.cancellation_reason.length < 10) {
    useToast().add({
      title: 'Error de Validación',
      description: 'La razón de cancelación debe tener al menos 10 caracteres',
      color: 'red'
    })
    return
  }

  if (!confirmCancel.value) {
    useToast().add({
      title: 'Confirmación Requerida',
      description: 'Debes confirmar que deseas cancelar la orden',
      color: 'red'
    })
    return
  }

  loading.value = true

  try {
    const response = await $fetch(`/api/suppliers/purchases/${props.purchaseId}/cancel`, {
      method: 'POST',
      body: {
        cancellation_reason: formData.value.cancellation_reason,
        notes: formData.value.notes || null
      }
    })

    if (response.success) {
      emit('cancelled')
      emit('close')

      useToast().add({
        title: 'Orden Cancelada',
        description: 'La orden de compra ha sido cancelada',
        color: 'green'
      })
    }
  } catch (error: any) {
    console.error('Error cancelling purchase:', error)
    useToast().add({
      title: 'Error',
      description: error.data?.detail || 'No se pudo cancelar la orden',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}
</script>
