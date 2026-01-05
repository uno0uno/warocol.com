<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
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

    <!-- Estimated Delivery Date -->
    <div>
      <label class="block text-sm font-medium text-text-primary mb-2">
        Fecha Estimada de Entrega
      </label>
      <input
        v-model="formData.estimated_delivery_date"
        type="date"
        class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
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
    <div class="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t-2 border-border">
      <button
        type="button"
        @click="$emit('cancel')"
        :disabled="loading"
        class="w-full sm:w-auto px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="loading"
        class="w-full sm:w-auto px-6 py-2 border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        <CommonsTheCustomLoader v-if="loading" size="small" />
        <span>{{ loading ? 'Registrando...' : 'Marcar como Enviado' }}</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  purchase: any
  token: string
}>()

const emit = defineEmits<{
  cancel: []
  shipped: []
}>()

const loading = ref(false)
const formData = ref({
  carrier: 'Waro',
  package_count: 1,
  estimated_delivery_date: '',
  notes: ''
})

const selectedFiles = ref<File[]>([])

// Generate tracking number automatically based on purchase number
const trackingNumber = computed(() => {
  if (!props.purchase?.purchase_number) return ''
  return props.purchase.purchase_number.replace('WR-', 'TRACK-')
})

onMounted(() => {
  formData.value = {
    carrier: 'Waro',
    package_count: 1,
    estimated_delivery_date: '',
    notes: ''
  }
  selectedFiles.value = []
})

const handleSubmit = async () => {
  loading.value = true

  try {
    const formDataPayload = new FormData()

    formDataPayload.append('tracking_number', trackingNumber.value)
    formDataPayload.append('carrier', formData.value.carrier)

    if (formData.value.package_count) {
      formDataPayload.append('package_count', formData.value.package_count.toString())
    }

    if (formData.value.estimated_delivery_date) {
      formDataPayload.append('estimated_delivery_date', formData.value.estimated_delivery_date)
    }

    if (formData.value.notes) {
      formDataPayload.append('notes', formData.value.notes)
    }

    if (selectedFiles.value.length > 0) {
      for (const file of selectedFiles.value) {
        formDataPayload.append('files', file)
      }
    }

    const response = await $fetch(`/api/supplier-portal/${props.token}/purchases/${props.purchase.id}/ship`, {
      method: 'POST',
      body: formDataPayload
    })

    if (response.success) {
      emit('shipped')

      useToast().success('La orden ha sido marcada como enviada', { title: 'Envío Registrado' })
    }
  } catch (error: any) {
    console.error('Error shipping purchase:', error)
    useToast().error(error.data?.detail || 'No se pudo registrar el envío', { title: 'Error' })
  } finally {
    loading.value = false
  }
}
</script>
