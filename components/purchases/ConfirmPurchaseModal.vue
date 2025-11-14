<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="closeModal"
    ></div>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-2xl bg-surface rounded-xl shadow-2xl border-2 border-border">
        <!-- Header -->
        <div class="border-b-2 border-border p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-green-500/10 p-3 rounded-lg">
                <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">Confirmar Orden de Compra</h2>
                <p class="text-sm text-text-secondary">Registra la confirmación del proveedor</p>
              </div>
            </div>
            <button
              @click="closeModal"
              class="text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
          <!-- Confirmation Number (Auto-generated) -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Número de Confirmación
            </label>
            <input
              :value="confirmationNumber"
              type="text"
              readonly
              class="w-full px-4 py-2 bg-surface-secondary border-2 border-border rounded-lg text-text-primary font-semibold cursor-not-allowed"
            />
            <p class="mt-1 text-xs text-text-secondary">
              Generado automáticamente basado en el número de orden
            </p>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Notas (Opcional)
            </label>
            <textarea
              v-model="formData.notes"
              rows="3"
              class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              placeholder="Agrega notas sobre la confirmación..."
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-between items-center pt-4 border-t-2 border-border">
            <button
              type="button"
              @click="closeModal"
              :disabled="loading"
              class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-6 py-2 border-2 border-green-500 text-green-500 rounded-lg hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ loading ? 'Confirmando...' : 'Confirmar Orden' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  isOpen: boolean
  purchaseId: string
  purchaseNumber: string
}>()

const emit = defineEmits<{
  close: []
  confirmed: []
}>()

const loading = ref(false)
const formData = ref({
  notes: ''
})

// Generate confirmation number automatically based on purchase number
// Example: WR-2025-0004 -> CONF-2025-0004
const confirmationNumber = computed(() => {
  if (!props.purchaseNumber) return ''
  return props.purchaseNumber.replace('WR-', 'CONF-')
})

// Reset form when modal opens
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    formData.value = {
      notes: ''
    }
  }
})

const closeModal = () => {
  if (!loading.value) {
    emit('close')
  }
}

const handleSubmit = async () => {
  loading.value = true

  try {
    const response = await $fetch(`/api/suppliers/purchases/${props.purchaseId}/confirm`, {
      method: 'POST',
      body: {
        confirmation_number: confirmationNumber.value,
        notes: formData.value.notes || null
      }
    })

    if (response.success) {
      emit('confirmed')
      emit('close')

      // Show success message
      useToast().add({
        title: 'Orden Confirmada',
        description: 'La orden de compra ha sido confirmada exitosamente',
        color: 'green'
      })
    }
  } catch (error: any) {
    console.error('Error confirming purchase:', error)
    useToast().add({
      title: 'Error',
      description: error.data?.detail || 'No se pudo confirmar la orden',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}
</script>
