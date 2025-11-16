<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="closeModal"
    ></div>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-4xl rounded-xl shadow-2xl border-2 max-h-[90vh] overflow-y-auto" style="background-color: hsl(var(--surface)); border-color: hsl(var(--crocus-600));">
        <!-- Header -->
        <div class="sticky top-0 border-b-2 p-6 z-10" style="background-color: hsl(var(--surface)); border-bottom-color: hsl(var(--crocus-600) / 0.3);">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="p-3 rounded-lg" style="background-color: hsl(var(--crocus-600) / 0.1);">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: hsl(var(--crocus-600));">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">Recibir Orden</h2>
                <p class="text-sm text-text-secondary">Registra las cantidades recibidas de cada ítem</p>
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
          <!-- Package Condition -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Condición del Paquete *
            </label>
            <div class="grid grid-cols-3 gap-3">
              <button
                type="button"
                v-for="condition in packageConditions"
                :key="condition.value"
                @click="formData.package_condition = condition.value"
                class="p-4 border-2 rounded-lg transition-all text-left"
                :style="{
                  borderColor: formData.package_condition === condition.value ? 'hsl(var(--crocus-600))' : 'hsl(var(--crocus-600) / 0.3)',
                  backgroundColor: formData.package_condition === condition.value ? 'hsl(var(--crocus-600) / 0.1)' : 'transparent'
                }"
                @mouseenter="formData.package_condition !== condition.value && ($event.target.style.borderColor = 'hsl(var(--crocus-600) / 0.5)')"
                @mouseleave="formData.package_condition !== condition.value && ($event.target.style.borderColor = 'hsl(var(--crocus-600) / 0.3)')"
              >
                <div class="font-medium text-text-primary">{{ condition.label }}</div>
                <div class="text-xs text-text-secondary mt-1">{{ condition.description }}</div>
              </button>
            </div>
          </div>

          <!-- Items Received -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-3">
              Ítems Recibidos *
            </label>
            <div class="space-y-3">
              <div
                v-for="(item, index) in formData.items"
                :key="index"
                class="rounded-lg p-4 border-2"
                style="background-color: hsl(var(--background)); border-color: hsl(var(--crocus-600) / 0.3);"
              >
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Item Name (readonly) -->
                  <div class="md:col-span-1">
                    <label class="block text-xs font-medium text-text-secondary mb-1">
                      Ingrediente
                    </label>
                    <div class="text-sm font-medium text-text-primary">
                      {{ getIngredientName(item.ingredient_id) }}
                    </div>
                    <div class="text-xs text-text-secondary mt-1">
                      Ordenado: {{ item.quantity_ordered }} {{ item.unit }}
                    </div>
                  </div>

                  <!-- Quantity Received -->
                  <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">
                      Cantidad Recibida *
                    </label>
                    <input
                      v-model.number="item.quantity_received"
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      class="w-full px-3 py-2 rounded-lg text-text-primary transition-all border-2"
                      style="background-color: hsl(var(--surface)); border-color: hsl(var(--crocus-600) / 0.3);"
                      @focus="$event.target.style.borderColor = 'hsl(var(--crocus-600))'; $event.target.style.outline = '2px solid hsl(var(--crocus-600) / 0.2)'"
                      @blur="$event.target.style.borderColor = 'hsl(var(--crocus-600) / 0.3)'; $event.target.style.outline = 'none'"
                      :placeholder="item.quantity_ordered.toString()"
                    />
                  </div>

                  <!-- Item Condition -->
                  <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">
                      Condición *
                    </label>
                    <select
                      v-model="item.item_condition"
                      required
                      class="w-full px-3 py-2 rounded-lg text-text-primary transition-all border-2"
                      style="background-color: hsl(var(--surface)); border-color: hsl(var(--crocus-600) / 0.3);"
                      @focus="$event.target.style.borderColor = 'hsl(var(--crocus-600))'; $event.target.style.outline = '2px solid hsl(var(--crocus-600) / 0.2)'"
                      @blur="$event.target.style.borderColor = 'hsl(var(--crocus-600) / 0.3)'; $event.target.style.outline = 'none'"
                    >
                      <option value="complete">Completo</option>
                      <option value="partial">Parcial</option>
                      <option value="missing">Faltante</option>
                      <option value="damaged">Dañado</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Reception Notes -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Notas de Recepción (Opcional)
            </label>
            <textarea
              v-model="formData.reception_notes"
              rows="3"
              class="w-full px-4 py-2 rounded-lg text-text-primary placeholder-text-secondary transition-all resize-none border-2"
              style="background-color: hsl(var(--background)); border-color: hsl(var(--crocus-600) / 0.3);"
              @focus="$event.target.style.borderColor = 'hsl(var(--crocus-600))'; $event.target.style.outline = '2px solid hsl(var(--crocus-600) / 0.2)'"
              @blur="$event.target.style.borderColor = 'hsl(var(--crocus-600) / 0.3)'; $event.target.style.outline = 'none'"
              placeholder="Observaciones sobre la recepción..."
            ></textarea>
          </div>

          <!-- Partial Reception Toggle -->
          <div class="flex items-center space-x-3 p-4 rounded-lg border-2" style="background-color: hsl(var(--warning) / 0.1); border-color: hsl(var(--warning) / 0.3);">
            <input
              v-model="formData.partial"
              type="checkbox"
              id="partial-reception"
              class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
            <label for="partial-reception" class="text-sm font-medium text-text-primary cursor-pointer">
              Marcar como recepción parcial (quedan ítems por recibir)
            </label>
          </div>

          <!-- Attachments Section -->
          <PurchasesAttachmentUploader v-model="selectedFiles" />

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4 border-t-2" style="border-top-color: hsl(var(--crocus-600) / 0.3);">
            <button
              type="button"
              @click="closeModal"
              :disabled="loading"
              class="px-6 py-2 border-2 rounded-lg text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style="border-color: hsl(var(--crocus-600) / 0.3);"
              @mouseenter="!loading && ($event.target.style.backgroundColor = 'hsl(var(--background))')"
              @mouseleave="$event.target.style.backgroundColor = 'transparent'"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              style="background-color: hsl(var(--crocus-600));"
              @mouseenter="!loading && ($event.target.style.backgroundColor = 'hsl(var(--crocus-600) / 0.9)')"
              @mouseleave="!loading && ($event.target.style.backgroundColor = 'hsl(var(--crocus-600))')"
            >
              <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ loading ? 'Registrando...' : 'Confirmar Recepción' }}</span>
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

const emit = defineEmits<{
  close: []
  received: []
}>()

const loading = ref(false)

const packageConditions = [
  { value: 'good', label: 'Bueno', description: 'Sin daños aparentes' },
  { value: 'damaged', label: 'Dañado', description: 'Paquete con daños' },
  { value: 'partial', label: 'Parcial', description: 'Falta contenido' }
]

const formData = ref({
  package_condition: 'good',
  items: [] as any[],
  reception_notes: '',
  partial: false
})

const selectedFiles = ref<File[]>([])

// Initialize items when modal opens
watch(() => props.isOpen, (newValue) => {
  if (newValue && props.purchaseItems?.length) {
    formData.value = {
      package_condition: 'good',
      items: props.purchaseItems.map(item => ({
        ingredient_id: item.ingredient_id,
        quantity_ordered: item.quantity,
        unit: item.unit,
        quantity_received: item.quantity, // Default to ordered quantity
        item_condition: 'complete'
      })),
      reception_notes: '',
      partial: false
    }
    selectedFiles.value = []
  }
})

const getIngredientName = (ingredientId: string) => {
  const ingredient = props.ingredients?.find(i => i.id === ingredientId)
  return ingredient?.name || 'Ingrediente desconocido'
}

const closeModal = () => {
  if (!loading.value) {
    emit('close')
  }
}

const handleSubmit = async () => {
  loading.value = true

  try {
    const response = await $fetch(`/api/suppliers/purchases/${props.purchaseId}/receive`, {
      method: 'POST',
      body: {
        package_condition: formData.value.package_condition,
        items: formData.value.items,
        reception_notes: formData.value.reception_notes || null,
        partial: formData.value.partial
      }
    })

    if (response.success) {
      // Upload attachments if any
      if (selectedFiles.value.length > 0) {
        for (const file of selectedFiles.value) {
          try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('attachment_type', 'receipt')
            formData.append('description', `Documento de recepción: ${new Date().toISOString().split('T')[0]}`)

            await $fetch(`/api/attachments/purchases/${props.purchaseId}/upload`, {
              method: 'POST',
              body: formData
            })
          } catch (error) {
            console.error('Error uploading attachment:', error)
          }
        }
      }

      emit('received')
      emit('close')

      useToast().add({
        title: 'Recepción Registrada',
        description: formData.value.partial
          ? 'Se ha registrado la recepción parcial de la orden'
          : 'La orden ha sido recibida completamente',
        color: 'green'
      })
    }
  } catch (error: any) {
    console.error('Error receiving purchase:', error)
    useToast().add({
      title: 'Error',
      description: error.data?.detail || 'No se pudo registrar la recepción',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}
</script>
