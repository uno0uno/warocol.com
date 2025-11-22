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
              <div class="bg-blue-500/10 p-3 rounded-lg">
                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">Marcar como Enviado</h2>
                <p class="text-sm text-text-secondary">
                  <span class="font-medium">{{ trackingNumber }}</span> • <span class="font-medium">{{ formData.carrier }}</span>
                </p>
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
          <!-- Package Count -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Número de Paquetes
            </label>
            <input
              v-model.number="formData.package_count"
              type="number"
              min="1"
              class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Ej: 1"
            />
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
              placeholder="Agrega notas sobre el envío..."
            ></textarea>
          </div>

          <!-- Attachments Section -->
          <PurchasesAttachmentUploader v-model="selectedFiles" />

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
              class="px-6 py-2 border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <CommonsTheCustomLoader v-if="loading" size="small" />
              <span>{{ loading ? 'Registrando...' : 'Marcar como Enviado' }}</span>
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
  shipped: []
}>()

const loading = ref(false)
const formData = ref({
  carrier: 'Waro',
  package_count: 1,
  notes: ''
})

const selectedFiles = ref<File[]>([])

// Generate tracking number automatically based on purchase number
// Example: WR-2025-0004 -> TRACK-2025-0004
const trackingNumber = computed(() => {
  if (!props.purchaseNumber) return ''
  return props.purchaseNumber.replace('WR-', 'TRACK-')
})

// Reset form when modal opens
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    formData.value = {
      carrier: 'Waro',
      package_count: 1,
      notes: ''
    }
    selectedFiles.value = []
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
    // Create FormData to include both form fields and files
    const formDataPayload = new FormData()

    formDataPayload.append('tracking_number', trackingNumber.value)
    formDataPayload.append('carrier', formData.value.carrier)

    if (formData.value.package_count) {
      formDataPayload.append('package_count', formData.value.package_count.toString())
    }

    if (formData.value.notes) {
      formDataPayload.append('notes', formData.value.notes)
    }

    // Append files if any
    if (selectedFiles.value.length > 0) {
      for (const file of selectedFiles.value) {
        formDataPayload.append('files', file)
      }
    }

    const response = await $fetch(`/api/suppliers/purchases/${props.purchaseId}/ship`, {
      method: 'POST',
      body: formDataPayload
    })

    if (response.success) {
      emit('shipped')
      emit('close')

      useToast().add({
        title: 'Envío Registrado',
        description: 'La orden ha sido marcada como enviada',
        color: 'green'
      })
    }
  } catch (error: any) {
    console.error('Error shipping purchase:', error)
    useToast().add({
      title: 'Error',
      description: error.data?.detail || 'No se pudo registrar el envío',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}
</script>
