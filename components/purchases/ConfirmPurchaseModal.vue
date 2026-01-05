<template>
  <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="closeModal"
    ></div>

    <!-- Modal -->
    <div class="relative w-full h-full md:h-auto md:max-w-2xl bg-surface md:rounded-xl shadow-2xl border-2 border-border flex flex-col md:max-h-[90vh]">
        <!-- Header -->
        <div class="flex-shrink-0 border-b-2 border-border p-4 md:p-6">
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

        <!-- Body (Scrollable) -->
        <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
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
        </div>

        <!-- Actions (Fixed at bottom) -->
        <div class="flex-shrink-0 flex justify-between items-center p-4 md:p-6 border-t-2 border-border bg-surface">
          <button
            type="button"
            @click="closeModal"
            :disabled="loading"
            class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="loading"
            class="px-6 py-2 border-2 border-green-500 text-green-500 rounded-lg hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <CommonsTheCustomLoader v-if="loading" size="small" />
            <span>{{ loading ? 'Confirmando...' : 'Confirmar Orden' }}</span>
          </button>
        </div>
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
      useToast().success('La orden de compra ha sido confirmada exitosamente', { title: 'Orden Confirmada' })
    }
  } catch (error: any) {
    console.error('Error confirming purchase:', error)
    useToast().error(error.data?.detail || 'No se pudo confirmar la orden', { title: 'Error' })
  } finally {
    loading.value = false
  }
}
</script>
