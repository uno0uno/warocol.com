<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Items Received -->
    <div>
      <label class="block text-sm font-medium text-text-primary mb-3">
        Ítems Recibidos *
      </label>
      <div class="space-y-3">
        <div v-for="(item, index) in formData.items" :key="index" class="rounded-lg p-4 border-2"
          style="background-color: hsl(var(--background)); border-color: hsl(var(--crocus-600) / 0.3);">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <input v-model.number="item.quantity_received" type="number" step="0.001" min="0" required
                class="w-full px-3 py-2 rounded-lg text-text-primary transition-all border-2"
                style="background-color: hsl(var(--surface)); border-color: hsl(var(--crocus-600) / 0.3);"
                @focus="$event.target.style.borderColor = 'hsl(var(--crocus-600))'; $event.target.style.outline = '2px solid hsl(var(--crocus-600) / 0.2)'"
                @blur="$event.target.style.borderColor = 'hsl(var(--crocus-600) / 0.3)'; $event.target.style.outline = 'none'"
                :placeholder="item.quantity_ordered.toString()" />
            </div>

            <!-- Item Condition -->
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">
                Condición *
              </label>
              <select v-model="item.item_condition" required
                class="w-full px-3 py-2 rounded-lg text-text-primary transition-all border-2"
                style="background-color: hsl(var(--surface)); border-color: hsl(var(--crocus-600) / 0.3);"
                @focus="$event.target.style.borderColor = 'hsl(var(--crocus-600))'; $event.target.style.outline = '2px solid hsl(var(--crocus-600) / 0.2)'"
                @blur="$event.target.style.borderColor = 'hsl(var(--crocus-600) / 0.3)'; $event.target.style.outline = 'none'">
                <option value="complete">Completo</option>
                <option value="partial">Parcial</option>
                <option value="missing">Faltante</option>
                <option value="damaged">Dañado</option>
              </select>
            </div>

            <!-- Quality Status -->
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Estado de Calidad *</label>
              <select v-model="item.quality_status" required
                class="w-full px-3 py-2 rounded-lg text-text-primary transition-all border-2"
                style="background-color: hsl(var(--surface)); border-color: hsl(var(--crocus-600) / 0.3);"
                @focus="$event.target.style.borderColor = 'hsl(var(--crocus-600))'; $event.target.style.outline = '2px solid hsl(var(--crocus-600) / 0.2)'"
                @blur="$event.target.style.borderColor = 'hsl(var(--crocus-600) / 0.3)'; $event.target.style.outline = 'none'">
                <option value="good">Bueno</option>
                <option value="acceptable">Aceptable</option>
                <option value="poor">Pobre</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overall Quality Approval -->
    <div class="p-4 rounded-lg border-2"
      style="background-color: hsl(var(--info) / 0.1); border-color: hsl(var(--info) / 0.3);">
      <div class="flex items-center space-x-3">
        <input v-model="formData.all_items_approved" type="checkbox" id="all-items-approved"
          class="w-4 h-4 text-primary border-border rounded focus:ring-primary" />
        <label for="all-items-approved" class="text-sm font-medium text-text-primary cursor-pointer">
          Todos los ítems cumplen con las especificaciones de calidad
        </label>
      </div>
    </div>

    <!-- Verification Notes -->
    <div>
      <label class="block text-sm font-medium text-text-primary mb-2">
        Notas de Verificación (Opcional)
      </label>
      <textarea v-model="formData.verification_notes" rows="3"
        class="w-full px-4 py-2 rounded-lg text-text-primary placeholder-text-secondary transition-all resize-none border-2"
        style="background-color: hsl(var(--background)); border-color: hsl(var(--crocus-600) / 0.3);"
        @focus="$event.target.style.borderColor = 'hsl(var(--crocus-600))'; $event.target.style.outline = '2px solid hsl(var(--crocus-600) / 0.2)'"
        @blur="$event.target.style.borderColor = 'hsl(var(--crocus-600) / 0.3)'; $event.target.style.outline = 'none'"
        placeholder="Observaciones sobre la calidad y verificación..."></textarea>
    </div>

    <!-- Partial Reception Toggle -->
    <div class="flex items-center space-x-3 p-4 rounded-lg border-2"
      style="background-color: hsl(var(--warning) / 0.1); border-color: hsl(var(--warning) / 0.3);">
      <input v-model="formData.partial" type="checkbox" id="partial-reception"
        class="w-4 h-4 text-primary border-border rounded focus:ring-primary" />
      <label for="partial-reception" class="text-sm font-medium text-text-primary cursor-pointer">
        Marcar como recepción parcial (quedan ítems por recibir)
      </label>
    </div>

    <!-- Attachments Section -->
    <PurchasesAttachmentUploader v-model="selectedFiles" />

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-3 pt-2">
      <button type="button" @click="$emit('cancel')" :disabled="loading"
        class="flex-1 px-6 py-3 border-2 border-border rounded-lg text-text-primary hover:bg-surface transition-colors disabled:opacity-50">
        Cancelar
      </button>
      <button type="submit" :disabled="loading"
        class="flex-1 px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        style="background-color: hsl(var(--crocus-600));"
        @mouseenter="!loading && ($event.target.style.backgroundColor = 'hsl(var(--crocus-600) / 0.9)')"
        @mouseleave="!loading && ($event.target.style.backgroundColor = 'hsl(var(--crocus-600))')">
        <CommonsTheCustomLoader v-if="loading" size="small" />
        <span>{{ loading ? 'Registrando...' : 'Confirmar Recepción' }}</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  purchaseId: string
  purchaseItems: any[]
  ingredients: any[]
}>()

const emit = defineEmits<{
  cancel: []
  received: []
}>()

const loading = ref(false)

const formData = ref({
  items: [] as any[],
  verification_notes: '',
  partial: false,
  all_items_approved: true
})

const selectedFiles = ref<File[]>([])

// Initialize items
watch(() => props.purchaseItems, (items) => {
  if (items?.length) {
    formData.value = {
      items: items.map(item => ({
        ingredient_id: item.ingredient_id,
        quantity_ordered: item.quantity,
        unit: item.unit,
        quantity_received: item.quantity, // Default to ordered quantity
        item_condition: 'complete',
        quality_status: 'good', // Default quality
        quality_notes: '',
        verification_notes: ''
      })),
      verification_notes: '',
      partial: false,
      all_items_approved: true
    }
    selectedFiles.value = []
  }
}, { immediate: true })

const getIngredientName = (ingredientId: string) => {
  const ingredient = props.ingredients?.find(i => i.id === ingredientId)
  return ingredient?.name || 'Ingrediente desconocido'
}

const handleSubmit = async () => {
  loading.value = true

  try {
    // Create FormData to include both form fields and files
    const formDataPayload = new FormData()

    // Add items as JSON string
    formDataPayload.append('items_data', JSON.stringify(formData.value.items))
    formDataPayload.append('partial', formData.value.partial.toString())
    formDataPayload.append('all_items_approved', formData.value.all_items_approved.toString())

    if (formData.value.verification_notes) {
      formDataPayload.append('verification_notes', formData.value.verification_notes)
    }

    // Append files if any
    if (selectedFiles.value.length > 0) {
      for (const file of selectedFiles.value) {
        formDataPayload.append('files', file)
      }
    }

    const response = await $fetch(`/api/suppliers/purchases/${props.purchaseId}/receive`, {
      method: 'POST',
      body: formDataPayload
    })

    if (response.success) {
      emit('received')
    }
  } catch (error: any) {
    console.error('Error receiving purchase:', error)
    useToast().error(error.data?.detail || 'No se pudo registrar la recepción', { title: 'Error' })
  } finally {
    loading.value = false
  }
}
</script>
