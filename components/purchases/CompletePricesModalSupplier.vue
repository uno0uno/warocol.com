<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="closeModal"
    ></div>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-4xl bg-surface rounded-xl shadow-2xl border-2 border-border">
        <!-- Header -->
        <div class="border-b-2 border-border p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-green-500/10 p-3 rounded-lg">
                <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">Completar Cotización</h2>
                <p class="text-sm text-text-secondary">{{ purchase?.purchase_number }}</p>
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
          <!-- Items with Prices -->
          <div class="space-y-4">
            <div
              v-for="(item, index) in priceItems"
              :key="index"
              class="p-4 bg-background border-2 border-border rounded-lg"
            >
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h4 class="font-semibold text-text-primary">{{ item.ingredient_name }}</h4>
                  <p class="text-sm text-text-secondary">
                    Cantidad: {{ item.quantity }} {{ item.unit }}
                  </p>
                </div>
                <span class="text-xs bg-surface-secondary px-2 py-1 rounded">
                  Item #{{ index + 1 }}
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    Precio Unitario *
                  </label>
                  <input
                    v-model.number="item.unit_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    class="input-base w-full px-4 py-2"
                    placeholder="0.00"
                    @input="calculateItemTotal(index)"
                  />
                  <p class="text-xs text-text-secondary mt-1">
                    Por {{ item.unit }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    Total Item
                  </label>
                  <input
                    :value="item.total_cost.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })"
                    type="text"
                    readonly
                    class="input-base w-full px-4 py-2 bg-surface-secondary font-semibold"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    Notas del Item
                  </label>
                  <input
                    v-model="item.notes"
                    type="text"
                    class="input-base w-full px-4 py-2"
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Totals Summary -->
          <div class="bg-primary-50 border-2 border-primary-200 rounded-lg p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Subtotal
                </label>
                <input
                  :value="subtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })"
                  type="text"
                  readonly
                  class="input-base w-full px-4 py-2 bg-white font-semibold"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  IVA
                </label>
                <input
                  v-model.number="taxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="input-base w-full px-4 py-2"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Total General
                </label>
                <input
                  :value="totalAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })"
                  type="text"
                  readonly
                  class="input-base w-full px-4 py-2 bg-white font-bold text-lg"
                />
              </div>
            </div>
          </div>

          <!-- Additional Notes -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Observaciones Adicionales
            </label>
            <textarea
              v-model="additionalNotes"
              rows="3"
              class="input-base w-full px-4 py-2"
              placeholder="Notas sobre los precios o condiciones..."
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4 border-t-2 border-border">
            <button
              type="button"
              @click="closeModal"
              :disabled="loading"
              class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="loading || !allPricesValid"
              class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ loading ? 'Enviando...' : 'Enviar Cotización' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  purchase: any
  token: string
}>()

const emit = defineEmits<{
  close: []
  completed: []
}>()

const loading = ref(false)
const priceItems = ref<any[]>([])
const taxAmount = ref(0)
const additionalNotes = ref('')

// Initialize price items when modal opens
watch(() => props.isOpen, (newValue) => {
  if (newValue && props.purchase) {
    priceItems.value = props.purchase.items.map((item: any) => ({
      id: item.id,
      ingredient_name: item.ingredient_name,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost || 0,
      total_cost: item.total_cost || 0,
      notes: item.notes || ''
    }))
    taxAmount.value = 0
    additionalNotes.value = ''
  }
})

const subtotal = computed(() => {
  return priceItems.value.reduce((sum, item) => sum + (item.total_cost || 0), 0)
})

const totalAmount = computed(() => {
  return subtotal.value + (taxAmount.value || 0)
})

const allPricesValid = computed(() => {
  return priceItems.value.every(item => item.unit_cost > 0)
})

function calculateItemTotal(index: number) {
  const item = priceItems.value[index]
  item.total_cost = (item.quantity || 0) * (item.unit_cost || 0)
}

const closeModal = () => {
  if (!loading.value) {
    emit('close')
  }
}

const handleSubmit = async () => {
  loading.value = true

  try {
    const itemsWithPrices = priceItems.value.map(item => ({
      id: item.id,
      unit_cost: item.unit_cost,
      notes: item.notes || ''
    }))

    const response = await $fetch(`/api/supplier-portal/${props.token}/purchases/${props.purchase.id}/update-prices`, {
      method: 'POST',
      body: {
        items: itemsWithPrices,
        tax_amount: taxAmount.value,
        notes: additionalNotes.value || ''
      }
    })

    if (response.success) {
      emit('completed')
      emit('close')

      useToast().add({
        title: 'Cotización Enviada',
        description: 'Los precios han sido enviados correctamente',
        color: 'green'
      })
    }
  } catch (error: any) {
    console.error('Error completing quotation:', error)
    useToast().add({
      title: 'Error',
      description: error.data?.detail || 'No se pudo enviar la cotización',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}
</script>
