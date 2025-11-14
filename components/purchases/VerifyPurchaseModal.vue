<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="closeModal"></div>

    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-4xl bg-surface rounded-xl shadow-2xl border-2 border-border max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="sticky top-0 bg-surface border-b-2 border-border p-6 z-10">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-indigo-500/10 p-3 rounded-lg">
                <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">Verificar Calidad</h2>
                <p class="text-sm text-text-secondary">Evalúa la calidad de los ítems recibidos</p>
              </div>
            </div>
            <button @click="closeModal" class="text-text-secondary hover:text-text-primary transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
          <!-- Items Quality Assessment -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-3">
              Evaluación de Calidad *
            </label>
            <div class="space-y-3">
              <div v-for="(item, index) in formData.items" :key="index" class="bg-background border-2 border-border rounded-lg p-4">
                <div class="mb-3">
                  <div class="font-medium text-text-primary">{{ getIngredientName(item.ingredient_id) }}</div>
                  <div class="text-xs text-text-secondary">Recibido: {{ item.quantity_received }} {{ item.unit }}</div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Quality Status -->
                  <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">Estado de Calidad *</label>
                    <select v-model="item.quality_status" required class="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg text-text-primary focus:border-primary">
                      <option value="good">Bueno - Cumple especificaciones</option>
                      <option value="acceptable">Aceptable - Ligeras variaciones</option>
                      <option value="poor">Pobre - No cumple estándares</option>
                      <option value="rejected">Rechazado - No aceptable</option>
                    </select>
                  </div>

                  <!-- Quality Notes -->
                  <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">Notas de Calidad</label>
                    <input v-model="item.quality_notes" type="text" class="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg text-text-primary" placeholder="Observaciones..." />
                  </div>
                </div>

                <!-- Verification Notes -->
                <div class="mt-3">
                  <label class="block text-xs font-medium text-text-secondary mb-1">Notas de Verificación</label>
                  <textarea v-model="item.verification_notes" rows="2" class="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg text-text-primary resize-none" placeholder="Detalles de la verificación..."></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- All Items Approved -->
          <div class="flex items-center space-x-3 p-4 bg-indigo-500/10 border-2 border-indigo-500/20 rounded-lg">
            <input v-model="formData.all_items_approved" type="checkbox" id="all-approved" class="w-4 h-4 text-primary border-border rounded" />
            <label for="all-approved" class="text-sm font-medium text-text-primary cursor-pointer">
              Todos los ítems cumplen con las especificaciones requeridas
            </label>
          </div>

          <!-- General Verification Notes -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Notas Generales de Verificación</label>
            <textarea v-model="formData.verification_notes" rows="3" class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary resize-none" placeholder="Observaciones generales..."></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4 border-t-2 border-border">
            <button type="button" @click="closeModal" :disabled="loading" class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-background transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" :disabled="loading" class="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center space-x-2">
              <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ loading ? 'Verificando...' : 'Confirmar Verificación' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  purchaseId: string
  purchaseItems: any[]
  ingredients: any[]
}>()

const emit = defineEmits<{ close: [], verified: [] }>()

const loading = ref(false)
const formData = ref({
  items: [] as any[],
  all_items_approved: false,
  verification_notes: ''
})

watch(() => props.isOpen, (newValue) => {
  if (newValue && props.purchaseItems?.length) {
    formData.value = {
      items: props.purchaseItems.map(item => ({
        ingredient_id: item.ingredient_id,
        quantity_received: item.quantity_received || item.quantity,
        unit: item.unit,
        quality_status: 'good',
        quality_notes: '',
        verification_notes: ''
      })),
      all_items_approved: false,
      verification_notes: ''
    }
  }
})

const getIngredientName = (ingredientId: string) => {
  return props.ingredients?.find(i => i.id === ingredientId)?.name || 'Ingrediente desconocido'
}

const closeModal = () => !loading.value && emit('close')

const handleSubmit = async () => {
  loading.value = true
  try {
    const response = await $fetch(`/api/suppliers/purchases/${props.purchaseId}/verify`, {
      method: 'POST',
      body: {
        items: formData.value.items,
        all_items_approved: formData.value.all_items_approved,
        verification_notes: formData.value.verification_notes || null
      }
    })

    if (response.success) {
      emit('verified')
      emit('close')
      useToast().add({ title: 'Verificación Completa', description: 'La calidad de la orden ha sido verificada', color: 'green' })
    }
  } catch (error: any) {
    console.error('Error verifying purchase:', error)
    useToast().add({ title: 'Error', description: error.data?.detail || 'No se pudo verificar la orden', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>
