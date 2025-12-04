<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
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
            <p v-if="item.weight_info" class="text-xs text-text-secondary mt-1">
              {{ item.weight_info }}
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
  completed: []
  loading: [boolean]
}>()

const loading = ref(false)
const priceItems = ref<any[]>([])
const taxAmount = ref(0)
const additionalNotes = ref('')

// Initialize price items
onMounted(() => {
  if (props.purchase) {
    priceItems.value = props.purchase.items.map((item: any) => {
      const displayQuantity = item.purchase_quantity || item.quantity
      const displayUnit = item.purchase_unit || item.unit

      // Calculate display unit cost (price per display unit)
      let displayUnitCost = 0
      if (item.total_cost > 0) {
        displayUnitCost = item.total_cost / displayQuantity
      } else if (item.unit_cost > 0) {
        // Convert base unit cost to display unit cost
        // total = base_cost * base_qty
        // display_cost = total / display_qty
        displayUnitCost = (item.unit_cost * item.quantity) / displayQuantity
      }

      // Extract weight information for packages
      let weightInfo = null
      if (item.weight_value && item.weight_unit && item.weight_per_unit_grams) {
        weightInfo = `Peso del paquete: ${item.weight_value} ${item.weight_unit} (≈${item.weight_per_unit_grams} gr/und)`
      }

      return {
        id: item.id,
        ingredient_name: item.ingredient_name,
        quantity: displayQuantity,
        unit: displayUnit,
        base_quantity: item.quantity, // Keep base quantity for conversion
        unit_cost: displayUnitCost,
        total_cost: item.total_cost || 0,
        notes: item.notes || '',
        weight_info: weightInfo
      }
    })
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
  // Calculate total based on displayed quantity and displayed unit cost
  item.total_cost = (item.quantity || 0) * (item.unit_cost || 0)
}

const handleSubmit = async () => {
  loading.value = true
  emit('loading', true)

  try {
    const itemsWithPrices = priceItems.value.map(item => {
      // Convert back to base unit cost for backend
      // base_unit_cost = total_cost / base_quantity
      const baseUnitCost = item.base_quantity > 0 ? (item.total_cost / item.base_quantity) : 0

      return {
        id: item.id,
        unit_cost: baseUnitCost,
        notes: item.notes || ''
      }
    })

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
    emit('loading', false)
  }
}
</script>
